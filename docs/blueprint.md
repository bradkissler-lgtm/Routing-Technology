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
  `BusinessApplicant`, `Owner`, `Guarantor`, and (schema-only, Phase 2)
  `IndividualApplicant`. A `Lender` is separate from the `FinancingProgram`
  it runs — a lender can run several programs, captive or third-party.
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
`BusinessApplicant`, `Owner`, `IndividualApplicant` (Phase 2, unused by any
route yet), `Guarantor`, `Application`, `LenderSubmission`, `Decision`,
`AcceptedOffer`, `FundedTransaction`, `ConsentRecord`, `AuditLogEntry`,
`DataRetentionEvent`.

`Guarantor.ssnLast4` is the only SSN fragment stored, matching the previous
prototype's approach. A live deployment that needs a full SSN for an actual
credit pull must not persist it in this database — route it through a
PCI/GLBA-compliant vault and store only a reference. See the comment
directly above `model Guarantor` in the schema.

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
- **No legal/compliance sign-off has happened.** This code must not be
  used with real applicant data until that review (the blueprint's M5) is
  complete — see the full blueprint document for what that review needs to
  cover.

## Running locally

Same as the previous prototype — see `README.md`. The seed data now
reflects the construction/heavy-equipment vertical: three dealers, two
lenders (`Ridgeline Capital` captive, `Summit National Bank` third-party),
one financing program each.
