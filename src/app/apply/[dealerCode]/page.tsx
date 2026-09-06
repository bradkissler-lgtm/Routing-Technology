import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { auth } from "@/lib/auth";
import { canAccessDealer } from "@/lib/access-control";
import { ApplicantTypeSelector } from "@/components/ApplicantTypeSelector";

export const dynamic = "force-dynamic";

/**
 * Dealer-facing intake — commercial (business applicant) and consumer
 * (individual applicant) ship together in V1 (Blueprint §2.1, updated
 * 2026-09-06); ApplicantTypeSelector lets the visitor choose which applies.
 * Behind dealer-user login (added 2026-09-06, closing the gap noted in
 * /docs/blueprint.md, "Known limitations") — src/proxy.ts already requires
 * a session to reach this route; the check below additionally confirms the
 * session's own dealer matches this specific dealerCode, since a dealer
 * user for one dealer must never see or submit into another dealer's data.
 */
export default async function ApplyPage({
  params,
}: {
  params: Promise<{ dealerCode: string }>;
}) {
  const { dealerCode } = await params;
  const manufacturer = await getCurrentManufacturer();

  const dealer = await prisma.dealer.findUnique({
    where: { manufacturerId_code: { manufacturerId: manufacturer.id, code: dealerCode } },
  });

  if (!dealer || !dealer.isActive) {
    notFound();
  }

  const session = await auth();
  if (!canAccessDealer(session, dealer.id)) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">
          {manufacturer.name} · Equipment Financing Application
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Apply for financing at {dealer.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          For a business (with its owners and a guarantor) or an individual applicant (with an
          optional co-signer).
        </p>
      </div>
      <ApplicantTypeSelector dealerCode={dealer.code} />
    </main>
  );
}
