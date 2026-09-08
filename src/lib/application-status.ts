/**
 * Derives an Application's reporting status from its lifecycle chain
 * (Blueprint §1.3): LenderSubmission -> Decision -> AcceptedOffer ->
 * FundedTransaction. Approval rate, volume, and time-to-decision must be
 * computed off THIS derived status, never by counting individual
 * LenderSubmission decisions — a cascade otherwise distorts the numbers
 * (declining 2 lenders before a 3rd approves must read as one approval,
 * not two declines and an approval).
 *
 * Pure function, no DB access, so it's unit-testable in isolation from the
 * lifecycle-mutation code that calls it.
 */

export type SubmissionOutcome = "APPROVED" | "DECLINED" | "COUNTERED" | null;

export interface LifecycleSnapshot {
  submissions: { decisionOutcome: SubmissionOutcome }[];
  hasAcceptedOffer: boolean;
  hasFundedTransaction: boolean;
}

export type DerivedStatus =
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "ACCEPTED"
  | "FUNDED"
  | "CLOSED_LOST";

export function deriveApplicationStatus(snapshot: LifecycleSnapshot): DerivedStatus {
  if (snapshot.hasFundedTransaction) return "FUNDED";
  if (snapshot.hasAcceptedOffer) return "ACCEPTED";

  if (snapshot.submissions.length === 0) return "SUBMITTED";

  const unresolved = snapshot.submissions.some((s) => s.decisionOutcome === null);
  if (unresolved) return "IN_PROGRESS";

  const allDeclined = snapshot.submissions.every(
    (s) => s.decisionOutcome === "DECLINED",
  );
  if (allDeclined) return "CLOSED_LOST";

  // At least one COUNTERED or APPROVED decision exists but nothing has been
  // accepted yet — still open, waiting on the applicant/dealer to act.
  return "IN_PROGRESS";
}
