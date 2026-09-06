import { PrismaClient } from "@prisma/client";
import { seedBaseData } from "./seed";
import { recordAuditEvent } from "../src/lib/audit-log";

const prisma = new PrismaClient();

/**
 * Populates a full sales-demo storyline on top of the base manufacturer/
 * dealer/lender/program/user data (see seedBaseData in ./seed.ts). Unlike
 * seed.ts — a clean slate for local dev/testing — this script exists to
 * make the platform demo-ready: every application status, every decision
 * outcome, all three dealers, all three financing programs (including the
 * rare FICO-routing-rule/BureauPull path), and one honestly-unresolved
 * "needs reconciliation" case are all represented, because a sales demo
 * that only shows manufactured wins isn't credible to a technical buyer.
 *
 * Run this once against a fresh database (after `prisma migrate deploy`)
 * — it is not idempotent the way seed.ts is; running it twice creates a
 * second copy of every application.
 */
async function main() {
  const { manufacturer, dealers, captiveProgram, thirdPartyProgram } = await seedBaseData(prisma);
  const dlr001 = dealers.find((d) => d.code === "DLR-001")!;
  const dlr002 = dealers.find((d) => d.code === "DLR-002")!;
  const dlr003 = dealers.find((d) => d.code === "DLR-003")!;

  // A third lender/program whose own routing rule needs a FICO score before
  // submission — the rare BureauPull exception (Blueprint §1.2/§2.1,
  // updated 2026-09-06), so the demo has a real example of it, not just a
  // description.
  const specialtyLender = await prisma.lender.upsert({
    where: { id: "demo-specialty-lender" },
    update: {},
    create: { id: "demo-specialty-lender", name: "Timberline Finance Partners" },
  });
  const ficoGatedProgram = await prisma.financingProgram.upsert({
    where: { id: "demo-fico-gated-program" },
    update: {},
    create: {
      id: "demo-fico-gated-program",
      manufacturerId: manufacturer.id,
      lenderId: specialtyLender.id,
      name: "Timberline Equipment Advantage",
      type: "THIRD_PARTY",
      minFicoScore: 680,
    },
  });

  async function auditLog(entityType: string, entityId: string, action: string, opts: { actorId?: string; payload?: Record<string, unknown> } = {}) {
    await recordAuditEvent(prisma, {
      manufacturerId: manufacturer.id,
      entityType,
      entityId,
      action,
      actorType: "DEALER",
      actorId: opts.actorId,
      payload: opts.payload,
    });
  }

  async function createBusinessApp(input: {
    dealerId: string;
    legalName: string;
    ein: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    equipmentDescription: string;
    requestedAmount: number;
    ownerFirstName: string;
    ownerLastName: string;
    ownerTitle: string;
    status: "SUBMITTED" | "IN_PROGRESS" | "ACCEPTED" | "FUNDED" | "CLOSED_LOST";
    needsReconciliation?: boolean;
  }) {
    const businessApplicant = await prisma.businessApplicant.create({
      data: {
        manufacturerId: manufacturer.id,
        legalName: input.legalName,
        ein: input.ein,
        addressLine1: input.addressLine1,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
      },
    });
    await auditLog("BusinessApplicant", businessApplicant.id, "CREATE");

    const owner = await prisma.owner.create({
      data: {
        businessApplicantId: businessApplicant.id,
        firstName: input.ownerFirstName,
        lastName: input.ownerLastName,
        title: input.ownerTitle,
        ownershipPercent: 100,
      },
    });

    const application = await prisma.application.create({
      data: {
        manufacturerId: manufacturer.id,
        dealerId: input.dealerId,
        applicantType: "BUSINESS",
        businessApplicantId: businessApplicant.id,
        equipmentDescription: input.equipmentDescription,
        requestedAmount: input.requestedAmount,
        status: input.status,
        needsReconciliation: input.needsReconciliation ?? false,
        submittedAt: new Date(),
      },
    });
    await auditLog("Application", application.id, "SUBMIT");

    await prisma.consentRecord.createMany({
      data: [
        { applicationId: application.id, participantType: "BUSINESS", participantId: businessApplicant.id, purpose: "DATA_SHARING", granted: true },
        { applicationId: application.id, participantType: "BUSINESS", participantId: businessApplicant.id, purpose: "MARKETING", granted: false },
      ],
    });

    const guarantor = await prisma.guarantor.create({
      data: {
        applicationId: application.id,
        ownerId: owner.id,
        firstName: input.ownerFirstName,
        lastName: input.ownerLastName,
        addressLine1: input.addressLine1,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        ssnLast4: String(1000 + Math.floor(Math.random() * 9000)).slice(-4),
        consentCreditPull: true,
        consentDataSharing: true,
        consentRecordedAt: new Date(),
      },
    });
    await auditLog("Guarantor", guarantor.id, "CREATE");
    await prisma.consentRecord.createMany({
      data: [
        { applicationId: application.id, participantType: "GUARANTOR", participantId: guarantor.id, purpose: "CREDIT_PULL", granted: true },
        { applicationId: application.id, participantType: "GUARANTOR", participantId: guarantor.id, purpose: "DATA_SHARING", granted: true },
      ],
    });

    return { application, businessApplicant, owner, guarantor };
  }

  async function createIndividualApp(input: {
    dealerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    equipmentDescription: string;
    requestedAmount: number;
    status: "SUBMITTED" | "IN_PROGRESS" | "ACCEPTED" | "FUNDED" | "CLOSED_LOST";
    needsReconciliation?: boolean;
    coSigner?: { firstName: string; lastName: string };
  }) {
    const individualApplicant = await prisma.individualApplicant.create({
      data: {
        manufacturerId: manufacturer.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        addressLine1: input.addressLine1,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        ssnLast4: String(1000 + Math.floor(Math.random() * 9000)).slice(-4),
      },
    });
    await auditLog("IndividualApplicant", individualApplicant.id, "CREATE");

    const application = await prisma.application.create({
      data: {
        manufacturerId: manufacturer.id,
        dealerId: input.dealerId,
        applicantType: "INDIVIDUAL",
        individualApplicantId: individualApplicant.id,
        equipmentDescription: input.equipmentDescription,
        requestedAmount: input.requestedAmount,
        status: input.status,
        needsReconciliation: input.needsReconciliation ?? false,
        submittedAt: new Date(),
      },
    });
    await auditLog("Application", application.id, "SUBMIT");

    await prisma.consentRecord.createMany({
      data: [
        { applicationId: application.id, participantType: "INDIVIDUAL", participantId: individualApplicant.id, purpose: "CREDIT_PULL", granted: true },
        { applicationId: application.id, participantType: "INDIVIDUAL", participantId: individualApplicant.id, purpose: "DATA_SHARING", granted: true },
        { applicationId: application.id, participantType: "INDIVIDUAL", participantId: individualApplicant.id, purpose: "MARKETING", granted: false },
      ],
    });

    let guarantor = null;
    if (input.coSigner) {
      guarantor = await prisma.guarantor.create({
        data: {
          applicationId: application.id,
          firstName: input.coSigner.firstName,
          lastName: input.coSigner.lastName,
          addressLine1: input.addressLine1,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          ssnLast4: String(1000 + Math.floor(Math.random() * 9000)).slice(-4),
          consentCreditPull: true,
          consentDataSharing: true,
          consentRecordedAt: new Date(),
        },
      });
      await auditLog("Guarantor", guarantor.id, "CREATE");
      await prisma.consentRecord.createMany({
        data: [
          { applicationId: application.id, participantType: "GUARANTOR", participantId: guarantor.id, purpose: "CREDIT_PULL", granted: true },
          { applicationId: application.id, participantType: "GUARANTOR", participantId: guarantor.id, purpose: "DATA_SHARING", granted: true },
        ],
      });
    }

    return { application, individualApplicant, guarantor };
  }

  async function submit(applicationId: string, financingProgramId: string) {
    const submission = await prisma.lenderSubmission.create({
      data: { applicationId, financingProgramId },
    });
    await auditLog("LenderSubmission", submission.id, "CREATE", { payload: { financingProgramId } });
    return submission;
  }

  async function decide(
    submissionId: string,
    outcome: "APPROVED" | "DECLINED" | "COUNTERED",
    reasonCode: string,
    reasonText: string,
    enteredBy: string,
  ) {
    const decision = await prisma.decision.create({
      data: { lenderSubmissionId: submissionId, outcome, reasonCode, reasonText, enteredBy },
    });
    await prisma.lenderSubmission.update({ where: { id: submissionId }, data: { status: "DECISIONED" } });
    await auditLog("Decision", decision.id, "CREATE", { actorId: enteredBy, payload: { outcome, reasonCode } });
    return decision;
  }

  async function accept(applicationId: string, decisionId: string) {
    const acceptedOffer = await prisma.acceptedOffer.create({
      data: { applicationId, decisionId },
    });
    await auditLog("AcceptedOffer", acceptedOffer.id, "CREATE");
    return acceptedOffer;
  }

  async function fund(acceptedOfferId: string, fundedAmount: number) {
    const fundedTransaction = await prisma.fundedTransaction.create({
      data: { acceptedOfferId, fundedAmount },
    });
    await auditLog("FundedTransaction", fundedTransaction.id, "CREATE");
    return fundedTransaction;
  }

  async function pullBureau(input: {
    applicationId: string;
    participantType: "GUARANTOR" | "INDIVIDUAL";
    participantId: string;
    financingProgramId: string;
    bureau: "EQUIFAX" | "EXPERIAN" | "TRANSUNION";
    ficoScore: number;
    pulledBy: string;
  }) {
    const pull = await prisma.bureauPull.create({
      data: {
        applicationId: input.applicationId,
        participantType: input.participantType,
        participantId: input.participantId,
        financingProgramId: input.financingProgramId,
        bureau: input.bureau,
        ficoScore: input.ficoScore,
        pulledBy: input.pulledBy,
      },
    });
    await auditLog("BureauPull", pull.id, "CREATE", {
      payload: { participantType: input.participantType, bureau: input.bureau, financingProgramId: input.financingProgramId },
    });
    return pull;
  }

  // 1. DLR-001, business, funded via the captive program — the clean win.
  {
    const { application } = await createBusinessApp({
      dealerId: dlr001.id,
      legalName: "Cascade Excavation LLC",
      ein: "84-1029384",
      addressLine1: "500 Industrial Way",
      city: "Bend",
      state: "OR",
      postalCode: "97701",
      equipmentDescription: "CAT 336 Excavator",
      requestedAmount: 310000,
      ownerFirstName: "Dana",
      ownerLastName: "Ruiz",
      ownerTitle: "Managing Member",
      status: "FUNDED",
    });
    const sub = await submit(application.id, captiveProgram.id);
    const decision = await decide(sub.id, "APPROVED", "STRONG_FINANCIALS", "3+ years in business, strong D/E ratio, equipment retains high resale value.", "Jordan (Cascade Construction Equipment)");
    const offer = await accept(application.id, decision.id);
    await fund(offer.id, 310000);
  }

  // 2. DLR-001, individual + co-signer, funded via the FICO-gated program —
  // the BureauPull story.
  {
    const { application, individualApplicant } = await createIndividualApp({
      dealerId: dlr001.id,
      firstName: "Marcus",
      lastName: "Webb",
      email: "marcus.webb@example.com",
      phone: "5415550142",
      addressLine1: "812 Riverbend Dr",
      city: "Bend",
      state: "OR",
      postalCode: "97701",
      equipmentDescription: "Compact Track Loader",
      requestedAmount: 58500,
      status: "FUNDED",
      coSigner: { firstName: "Priya", lastName: "Nair" },
    });
    await pullBureau({
      applicationId: application.id,
      participantType: "INDIVIDUAL",
      participantId: individualApplicant.id,
      financingProgramId: ficoGatedProgram.id,
      bureau: "EQUIFAX",
      ficoScore: 712,
      pulledBy: "Jordan (Cascade Construction Equipment)",
    });
    const sub = await submit(application.id, ficoGatedProgram.id);
    const decision = await decide(sub.id, "APPROVED", "SCORE_ABOVE_THRESHOLD", "FICO 712 clears the program's 680 minimum; approved at standard terms.", "Jordan (Cascade Construction Equipment)");
    const offer = await accept(application.id, decision.id);
    await fund(offer.id, 58500);
  }

  // 3. DLR-002, business, cascade — Summit declines, Ridgeline approves —
  // the "cascade doesn't distort approval rate" story made visible.
  {
    const { application } = await createBusinessApp({
      dealerId: dlr002.id,
      legalName: "Northgate Paving & Grading Inc.",
      ein: "91-7734215",
      addressLine1: "2200 Frontage Rd",
      city: "Redmond",
      state: "OR",
      postalCode: "97756",
      equipmentDescription: "Motor Grader",
      requestedAmount: 245000,
      ownerFirstName: "Leon",
      ownerLastName: "Whitfield",
      ownerTitle: "President",
      status: "FUNDED",
    });
    const sub1 = await submit(application.id, thirdPartyProgram.id);
    await decide(sub1.id, "DECLINED", "CREDIT_POLICY", "Outside Summit's current appetite for grading equipment over $200k.", "Alicia (Northgate Heavy Machinery)");
    const sub2 = await submit(application.id, captiveProgram.id);
    const decision2 = await decide(sub2.id, "APPROVED", "STRONG_FINANCIALS", "Approved on Ridgeline's captive terms after Summit's decline.", "Alicia (Northgate Heavy Machinery)");
    const offer = await accept(application.id, decision2.id);
    await fund(offer.id, 245000);
  }

  // 4. DLR-002, individual, in progress — a real pipeline deal, no decision yet.
  {
    const { application } = await createIndividualApp({
      dealerId: dlr002.id,
      firstName: "Sara",
      lastName: "Okafor",
      email: "sara.okafor@example.com",
      phone: "5415550198",
      addressLine1: "44 Juniper Ct",
      city: "Redmond",
      state: "OR",
      postalCode: "97756",
      equipmentDescription: "Skid Steer",
      requestedAmount: 42000,
      status: "IN_PROGRESS",
    });
    await submit(application.id, thirdPartyProgram.id);
  }

  // 5. DLR-002, business, accepted but not yet funded — the in-between state.
  {
    const { application } = await createBusinessApp({
      dealerId: dlr002.id,
      legalName: "Northgate Site Services LLC",
      ein: "88-2201947",
      addressLine1: "760 Quarry Rd",
      city: "Redmond",
      state: "OR",
      postalCode: "97756",
      equipmentDescription: "Wheel Loader",
      requestedAmount: 178000,
      ownerFirstName: "Renee",
      ownerLastName: "Castillo",
      ownerTitle: "Owner",
      status: "ACCEPTED",
    });
    const sub = await submit(application.id, thirdPartyProgram.id);
    const decision = await decide(sub.id, "APPROVED", "STRONG_FINANCIALS", "Approved at standard terms; awaiting funding close.", "Alicia (Northgate Heavy Machinery)");
    await accept(application.id, decision.id);
  }

  // 6. DLR-003, business, closed lost — an honest loss, not a cherry-picked win.
  {
    const { application } = await createBusinessApp({
      dealerId: dlr003.id,
      legalName: "Ironline Demolition Co.",
      ein: "77-5560213",
      addressLine1: "19 Depot St",
      city: "Prineville",
      state: "OR",
      postalCode: "97754",
      equipmentDescription: "Mini Excavator",
      requestedAmount: 95000,
      ownerFirstName: "Tomás",
      ownerLastName: "Herrera",
      ownerTitle: "Owner",
      status: "CLOSED_LOST",
    });
    const sub = await submit(application.id, thirdPartyProgram.id);
    await decide(sub.id, "DECLINED", "DEBT_TO_INCOME", "Debt-to-income ratio outside Summit's guidelines for this equipment class.", "Priya (Ironline Equipment Sales)");
  }

  // 7. DLR-003, individual, needs reconciliation — entered but outcome
  // unconfirmed; the honest "coverage gap" case, not swept under the rug.
  {
    await createIndividualApp({
      dealerId: dlr003.id,
      firstName: "Grace",
      lastName: "Lindqvist",
      email: "grace.lindqvist@example.com",
      phone: "5415550176",
      addressLine1: "305 Ochoco Ave",
      city: "Prineville",
      state: "OR",
      postalCode: "97754",
      equipmentDescription: "Used Backhoe Loader",
      requestedAmount: 51000,
      status: "SUBMITTED",
      needsReconciliation: true,
    });
  }

  // 8. DLR-001, business, countered — a live negotiation, not yet accepted.
  {
    const { application } = await createBusinessApp({
      dealerId: dlr001.id,
      legalName: "Cascade Aggregates Supply",
      ein: "82-9910447",
      addressLine1: "1180 Pine Mill Rd",
      city: "Bend",
      state: "OR",
      postalCode: "97701",
      equipmentDescription: "Tandem-Axle Dump Truck",
      requestedAmount: 132000,
      ownerFirstName: "Angela",
      ownerLastName: "Brooks",
      ownerTitle: "Managing Member",
      status: "IN_PROGRESS",
    });
    const sub = await submit(application.id, captiveProgram.id);
    await decide(sub.id, "COUNTERED", "TERM_ADJUSTMENT", "Approved at a shorter term (48 mo. instead of 60) given the truck's age; awaiting applicant response.", "Jordan (Cascade Construction Equipment)");
  }

  console.log(`Seeded 8 applications across ${dealers.length} dealers and 3 financing programs (captive, third-party, and the FICO-gated Timberline program).`);
  console.log("Statuses represented: SUBMITTED (flagged for reconciliation), IN_PROGRESS (pending + countered), ACCEPTED, FUNDED (x3), CLOSED_LOST.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
