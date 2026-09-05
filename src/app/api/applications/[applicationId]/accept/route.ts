import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { acceptOfferInputSchema } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit-log";
import { recomputeApplicationStatus } from "@/lib/lifecycle";

/**
 * Records which Decision the applicant accepted. An Application has
 * zero-or-one AcceptedOffer (Blueprint §1.3) — only one Decision across all
 * of an application's LenderSubmissions can ever be the accepted one, even
 * when a cascade produced several APPROVED/COUNTERED offers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;

  let input;
  try {
    input = acceptOfferInputSchema.parse(await request.json());
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
    include: { acceptedOffer: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.acceptedOffer) {
    return NextResponse.json(
      { error: "This application already has an accepted offer" },
      { status: 409 },
    );
  }

  const decision = await prisma.decision.findFirst({
    where: {
      id: input.decisionId,
      lenderSubmission: { applicationId: application.id },
    },
  });
  if (!decision) {
    return NextResponse.json(
      { error: "Decision not found on this application" },
      { status: 404 },
    );
  }
  if (decision.outcome === "DECLINED") {
    return NextResponse.json(
      { error: "Cannot accept a declined decision" },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const acceptedOffer = await tx.acceptedOffer.create({
      data: { applicationId: application.id, decisionId: decision.id },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "AcceptedOffer",
      entityId: acceptedOffer.id,
      action: "CREATE",
      actorType: "DEALER",
    });

    const status = await recomputeApplicationStatus(tx, application.id);
    return { acceptedOffer, status };
  });

  return NextResponse.json(
    { acceptedOfferId: result.acceptedOffer.id, applicationStatus: result.status },
    { status: 201 },
  );
}
