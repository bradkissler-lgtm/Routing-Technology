import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { creditApplicationInputSchema } from "@/lib/validation";
import { evaluateApplication } from "@/lib/decision-engine";
import { recordAuditEvent } from "@/lib/audit-log";

/**
 * Dealer point-of-sale submission endpoint. This is the one API surface a
 * dealer's DMS should call directly instead of using the hosted /apply form
 * (see /docs/architecture.md, "Front-end capture"). Keep this handler on the
 * fast, transactional path — no analytics or reporting queries here.
 */
export async function POST(request: NextRequest) {
  let input;
  try {
    input = creditApplicationInputSchema.parse(await request.json());
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

  const dealer = await prisma.dealer.findUnique({
    where: {
      manufacturerId_code: {
        manufacturerId: manufacturer.id,
        code: input.dealerCode,
      },
    },
  });

  if (!dealer || !dealer.isActive) {
    return NextResponse.json(
      { error: `Unknown or inactive dealer code "${input.dealerCode}"` },
      { status: 404 },
    );
  }

  const lenderProgram = await prisma.lenderProgram.findFirst({
    where: { manufacturerId: manufacturer.id, isActive: true },
  });

  if (!lenderProgram) {
    return NextResponse.json(
      { error: "No active lender program configured for this manufacturer" },
      { status: 500 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const endBuyer = await tx.endBuyer.upsert({
      where: {
        manufacturerId_email: {
          manufacturerId: manufacturer.id,
          email: input.buyer.email,
        },
      },
      update: {
        firstName: input.buyer.firstName,
        lastName: input.buyer.lastName,
        phone: input.buyer.phone,
        addressLine1: input.buyer.addressLine1,
        city: input.buyer.city,
        state: input.buyer.state,
        postalCode: input.buyer.postalCode,
        ssnLast4: input.buyer.ssnLast4,
        incomeBand: input.buyer.incomeBand,
        referralSource: input.buyer.referralSource,
        consentCreditPull: input.consent.creditPull,
        consentDataSharing: input.consent.dataSharing,
        consentMarketing: input.consent.marketing,
        consentRecordedAt: new Date(),
      },
      create: {
        manufacturerId: manufacturer.id,
        firstName: input.buyer.firstName,
        lastName: input.buyer.lastName,
        email: input.buyer.email,
        phone: input.buyer.phone,
        addressLine1: input.buyer.addressLine1,
        city: input.buyer.city,
        state: input.buyer.state,
        postalCode: input.buyer.postalCode,
        ssnLast4: input.buyer.ssnLast4,
        incomeBand: input.buyer.incomeBand,
        referralSource: input.buyer.referralSource,
        consentCreditPull: input.consent.creditPull,
        consentDataSharing: input.consent.dataSharing,
        consentMarketing: input.consent.marketing,
        consentRecordedAt: new Date(),
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "EndBuyer",
      entityId: endBuyer.id,
      action: "UPSERT",
      actorType: "BUYER",
    });

    const application = await tx.creditApplication.create({
      data: {
        manufacturerId: manufacturer.id,
        dealerId: dealer.id,
        endBuyerId: endBuyer.id,
        lenderProgramId: lenderProgram.id,
        productDescription: input.application.productDescription,
        requestedAmount: input.application.requestedAmount,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "CreditApplication",
      entityId: application.id,
      action: "SUBMIT",
      actorType: "BUYER",
    });

    const decisionResult = evaluateApplication({
      requestedAmount: input.application.requestedAmount,
      incomeBand: input.buyer.incomeBand,
    });

    const decision = await tx.decision.create({
      data: {
        creditApplicationId: application.id,
        lenderProgramId: lenderProgram.id,
        outcome: decisionResult.outcome,
        reasonCode: decisionResult.reasonCode,
        reasonText: decisionResult.reasonText,
        termsJson: (decisionResult.termsJson ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });

    const updatedApplication = await tx.creditApplication.update({
      where: { id: application.id },
      data: { status: decisionResult.outcome },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "CreditApplication",
      entityId: application.id,
      action: "DECISION",
      actorType: "SYSTEM",
      payload: { reasonCode: decisionResult.reasonCode },
    });

    return { application: updatedApplication, decision };
  });

  return NextResponse.json(
    {
      applicationId: result.application.id,
      status: result.application.status,
      decision: {
        outcome: result.decision.outcome,
        reasonText: result.decision.reasonText,
        terms: result.decision.termsJson,
      },
    },
    { status: 201 },
  );
}
