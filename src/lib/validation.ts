import { z } from "zod";

// Shared validation for the buyer-facing credit application form and its
// API route. Keep this in sync with prisma/schema.prisma's EndBuyer and
// CreditApplication fields.

export const creditApplicationInputSchema = z.object({
  dealerCode: z.string().min(1, "Dealer code is required"),
  buyer: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .min(10, "Enter a valid phone number")
      .max(20, "Enter a valid phone number"),
    addressLine1: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z
      .string()
      .length(2, "Use a two-letter state code")
      .toUpperCase(),
    postalCode: z
      .string()
      .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
    ssnLast4: z
      .string()
      .regex(/^\d{4}$/, "Enter the last 4 digits of the SSN"),
    incomeBand: z.string().optional(),
    referralSource: z.string().optional(),
  }),
  application: z.object({
    productDescription: z.string().min(1, "Product description is required"),
    requestedAmount: z
      .number()
      .positive("Requested amount must be greater than zero")
      .max(1_000_000, "Requested amount exceeds the maximum allowed"),
  }),
  consent: z.object({
    creditPull: z.literal(true, {
      message: "Buyer must authorize the credit pull to submit",
    }),
    dataSharing: z.boolean(),
    marketing: z.boolean(),
  }),
});

export type CreditApplicationInput = z.infer<
  typeof creditApplicationInputSchema
>;
