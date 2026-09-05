import { z } from "zod";

// Shared validation for the business-applicant intake flow (Phase 1 —
// commercial equipment financing). Individual/consumer-mode intake is a
// Phase 2 item; the schema supports IndividualApplicant already but no
// intake path exists for it yet. Keep this in sync with
// prisma/schema.prisma's BusinessApplicant / Owner / Guarantor / Application
// fields.
//
// Consent is per-participant, per-purpose (Blueprint §2.1): the business's
// consent does not cover an individual guarantor's own credit-pull
// authorization — each guarantor must separately authorize their own pull.

const ownerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().optional(),
  ownershipPercent: z.number().min(0).max(100).optional(),
});

const guarantorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "Use a two-letter state code").toUpperCase(),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  ssnLast4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits of the SSN"),
  ownerIndex: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Index into the owners array, if this guarantor is also an owner — never assumed automatically."),
  consent: z.object({
    creditPull: z.literal(true, {
      message: "Each guarantor must individually authorize their own credit pull",
    }),
    dataSharing: z.boolean(),
  }),
});

export const applicationIntakeSchema = z.object({
  dealerCode: z.string().min(1, "Dealer code is required"),
  business: z.object({
    legalName: z.string().min(1, "Business legal name is required"),
    ein: z.string().optional(),
    addressLine1: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().length(2, "Use a two-letter state code").toUpperCase(),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
    consent: z.object({
      dataSharing: z.boolean(),
      marketing: z.boolean(),
    }),
  }),
  owners: z.array(ownerSchema).min(1, "At least one owner is required"),
  guarantors: z.array(guarantorSchema).min(1, "At least one guarantor is required"),
  equipment: z.object({
    description: z.string().min(1, "Equipment description is required"),
    requestedAmount: z
      .number()
      .positive("Requested amount must be greater than zero")
      .max(5_000_000, "Requested amount exceeds the maximum allowed"),
  }),
});

export type ApplicationIntakeInput = z.infer<typeof applicationIntakeSchema>;

// Logging a lender submission (Blueprint §2.1 — manual in Phase 1, no live
// lender API).
export const lenderSubmissionInputSchema = z.object({
  financingProgramId: z.string().min(1),
});

// Recording a decision against an existing LenderSubmission (manual entry —
// Phase 1 has no live bureau pull or decisioning API). A reason is always
// required, never optional, so every decision stays explainable
// (FCRA/ECOA adverse-action expectations — carried forward from the
// original build prompt's adaptive-intelligence guidance).
export const decisionInputSchema = z.object({
  outcome: z.enum(["APPROVED", "DECLINED", "COUNTERED"]),
  reasonCode: z.string().min(1, "A reason code is required"),
  reasonText: z.string().min(1, "A human-readable reason is required"),
  enteredBy: z.string().min(1, "Record who entered this decision"),
  termsJson: z.record(z.string(), z.unknown()).optional(),
});

// Accepting an offer (marks the winning Decision as the AcceptedOffer).
export const acceptOfferInputSchema = z.object({
  decisionId: z.string().min(1),
});

// Confirming funding on an accepted offer.
export const fundedTransactionInputSchema = z.object({
  fundedAmount: z.number().positive("Funded amount must be greater than zero"),
});
