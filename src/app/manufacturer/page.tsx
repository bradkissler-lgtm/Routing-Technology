import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";

// Always live data — dealer/lender figures change on every submission, and
// this page isn't safe to prerender at build time (no DB connection then).
export const dynamic = "force-dynamic";

/**
 * Manufacturer home dashboard. MVP scope only: dealer scorecard + lender
 * approval rates. No anomaly detection, no buyer segmentation yet — those
 * are V1/V2 (see /docs/architecture.md, "Phased roadmap"). No auth yet
 * either; a real deployment puts this behind manufacturer-admin login.
 */
export default async function ManufacturerDashboardPage() {
  const manufacturer = await getCurrentManufacturer();

  const dealers = await prisma.dealer.findMany({
    where: { manufacturerId: manufacturer.id },
    include: { applications: true },
    orderBy: { name: "asc" },
  });

  const lenderPrograms = await prisma.lenderProgram.findMany({
    where: { manufacturerId: manufacturer.id },
    include: { decisions: true },
  });

  const totalApplications = dealers.reduce(
    (sum, dealer) => sum + dealer.applications.length,
    0,
  );
  const totalApproved = dealers.reduce(
    (sum, dealer) =>
      sum + dealer.applications.filter((a) => a.status === "APPROVED").length,
    0,
  );
  const networkApprovalRate =
    totalApplications > 0
      ? Math.round((totalApproved / totalApplications) * 100)
      : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-medium text-slate-500">{manufacturer.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        Network overview
      </h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <SummaryTile label="Total submissions" value={totalApplications.toString()} />
        <SummaryTile
          label="Network approval rate"
          value={networkApprovalRate === null ? "—" : `${networkApprovalRate}%`}
        />
        <SummaryTile label="Active dealers" value={dealers.length.toString()} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">
        Dealer oversight
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Dealer</th>
              <th className="px-4 py-2 font-medium">Submissions</th>
              <th className="px-4 py-2 font-medium">Approval rate</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dealers.map((dealer) => {
              const approved = dealer.applications.filter(
                (a) => a.status === "APPROVED",
              ).length;
              const rate =
                dealer.applications.length > 0
                  ? Math.round((approved / dealer.applications.length) * 100)
                  : null;
              return (
                <tr key={dealer.id}>
                  <td className="px-4 py-2 text-slate-900">{dealer.name}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {dealer.applications.length}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {rate === null ? "—" : `${rate}%`}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/dealer/${dealer.code}`}
                      className="text-slate-600 underline underline-offset-2 hover:text-slate-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">
        Lender &amp; program reporting
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Lender / program</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Decisions</th>
              <th className="px-4 py-2 font-medium">Approval rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lenderPrograms.map((program) => {
              const approved = program.decisions.filter(
                (d) => d.outcome === "APPROVED",
              ).length;
              const rate =
                program.decisions.length > 0
                  ? Math.round((approved / program.decisions.length) * 100)
                  : null;
              return (
                <tr key={program.id}>
                  <td className="px-4 py-2 text-slate-900">{program.name}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {program.type === "CAPTIVE" ? "Captive" : "Third-party"}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {program.decisions.length}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {rate === null ? "—" : `${rate}%`}
                  </td>
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
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
