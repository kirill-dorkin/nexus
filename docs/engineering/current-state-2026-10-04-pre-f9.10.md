# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed, the durable architecture facts that must not drift, and the next coherent frontier.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

Detailed historical checkpoints are preserved at:

- `docs/engineering/current-state-2026-10-03-pre-f9.8.md`;
- `docs/engineering/current-state-2026-10-03-pre-f9.9.md`.

Use this file as the active continuation checkpoint and the archives only when older slice-level detail is needed.

## Checkpoint baseline

Last maintained: 2026-10-03.

F0-F8 foundations are established through modular-monolith boundaries, identity/tenancy/authorization, immutable curriculum, Delivery, Attempt/Submission/Validation/Evidence/Mastery, Guided Build, GitHub Projects, repository-side grader hardening, Recommendations/Readiness, and readiness-gated Enrollment completion.

F9 now establishes the first complete public paid path and its first production operational contract: provider-independent Product/immutable Price, canonical pending/paid Purchase settlement, Paddle one-time payments, safe unauthenticated public catalog reads, explicit customer Organization entry, server-authoritative public checkout, direct exact-origin browser checkout UX, Paddle return plus purchaser-safe canonical reconciliation, and low-cardinality redacted operational events for the launch-critical API/security/payment-worker path.

Production learner-code execution remains disabled. F7 repository runner/profile/sandbox artifacts do not activate production execution; a separate deployment change still requires the exact production image digest and a green real-cluster verification record.

Latest architectural decision at this checkpoint: ADR-0052.

Latest ordered migration at this checkpoint: `000039_purchaser_purchase_reconciliation.sql`.

The baseline above is an orientation marker, not permission to skip checking the live `main` head.

## Foundation frontier

### F0-F3 — architecture, tenancy, immutable curriculum, Delivery: established

The modular-monolith constitution, ADR process, PostgreSQL/RLS tenancy, users/sessions/memberships/authorization, immutable published curriculum, and LearningOffering/Enrollment/CourseRun/Group/Session/Attendance/Assignment delivery model are established.

### F4 — Activity / Attempt / Evidence learner vertical: implemented

The canonical learner lifecycle remains:

```text
Assignment / recommendation
  -> Attempt started
  -> immutable Submission
  -> ValidationResult
  -> normalized Evidence
  -> Mastery projection
  -> learner-facing skill state
```

`ValidationResult != Evidence`; only completed trusted decisive validation may normalize into automated Evidence. Infrastructure `system_error` and non-decisive review state never become negative learner Evidence. Mastery remains organization-wide by stable Skill identity. LearningEvent is a separate append-only learner history from the integration outbox.

### F5 — Guided Build: implemented API-level learner vertical

Guided Build composes with the ordinary Attempt/Submission lifecycle. Protected hints/solutions are immutable curriculum state; assistance exposure is Attempt-scoped and not Evidence. Professional compare is derived read state. Transfer work starts a separate normal Attempt rather than a parallel learner-state model.

### F6 — GitHub Projects: implemented Project activity vertical

Integrations owns GitHub external identity, trusted mapping and webhook processing. Projects owns Team/Project/repository-binding history plus normalized immutable PR/review/check facts. External GitHub activity is not Learning Evidence, and historical attribution uses immutable webhook receive time plus the binding active at that time.

### F7 — Grader hardening: repository-side foundation complete; production activation still gated

The repository contains authenticated/versioned Grader Gateway admission, Validation-owned durable grader jobs and lease/retry/dead-letter state, authenticated Worker dispatch, lease-fenced ValidationResult recording, hardened Kubernetes/gVisor controls, a separate trusted Go runner, reproducible digest-pinned artifacts, security-contract tests, and real-cluster verification tooling.

Production learner-code execution remains off until a separate deployment activation proves the exact runtime/node/admission/network/resource/security envelope.

### F8 — Recommendations / readiness / progression: implemented foundation

F8 composes versioned derived policies rather than persisting a second learner-state model:

- `ordered-mastery@1` + `fixed-interval-review@1`;
- `repeated-trusted-failure@1` suspected signal;
- authored Skill-to-Activity remediation + `repeated-failure-remediation@1`;
- `course-progression-readiness@1`;
- `offering-readiness-triage@1`;
- `course-readiness-enrollment-completion@1`.

Readiness/recommendation/signal/intervention remain derived. Enrollment persistence remains Delivery-owned.

### F9 — Commerce/public launch: first paid path + operational contract implemented

F9 preserves:

```text
Product != Price != Purchase != Entitlement != Enrollment
External provider state != canonical Commerce state
Operational telemetry != canonical business/audit/event state
```

