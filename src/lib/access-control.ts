import type { Session } from "next-auth";

/**
 * Pure authorization checks (no Prisma, no Next.js request/response) —
 * unit tested directly in access-control.test.ts. Callers resolve a
 * dealerCode to a Dealer.id first (every page/route already does this
 * lookup), then check the session against that id: a DEALER-role session
 * only ever matches its own Dealer.id, never another dealer's, and a
 * MANUFACTURER-role session never matches any dealer at all — it only
 * gets the aggregate-only manufacturer view (docs/blueprint.md,
 * "Manufacturer's role and data access").
 */
export function canAccessDealer(session: Session | null, dealerId: string): boolean {
  return session?.user?.role === "DEALER" && session.user.dealerId === dealerId;
}

export function canAccessManufacturerDashboard(session: Session | null): boolean {
  return session?.user?.role === "MANUFACTURER";
}
