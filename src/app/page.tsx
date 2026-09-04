import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Dealer Network Credit Application Platform
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          MVP vertical slice — buyer capture, dealer oversight, lender
          reporting. See /docs/architecture.md for scope and roadmap.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <HomeCard
          href="/apply/DLR-001"
          title="Buyer application"
          description="Public, embeddable credit application form."
        />
        <HomeCard
          href="/dealer/DLR-001"
          title="Dealer view"
          description="A single dealer's submissions and approval rate."
        />
        <HomeCard
          href="/manufacturer"
          title="Manufacturer dashboard"
          description="Network-wide dealer and lender reporting."
        />
      </div>
    </main>
  );
}

function HomeCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
    >
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
}
