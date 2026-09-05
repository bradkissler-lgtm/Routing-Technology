import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { applicationIntakeSchema } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit-log";

/**
 * Dealer-initiated intake for a commercial equipment financing application
 * (Blueprint §2.1). Creates the BusinessApplicant, its Owners, the
 * Guarantors on this application, per-participant ConsentRecords, and the
 * Application itself in one transaction.
 *
 * Phase 1 explicitly excludes live lender submission at intake time
 * (Blueprint §2.4) — this endpoint only records the request. Submitting to
 * a lender and recording that lender's decision are separate, manual steps
 * (see /api/applications/[applicationId]/submissions and
 * /api/submissions/[submissionId]/decision).
 */
export async function POST(request: NextRequest) {
  let input;
  try {
    input = applicationIntakeSchema.parse(await request.json());
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
      manufacturerId_code: { manufacturerId: manufacturer.id, code: input.dealerCode },
    },
  });

  if (!dealer || !dealer.isActive) {
    return NextResponse.json(
      { error: `Unknown or inactive dealer code "${input.dealerCode}"` },
      { status: 404 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const businessApplicant = await tx.businessApplicant.create({
      data: {
        manufacturerId: manufacturer.id,
        legalName: input.business.legalName,
        ein: input.business.ein,
        addressLine1: input.business.addressLine1,
        city: input.business.city,
        state: input.business.state,
        postalCode: input.business.postalCode,
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "BusinessApplicant",
      entityId: businessApplicant.id,
      action: "CREATE",
      actorType: "DEALER",
    });

    const owners = [];
    for (const ownerInput of input.owners) {
      const owner = await tx.owner.create({
        data: {
          businessApplicantId: businessApplicant.id,
          firstName: ownerInput.firstName,
          lastName: ownerInput.lastName,
          title: ownerInput.title,
          ownershipPercent: ownerInput.ownershipPercent,
        },
      });
      owners.push(owner);
    }

    const application = await tx.application.create({
      data: {
        manufacturerId: manufacturer.id,
        dealerId: dealer.id,
        applicantType: "BUSINESS",
        businessApplicantId: businessApplicant.id,
        equipmentDescription: input.equipment.description,
        requestedAmount: input.equipment.requestedAmount,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId: manufacturer.id,
      entityType: "Application",
      entityId: application.id,
      action: "SUBMIT",
      actorType: "DEALER",
    });

    // Business-level consent record (Blueprint §2.1: this covers the
    // business's own data use — it does NOT cover any guarantor below).
    await tx.consentRecord.create({
      data: {
        applicationId: application.id,
        participantType: "BUSINESS",
        participantId: businessApplicant.id,
        purpose: "DATA_SHARING",
        granted: input.business.consent.dataSharing,
      },
    });
    await tx.consentRecord.create({
      data: {
        applicationId: application.id,
        participantType: "BUSINESS",
        participantId: businessApplicant.id,
        purpose: "MARKETING",
        granted: input.business.consent.marketing,
      },
    });

    for (const guarantorInput of input.guarantors) {
      const linkedOwner =
        guarantorInput.ownerIndex !== undefined ? owners[guarantorInput.ownerIndex] : undefined;

      const guarantor = await tx.guarantor.create({
        data: {
          applicationId: application.id,
          ownerId: linkedOwner?.id,
          firstName: guarantorInput.firstName,
          lastName: guarantorInput.lastName,
          addressLine1: guarantorInput.addressLine1,
          city: guarantorInput.city,
          state: guarantorInput.state,
          postalCode: guarantorInput.postalCode,
          ssnLast4: guarantorInput.ssnLast4,
          consentCreditPull: guarantorInput.consent.creditPull,
          consentDataSharing: guarantorInput.consent.dataSharing,
          consentRecordedAt: new Date(),
        },
      });

      await recordAuditEvent(tx, {
        manufacturerId: manufacturer.id,
        entityType: "Guarantor",
        entityId: guarantor.id,
        action: "CREATE",
        actorType: "DEALER",
      });

      // Each guarantor's own authorization — distinct from the business's
      // consent above, per participant, per purpose (Blueprint §2.1).
      await tx.consentRecord.create({
        data: {
          applicationId: application.id,
          participantType: "GUARANTOR",
          participantId: guarantor.id,
          purpose: "CREDIT_PULL",
          granted: guarantorInput.consent.creditPull,
        },
      });
      await tx.consentRecord.create({
        data: {
          applicationId: application.id,
          participantType: "GUARANTOR",
          participantId: guarantor.id,
          purpose: "DATA_SHARING",
          granted: guarantorInput.consent.dataSharing,
        },
      });
    }

    return application;
  });

  return NextResponse.json({ applicationId: result.id, status: result.status }, { status: 201 });
}
