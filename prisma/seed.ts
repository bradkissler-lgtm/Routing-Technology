import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo-only password for every seeded login — never use a shared, hardcoded
// password like this outside local development (see docs/blueprint.md,
// "Known limitations" for the real gaps: no password reset, no MFA, no
// rate limiting).
export const DEMO_PASSWORD = "demo-password-2026";

// Creates the manufacturer/dealer/lender/program/user base data shared by
// both this lean seed (empty of applications — a clean slate for dev/test)
// and prisma/seed-demo.ts (the same base, plus a full sales-demo storyline
// of applications). Exported so seed-demo.ts doesn't duplicate it.
export async function seedBaseData(db: PrismaClient) {
  const manufacturer = await db.manufacturer.upsert({
    where: { slug: "demo-manufacturer" },
    update: {},
    create: {
      name: "Ridgeline Heavy Equipment Co.",
      slug: "demo-manufacturer",
    },
  });

  const dealerSeeds = [
    { code: "DLR-001", name: "Cascade Construction Equipment", contactEmail: "sales@cascadece.example.com" },
    { code: "DLR-002", name: "Northgate Heavy Machinery", contactEmail: "info@northgatehm.example.com" },
    { code: "DLR-003", name: "Ironline Equipment Sales", contactEmail: "finance@ironline.example.com" },
  ];

  const dealers = [];
  for (const dealer of dealerSeeds) {
    const created = await db.dealer.upsert({
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
    dealers.push(created);
  }

  // Two lenders, demonstrating Lender vs. FinancingProgram as separate
  // entities (Blueprint §1.4) — a captive program and a third-party program,
  // so a cascade (a submission to each) can be demonstrated without
  // conflating "which lender" with "which program."
  const captiveLender = await db.lender.upsert({
    where: { id: "demo-captive-lender" },
    update: {},
    create: { id: "demo-captive-lender", name: "Ridgeline Capital (Captive)" },
  });
  const thirdPartyLender = await db.lender.upsert({
    where: { id: "demo-third-party-lender" },
    update: {},
    create: { id: "demo-third-party-lender", name: "Summit National Bank" },
  });

  const captiveProgram = await db.financingProgram.upsert({
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
  const thirdPartyProgram = await db.financingProgram.upsert({
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

  for (const dealer of dealers) {
    const email = `${dealer.code.toLowerCase()}@demo.local`;
    await db.user.upsert({
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

  await db.user.upsert({
    where: { email: "manufacturer@demo.local" },
    update: {},
    create: {
      manufacturerId: manufacturer.id,
      email: "manufacturer@demo.local",
      passwordHash,
      role: "MANUFACTURER",
    },
  });

  return { manufacturer, dealers, captiveLender, thirdPartyLender, captiveProgram, thirdPartyProgram };
}

async function main() {
  const { manufacturer, dealers } = await seedBaseData(prisma);

  console.log(
    `Seeded manufacturer "${manufacturer.name}" with ${dealers.length} dealers and 2 lender programs.`,
  );
  console.log(
    `Demo logins (password "${DEMO_PASSWORD}" for all): ` +
      dealers.map((d) => `${d.code.toLowerCase()}@demo.local`).join(", ") +
      ", manufacturer@demo.local",
  );
  console.log(
    "No applications yet — run `npm run db:seed:demo` instead for a full sales-demo storyline.",
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
