import { describe, expect, it } from "vitest";
import { evaluateApplication } from "../decision-engine";

describe("evaluateApplication (stub decision engine)", () => {
  it("approves when the requested amount is within the income band ceiling", () => {
    const result = evaluateApplication({
      requestedAmount: 5_000,
      incomeBand: "UNDER_50K",
    });

    expect(result.outcome).toBe("APPROVED");
    expect(result.reasonCode).toBe("STUB_WITHIN_CEILING");
    expect(result.termsJson).not.toBeNull();
  });

  it("declines when the requested amount exceeds the income band ceiling", () => {
    const result = evaluateApplication({
      requestedAmount: 50_000,
      incomeBand: "UNDER_50K",
    });

    expect(result.outcome).toBe("DECLINED");
    expect(result.reasonCode).toBe("STUB_OVER_CEILING");
    expect(result.termsJson).toBeNull();
  });

  it("counters to manual review when no income band is on file", () => {
    const result = evaluateApplication({ requestedAmount: 5_000 });

    expect(result.outcome).toBe("COUNTERED");
    expect(result.reasonCode).toBe("STUB_INCOME_UNKNOWN");
  });

  it("always returns a human-readable reason, never a bare score", () => {
    const result = evaluateApplication({
      requestedAmount: 5_000,
      incomeBand: "OVER_200K",
    });

    expect(result.reasonText.length).toBeGreaterThan(0);
  });
});
