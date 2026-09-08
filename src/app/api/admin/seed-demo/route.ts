import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDemoData } from "../../../../../prisma/seed-demo";

/**
 * One-time, browser-triggerable sales-demo seed. Not covered by src/proxy.ts
 * (no session auth) — guarded instead by a shared-secret token so it can be
 * fired by opening a URL, for environments where running `npm run
 * db:seed:demo` from a terminal against the production DATABASE_URL isn't
 * practical. Requires SEED_ADMIN_TOKEN to be set in the environment; refuses
 * to run twice against the same database (checked by application count) so
 * an accidental second click can't double the demo data.
 *
 * Delete this route once the demo database is seeded — it has no reason to
 * stay in production after its one use.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.SEED_ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "SEED_ADMIN_TOKEN is not set on this deployment." }, { status: 500 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.application.count();
  if (existing > 0) {
    return NextResponse.json({
      status: "already-seeded",
      message: `${existing} application(s) already exist — not seeding again to avoid creating duplicates.`,
    });
  }

  const result = await seedDemoData(prisma);
  return NextResponse.json({ status: "seeded", ...result });
}
