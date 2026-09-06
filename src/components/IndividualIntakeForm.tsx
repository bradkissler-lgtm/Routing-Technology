"use client";

import { useState, type FormEvent } from "react";

type Step = "applicant" | "cosigner" | "equipment" | "result";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClass = "text-sm font-medium text-slate-700";

/**
 * Consumer intake — an individual applicant, an optional co-signer/
 * guarantor, equipment, and consent. Ships alongside the business path in
 * V1 (Blueprint §2.1, updated 2026-09-06). Unlike the business path, the
 * applicant themselves authorizes their own credit pull directly — they
 * are the consumer-report subject, not just an owner or guarantor.
 */
export function IndividualIntakeForm({ dealerCode }: { dealerCode: string }) {
  const [step, setStep] = useState<Step>("applicant");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const [applicant, setApplicant] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    ssnLast4: "",
    consentCreditPull: false,
    consentDataSharing: false,
    consentMarketing: false,
  });

  const [hasCoSigner, setHasCoSigner] = useState(false);
  const [coSigner, setCoSigner] = useState({
    firstName: "",
    lastName: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    ssnLast4: "",
    consentCreditPull: false,
    consentDataSharing: false,
  });

  const [equipment, setEquipment] = useState({ description: "", requestedAmount: "" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantType: "INDIVIDUAL",
          dealerCode,
          individual: {
            firstName: applicant.firstName,
            lastName: applicant.lastName,
            email: applicant.email,
            phone: applicant.phone,
            addressLine1: applicant.addressLine1,
            city: applicant.city,
            state: applicant.state,
            postalCode: applicant.postalCode,
            ssnLast4: applicant.ssnLast4,
            consent: {
              creditPull: applicant.consentCreditPull,
              dataSharing: applicant.consentDataSharing,
              marketing: applicant.consentMarketing,
            },
          },
          guarantor: hasCoSigner
            ? {
                firstName: coSigner.firstName,
                lastName: coSigner.lastName,
                addressLine1: coSigner.addressLine1,
                city: coSigner.city,
                state: coSigner.state,
                postalCode: coSigner.postalCode,
                ssnLast4: coSigner.ssnLast4,
                consent: {
                  creditPull: coSigner.consentCreditPull,
                  dataSharing: coSigner.consentDataSharing,
                },
              }
            : undefined,
          equipment: {
            description: equipment.description,
            requestedAmount: Number(equipment.requestedAmount),
          },
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      setApplicationId(body.applicationId);
      setStep("result");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "result" && applicationId) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        <h2 className="text-lg font-semibold">Application received</h2>
        <p className="mt-2 text-sm">
          Reference ID: <span className="font-mono">{applicationId}</span>
        </p>
        <p className="mt-2 text-sm">
          Your dealer will submit this to one or more lenders and follow up with a decision.
          Nothing has been submitted to a lender yet — that happens as a separate step.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === "equipment" ? handleSubmit : (e) => e.preventDefault()}
      className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <StepIndicator step={step} />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {step === "applicant" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">About you</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <input required className={inputClass} value={applicant.firstName}
                onChange={(e) => setApplicant({ ...applicant, firstName: e.target.value })} />
            </Field>
            <Field label="Last name">
              <input required className={inputClass} value={applicant.lastName}
                onChange={(e) => setApplicant({ ...applicant, lastName: e.target.value })} />
            </Field>
          </div>
          <Field label="Email">
            <input required type="email" className={inputClass} value={applicant.email}
              onChange={(e) => setApplicant({ ...applicant, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input required type="tel" className={inputClass} value={applicant.phone}
              onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })} />
          </Field>
          <Field label="Address">
            <input required className={inputClass} value={applicant.addressLine1}
              onChange={(e) => setApplicant({ ...applicant, addressLine1: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <input required className={inputClass} value={applicant.city}
                onChange={(e) => setApplicant({ ...applicant, city: e.target.value })} />
            </Field>
            <Field label="State">
              <input required maxLength={2} className={inputClass} value={applicant.state}
                onChange={(e) => setApplicant({ ...applicant, state: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="ZIP code">
              <input required className={inputClass} value={applicant.postalCode}
                onChange={(e) => setApplicant({ ...applicant, postalCode: e.target.value })} />
            </Field>
          </div>
          <Field label="Last 4 digits of SSN">
            <input required maxLength={4} inputMode="numeric" className={inputClass} value={applicant.ssnLast4}
              onChange={(e) => setApplicant({ ...applicant, ssnLast4: e.target.value })} />
          </Field>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input required type="checkbox" className="mt-1" checked={applicant.consentCreditPull}
              onChange={(e) => setApplicant({ ...applicant, consentCreditPull: e.target.checked })} />
            I authorize a lender to check my personal credit to evaluate this application. (Required)
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={applicant.consentDataSharing}
              onChange={(e) => setApplicant({ ...applicant, consentDataSharing: e.target.checked })} />
            I agree the manufacturer can keep my application on file for warranty and service purposes.
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={applicant.consentMarketing}
              onChange={(e) => setApplicant({ ...applicant, consentMarketing: e.target.checked })} />
            I&rsquo;d like to hear about future offers and products. (Optional)
          </label>

          <NextButton onClick={() => setStep("cosigner")} />
        </fieldset>
      )}

      {step === "cosigner" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Co-signer (optional)</legend>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={hasCoSigner}
              onChange={(e) => setHasCoSigner(e.target.checked)} />
            I have a co-signer for this application.
          </label>

          {hasCoSigner && (
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">
                Your co-signer authorizes their own credit check separately — it is not covered
                by your consent above.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input required className={inputClass} value={coSigner.firstName}
                    onChange={(e) => setCoSigner({ ...coSigner, firstName: e.target.value })} />
                </Field>
                <Field label="Last name">
                  <input required className={inputClass} value={coSigner.lastName}
                    onChange={(e) => setCoSigner({ ...coSigner, lastName: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Address">
                  <input required className={inputClass} value={coSigner.addressLine1}
                    onChange={(e) => setCoSigner({ ...coSigner, addressLine1: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Field label="City">
                  <input required className={inputClass} value={coSigner.city}
                    onChange={(e) => setCoSigner({ ...coSigner, city: e.target.value })} />
                </Field>
                <Field label="State">
                  <input required maxLength={2} className={inputClass} value={coSigner.state}
                    onChange={(e) => setCoSigner({ ...coSigner, state: e.target.value.toUpperCase() })} />
                </Field>
                <Field label="ZIP code">
                  <input required className={inputClass} value={coSigner.postalCode}
                    onChange={(e) => setCoSigner({ ...coSigner, postalCode: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Last 4 digits of SSN">
                  <input required maxLength={4} inputMode="numeric" className={inputClass} value={coSigner.ssnLast4}
                    onChange={(e) => setCoSigner({ ...coSigner, ssnLast4: e.target.value })} />
                </Field>
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input required type="checkbox" className="mt-1" checked={coSigner.consentCreditPull}
                  onChange={(e) => setCoSigner({ ...coSigner, consentCreditPull: e.target.checked })} />
                I (the co-signer) authorize a lender to check my personal credit. (Required)
              </label>
              <label className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-1" checked={coSigner.consentDataSharing}
                  onChange={(e) => setCoSigner({ ...coSigner, consentDataSharing: e.target.checked })} />
                I agree my information can be retained for this application&apos;s records.
              </label>
            </div>
          )}

          <div className="flex justify-between">
            <BackButton onClick={() => setStep("applicant")} />
            <NextButton onClick={() => setStep("equipment")} />
          </div>
        </fieldset>
      )}

      {step === "equipment" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Equipment and amount</legend>
          <Field label="What are you financing?">
            <input required placeholder="e.g. Compact Utility Tractor" className={inputClass}
              value={equipment.description}
              onChange={(e) => setEquipment({ ...equipment, description: e.target.value })} />
          </Field>
          <Field label="Amount requested">
            <input required type="number" min={1} placeholder="32000" className={inputClass}
              value={equipment.requestedAmount}
              onChange={(e) => setEquipment({ ...equipment, requestedAmount: e.target.value })} />
          </Field>

          <div className="flex justify-between">
            <BackButton onClick={() => setStep("cosigner")} />
            <button type="submit" disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </fieldset>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
      Continue
    </button>
  );
}
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
      Back
    </button>
  );
}
function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "applicant", label: "About you" },
    { key: "cosigner", label: "Co-signer" },
    { key: "equipment", label: "Equipment" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center gap-2 text-xs font-medium text-slate-400">
      {steps.map((s, index) => (
        <li key={s.key} className="flex items-center gap-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${
            index <= activeIndex ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
          }`}>
            {index + 1}
          </span>
          <span className={index <= activeIndex ? "text-slate-900" : ""}>{s.label}</span>
          {index < steps.length - 1 && <span className="mx-1 h-px w-4 bg-slate-200" />}
        </li>
      ))}
    </ol>
  );
}
