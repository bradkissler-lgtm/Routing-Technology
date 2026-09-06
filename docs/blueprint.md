# Blueprint (Engineering Summary)

This is the developer-facing summary of the full blueprint document
("Equipment Finance Platform — Developer-Ready Blueprint") that this
rebuild implements. That document also covers the legal-posture discussion,
the field-level data-rights matrix, the commercial-proof acceptance
criteria, and the milestone plan — read it before extending this codebase
if you don't have it, ask the project owner for a copy. This file focuses
on what the code actually does and why.

## What changed from the original prototype

The first prototype (still on `main`, see its own `docs/architecture.md`)
was a plain consumer individual-buyer flow. An external review of the
original product brief found that model asked for a commercial platform
before resolving several foundational decisions, and assumed the
manufacturer should hold data it may have no legal basis to hold. This
rebuild implements the corrected model:

- **Participants are distinct types**, not one undifferentiated "buyer":
  `BusinessApplicant`, `Owner`, `Guarantor`, and `IndividualApplicant`. A
  `Lender` is separate from the `FinancingProgram` it runs — a lender can
  run several programs, captive or third-party.
- **Commercial and consumer ship together in V1** (updated 2026-09-06 —
  originally phased, that deferral is superseded). `IndividualApplicant`
  is a fully working intake path now, not schema-only: an individual
  applicant is credit-pulled directly (unlike a business, which never is),
  so `IndividualApplicant.ssnLast4` and their own `CREDIT_PULL` consent are
  required, same as a `Guarantor`'s. An individual application can also
  have an optional co-signer, using the same `Guarantor` entity as the
  commercial path's guarantors. The expectation for V1 OEMs: it's fine to
  start as a pure bank-referral OEM (every application routed to a
  third-party lender, no captive arm), but the platform must accommodate
  an OEM that wants to run its own captive financing later without an
  architecture change — the `Lender`/`FinancingProgram` split already
  supports that per program, independent of applicant type.
- **The application lifecycle is five stages, not one record**:
  `Application` → `LenderSubmission` (one per lender tried — a cascade
  produces several) → `Decision` (one per submission) → `AcceptedOffer`
  (zero-or-one per application) → `FundedTransaction`. Approval rate and
  volume are computed off `Application.status`, which is *derived* from
  this chain (see `src/lib/application-status.ts`), never by counting raw
  `Decision` rows — otherwise a cascade of declines before an eventual
  approval reads as mostly declines instead of one funded deal.
- **Consent is per-participant, per-purpose.** A business's consent to
  data sharing does not cover an individual guarantor's own credit-pull
  authorization — each guarantor consents separately (`ConsentRecord`,
  one row per participant per purpose).
- **Phase 1 has no live decisioning.** There is no bureau pull, no lender
  API, no predictive routing. Every `LenderSubmission` and `Decision` is
  logged manually by a dealer or platform operator on the application's
  detail page (`/dealer/[dealerCode]/applications/[applicationId]`). This
  is deliberate scope, not a missing feature — see "Known limitations."

## Data model

See `prisma/schema.prisma` — read it directly, this is a summary only.
Core entities: `Manufacturer`, `Dealer`, `Lender`, `FinancingProgram`,
`BusinessApplicant`, `Owner`, `IndividualApplicant`, `Guarantor`,
`Application`, `LenderSubmission`, `Decision`, `AcceptedOffer`,
`FundedTransaction`, `ConsentRecord`, `AuditLogEntry`, `DataRetentionEvent`.

`Guarantor.ssnLast4` and `IndividualApplicant.ssnLast4` are the only SSN
fragments stored — both required, since both entities are directly
credit-pulled by a lender. A `BusinessApplicant` and an `Owner` never carry
an SSN field: a business isn't a consumer-report subject, and an owner
only becomes one if they're also captured as a `Guarantor`. A live
deployment that needs a full SSN for an actual credit pull must not
persist it in this database for any of these entities — route it through
a PCI/GLBA-compliant vault and store only a reference. See the comments
directly above `model Guarantor` and `model IndividualApplicant` in the
schema.

Routing and decisioning stay entirely external in Phase 1: the platform
never performs a credit-bureau pull itself. `LenderSubmission` records
that an application was routed to a specific lender; the lender pulls
credit (or not) and decides on their own systems; `Decision` is a manual
record of that external outcome. SSN capture here is for consent/reference
and to accompany the routed application, not for this platform to query a
bureau with.

