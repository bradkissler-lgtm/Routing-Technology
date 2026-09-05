const STYLES: Record<string, string> = {
  SUBMITTED: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  FUNDED: "bg-emerald-100 text-emerald-800",
  CLOSED_LOST: "bg-red-50 text-red-700",
  PENDING_RECONCILIATION: "bg-amber-50 text-amber-700",
  DECISIONED: "bg-blue-50 text-blue-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-red-50 text-red-700",
  COUNTERED: "bg-amber-50 text-amber-700",
};

const LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  IN_PROGRESS: "In progress",
  ACCEPTED: "Accepted",
  FUNDED: "Funded",
  CLOSED_LOST: "Closed – lost",
  PENDING_RECONCILIATION: "Needs reconciliation",
  DECISIONED: "Decisioned",
  APPROVED: "Approved",
  DECLINED: "Declined",
  COUNTERED: "Countered",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
