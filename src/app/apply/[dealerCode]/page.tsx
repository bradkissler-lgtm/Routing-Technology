import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { ApplicantTypeSelector } from "@/components/ApplicantTypeSelector";

export const dynamic = "force-dynamic";

/**
 * Dealer-facing intake — commercial (business applicant) and consumer
 * (individual applicant) ship together in V1 (Blueprint §2.1, updated
 * 2026-09-06); ApplicantTypeSelector lets the visitor choose which applies.
 * No auth yet (see /docs/blueprint.md, "Known limitations") — a real
 * deployment puts this behind dealer-user login, which matters more here
 * than it did for the earlier consumer-only prototype since real business,
 * individual, and guarantor/co-signer PII all flow through this form.
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
