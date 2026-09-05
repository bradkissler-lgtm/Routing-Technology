import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { decisionInputSchema } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit-log";
import { recomputeApplicationStatus } from "@/lib/lifecycle";

/**
 * Manually records a lender's decision on one LenderSubmission. Phase 1 has
 * no live bureau pull or lender decisioning API (Blueprint §2.4) — every
 * Decision here is entered by a dealer or platform operator, which is why
 * `reasonCode`/`reasonText` are required rather than optional: a decision
 * without a stated reason isn't fit to enter, manual or automated.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { submissionId } = await params;

  let input;
  try {
    input = decisionInputSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid submission", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const manufacturer = await getCurrentManufacturer();

  const submission = await prisma.lenderSubmission.findFirst({
    where: { id: submissionId, application: { manufacturerId: manufacturer.id } },
    include: { decision: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Lender submission not found" }, { status: 404 });
  }
  if (submission.decision) {
    return NextResponse.json(
      { error: "This submission already has a decision recorded" },
      { status: 409 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const decision = await tx.decision.create({
      data: {
        lenderSubmissionId: submission.id,
        outcome: input.outcome,
        reasonCode: input.reasonCode,
        reasonText: input.reasonText,
        enteredBy: input.enteredBy,
        termsJson: input.termsJson as Prisma.InputJsonValue | undefined,
      },
    });

    await tx.lenderSubmission.update({
      where: { id: submission.id },
      data: { status: "DECISIONED" },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "Decision",
      entityId: decision.id,
      action: "CREATE",
      actorType: "MANUFACTURER",
      actorId: input.enteredBy,
      payload: { outcome: input.outcome, reasonCode: input.reasonCode },
    });

    const status = await recomputeApplicationStatus(tx, submission.applicationId);
    return { decision, status };
  });

  return NextResponse.json(
    { decisionId: result.decision.id, applicationStatus: result.status },
    { status: 201 },
  );
}
