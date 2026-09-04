import { prisma } from "./prisma";

const DEMO_MANUFACTURER_SLUG =
  process.env.DEMO_MANUFACTURER_SLUG ?? "demo-manufacturer";

/**
 * MVP is single-tenant: every request resolves against one seeded
 * manufacturer. Multi-manufacturer tenancy (resolving by subdomain, API key,
 * or session) is a V2 item — the data model already supports it, this
 * lookup is the only place that needs to change. See /docs/architecture.md.
 */
export async function getCurrentManufacturer() {
  const manufacturer = await prisma.manufacturer.findUnique({
    where: { slug: DEMO_MANUFACTURER_SLUG },
  });

  if (!manufacturer) {
    throw new Error(
      `No manufacturer found for slug "${DEMO_MANUFACTURER_SLUG}". Run "npm run db:seed" first.`,
    );
  }

  return manufacturer;
}