## Manufacturer's role and data access (per-tenant, resolved 2026-09-06)

Whether a participating manufacturer is itself a lender (via a captive
finance arm) or strictly a referral partner with no lending role **varies
by manufacturer** and is not fixed platform-wide. The schema already
supports this at the program level — `FinancingProgram.type` is `CAPTIVE`
or `THIRD_PARTY` per program, not a platform-wide setting — but that's a
labeling distinction, not an access-control policy.

Until a specific manufacturer's role is confirmed at onboarding, the
default is the conservative reading: **every manufacturer is treated as a
neutral referral partner.** In practice, that means manufacturer-facing
code (`src/app/manufacturer/page.tsx`) should only ever surface aggregate
figures — approval rates, volumes, dealer/lender performance — and never
raw guarantor PII or consumer-report data, regardless of whether a given
program is captive or third-party. This already holds in the current
code: the manufacturer dashboard queries dealers/programs and their
application/decision counts, never `Guarantor` rows directly; only the
dealer-facing application detail page (`/dealer/[dealerCode]/applications/
[applicationId]`) reads guarantor fields.

A manufacturer whose captive arm has a documented, reviewed compliance
basis (structurally similar to Ford Motor Credit or John Deere Financial —
a separately regulated lending entity under common ownership with the
manufacturer's brand/marketing side) may warrant broader access for that
entity specifically, but that expansion is an onboarding decision made
per manufacturer, not a platform-wide default, and it should be paired with
whatever operational/legal separation keeps the captive entity's
permissible purpose intact. Treat this as a real feature to build (a
per-manufacturer access policy setting) once a specific manufacturer needs
it — not as something to design speculatively now.

## Application lifecycle status derivation

`src/lib/application-status.ts` is a pure function (`deriveApplicationStatus`)
covered by `src/lib/__tests__/application-status.test.ts`, including the
exact regression case the blueprint calls out: two declined submissions and
one approved submission on the same application must derive to
`IN_PROGRESS`, never `CLOSED_LOST`. `src/lib/lifecycle.ts` re-reads an
application's full chain and writes this derived status inside the same
transaction as any lifecycle mutation — the stored `Application.status`
field exists for query performance, the lifecycle chain is the source of
truth.

## What's manual, and why

Every one of these is a Phase 1 scope boundary (see the blueprint's
"Explicit Scope Exclusions"), not a placeholder that got forgotten:

- Logging a `LenderSubmission` — no live lender API.
- Recording a `Decision` — no bureau pull, no automated decisioning.
- Accepting an offer and confirming funding — both operator actions.
- `Application.needsReconciliation` — a manual flag standing in for the
  real coverage/completeness measurement the pilot still needs an
  independent denominator to compute (the blueprint's four commercial-proof
  metrics: coverage, completeness, outcome visibility, dealer effort).

## Known limitations

- **No authentication.** Every page and API route here is open. This
  matters more than it did for the previous consumer prototype, since real
  business and guarantor PII flows through this form — auth is the most
  important gap before any pilot with real data.
- **Single-tenant**, same as the previous prototype — resolves to one
  seeded manufacturer via `DEMO_MANUFACTURER_SLUG`.
- **No DMS integration, no automated reconciliation job.** Both are manual
  processes for Phase 1.
- **No legal/compliance sign-off has happened yet.** This code must not be
  used with real applicant data until that review (the blueprint's M5) is
  complete. Reviewer confirmed 2026-09-06: **Vanguard Captive Management**,
  reviewing on a recurring basis "as often as required" rather than a
  single one-time approval — M5 is still the hard gate before any real
  applicant data is used, but expect re-review to continue afterward, not
  just once at the start. See the full blueprint document for what that
  review needs to cover.

## Running locally

Same as the previous prototype — see `README.md`. The seed data now
reflects the construction/heavy-equipment vertical: three dealers, two
lenders (`Ridgeline Capital` captive, `Summit National Bank` third-party),
one financing program each. Visiting `/apply/<dealerCode>` now presents a
choice between the business and individual intake paths
(`ApplicantTypeSelector`); both post to the same `/api/applications`
endpoint with a different `applicantType` discriminator.
