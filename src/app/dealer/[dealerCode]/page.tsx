import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { StatusBadge } from "@/components/StatusBadge";

// Always live data — a dealer's application list changes on every
// submission, and this page isn't safe to prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Dealer console (read-only for MVP). No auth yet — see /docs/architecture.md,
 * "Known limitations." A real deployment puts this behind dealer-user login
 * scoped to their own dealer record.
 */
export default async function DealerPage({
  params,
}: {
  params: Promise<{ dealerCode: string }>;
}) {
  const { dealerCode } = await params;
  const manufacturer = await getCurrentManufacturer();

  const dealer = await prisma.dealer.findUnique({
    where: {
      manufacturerId_code: {
        manufacturerId: manufacturer.id,
        code: dealerCode,
      },
    },
  });

  if (!dealer) {
    notFound();
  }

  const applications = await prisma.creditApplication.findMany({
    where: { dealerId: dealer.id },
    orderBy: { createdAt: "desc" },
    include: { endBuyer: true, decisions: { orderBy: { decidedAt: "desc" }, take: 1 } },
  });

  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const approvalRate =
    applications.length > 0
      ? Math.round((approvedCount / applications.length) * 100)
      : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-slate-500">{manufacturer.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        {dealer.name}
      </h1>
      <p className="mt-1 text-sm text-slate-500">Dealer code {dealer.code}</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatTile label="Submissions" value={applications.length.toString()} />
        <StatTile
          label="Approval rate"
          value={approvalRate === null ? "—" : `${approvalRate}%`}
        />
        <StatTile
          label="Apply link"
          value={`/apply/${dealer.code}`}
          small
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">
        Recent applications
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Buyer</th>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No applications yet. Share the apply link above to get started.
                </td>
              </tr>
            )}
            {applications.map((app) => (
              <tr key={app.id}>
                <td className="px-4 py-2 text-slate-900">
                  {app.endBuyer.firstName} {app.endBuyer.lastName}
                </td>
                <td className="px-4 py-2 text-slate-700">
                  {app.productDescription}
                </td>
                <td className="px-4 py-2 text-slate-700">
                  ${app.requestedAmount.toString()}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {app.submittedAt
                    ? new Date(app.submittedAt).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold text-slate-900 ${
          small ? "truncate text-sm" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
