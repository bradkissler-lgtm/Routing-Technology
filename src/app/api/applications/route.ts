import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { applicationIntakeSchema, type ApplicationIntakeInput } from "@/lib/validation";
import { recordAuditEvent } from "@/lib/audit-log";
import type { Prisma } from "@prisma/client";

/**
 * Dealer-initiated intake for a financing application — commercial
 * (business applicant) or consumer (individual applicant); both ship
 * together in V1 (Blueprint §2.1, updated 2026-09-06). Creates the
 * applicant record(s), any owners/guarantor, per-participant
 * ConsentRecords, and the Application itself in one transaction.
 *
 * Phase 1 explicitly excludes live lender submission at intake time
 * (Blueprint §2.4) — this endpoint only records the request. Submitting to
 * a lender and recording that lender's decision are separate, manual steps
 * (see /api/applications/[applicationId]/submissions and
 * /api/submissions/[submissionId]/decision).
 */
export async function POST(request: NextRequest) {
  let input: ApplicationIntakeInput;
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

  const result =
    input.applicantType === "BUSINESS"
      ? await createBusinessApplication(manufacturer.id, dealer.id, input)
      : await createIndividualApplication(manufacturer.id, dealer.id, input);

  return NextResponse.json({ applicationId: result.id, status: result.status }, { status: 201 });
}

async function createBusinessApplication(
  manufacturerId: string,
  dealerId: string,
  input: Extract<ApplicationIntakeInput, { applicantType: "BUSINESS" }>,
) {
  return prisma.$transaction(async (tx) => {
    const businessApplicant = await tx.businessApplicant.create({
      data: {
        manufacturerId,
        legalName: input.business.legalName,
        ein: input.business.ein,
        addressLine1: input.business.addressLine1,
        city: input.business.city,
        state: input.business.state,
        postalCode: input.business.postalCode,
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId,
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
        manufacturerId,
        dealerId,
        applicantType: "BUSINESS",
        businessApplicantId: businessApplicant.id,
        equipmentDescription: input.equipment.description,
        requestedAmount: input.equipment.requestedAmount,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId,
      entityType: "Application",
      entityId: application.id,
      action: "SUBMIT",
      actorType: "DEALER",
    });

    // Business-level consent record (Blueprint §2.1: this covers the
    // business's own data use — it does NOT cover any guarantor below, and
    // a business is never itself credit-pulled, so there is no CREDIT_PULL
    // purpose recorded for it).
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
      await createGuarantor(tx, manufacturerId, application.id, guarantorInput, owners);
    }

    return application;
  });
}

async function createIndividualApplication(
  manufacturerId: string,
  dealerId: string,
  input: Extract<ApplicationIntakeInput, { applicantType: "INDIVIDUAL" }>,
) {
  return prisma.$transaction(async (tx) => {
    const individualApplicant = await tx.individualApplicant.create({
      data: {
        manufacturerId,
        firstName: input.individual.firstName,
        lastName: input.individual.lastName,
        email: input.individual.email,
        phone: input.individual.phone,
        addressLine1: input.individual.addressLine1,
        city: input.individual.city,
        state: input.individual.state,
        postalCode: input.individual.postalCode,
        ssnLast4: input.individual.ssnLast4,
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId,
      entityType: "IndividualApplicant",
      entityId: individualApplicant.id,
      action: "CREATE",
      actorType: "DEALER",
    });

    const application = await tx.application.create({
      data: {
        manufacturerId,
        dealerId,
        applicantType: "INDIVIDUAL",
        individualApplicantId: individualApplicant.id,
        equipmentDescription: input.equipment.description,
        requestedAmount: input.equipment.requestedAmount,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    await recordAuditEvent(tx, {
      manufacturerId,
      entityType: "Application",
      entityId: application.id,
      action: "SUBMIT",
      actorType: "DEALER",
    });

    // Unlike a business, an individual applicant IS credit-pulled directly
    // — their own consent includes CREDIT_PULL, the same as a guarantor's.
    await tx.consentRecord.create({
      data: {
        applicationId: application.id,
        participantType: "INDIVIDUAL",
        participantId: individualApplicant.id,
        purpose: "CREDIT_PULL",
        granted: input.individual.consent.creditPull,
      },
    });
    await tx.consentRecord.create({
      data: {
        applicationId: application.id,
        participantType: "INDIVIDUAL",
        participantId: individualApplicant.id,
        purpose: "DATA_SHARING",
        granted: input.individual.consent.dataSharing,
      },
    });
    await tx.consentRecord.create({
      data: {
        applicationId: application.id,
        participantType: "INDIVIDUAL",
        participantId: individualApplicant.id,
        purpose: "MARKETING",
        granted: input.individual.consent.marketing,
      },
    });

    if (input.guarantor) {
      await createGuarantor(tx, manufacturerId, application.id, input.guarantor, []);
    }

    return application;
  });
}

async function createGuarantor(
  tx: Prisma.TransactionClient,
  manufacturerId: string,
  applicationId: string,
  guarantorInput: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    ssnLast4: string;
    ownerIndex?: number;
    consent: { creditPull: true; dataSharing: boolean };
  },
  owners: { id: string }[],
) {
  const linkedOwner =
    guarantorInput.ownerIndex !== undefined ? owners[guarantorInput.ownerIndex] : undefined;

  const guarantor = await tx.guarantor.create({
    data: {
      applicationId,
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
    manufacturerId,
    entityType: "Guarantor",
    entityId: guarantor.id,
    action: "CREATE",
    actorType: "DEALER",
  });

  // Each guarantor's own authorization — distinct from the applicant's
  // consent, per participant, per purpose (Blueprint §2.1).
  await tx.consentRecord.create({
    data: {
      applicationId,
      participantType: "GUARANTOR",
      participantId: guarantor.id,
      purpose: "CREDIT_PULL",
      granted: guarantorInput.consent.creditPull,
    },
  });
  await tx.consentRecord.create({
    data: {
      applicationId,
      participantType: "GUARANTOR",
      participantId: guarantor.id,
      purpose: "DATA_SHARING",
      granted: guarantorInput.consent.dataSharing,
    },
  });

  return guarantor;
}
