import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { bureauPullInputSchema } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit-log";

/**
 * Records that the platform itself pulled a credit bureau report on a
 * Guarantor or IndividualApplicant — the rare exception to the default
 * posture that this platform never performs a bureau pull (Blueprint §2.1,
 * corrected 2026-09-06). This only applies when a FinancingProgram's own
 * routing rule needs a FICO score to decide whether to submit there at all
 * (FinancingProgram.minFicoScore); it is never the lender's own downstream
 * decisioning pull, which stays external and unmodeled. Phase 1 has no live
 * bureau API — this is a manual record of a pull performed outside this
 * system, and it requires that participant's own CREDIT_PULL consent to
 * already be on file (the same consent that authorizes the lender's
 * eventual pull, not a second consent to collect).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;

  let input;
  try {
    input = bureauPullInputSchema.parse(await request.json());
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

  if (input.participantType === "GUARANTOR") {
    const guarantor = await prisma.guarantor.findFirst({
      where: { id: input.participantId, applicationId: application.id },
    });
    if (!guarantor) {
      return NextResponse.json(
        { error: "Guarantor not found on this application" },
        { status: 404 },
      );
    }
    if (!guarantor.consentCreditPull) {
      return NextResponse.json(
        { error: "This guarantor has not authorized a credit pull" },
        { status: 409 },
      );
    }
  } else {
    if (application.individualApplicantId !== input.participantId) {
      return NextResponse.json(
        { error: "Individual applicant not found on this application" },
        { status: 404 },
      );
    }
    const consent = await prisma.consentRecord.findFirst({
      where: {
        applicationId: application.id,
        participantType: "INDIVIDUAL",
        participantId: input.participantId,
        purpose: "CREDIT_PULL",
        granted: true,
      },
    });
    if (!consent) {
      return NextResponse.json(
        { error: "This applicant has not authorized a credit pull" },
        { status: 409 },
      );
    }
  }

  if (input.financingProgramId) {
    const program = await prisma.financingProgram.findFirst({
      where: { id: input.financingProgramId, manufacturerId: manufacturer.id },
    });
    if (!program) {
      return NextResponse.json(
        { error: "Unknown financing program" },
        { status: 404 },
      );
    }
  }

  const bureauPull = await prisma.$transaction(async (tx) => {
    const created = await tx.bureauPull.create({
      data: {
        applicationId: application.id,
        participantType: input.participantType,
        participantId: input.participantId,
        financingProgramId: input.financingProgramId,
        bureau: input.bureau,
        ficoScore: input.ficoScore,
        pulledBy: input.pulledBy,
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "BureauPull",
      entityId: created.id,
      action: "CREATE",
      actorType: "DEALER",
      payload: {
        participantType: input.participantType,
        bureau: input.bureau,
        financingProgramId: input.financingProgramId ?? null,
      },
    });

    return created;
  });

  return NextResponse.json({ bureauPullId: bureauPull.id }, { status: 201 });
}
