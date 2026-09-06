"use client";

import { useState } from "react";
import { IntakeForm } from "./IntakeForm";
import { IndividualIntakeForm } from "./IndividualIntakeForm";

type ApplicantType = "BUSINESS" | "INDIVIDUAL";

/**
 * Lets the visitor choose which intake path applies before rendering it.
 * Both ship together in V1 (Blueprint §2.1, updated 2026-09-06) — this is
 * the only place that decision gets made; the two forms below post to the
 * same /api/applications endpoint with different `applicantType` values.
 */
export function ApplicantTypeSelector({ dealerCode }: { dealerCode: string }) {
  const [applicantType, setApplicantType] = useState<ApplicantType | null>(null);

  if (applicantType === null) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-700">
          Are you applying as a business or an individual?
        </p>
        <button
          type="button"
          onClick={() => setApplicantType("BUSINESS")}
          className="rounded-md border border-slate-300 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:border-slate-500"
        >
          A business — this financing is for a company, with owners and/or a personal guarantor.
        </button>
        <button
          type="button"
          onClick={() => setApplicantType("INDIVIDUAL")}
          className="rounded-md border border-slate-300 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:border-slate-500"
        >
          An individual — I&rsquo;m applying personally, with an optional co-signer.
        </button>
      </div>
    );
  }

  return applicantType === "BUSINESS" ? (
    <IntakeForm dealerCode={dealerCode} />
  ) : (
    <IndividualIntakeForm dealerCode={dealerCode} />
  );
}