The implemented F9 architecture now includes:

- ADR-0044 provider-independent `CommerceProduct` and immutable `CommercePrice`;
- ADR-0045 canonical Commerce-owned Purchase with `pending -> paid` and purchase-backed Entitlement settlement;
- ADR-0046 fail-closed stateless Public Catalog composition;
- ADR-0047 explicit Organization-owned `customerEntryPolicy` plus authenticated role-less self-entry;
- ADR-0048 Paddle one-time transaction adapter, trusted Purchase-to-provider mapping, signed durable webhook ingress, and lease-fenced worker settlement;
- ADR-0049 browser-safe public checkout by `organizationSlug + productSlug + exact priceId + idempotencyKey` with server-owned tenant/internal identity, money, provider, and settlement authority;
- ADR-0050 direct exact-origin credentialed Web -> API transport using the existing secure HttpOnly session and browser-attempt idempotency;
- ADR-0051 server-owned Paddle payment-link/return boundary plus authenticated purchaser-safe canonical Purchase reconciliation;
- ADR-0052 a vendor-neutral public-launch operational event contract with explicit redaction/cardinality rules and initial rollout budgets.

The paid path is:

```text
public Product route
  -> optional registration/login through HttpOnly session
  -> explicit customer entry when policy is open
  -> exact-origin public checkout
  -> pending canonical Purchase with server-owned terms
  -> Paddle transaction outside DB transaction
  -> trusted provider mapping
  -> application payment-link page + exact _ptxn
  -> Paddle.js checkout
  -> /purchases/:purchaseId return
  -> authenticated canonical reconciliation (pending is normal)
  -> signed transaction.completed webhook
  -> lease-fenced amount/currency-verified worker settlement
  -> Purchase paid + purchase-backed Entitlement atomically
  -> no Enrollment
```

F9.8 return/reconciliation invariants remain:

- payment-link URL and `_ptxn` are provider UX state, never payment evidence;
- only signed durable webhook/worker settlement may perform canonical `pending -> paid`;
- `GET /v1/me/purchases/:purchaseId` returns only the safe PublicPurchase projection;
- Purchase id is a locator, not tenant/payment authority;
- `000039` provides only the narrow purchaser-bound Organization resolver needed to establish tenant context, followed by normal tenant/RLS revalidation;
- foreign and unknown Purchase ids fail closed as the same not-found outcome;
- own historical Purchase reconciliation does not depend on current Organization Membership.

F9.9 operational invariants now established:

- operational signals are derived process output, not `events.outbox`, LearningEvent, Audit state, Commerce state, Integrations state, or a monitoring source of truth;
- API launch events expose only bounded operation/outcome/status plus duration measurement;
- browser-write security events expose only categorical allow/reject/misconfiguration reason and never the configured/supplied Origin;
- purchaser reconciliation adds only canonical `pending|paid` plus a coarse age bucket; no Purchase id/timestamp enters the event;
- payment-worker events expose only bounded outcome/error/payment-status/duration fields and no inbox/Purchase/provider ids;
- routine launch telemetry excludes business/provider identifiers, slugs, URLs/origins, purchaser PII, cookies/tokens/credentials/signatures, raw request/provider payloads, and exception messages/names;
- operational log emission is fail-open/best-effort and cannot change an already-decided HTTP/security/business or worker state outcome;
- no telemetry backend/vendor, monitoring database, migration, canonical event, or business lifecycle change is introduced;
- initial rollout latency/error budgets and security verification expectations live in `docs/engineering/public-launch-operations.md` and must be tuned after real traffic rather than treated as permanent SLOs.

Still deferred from Commerce scope: refunds/adjustments/disputes and Entitlement reversal semantics, subscriptions, supported discounts/coupons, provider-customer synchronization, purchase-history/recovery beyond the exact Purchase, and broader marketing/SEO.

## Durable architecture facts

These are continuation guardrails, not substitutes for accepted ADRs.

