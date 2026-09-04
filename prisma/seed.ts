import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seeds one demo manufacturer with a small dealer network and a captive
// finance program, so the dealer and manufacturer views have something to
// show before any real submissions come in. MVP is single-tenant: every
// query in this app resolves against DEMO_MANUFACTURER_SLUG (see
// src/lib/manufacturer.ts). Multi-manufacturer tenancy is a V2 item — see
// /docs/architecture.md.
async function main() {
  const manufacturer = await prisma.manufacturer.upsert({
    where: { slug: "demo-manufacturer" },
    update: {},
    create: {
      name: "Demo Manufacturer Co.",
      slug: "demo-manufacturer",
    },
  });

  const dealers = [
    { code: "DLR-001", name: "Northside Powersports", contactEmail: "sales@northsideps.example.com" },
    { code: "DLR-002", name: "Lakefront Outdoor Equipment", contactEmail: "info@lakefrontoe.example.com" },
    { code: "DLR-003", name: "Summit Ridge Motors", contactEmail: "finance@summitridge.example.com" },
  ];

  for (const dealer of dealers) {
    await prisma.dealer.upsert({
      where: {
        manufacturerId_code: {
          manufacturerId: manufacturer.id,
          code: dealer.code,
        },
      },
      update: {},
      create: {
        manufacturerId: manufacturer.id,
        code: dealer.code,
        name: dealer.name,
        contactEmail: dealer.contactEmail,
      },
    });
  }

  await prisma.lenderProgram.upsert({
    where: { id: "demo-captive-finance-seed" },
    update: {},
    create: {
      id: "demo-captive-finance-seed",
      manufacturerId: manufacturer.id,
      name: "Demo Captive Finance",
      type: "CAPTIVE",
    },
  });

  console.log(`Seeded manufacturer "${manufacturer.name}" with ${dealers.length} dealers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
