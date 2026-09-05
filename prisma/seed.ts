import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seeds one demo manufacturer in the construction/heavy-equipment vertical
// with a small dealer network and two lenders (one captive program, one
// third-party) so the dealer and manufacturer views have something to show
// before any real submissions come in. MVP is single-tenant: every query in
// this app resolves against DEMO_MANUFACTURER_SLUG (see
// src/lib/manufacturer.ts). See /docs/blueprint.md for the full model.
async function main() {
  const manufacturer = await prisma.manufacturer.upsert({
    where: { slug: "demo-manufacturer" },
    update: {},
    create: {
      name: "Ridgeline Heavy Equipment Co.",
      slug: "demo-manufacturer",
    },
  });

  const dealers = [
    { code: "DLR-001", name: "Cascade Construction Equipment", contactEmail: "sales@cascadece.example.com" },
    { code: "DLR-002", name: "Northgate Heavy Machinery", contactEmail: "info@northgatehm.example.com" },
    { code: "DLR-003", name: "Ironline Equipment Sales", contactEmail: "finance@ironline.example.com" },
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

  // Two lenders, demonstrating Lender vs. FinancingProgram as separate
  // entities (Blueprint §1.4) — a captive program and a third-party program,
  // so a cascade (a submission to each) can be demonstrated without
  // conflating "which lender" with "which program."
  const captiveLender = await prisma.lender.upsert({
    where: { id: "demo-captive-lender" },
    update: {},
    create: { id: "demo-captive-lender", name: "Ridgeline Capital (Captive)" },
  });
  const thirdPartyLender = await prisma.lender.upsert({
    where: { id: "demo-third-party-lender" },
    update: {},
    create: { id: "demo-third-party-lender", name: "Summit National Bank" },
  });

  await prisma.financingProgram.upsert({
    where: { id: "demo-captive-program" },
    update: {},
    create: {
      id: "demo-captive-program",
      manufacturerId: manufacturer.id,
      lenderId: captiveLender.id,
      name: "Ridgeline Equipment Finance",
      type: "CAPTIVE",
    },
  });
  await prisma.financingProgram.upsert({
    where: { id: "demo-third-party-program" },
    update: {},
    create: {
      id: "demo-third-party-program",
      manufacturerId: manufacturer.id,
      lenderId: thirdPartyLender.id,
      name: "Summit Commercial Equipment Program",
      type: "THIRD_PARTY",
    },
  });

  console.log(
    `Seeded manufacturer "${manufacturer.name}" with ${dealers.length} dealers and 2 lender programs.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
