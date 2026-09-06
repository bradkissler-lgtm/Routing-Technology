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
docs/blueprint.md). This branch supersedes the consumer-only prototype on
`main` — see `docs/blueprint.md`, "What changed from the original
prototype." Both hard gates before real applicant data are now cleared:
legal/compliance review (M5, Vanguard Captive Management, 2026-09-06) and
authentication (2026-09-06, see "Sign in" below). **Do not use with real
applicant data** until the remaining items in `docs/blueprint.md`, "Known
limitations" are also addressed (no SSO, password reset, MFA, or
login-attempt rate limiting yet — Phase 1 auth scope, not oversights).

## Stack

Next.js (App Router, TypeScript) · Prisma + PostgreSQL · Tailwind CSS · Zod ·
Vitest · next-auth (Auth.js v5) — unchanged from the original prototype
apart from auth; this rebuild only changed the data model, application
logic, and (as of 2026-09-06) added login, not the core technology choices.

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

   Also set `AUTH_SECRET` — generate one with `openssl rand -base64 32`.

4. **Run migrations and seed demo data**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Seeds one manufacturer (construction/heavy-equipment vertical), three
   dealers, two lenders each with one financing program, and demo logins
   (see "Sign in" below).

5. **Run the app**

   ```bash
   npm run dev
   ```

   Then visit `http://localhost:3000/` and sign in (below) before trying
   any of the dealer or manufacturer surfaces — they all require it now.

## Sign in

Every `/apply`, `/dealer`, and `/manufacturer` route (and the API routes
they call) requires a session. `npm run db:seed` creates one `DEALER`
login per seeded dealer, scoped to that dealer only, plus one
`MANUFACTURER` login scoped to the aggregate-only dashboard — see
`docs/blueprint.md`, "Authentication" for the full role model.

| Email                     | Password             | Role         | Scope                     |
|----------------------------|----------------------|--------------|---------------------------|
| `dlr-001@demo.local`       | `demo-password-2026` | `DEALER`     | Cascade Construction Equipment (DLR-001) only |
| `dlr-002@demo.local`       | `demo-password-2026` | `DEALER`     | Northgate Heavy Machinery (DLR-002) only |
| `dlr-003@demo.local`       | `demo-password-2026` | `DEALER`     | Ironline Equipment Sales (DLR-003) only |
| `manufacturer@demo.local`  | `demo-password-2026` | `MANUFACTURER` | Network dashboard only, no dealer PII |

These are demo-only credentials sharing one hardcoded password — never do
this outside local development. A `DEALER` login for one dealer gets a 404
if it tries to reach another dealer's pages or API routes; a
`MANUFACTURER` login gets a 404 on any dealer page.

Once signed in:
- `http://localhost:3000/apply/DLR-001` — choose business or individual
  intake (`ApplicantTypeSelector`), then complete either flow (requires
  the matching `DLR-001` dealer login)
- `http://localhost:3000/dealer/DLR-001` — that dealer's applications
- `http://localhost:3000/dealer/DLR-001/applications/<id>` — an
  application's detail page, where lender submissions, decisions,
  acceptance, funding, and bureau pulls are logged manually
- `http://localhost:3000/manufacturer` — the network-wide dashboard
  (requires the `manufacturer@demo.local` login)

## Scripts

| Command              | What it does                                             |
|-----------------------|----------------------------------------------------------|
| `npm run dev`         | Start the dev server                                     |
| `npm run build`       | Production build                                          |
| `npm run test`        | Run the unit test suite (Vitest)                          |
| `npm run lint`        | ESLint                                                     |
| `npm run db:migrate`  | Apply/create migrations against `DATABASE_URL` (dev)       |
| `npm run db:seed`     | Seed demo manufacturer/dealers/lenders/programs/logins      |
| `npm run db:studio`   | Prisma Studio — browse the database visually               |

## Project layout

```
prisma/
  schema.prisma        # the data model — read this first
  migrations/           # SQL migrations, checked in and reviewable
  seed.ts                # demo data + demo logins (construction/heavy equipment vertical)
src/
  proxy.ts                                              # requires a session for every protected route (next-auth)
  app/
    login/                                              # sign-in page
    apply/[dealerCode]/                                 # business or individual intake (DEALER login required)
    dealer/[dealerCode]/                                # dealer application list (DEALER login required)
    dealer/[dealerCode]/applications/[applicationId]/   # manual lifecycle ops screen (DEALER login required)
    manufacturer/                                        # network dashboard (MANUFACTURER login required)
    api/auth/[...nextauth]/                              # next-auth route handlers
    api/applications/                                    # intake endpoint (both applicant types)
    api/applications/[id]/submissions/                   # log a lender submission
    api/submissions/[id]/decision/                        # record a decision
    api/applications/[id]/bureau-pull/                    # log a bureau pull (rare — see docs/blueprint.md)
    api/applications/[id]/accept/                        # accept an offer
    api/applications/[id]/fund/                          # confirm funding
  components/            # ApplicantTypeSelector, IntakeForm (business),
                          # IndividualIntakeForm (consumer), ApplicationOpsPanel, StatusBadge,
                          # LoginForm, SignOutButton
  lib/
    auth.ts                  # next-auth config — Credentials provider, JWT sessions
    access-control.ts          # canAccessDealer / canAccessManufacturerDashboard (unit tested)
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
limitations" and "Authentication." No live bureau pull (outside the one
routing-rule exception), manual lender-submission/decision logging, and
the auth gaps listed there (no SSO, password reset, MFA, or rate limiting)
are documented Phase 1 scope boundaries, not oversights. The full
blueprint document (outside this repo) covers the legal-posture and
data-rights sections this markdown summary doesn't repeat.
