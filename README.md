# Commercial Equipment Finance Platform

A platform for capturing equipment financing applications — commercial
(business applicant, owners, personal guarantors) and consumer (individual
applicant, optional co-signer) both ship together in V1 — logging lender
submissions and decisions, and reporting on dealer and lender/program
performance. See [`docs/blueprint.md`](docs/blueprint.md) for the full data
model, lifecycle design, and the reasoning behind this rebuild.

**Status:** Phase 1 pilot build. Construction/heavy-equipment vertical,
single manufacturer, manual lender-submission and decision logging (no live
bureau pull or lender API, outside one rare routing-rule exception — see
docs/blueprint.md), no auth yet. This branch supersedes the
consumer-only prototype on `main` — see `docs/blueprint.md`, "What changed
from the original prototype." Legal/compliance review (M5, Vanguard
Captive Management) is cleared as of 2026-09-06. **Do not use with real
applicant data** until authentication is added — see `docs/blueprint.md`,
"Known limitations."

## Stack

Next.js (App Router, TypeScript) · Prisma + PostgreSQL · Tailwind CSS · Zod ·
Vitest — unchanged from the original prototype; this rebuild only changed
the data model and application logic, not the technology choices.

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

4. **Run migrations and seed demo data**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Seeds one manufacturer (construction/heavy-equipment vertical), three
   dealers, and two lenders each with one financing program.

5. **Run the app**

   ```bash
   npm run dev
   ```

   Then visit:
   - `http://localhost:3000/` — links to all three surfaces below
   - `http://localhost:3000/apply/DLR-001` — choose business or individual
     intake (`ApplicantTypeSelector`), then complete either flow
   - `http://localhost:3000/dealer/DLR-001` — that dealer's applications
   - `http://localhost:3000/dealer/DLR-001/applications/<id>` — an
     application's detail page, where lender submissions, decisions,
     acceptance, and funding are logged manually
   - `http://localhost:3000/manufacturer` — the network-wide dashboard

## Scripts

| Command              | What it does                                             |
|-----------------------|----------------------------------------------------------|
| `npm run dev`         | Start the dev server                                     |
| `npm run build`       | Production build                                          |
| `npm run test`        | Run the unit test suite (Vitest)                          |
| `npm run lint`        | ESLint                                                     |
| `npm run db:migrate`  | Apply/create migrations against `DATABASE_URL` (dev)       |
| `npm run db:seed`     | Seed demo manufacturer/dealers/lenders/programs            |
| `npm run db:studio`   | Prisma Studio — browse the database visually               |

## Project layout

```
prisma/
  schema.prisma        # the data model — read this first
  migrations/           # SQL migrations, checked in and reviewable
  seed.ts                # demo data (construction/heavy equipment vertical)
src/
  app/
    apply/[dealerCode]/                              # business or individual intake (public)
    dealer/[dealerCode]/                              # dealer application list (no auth yet)
    dealer/[dealerCode]/applications/[applicationId]/ # manual lifecycle ops screen
    manufacturer/                                      # network dashboard (no auth yet)
    api/applications/                                  # intake endpoint (both applicant types)
    api/applications/[id]/submissions/                 # log a lender submission
    api/submissions/[id]/decision/                     # record a decision
    api/applications/[id]/bureau-pull/                  # log a bureau pull (rare — see docs/blueprint.md)
    api/applications/[id]/accept/                      # accept an offer
    api/applications/[id]/fund/                        # confirm funding
  components/            # ApplicantTypeSelector, IntakeForm (business),
                          # IndividualIntakeForm (consumer), ApplicationOpsPanel, StatusBadge
  lib/
    application-status.ts # pure lifecycle-status derivation (unit tested)
    lifecycle.ts            # recomputes + persists Application.status
    validation.ts             # Zod schemas for intake and lifecycle actions
    audit-log.ts               # append-only audit trail helper
    manufacturer.ts              # single-tenant lookup
docs/
  blueprint.md            # engineering summary of the corrected model
```

## Before you build on this

Read [`docs/blueprint.md`](docs/blueprint.md) — specifically "Known
limitations." No authentication, no live bureau pull, and manual
lender-submission/decision logging are documented Phase 1 scope
boundaries, not oversights. The full blueprint document (outside this
repo) covers the legal-posture and data-rights sections this markdown
summary doesn't repeat.
