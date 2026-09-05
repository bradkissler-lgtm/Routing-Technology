import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { fundedTransactionInputSchema } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit-log";
import { recomputeApplicationStatus } from "@/lib/lifecycle";

/**
 * Confirms funding closed on an application's AcceptedOffer — the real
 * "done" state for approval-rate and volume reporting (Blueprint §1.3).
 * An approved-and-accepted deal that never funds should NOT count as a
 * success in reporting; this is the event that makes it one.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;

  let input;
  try {
    input = fundedTransactionInputSchema.parse(await request.json());
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
    include: { acceptedOffer: { include: { fundedTransaction: true } } },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (!application.acceptedOffer) {
    return NextResponse.json(
      { error: "Application has no accepted offer to fund" },
      { status: 400 },
    );
  }
  if (application.acceptedOffer.fundedTransaction) {
    return NextResponse.json(
      { error: "This application is already funded" },
      { status: 409 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const fundedTransaction = await tx.fundedTransaction.create({
      data: {
        acceptedOfferId: application.acceptedOffer!.id,
        fundedAmount: input.fundedAmount,
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "FundedTransaction",
      entityId: fundedTransaction.id,
      action: "CREATE",
      actorType: "MANUFACTURER",
    });

    const status = await recomputeApplicationStatus(tx, application.id);
    return { fundedTransaction, status };
  });

  return NextResponse.json(
    { fundedTransactionId: result.fundedTransaction.id, applicationStatus: result.status },
    { status: 201 },
  );
}
