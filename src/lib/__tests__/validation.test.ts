import { describe, expect, it } from "vitest";
import { applicationIntakeSchema } from "../validation";

const validInput = {
  dealerCode: "DLR-001",
  business: {
    legalName: "Cascade Excavation LLC",
    ein: "12-3456789",
    addressLine1: "500 Industrial Way",
    city: "Bend",
    state: "or",
    postalCode: "97701",
    consent: { dataSharing: true, marketing: false },
  },
  owners: [{ firstName: "Dana", lastName: "Ruiz", title: "Managing Member", ownershipPercent: 100 }],
  guarantors: [
    {
      firstName: "Dana",
      lastName: "Ruiz",
      addressLine1: "12 River Rd",
      city: "Bend",
      state: "or",
      postalCode: "97701",
      ssnLast4: "1234",
      ownerIndex: 0,
      consent: { creditPull: true, dataSharing: true },
    },
  ],
  equipment: { description: "CAT 320 Excavator", requestedAmount: 185_000 },
};

describe("applicationIntakeSchema", () => {
  it("accepts a well-formed submission and uppercases state codes", () => {
    const result = applicationIntakeSchema.parse(validInput);
    expect(result.business.state).toBe("OR");
    expect(result.guarantors[0].state).toBe("OR");
  });

  it("requires at least one owner", () => {
    const invalid = { ...validInput, owners: [] };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("requires at least one guarantor", () => {
    const invalid = { ...validInput, guarantors: [] };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("rejects a guarantor who has not authorized their own credit pull, even if the business consented to data sharing", () => {
    const invalid = {
      ...validInput,
      guarantors: [
        { ...validInput.guarantors[0], consent: { creditPull: false, dataSharing: true } },
      ],
    };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("rejects a non-positive requested amount", () => {
    const invalid = {
      ...validInput,
      equipment: { ...validInput.equipment, requestedAmount: 0 },
    };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });
});
