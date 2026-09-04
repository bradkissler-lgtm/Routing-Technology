/**
 * STUB DECISION ENGINE — replace before any real money moves.
 *
 * This simulates a single lender's response so the capture → decision →
 * status flow can be demonstrated end-to-end without a live lender
 * integration. It is deliberately simple, deterministic, and rule-based
 * rather than a black box, because every real decision this eventually
 * stands in for has to carry a human-readable reason (FCRA/ECOA adverse
 * action requirements — see /docs/architecture.md, "Adaptive intelligence").
 *
 * To integrate a real lender: implement the same DecisionInput ->
 * DecisionResult contract against that lender's API, and swap the call site
 * in src/app/api/applications/route.ts. Do not grow this stub into the real
 * integration in place — replace it.
 */

export type DecisionOutcome = "APPROVED" | "DECLINED" | "COUNTERED";

export interface DecisionInput {
  requestedAmount: number;
  incomeBand?: string | null;
}

export interface DecisionResult {
  outcome: DecisionOutcome;
  reasonCode: string;
  reasonText: string;
  termsJson: Record<string, unknown> | null;
}

const INCOME_BAND_CEILING: Record<string, number> = {
  UNDER_50K: 10_000,
  "50K_100K": 35_000,
  "100K_200K": 75_000,
  OVER_200K: 1_000_000,
};

export function evaluateApplication(input: DecisionInput): DecisionResult {
  const ceiling = input.incomeBand
    ? INCOME_BAND_CEILING[input.incomeBand]
    : undefined;

  if (ceiling === undefined) {
    return {
      outcome: "COUNTERED",
      reasonCode: "STUB_INCOME_UNKNOWN",
      reasonText:
        "No income band on file — routed to manual review in this stub engine.",
      termsJson: null,
    };
  }

  if (input.requestedAmount <= ceiling) {
    return {
      outcome: "APPROVED",
      reasonCode: "STUB_WITHIN_CEILING",
      reasonText: `Requested amount is within the stub approval ceiling for the ${input.incomeBand} income band.`,
      termsJson: {
        apr: 9.99,
        termMonths: 60,
        note: "Simulated terms from the stub decision engine — not a real offer.",
      },
    };
  }

  return {
    outcome: "DECLINED",
    reasonCode: "STUB_OVER_CEILING",
    reasonText: `Requested amount exceeds the stub approval ceiling for the ${input.incomeBand} income band.`,
    termsJson: null,
  };
}
