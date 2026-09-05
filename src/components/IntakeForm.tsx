"use client";

import { useState, type FormEvent } from "react";

type Step = "business" | "guarantors" | "equipment" | "result";

interface OwnerRow {
  firstName: string;
  lastName: string;
  title: string;
  ownershipPercent: string;
}

interface GuarantorRow {
  firstName: string;
  lastName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  ssnLast4: string;
  ownerIndex: string; // "" = not an owner
  consentCreditPull: boolean;
  consentDataSharing: boolean;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClass = "text-sm font-medium text-slate-700";

const emptyOwner: OwnerRow = { firstName: "", lastName: "", title: "", ownershipPercent: "" };
const emptyGuarantor: GuarantorRow = {
  firstName: "",
  lastName: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
  ssnLast4: "",
  ownerIndex: "",
  consentCreditPull: false,
  consentDataSharing: false,
};

export function IntakeForm({ dealerCode }: { dealerCode: string }) {
  const [step, setStep] = useState<Step>("business");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const [business, setBusiness] = useState({
    legalName: "",
    ein: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    consentDataSharing: false,
    consentMarketing: false,
  });
  const [owners, setOwners] = useState<OwnerRow[]>([{ ...emptyOwner }]);
  const [guarantors, setGuarantors] = useState<GuarantorRow[]>([{ ...emptyGuarantor }]);
  const [equipment, setEquipment] = useState({ description: "", requestedAmount: "" });

  function updateOwner(index: number, patch: Partial<OwnerRow>) {
    setOwners(owners.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }
  function updateGuarantor(index: number, patch: Partial<GuarantorRow>) {
    setGuarantors(guarantors.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerCode,
          business: {
            legalName: business.legalName,
            ein: business.ein || undefined,
            addressLine1: business.addressLine1,
            city: business.city,
            state: business.state,
            postalCode: business.postalCode,
            consent: {
              dataSharing: business.consentDataSharing,
              marketing: business.consentMarketing,
            },
          },
          owners: owners.map((o) => ({
            firstName: o.firstName,
            lastName: o.lastName,
            title: o.title || undefined,
            ownershipPercent: o.ownershipPercent ? Number(o.ownershipPercent) : undefined,
          })),
          guarantors: guarantors.map((g) => ({
            firstName: g.firstName,
            lastName: g.lastName,
            addressLine1: g.addressLine1,
            city: g.city,
            state: g.state,
            postalCode: g.postalCode,
            ssnLast4: g.ssnLast4,
            ownerIndex: g.ownerIndex === "" ? undefined : Number(g.ownerIndex),
            consent: {
              creditPull: g.consentCreditPull,
              dataSharing: g.consentDataSharing,
            },
          })),
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

      {step === "business" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Business and ownership</legend>
          <h3 className="text-sm font-semibold text-slate-900">Business</h3>
          <Field label="Legal business name">
            <input required className={inputClass} value={business.legalName}
              onChange={(e) => setBusiness({ ...business, legalName: e.target.value })} />
          </Field>
          <Field label="EIN (optional)">
            <input className={inputClass} value={business.ein}
              onChange={(e) => setBusiness({ ...business, ein: e.target.value })} />
          </Field>
          <Field label="Business address">
            <input required className={inputClass} value={business.addressLine1}
              onChange={(e) => setBusiness({ ...business, addressLine1: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <input required className={inputClass} value={business.city}
                onChange={(e) => setBusiness({ ...business, city: e.target.value })} />
            </Field>
            <Field label="State">
              <input required maxLength={2} className={inputClass} value={business.state}
                onChange={(e) => setBusiness({ ...business, state: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="ZIP code">
              <input required className={inputClass} value={business.postalCode}
                onChange={(e) => setBusiness({ ...business, postalCode: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={business.consentDataSharing}
              onChange={(e) => setBusiness({ ...business, consentDataSharing: e.target.checked })} />
            The business agrees this information can be shared with participating lenders.
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={business.consentMarketing}
              onChange={(e) => setBusiness({ ...business, consentMarketing: e.target.checked })} />
            The business would like to hear about future offers. (Optional)
          </label>

          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            Owners <span className="font-normal text-slate-500">(at least one required)</span>
          </h3>
          {owners.map((owner, index) => (
            <div key={index} className="rounded-md border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input required className={inputClass} value={owner.firstName}
                    onChange={(e) => updateOwner(index, { firstName: e.target.value })} />
                </Field>
                <Field label="Last name">
                  <input required className={inputClass} value={owner.lastName}
                    onChange={(e) => updateOwner(index, { lastName: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Title (optional)">
                  <input className={inputClass} value={owner.title}
                    onChange={(e) => updateOwner(index, { title: e.target.value })} />
                </Field>
                <Field label="Ownership % (optional)">
                  <input type="number" min={0} max={100} className={inputClass} value={owner.ownershipPercent}
                    onChange={(e) => updateOwner(index, { ownershipPercent: e.target.value })} />
                </Field>
              </div>
              {owners.length > 1 && (
                <button type="button" onClick={() => setOwners(owners.filter((_, i) => i !== index))}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline">
                  Remove owner
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setOwners([...owners, { ...emptyOwner }])}
            className="self-start text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">
            + Add another owner
          </button>

          <NextButton onClick={() => setStep("guarantors")} />
        </fieldset>
      )}

      {step === "guarantors" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Guarantors</legend>
          <h3 className="text-sm font-semibold text-slate-900">
            Guarantors <span className="font-normal text-slate-500">(at least one required)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Each guarantor authorizes their own credit check separately — a business owner
            being a guarantor does not carry over automatically.
          </p>
          {guarantors.map((guarantor, index) => (
            <div key={index} className="rounded-md border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input required className={inputClass} value={guarantor.firstName}
                    onChange={(e) => updateGuarantor(index, { firstName: e.target.value })} />
                </Field>
                <Field label="Last name">
                  <input required className={inputClass} value={guarantor.lastName}
                    onChange={(e) => updateGuarantor(index, { lastName: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Is this person also one of the owners listed above?">
                  <select className={inputClass} value={guarantor.ownerIndex}
                    onChange={(e) => updateGuarantor(index, { ownerIndex: e.target.value })}>
                    <option value="">No / not listed</option>
                    {owners.map((owner, ownerIndex) => (
                      <option key={ownerIndex} value={ownerIndex}>
                        {owner.firstName || `Owner ${ownerIndex + 1}`} {owner.lastName}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Address">
                  <input required className={inputClass} value={guarantor.addressLine1}
                    onChange={(e) => updateGuarantor(index, { addressLine1: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Field label="City">
                  <input required className={inputClass} value={guarantor.city}
                    onChange={(e) => updateGuarantor(index, { city: e.target.value })} />
                </Field>
                <Field label="State">
                  <input required maxLength={2} className={inputClass} value={guarantor.state}
                    onChange={(e) => updateGuarantor(index, { state: e.target.value.toUpperCase() })} />
                </Field>
                <Field label="ZIP code">
                  <input required className={inputClass} value={guarantor.postalCode}
                    onChange={(e) => updateGuarantor(index, { postalCode: e.target.value })} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Last 4 digits of SSN">
                  <input required maxLength={4} inputMode="numeric" className={inputClass} value={guarantor.ssnLast4}
                    onChange={(e) => updateGuarantor(index, { ssnLast4: e.target.value })} />
                </Field>
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input required type="checkbox" className="mt-1" checked={guarantor.consentCreditPull}
                  onChange={(e) => updateGuarantor(index, { consentCreditPull: e.target.checked })} />
                I authorize a lender to check my personal credit in connection with this
                application. (Required for this guarantor)
              </label>
              <label className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-1" checked={guarantor.consentDataSharing}
                  onChange={(e) => updateGuarantor(index, { consentDataSharing: e.target.checked })} />
                I agree my information can be retained for this application&apos;s records.
              </label>
              {guarantors.length > 1 && (
                <button type="button" onClick={() => setGuarantors(guarantors.filter((_, i) => i !== index))}
                  className="mt-3 text-xs font-medium text-red-600 hover:underline">
                  Remove guarantor
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setGuarantors([...guarantors, { ...emptyGuarantor }])}
            className="self-start text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">
            + Add another guarantor
          </button>

          <div className="flex justify-between">
            <BackButton onClick={() => setStep("business")} />
            <NextButton onClick={() => setStep("equipment")} />
          </div>
        </fieldset>
      )}

      {step === "equipment" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Equipment and amount</legend>
          <Field label="Equipment description">
            <input required placeholder="e.g. CAT 320 Excavator" className={inputClass}
              value={equipment.description}
              onChange={(e) => setEquipment({ ...equipment, description: e.target.value })} />
          </Field>
          <Field label="Amount requested">
            <input required type="number" min={1} placeholder="185000" className={inputClass}
              value={equipment.requestedAmount}
              onChange={(e) => setEquipment({ ...equipment, requestedAmount: e.target.value })} />
          </Field>

          <div className="flex justify-between">
            <BackButton onClick={() => setStep("guarantors")} />
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
    { key: "business", label: "Business & owners" },
    { key: "guarantors", label: "Guarantors" },
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
