"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  label: string;
}

/**
 * Manual lifecycle controls for one Application — log a lender submission,
 * record a decision, accept an offer, confirm funding. Every action here is
 * a stand-in for what would otherwise be a live lender API call (Blueprint
 * §2.4 — Phase 1 has no automated decisioning). `enteredBy` is a free-text
 * field for now because there's no auth yet; it exists so the audit trail
 * still records who made each entry.
 */
export function ApplicationOpsPanel({
  applicationId,
  availablePrograms,
  pendingSubmissions,
  acceptableDecisions,
  hasAcceptedOffer,
  hasFundedTransaction,
}: {
  applicationId: string;
  availablePrograms: Option[];
  pendingSubmissions: Option[];
  acceptableDecisions: Option[];
  hasAcceptedOffer: boolean;
  hasFundedTransaction: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [programId, setProgramId] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [outcome, setOutcome] = useState<"APPROVED" | "DECLINED" | "COUNTERED">("APPROVED");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [enteredBy, setEnteredBy] = useState("");
  const [decisionId, setDecisionId] = useState("");
  const [fundedAmount, setFundedAmount] = useState("");

  async function post(path: string, body: unknown) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {availablePrograms.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Log a lender submission</h2>
          <div className="mt-2 flex gap-2">
            <select
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="">Select a lender / program…</option>
              {availablePrograms.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <button
              disabled={busy || !programId}
              onClick={() => post(`/api/applications/${applicationId}/submissions`, { financingProgramId: programId })}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Log submission
            </button>
          </div>
        </section>
      )}

      {pendingSubmissions.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Record a decision</h2>
          <div className="mt-2 flex flex-col gap-2">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
            >
              <option value="">Which submission?…</option>
              {pendingSubmissions.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as typeof outcome)}
            >
              <option value="APPROVED">Approved</option>
              <option value="DECLINED">Declined</option>
              <option value="COUNTERED">Countered</option>
            </select>
            <input
              placeholder="Reason code (e.g. DEBT_TO_INCOME)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            />
            <input
              placeholder="Reason (human-readable — required)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
            <input
              placeholder="Entered by (your name)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={enteredBy}
              onChange={(e) => setEnteredBy(e.target.value)}
            />
            <button
              disabled={busy || !submissionId || !reasonCode || !reasonText || !enteredBy}
              onClick={() =>
                post(`/api/submissions/${submissionId}/decision`, {
                  outcome,
                  reasonCode,
                  reasonText,
                  enteredBy,
                })
              }
              className="self-start rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Record decision
            </button>
          </div>
        </section>
      )}

      {!hasAcceptedOffer && acceptableDecisions.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Accept an offer</h2>
          <div className="mt-2 flex gap-2">
            <select
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={decisionId}
              onChange={(e) => setDecisionId(e.target.value)}
            >
              <option value="">Which decision?…</option>
              {acceptableDecisions.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
            <button
              disabled={busy || !decisionId}
              onClick={() => post(`/api/applications/${applicationId}/accept`, { decisionId })}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Accept
            </button>
          </div>
        </section>
      )}

      {hasAcceptedOffer && !hasFundedTransaction && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Confirm funding</h2>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              placeholder="Funded amount"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={fundedAmount}
              onChange={(e) => setFundedAmount(e.target.value)}
            />
            <button
              disabled={busy || !fundedAmount}
              onClick={() => post(`/api/applications/${applicationId}/fund`, { fundedAmount: Number(fundedAmount) })}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Confirm funded
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
