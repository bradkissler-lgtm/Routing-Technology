import { describe, expect, it } from "vitest";
import { creditApplicationInputSchema } from "../validation";

const validInput = {
  dealerCode: "DLR-001",
  buyer: {
    firstName: "Jamie",
    lastName: "Rivera",
    email: "jamie@example.com",
    phone: "5551234567",
    addressLine1: "123 Main St",
    city: "Springfield",
    state: "il",
    postalCode: "62701",
    ssnLast4: "1234",
  },
  application: {
    productDescription: "Model X Utility Trailer",
    requestedAmount: 12_500,
  },
  consent: {
    creditPull: true,
    dataSharing: true,
    marketing: false,
  },
};

describe("creditApplicationInputSchema", () => {
  it("accepts a well-formed submission and uppercases the state code", () => {
    const result = creditApplicationInputSchema.parse(validInput);
    expect(result.buyer.state).toBe("IL");
  });

  it("rejects a submission without credit-pull consent", () => {
    const invalid = {
      ...validInput,
      consent: { ...validInput.consent, creditPull: false },
    };

    expect(() => creditApplicationInputSchema.parse(invalid)).toThrow();
  });

  it("rejects a malformed ZIP code", () => {
    const invalid = {
      ...validInput,
      buyer: { ...validInput.buyer, postalCode: "abc" },
    };

    expect(() => creditApplicationInputSchema.parse(invalid)).toThrow();
  });

  it("rejects a non-positive requested amount", () => {
    const invalid = {
      ...validInput,
      application: { ...validInput.application, requestedAmount: 0 },
    };

    expect(() => creditApplicationInputSchema.parse(invalid)).toThrow();
  });
});
