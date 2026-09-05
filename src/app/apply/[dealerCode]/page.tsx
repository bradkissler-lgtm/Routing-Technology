import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { IntakeForm } from "@/components/IntakeForm";

export const dynamic = "force-dynamic";

/**
 * Dealer-facing intake for a commercial equipment financing application.
 * No auth yet (see /docs/architecture.md, "Known limitations") — a real
 * deployment puts this behind dealer-user login, which matters more here
 * than it did for the earlier consumer prototype since real business and
 * guarantor PII flows through this form.
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
          For the business, its owners, and anyone personally guaranteeing this financing.
        </p>
      </div>
      <IntakeForm dealerCode={dealer.code} />
    </main>
  );
}
