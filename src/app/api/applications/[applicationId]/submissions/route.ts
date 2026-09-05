import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { lenderSubmissionInputSchema } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit-log";
import { recomputeApplicationStatus } from "@/lib/lifecycle";

/**
 * Manually logs that an Application was submitted to a specific lender's
 * FinancingProgram. Phase 1 has no live lender API (Blueprint §2.4) — this
 * is a dealer or platform-operator data-entry action, not an automated
 * submission. An Application can accumulate several of these (a cascade);
 * each is tracked and decisioned independently (see Decision).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;

  let input;
  try {
    input = lenderSubmissionInputSchema.parse(await request.json());
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

  const application = await prisma.application.findFirst({
    where: { id: applicationId, manufacturerId: manufacturer.id },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const program = await prisma.financingProgram.findFirst({
    where: { id: input.financingProgramId, manufacturerId: manufacturer.id, isActive: true },
  });
  if (!program) {
    return NextResponse.json(
      { error: "Unknown or inactive financing program" },
      { status: 404 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.lenderSubmission.create({
      data: {
        applicationId: application.id,
        financingProgramId: program.id,
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "LenderSubmission",
      entityId: submission.id,
      action: "CREATE",
      actorType: "DEALER",
      payload: { financingProgramId: program.id },
    });

    const status = await recomputeApplicationStatus(tx, application.id);
    return { submission, status };
  });

  return NextResponse.json(
    { submissionId: result.submission.id, applicationStatus: result.status },
    { status: 201 },
  );
}
