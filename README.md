# Dealer Network Credit Application Platform

A manufacturer platform for capturing, overseeing, and reporting on
dealer-network credit applications, lenders, and end-buyer data. See
[`docs/architecture.md`](docs/architecture.md) for the full spec, data model,
and roadmap this MVP slice was built against.

**Status:** MVP vertical slice. Single manufacturer, single stubbed lender
decision engine, no auth yet. See "Known limitations" in the architecture doc
before treating any part of this as production-ready.

## Stack

Next.js (App Router, TypeScript) · Prisma + PostgreSQL · Tailwind CSS · Zod ·
Vitest. Nothing here is exotic — see "Why this stack" in the architecture doc.

## Get running locally (should take under 15 minutes)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Postgres.** Either Docker Compose:

   ```bash
   docker compose up -d
   ```

   or point `DATABASE_URL` (next step) at any Postgres 14+ instance you
   already have running.

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   The defaults in `.env.example` match the Docker Compose service, so if
   you used step 2 as-is you don't need to change anything.

4. **Run migrations and seed demo data**

   ```bash
   npm run db:migrate   # applies prisma/migrations, or creates a new one if the schema changed
   npm run db:seed      # seeds one demo manufacturer, 3 dealers, 1 lender program
   ```

   (First run in a fresh database: use `npm run db:migrate` — this runs
   `prisma migrate dev`, which applies `prisma/migrations/0001_init` since it
   already exists. `npx prisma migrate deploy` also works and is what CI/prod
   should use instead, since it never generates new migrations.)

5. **Run the app**

   ```bash
   npm run dev
   ```

   Then visit:
   - `http://localhost:3000/` — links to all three surfaces below
   - `http://localhost:3000/apply/DLR-001` — the buyer-facing application form
   - `http://localhost:3000/dealer/DLR-001` — that dealer's submissions
   - `http://localhost:3000/manufacturer` — the network-wide dashboard

   Submit an application at `/apply/DLR-001` and watch it show up on the
   dealer and manufacturer pages immediately.

## Scripts

| Command              | What it does                                             |
|-----------------------|----------------------------------------------------------|
| `npm run dev`         | Start the dev server                                     |
| `npm run build`       | Production build                                          |
| `npm run test`        | Run the unit test suite (Vitest)                          |
| `npm run lint`        | ESLint                                                     |
| `npm run db:migrate`  | Apply/create migrations against `DATABASE_URL` (dev)       |
| `npm run db:seed`     | Seed demo manufacturer/dealers/lender program              |
| `npm run db:studio`   | Prisma Studio — browse the database visually               |

## Project layout

```
prisma/
  schema.prisma        # the data model — read this first
  migrations/           # SQL migrations, checked in and reviewable
  seed.ts                # demo data for local dev
src/
  app/
    apply/[dealerCode]/   # buyer-facing application form (public)
    dealer/[dealerCode]/  # dealer oversight view (read-only, no auth yet)
    manufacturer/          # manufacturer network dashboard (no auth yet)
    api/applications/      # POST endpoint dealers'/DMSs' own systems can call directly
  components/            # ApplicationForm, StatusBadge
  lib/
    decision-engine.ts    # STUB — replace before any real lender integration
    validation.ts          # Zod schemas shared by the form and the API route
    audit-log.ts            # append-only audit trail helper
    manufacturer.ts          # single-tenant lookup (see "Known limitations")
docs/
  architecture.md         # full spec, data model rationale, roadmap, handoff package
```

## Before you build on this

Read [`docs/architecture.md`](docs/architecture.md) — specifically "Known
limitations" and "Before this touches real money or real lenders." The stub
decision engine, the lack of auth, and the SSN-handling note are not
oversights; they're documented scope boundaries for an MVP demo.
