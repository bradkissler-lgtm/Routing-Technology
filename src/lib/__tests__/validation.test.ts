import { describe, expect, it } from "vitest";
import { applicationIntakeSchema } from "../validation";

const validBusinessInput = {
  applicantType: "BUSINESS" as const,
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

const validIndividualInput = {
  applicantType: "INDIVIDUAL" as const,
  dealerCode: "DLR-001",
  individual: {
    firstName: "Jamie",
    lastName: "Rivera",
    email: "jamie@example.com",
    phone: "5551234567",
    addressLine1: "123 Main St",
    city: "Bend",
    state: "or",
    postalCode: "97701",
    ssnLast4: "5678",
    consent: { creditPull: true, dataSharing: true, marketing: false },
  },
  equipment: { description: "Compact Utility Tractor", requestedAmount: 32_000 },
};

describe("applicationIntakeSchema — business path", () => {
  it("accepts a well-formed submission and uppercases state codes", () => {
    const result = applicationIntakeSchema.parse(validBusinessInput);
    if (result.applicantType !== "BUSINESS") throw new Error("expected BUSINESS");
    expect(result.business.state).toBe("OR");
    expect(result.guarantors[0].state).toBe("OR");
  });

  it("requires at least one owner", () => {
    const invalid = { ...validBusinessInput, owners: [] };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("requires at least one guarantor", () => {
    const invalid = { ...validBusinessInput, guarantors: [] };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("rejects a guarantor who has not authorized their own credit pull, even if the business consented to data sharing", () => {
    const invalid = {
      ...validBusinessInput,
      guarantors: [
        { ...validBusinessInput.guarantors[0], consent: { creditPull: false, dataSharing: true } },
      ],
    };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("rejects a non-positive requested amount", () => {
    const invalid = {
      ...validBusinessInput,
      equipment: { ...validBusinessInput.equipment, requestedAmount: 0 },
    };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });
});

describe("applicationIntakeSchema — individual (consumer) path", () => {
  it("accepts a well-formed submission with no co-signer", () => {
    const result = applicationIntakeSchema.parse(validIndividualInput);
    if (result.applicantType !== "INDIVIDUAL") throw new Error("expected INDIVIDUAL");
    expect(result.individual.state).toBe("OR");
    expect(result.guarantor).toBeUndefined();
  });

  it("accepts an optional co-signer using the same guarantor shape", () => {
    const withCoSigner = {
      ...validIndividualInput,
      guarantor: {
        firstName: "Morgan",
        lastName: "Lee",
        addressLine1: "9 Oak St",
        city: "Bend",
        state: "or",
        postalCode: "97701",
        ssnLast4: "4321",
        consent: { creditPull: true, dataSharing: true },
      },
    };
    const result = applicationIntakeSchema.parse(withCoSigner);
    if (result.applicantType !== "INDIVIDUAL") throw new Error("expected INDIVIDUAL");
    expect(result.guarantor?.state).toBe("OR");
  });

  it("rejects an applicant who has not authorized their own credit pull", () => {
    const invalid = {
      ...validIndividualInput,
      individual: {
        ...validIndividualInput.individual,
        consent: { creditPull: false, dataSharing: true, marketing: false },
      },
    };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("rejects a co-signer who has not authorized their own credit pull", () => {
    const invalid = {
      ...validIndividualInput,
      guarantor: {
        firstName: "Morgan",
        lastName: "Lee",
        addressLine1: "9 Oak St",
        city: "Bend",
        state: "or",
        postalCode: "97701",
        ssnLast4: "4321",
        consent: { creditPull: false, dataSharing: true },
      },
    };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });

  it("rejects a non-positive requested amount", () => {
    const invalid = {
      ...validIndividualInput,
      equipment: { ...validIndividualInput.equipment, requestedAmount: 0 },
    };
    expect(() => applicationIntakeSchema.parse(invalid)).toThrow();
  });
});
