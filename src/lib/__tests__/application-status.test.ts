import { describe, expect, it } from "vitest";
import { deriveApplicationStatus } from "../application-status";

describe("deriveApplicationStatus", () => {
  it("is SUBMITTED with no lender submissions yet", () => {
    const status = deriveApplicationStatus({
      submissions: [],
      hasAcceptedOffer: false,
      hasFundedTransaction: false,
    });
    expect(status).toBe("SUBMITTED");
  });

  it("is IN_PROGRESS while any submission has no decision yet", () => {
    const status = deriveApplicationStatus({
      submissions: [{ decisionOutcome: "DECLINED" }, { decisionOutcome: null }],
      hasAcceptedOffer: false,
      hasFundedTransaction: false,
    });
    expect(status).toBe("IN_PROGRESS");
  });

  it("is CLOSED_LOST only when every submission declined and nothing accepted", () => {
    const status = deriveApplicationStatus({
      submissions: [{ decisionOutcome: "DECLINED" }, { decisionOutcome: "DECLINED" }],
      hasAcceptedOffer: false,
      hasFundedTransaction: false,
    });
    expect(status).toBe("CLOSED_LOST");
  });

  it("a cascade of 2 declines + 1 approval reads as one open application, not a decline", () => {
    // This is the exact distortion the blueprint calls out: counting
    // individual submission decisions instead of the application-level
    // outcome would show 2 declines and 1 approval instead of one deal
    // still in progress toward acceptance.
    const status = deriveApplicationStatus({
      submissions: [
        { decisionOutcome: "DECLINED" },
        { decisionOutcome: "DECLINED" },
        { decisionOutcome: "APPROVED" },
      ],
      hasAcceptedOffer: false,
      hasFundedTransaction: false,
    });
    expect(status).toBe("IN_PROGRESS");
    expect(status).not.toBe("CLOSED_LOST");
  });

  it("is ACCEPTED once an offer is accepted, regardless of other declined submissions", () => {
    const status = deriveApplicationStatus({
      submissions: [{ decisionOutcome: "DECLINED" }, { decisionOutcome: "APPROVED" }],
      hasAcceptedOffer: true,
      hasFundedTransaction: false,
    });
    expect(status).toBe("ACCEPTED");
  });

  it("is FUNDED once a funded transaction exists", () => {
    const status = deriveApplicationStatus({
      submissions: [{ decisionOutcome: "APPROVED" }],
      hasAcceptedOffer: true,
      hasFundedTransaction: true,
    });
    expect(status).toBe("FUNDED");
  });
});
