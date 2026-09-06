import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo-only password for every seeded login — never use a shared, hardcoded
// password like this outside local development (see docs/blueprint.md,
// "Known limitations" for the real gaps: no password reset, no MFA, no
// rate limiting).
const DEMO_PASSWORD = "demo-password-2026";

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

  const createdDealers = [];
  for (const dealer of dealers) {
    const created = await prisma.dealer.upsert({
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
    createdDealers.push(created);
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

  // One DEALER-role user per seeded dealer (scoped to that dealer only —
  // see prisma/schema.prisma, model User) plus one MANUFACTURER-role user
  // for the aggregate dashboard. All demo accounts share DEMO_PASSWORD;
  // never do this outside local development.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const dealer of createdDealers) {
    const email = `${dealer.code.toLowerCase()}@demo.local`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        manufacturerId: manufacturer.id,
        email,
        passwordHash,
        role: "DEALER",
        dealerId: dealer.id,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "manufacturer@demo.local" },
    update: {},
    create: {
      manufacturerId: manufacturer.id,
      email: "manufacturer@demo.local",
      passwordHash,
      role: "MANUFACTURER",
    },
  });

  console.log(
    `Seeded manufacturer "${manufacturer.name}" with ${dealers.length} dealers and 2 lender programs.`,
  );
  console.log(
    `Demo logins (password "${DEMO_PASSWORD}" for all): ` +
      createdDealers.map((d) => `${d.code.toLowerCase()}@demo.local`).join(", ") +
      ", manufacturer@demo.local",
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