- Nexus is a modular monolith. A module owns its business state and application code does not reach into another module's repositories/tables.
- PostgreSQL is canonical business state. Application authorization plus RLS/transaction-local actor and tenant context provide defense in depth.
- Cross-module synchronous collaboration targets public application/query interfaces. Deferred consequences use events/outbox.
- Migrations are ordered and append-only; applied history is never rewritten.
- Published curriculum is immutable **what**; Delivery is **how / when / to whom**.
- `Attempt != Submission`; Submission is immutable committed learner work against an exact ActivityVersion.
- `ValidationResult != Evidence`; normalized Evidence, not raw validator/provider output, drives learning projection semantics.
- System/infrastructure failure must remain `system_error`, never learner failure.
- Mastery is organization-wide by stable Skill identity; learner/course context does not create a second mastery source of truth.
- Guided Build assistance is not Evidence and does not directly rewrite Mastery.
- Recommendation/readiness/intervention are versioned derived decisions, not canonical progress state.
- `Group != Team`; GitHub Project facts are not Learning Evidence.
- GitHub external ids remain Integration identities; Project ids remain platform identities.
- Untrusted learner code never executes in Web/API/Worker; only the separately gated Grader boundary may execute it.
- `Product != Price != Purchase != Entitlement != Enrollment`.
- Price commercial meaning is immutable; changed terms require a new Price identity.
- Purchase pins immutable server-priced terms; Paddle/provider state is Integrations-owned rather than canonical Purchase meaning.
- External Paddle transaction creation occurs outside the PostgreSQL business transaction; canonical Purchase idempotency plus the unique trusted mapping arbitrate application retries.
- Merchant-of-Record tax remains provider state. Settlement compares normalized commercial amount/currency with immutable Purchase terms and fails closed on mismatch.
- Webhook HTTP ingress is verify/dedupe/persist/return; paid settlement is asynchronous and lease-fenced.
- Paid Purchase + purchase-backed Entitlement + their outbox events commit atomically; settlement never auto-enrolls.
- Public catalog state is presentation/discovery, never membership/access/checkout authority.
- Customer entry is explicit Organization policy, creates only role-less active Membership, and never creates Purchase/Entitlement/Enrollment.
- Browser credentials are allowed only for exact configured `WEB_APP_ORIGIN`; Web never owns the opaque session token.
- Public checkout revalidates current server-owned Organization/Product/Price/Offering/Membership/Entitlement conditions.
- Browser checkout idempotency is attempt-scoped and reuses one UUID for ambiguous retries of the same route/Price.
- Payment return navigation is not payment evidence.
- Purchaser Purchase ids are locators only; tenant context is resolved through the narrow purchaser-bound capability and then ordinary tenant/RLS checks.
- Provider transaction/customer ids, webhook state, tax state, and checkout mapping are not exposed through purchaser reconciliation.
- Operational telemetry is not canonical state and must remain fail-open, low-cardinality, and redacted.
- Routine telemetry must not become a searchable identity ledger; case-specific diagnosis uses authorized canonical/provider support tooling.
- Refund/reversal support requires an explicit canonical Purchase/Entitlement lifecycle decision before provider reversal events may change access.

## Active F4 compatibility windows

Do not remove these without an explicit cleanup slice/migration and proven caller migration.

1. Historical `learning_progress.attempts.submission` and `submitted_at` remain for migration compatibility; dedicated `learning_progress.submissions` is source of truth for new writes.
2. The transition create-Attempt command may still carry a submission payload and must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event; deprecated `attempt.submitted` remains only as an integration alias and is not materialized as a learner LearningEvent.
4. Evidence-by-Submission is canonical API direction; Evidence-by-Attempt remains temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to imitate LearningEvent history.

## Next recommended slice

**F9.10 Browser launch verification — prove the first-party public paid UX with a real browser before expanding Commerce scope.**

F9.9 makes the paid path observable without selecting a monitoring vendor. The next smallest coherent hardening slice is browser-level verification of what unit/integration tests cannot prove: keyboard/focus behavior, rendered live/error states, cookie/CORS behavior in an actual browser context, and first-party accessibility semantics across Product -> authentication/entry -> payment-link -> reconciliation.

Before coding:

- fresh-audit current Web pages, CSS/focus states, session cookie/CORS behavior, CI runtime budget, and existing test dependencies;
- introduce the smallest supported browser-test stack only if it can run deterministically in CI without weakening the current PostgreSQL integration gates;
- verify Product checkout controls by keyboard, form labels/fieldset semantics, visible focus, busy/error/status announcements, and purchaser pending/paid/error states;
- distinguish first-party assertions from Paddle's third-party overlay: do not claim accessibility control over provider-rendered internals that the repository cannot own;
- use a deterministic local/provider seam for browser verification rather than live Paddle credentials or internet-dependent checkout completion;
- keep browser tests from becoming a second business-test suite: canonical checkout/settlement/RLS invariants remain in API/DB integration tests;
- if a synthetic/load harness is added, tie it to the measurable budgets in `public-launch-operations.md` and avoid persisting synthetic traffic as canonical business state;
- keep refunds/reversals, subscriptions, discounts/coupons, provider-customer synchronization, marketing/SEO, and F7 production grader activation outside this slice unless a fresh audit proves a correctness dependency.
