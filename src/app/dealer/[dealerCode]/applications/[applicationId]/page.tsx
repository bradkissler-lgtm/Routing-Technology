import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { StatusBadge } from "@/components/StatusBadge";
import { ApplicationOpsPanel } from "@/components/ApplicationOpsPanel";

export const dynamic = "force-dynamic";

/**
 * Application detail / operator screen. This is where a dealer or platform
 * operator manually logs lender submissions and decisions, and confirms
 * acceptance and funding — Phase 1 has no live lender API, so every one of
 * these lifecycle transitions is a manual data-entry action here
 * (Blueprint §2.1, §2.4), not something the applicant's own form triggers.
 */
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ dealerCode: string; applicationId: string }>;
}) {
  const { dealerCode, applicationId } = await params;
  const manufacturer = await getCurrentManufacturer();

  const dealer = await prisma.dealer.findUnique({
    where: { manufacturerId_code: { manufacturerId: manufacturer.id, code: dealerCode } },
  });
  if (!dealer) notFound();

  const application = await prisma.application.findFirst({
    where: { id: applicationId, dealerId: dealer.id },
    include: {
      businessApplicant: { include: { owners: true } },
      individualApplicant: true,
      guarantors: true,
      lenderSubmissions: {
        include: { financingProgram: { include: { lender: true } }, decision: true },
        orderBy: { createdAt: "asc" },
      },
      acceptedOffer: { include: { decision: true, fundedTransaction: true } },
    },
  });
  if (!application) notFound();

  const availablePrograms = await prisma.financingProgram.findMany({
    where: { manufacturerId: manufacturer.id, isActive: true },
    include: { lender: true },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-medium text-slate-500">{dealer.name}</p>
      <div className="mt-1 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          {application.businessApplicant?.legalName ??
            (application.individualApplicant
              ? `${application.individualApplicant.firstName} ${application.individualApplicant.lastName}`
              : "Application")}
        </h1>
        <StatusBadge status={application.status} />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {application.equipmentDescription} · ${application.requestedAmount.toString()}
      </p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        {application.businessApplicant && (
          <>
            <h2 className="text-sm font-semibold text-slate-900">Owners</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {application.businessApplicant.owners.map((owner) => (
                <li key={owner.id}>
                  {owner.firstName} {owner.lastName}
                  {owner.title ? ` — ${owner.title}` : ""}
                  {owner.ownershipPercent ? ` (${owner.ownershipPercent}%)` : ""}
                </li>
              ))}
            </ul>
          </>
        )}

        {application.individualApplicant && (
          <>
            <h2 className="text-sm font-semibold text-slate-900">Applicant</h2>
            <p className="mt-2 text-sm text-slate-700">
              {application.individualApplicant.firstName} {application.individualApplicant.lastName}
              {" · "}SSN ending {application.individualApplicant.ssnLast4}
              {" · "}{application.individualApplicant.email}
            </p>
          </>
        )}

        <h2 className="mt-4 text-sm font-semibold text-slate-900">
          {application.businessApplicant ? "Guarantors" : "Co-signer"}
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {application.guarantors.length === 0 && (
            <li className="text-slate-400">
              {application.businessApplicant ? "None on file." : "No co-signer on this application."}
            </li>
          )}
          {application.guarantors.map((g) => (
            <li key={g.id}>
              {g.firstName} {g.lastName} · SSN ending {g.ssnLast4} ·{" "}
              {g.consentCreditPull ? "credit pull authorized" : "credit pull NOT authorized"}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Lender submissions</h2>
        <div className="mt-2 space-y-3">
          {application.lenderSubmissions.length === 0 && (
            <p className="text-sm text-slate-400">No lender submissions logged yet.</p>
          )}
          {application.lenderSubmissions.map((submission) => (
            <div key={submission.id} className="rounded-md border border-slate-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">
                  {submission.financingProgram.lender.name} — {submission.financingProgram.name}
                </span>
                {submission.decision ? (
                  <StatusBadge status={submission.decision.outcome} />
                ) : (
                  <StatusBadge status="SUBMITTED" />
                )}
              </div>
              {submission.decision && (
                <p className="mt-1 text-slate-600">{submission.decision.reasonText}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {application.acceptedOffer && (
        <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Accepted offer from this application&rsquo;s decision on{" "}
          {new Date(application.acceptedOffer.acceptedAt).toLocaleDateString()}.
          {application.acceptedOffer.fundedTransaction && (
            <> Funded ${application.acceptedOffer.fundedTransaction.fundedAmount.toString()} on{" "}
              {new Date(application.acceptedOffer.fundedTransaction.fundedAt).toLocaleDateString()}.</>
          )}
        </section>
      )}

      <ApplicationOpsPanel
        applicationId={application.id}
        availablePrograms={availablePrograms.map((p) => ({
          id: p.id,
          label: `${p.lender.name} — ${p.name}`,
        }))}
        pendingSubmissions={application.lenderSubmissions
          .filter((s) => !s.decision)
          .map((s) => ({ id: s.id, label: `${s.financingProgram.lender.name} — ${s.financingProgram.name}` }))}
        acceptableDecisions={application.lenderSubmissions
          .filter((s) => s.decision && s.decision.outcome !== "DECLINED")
          .map((s) => ({
            id: s.decision!.id,
            label: `${s.financingProgram.lender.name} — ${s.financingProgram.name} (${s.decision!.outcome})`,
          }))}
        hasAcceptedOffer={application.acceptedOffer !== null}
        hasFundedTransaction={application.acceptedOffer?.fundedTransaction != null}
      />
    </main>
  );
}
