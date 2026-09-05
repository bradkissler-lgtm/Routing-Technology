import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

/**
 * Dealer console (read-only list, no auth yet). Links into each
 * application's detail page, where lender submissions, decisions,
 * acceptance, and funding are logged manually (Blueprint §2.1, §2.4 — no
 * live lender API in Phase 1).
 */
export default async function DealerPage({
  params,
}: {
  params: Promise<{ dealerCode: string }>;
}) {
  const { dealerCode } = await params;
  const manufacturer = await getCurrentManufacturer();

  const dealer = await prisma.dealer.findUnique({
    where: { manufacturerId_code: { manufacturerId: manufacturer.id, code: dealerCode } },
  });
  if (!dealer) notFound();

  const applications = await prisma.application.findMany({
    where: { dealerId: dealer.id },
    orderBy: { createdAt: "desc" },
    include: { businessApplicant: true, individualApplicant: true },
  });

  const funded = applications.filter((a) => a.status === "FUNDED").length;
  const fundedRate =
    applications.length > 0 ? Math.round((funded / applications.length) * 100) : null;
  const needsReconciliation = applications.filter((a) => a.needsReconciliation).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-slate-500">{manufacturer.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{dealer.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Dealer code {dealer.code}</p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatTile label="Applications" value={applications.length.toString()} />
        <StatTile label="Funded rate" value={fundedRate === null ? "—" : `${fundedRate}%`} />
        <StatTile label="Needs reconciliation" value={needsReconciliation.toString()} />
        <StatTile label="Apply link" value={`/apply/${dealer.code}`} small />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Applications</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Applicant</th>
              <th className="px-4 py-2 font-medium">Equipment</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Submitted</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No applications yet. Share the apply link above to get started.
                </td>
              </tr>
            )}
            {applications.map((app) => (
              <tr key={app.id}>
                <td className="px-4 py-2 text-slate-900">
                  {app.businessApplicant?.legalName ??
                    `${app.individualApplicant?.firstName ?? ""} ${app.individualApplicant?.lastName ?? ""}`}
                </td>
                <td className="px-4 py-2 text-slate-700">{app.equipmentDescription}</td>
                <td className="px-4 py-2 text-slate-700">${app.requestedAmount.toString()}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={app.needsReconciliation ? "PENDING_RECONCILIATION" : app.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/dealer/${dealer.code}/applications/${app.id}`}
                    className="text-slate-600 underline underline-offset-2 hover:text-slate-900"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatTile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold text-slate-900 ${small ? "truncate text-sm" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}
