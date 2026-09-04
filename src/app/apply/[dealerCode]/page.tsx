import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentManufacturer } from "@/lib/manufacturer";
import { ApplicationForm } from "@/components/ApplicationForm";

// Always live data — looks up the dealer by code on every request, and
// isn't safe to prerender at build time (no DB connection then).
export const dynamic = "force-dynamic";

/**
 * Public, embeddable buyer-facing credit application. A dealer can point a
 * QR code, a link, or an <iframe> at /apply/<their-code> from their own
 * point-of-sale flow. No auth — this is intentionally the lowest-friction
 * surface in the system (see /docs/architecture.md, "User experience").
 */
export default async function ApplyPage({
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

  if (!dealer || !dealer.isActive) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">
          {manufacturer.name} · Financing Application
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Apply for financing at {dealer.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Takes about two minutes. Your information is only shared with{" "}
          {dealer.name} and the lender you approve below.
        </p>
      </div>
      <ApplicationForm dealerCode={dealer.code} />
    </main>
  );
}
