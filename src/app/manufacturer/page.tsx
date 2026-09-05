import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";

export const dynamic = "force-dynamic";

/**
 * Manufacturer network dashboard. Rollups use Application.status (FUNDED as
 * the success criterion), never raw LenderSubmission/Decision counts, per
 * Blueprint §1.3 — otherwise a cascade of declines-before-an-approval
 * distorts the approval rate. "Needs reconciliation" is a manual flag
 * standing in for the real coverage/completeness measurement this platform
 * still needs an independent denominator to compute (Blueprint §2.5) — it
 * is not itself the Coverage metric, just a visibility placeholder for it.
 */
export default async function ManufacturerDashboardPage() {
  const manufacturer = await getCurrentManufacturer();

  const dealers = await prisma.dealer.findMany({
    where: { manufacturerId: manufacturer.id },
    include: { applications: true },
    orderBy: { name: "asc" },
  });

  const programs = await prisma.financingProgram.findMany({
    where: { manufacturerId: manufacturer.id },
    include: {
      lender: true,
      submissions: { include: { decision: true } },
    },
  });

  const allApplications = dealers.flatMap((d) => d.applications);
  const funded = allApplications.filter((a) => a.status === "FUNDED").length;
  const fundedRate =
    allApplications.length > 0 ? Math.round((funded / allApplications.length) * 100) : null;
  const needsReconciliation = allApplications.filter((a) => a.needsReconciliation).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-medium text-slate-500">{manufacturer.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Network overview</h1>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <SummaryTile label="Total applications" value={allApplications.length.toString()} />
        <SummaryTile label="Funded rate" value={fundedRate === null ? "—" : `${fundedRate}%`} />
        <SummaryTile label="Active dealers" value={dealers.length.toString()} />
        <SummaryTile label="Needs reconciliation" value={needsReconciliation.toString()} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Funded rate is computed at the application level (funded ÷ total applications), not by
        counting individual lender-submission decisions — a cascade of declines before an
        eventual approval should not distort this figure. &ldquo;Needs reconciliation&rdquo; flags
        applications whose real-world outcome is uncertain; it is a placeholder for the pilot&rsquo;s
        coverage/completeness measurement, not the measurement itself (see the blueprint, §2.5).
      </p>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Dealer oversight</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Dealer</th>
              <th className="px-4 py-2 font-medium">Applications</th>
              <th className="px-4 py-2 font-medium">Funded rate</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dealers.map((dealer) => {
              const dealerFunded = dealer.applications.filter((a) => a.status === "FUNDED").length;
              const rate =
                dealer.applications.length > 0
                  ? Math.round((dealerFunded / dealer.applications.length) * 100)
                  : null;
              return (
                <tr key={dealer.id}>
                  <td className="px-4 py-2 text-slate-900">{dealer.name}</td>
                  <td className="px-4 py-2 text-slate-700">{dealer.applications.length}</td>
                  <td className="px-4 py-2 text-slate-700">{rate === null ? "—" : `${rate}%`}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/dealer/${dealer.code}`} className="text-slate-600 underline underline-offset-2 hover:text-slate-900">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Lender &amp; program reporting</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Lender</th>
              <th className="px-4 py-2 font-medium">Program</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Submissions decisioned</th>
              <th className="px-4 py-2 font-medium">Approval rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programs.map((program) => {
              const decisioned = program.submissions.filter((s) => s.decision);
              const approved = decisioned.filter((s) => s.decision!.outcome === "APPROVED").length;
              const rate = decisioned.length > 0 ? Math.round((approved / decisioned.length) * 100) : null;
              return (
                <tr key={program.id}>
                  <td className="px-4 py-2 text-slate-900">{program.lender.name}</td>
                  <td className="px-4 py-2 text-slate-700">{program.name}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {program.type === "CAPTIVE" ? "Captive" : "Third-party"}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{decisioned.length}</td>
                  <td className="px-4 py-2 text-slate-700">{rate === null ? "—" : `${rate}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
