"use client";

import { useState, type FormEvent } from "react";

type Step = "buyer" | "product" | "consent" | "result";

interface DecisionSummary {
  outcome: "APPROVED" | "DECLINED" | "COUNTERED";
  reasonText: string;
  terms: Record<string, unknown> | null;
}

const INCOME_BANDS = [
  { value: "", label: "Prefer not to say" },
  { value: "UNDER_50K", label: "Under $50,000" },
  { value: "50K_100K", label: "$50,000 – $100,000" },
  { value: "100K_200K", label: "$100,000 – $200,000" },
  { value: "OVER_200K", label: "Over $200,000" },
];

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClass = "text-sm font-medium text-slate-700";

export function ApplicationForm({ dealerCode }: { dealerCode: string }) {
  const [step, setStep] = useState<Step>("buyer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionSummary | null>(null);

  const [buyer, setBuyer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    ssnLast4: "",
    incomeBand: "",
  });
  const [product, setProduct] = useState({
    productDescription: "",
    requestedAmount: "",
  });
  const [consent, setConsent] = useState({
    creditPull: false,
    dataSharing: false,
    marketing: false,
  });

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
          buyer: {
            ...buyer,
            incomeBand: buyer.incomeBand || undefined,
          },
          application: {
            productDescription: product.productDescription,
            requestedAmount: Number(product.requestedAmount),
          },
          consent,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      setDecision(body.decision);
      setStep("result");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "result" && decision) {
    return <ResultCard decision={decision} />;
  }

  return (
    <form
      onSubmit={step === "consent" ? handleSubmit : (e) => e.preventDefault()}
      className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <StepIndicator step={step} />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === "buyer" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">About you</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <input
                required
                className={inputClass}
                value={buyer.firstName}
                onChange={(e) =>
                  setBuyer({ ...buyer, firstName: e.target.value })
                }
              />
            </Field>
            <Field label="Last name">
              <input
                required
                className={inputClass}
                value={buyer.lastName}
                onChange={(e) =>
                  setBuyer({ ...buyer, lastName: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              required
              type="email"
              className={inputClass}
              value={buyer.email}
              onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              required
              type="tel"
              className={inputClass}
              value={buyer.phone}
              onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
            />
          </Field>
          <Field label="Street address">
            <input
              required
              className={inputClass}
              value={buyer.addressLine1}
              onChange={(e) =>
                setBuyer({ ...buyer, addressLine1: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <input
                required
                className={inputClass}
                value={buyer.city}
                onChange={(e) => setBuyer({ ...buyer, city: e.target.value })}
              />
            </Field>
            <Field label="State">
              <input
                required
                maxLength={2}
                className={inputClass}
                value={buyer.state}
                onChange={(e) =>
                  setBuyer({ ...buyer, state: e.target.value.toUpperCase() })
                }
              />
            </Field>
            <Field label="ZIP code">
              <input
                required
                className={inputClass}
                value={buyer.postalCode}
                onChange={(e) =>
                  setBuyer({ ...buyer, postalCode: e.target.value })
                }
              />
            </Field>
          </div>
          <NextButton onClick={() => setStep("product")} />
        </fieldset>
      )}

      {step === "product" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">What you&rsquo;re financing</legend>
          <Field label="What are you financing?">
            <input
              required
              placeholder="e.g. Model X Utility Trailer"
              className={inputClass}
              value={product.productDescription}
              onChange={(e) =>
                setProduct({ ...product, productDescription: e.target.value })
              }
            />
          </Field>
          <Field label="Amount requested">
            <input
              required
              type="number"
              min={1}
              placeholder="12500"
              className={inputClass}
              value={product.requestedAmount}
              onChange={(e) =>
                setProduct({ ...product, requestedAmount: e.target.value })
              }
            />
          </Field>
          <Field label="Household income (optional — helps match you to the right lender)">
            <select
              className={inputClass}
              value={buyer.incomeBand}
              onChange={(e) =>
                setBuyer({ ...buyer, incomeBand: e.target.value })
              }
            >
              {INCOME_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-between">
            <BackButton onClick={() => setStep("buyer")} />
            <NextButton onClick={() => setStep("consent")} />
          </div>
        </fieldset>
      )}

      {step === "consent" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Last step — SSN and consent</legend>
          <Field label="Last 4 digits of SSN">
            <input
              required
              maxLength={4}
              inputMode="numeric"
              className={inputClass}
              value={buyer.ssnLast4}
              onChange={(e) =>
                setBuyer({ ...buyer, ssnLast4: e.target.value })
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              We only ask for the last 4 digits here. The lender will request
              your full SSN separately through a secure form if needed.
            </p>
          </Field>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              required
              type="checkbox"
              className="mt-1"
              checked={consent.creditPull}
              onChange={(e) =>
                setConsent({ ...consent, creditPull: e.target.checked })
              }
            />
            I authorize {`${product.productDescription ? "the lender" : "the lender"}`}{" "}
            to check my credit to evaluate this application. (Required)
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent.dataSharing}
              onChange={(e) =>
                setConsent({ ...consent, dataSharing: e.target.checked })
              }
            />
            I agree the manufacturer can keep my application on file for
            warranty and service purposes.
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent.marketing}
              onChange={(e) =>
                setConsent({ ...consent, marketing: e.target.checked })
              }
            />
            I&rsquo;d like to hear about future offers and products. (Optional)
          </label>

          <div className="flex justify-between">
            <BackButton onClick={() => setStep("product")} />
            <button
              type="submit"
              disabled={submitting || !consent.creditPull}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </fieldset>
      )}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
    >
      Continue
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
    >
      Back
    </button>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "buyer", label: "About you" },
    { key: "product", label: "Financing" },
    { key: "consent", label: "Consent" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <ol className="flex items-center gap-2 text-xs font-medium text-slate-400">
      {steps.map((s, index) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full ${
              index <= activeIndex
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {index + 1}
          </span>
          <span className={index <= activeIndex ? "text-slate-900" : ""}>
            {s.label}
          </span>
          {index < steps.length - 1 && (
            <span className="mx-1 h-px w-4 bg-slate-200" />
          )}
        </li>
      ))}
    </ol>
  );
}

function ResultCard({ decision }: { decision: DecisionSummary }) {
  const copy = {
    APPROVED: {
      title: "You're approved",
      tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    DECLINED: {
      title: "Not approved right now",
      tone: "bg-red-50 text-red-800 border-red-200",
    },
    COUNTERED: {
      title: "We need a bit more information",
      tone: "bg-amber-50 text-amber-800 border-amber-200",
    },
  }[decision.outcome];

  return (
    <div className={`rounded-lg border p-6 ${copy.tone}`}>
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="mt-2 text-sm">{decision.reasonText}</p>
      {decision.terms && (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {Object.entries(decision.terms)
            .filter(([key]) => key !== "note")
            .map(([key, value]) => (
              <div key={key}>
                <dt className="font-medium capitalize">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  );
}
