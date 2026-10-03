# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed, the durable architecture facts that must not drift, and the next coherent frontier.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

The detailed pre-F9.8 checkpoint is preserved verbatim at `docs/engineering/current-state-2026-10-03-pre-f9.8.md`. Read that archive when historical slice-level detail is needed; use this file as the active continuation checkpoint.

## Checkpoint baseline

Last maintained: 2026-10-03.

Baseline repository state: F0-F8 foundations are established through immutable curriculum, Delivery, learner Attempt/Submission/Validation/Evidence/Mastery, Guided Build, GitHub Projects, repository-side grader hardening, recommendations/readiness, and readiness-gated Enrollment completion. F9 now includes provider-independent Product/immutable Price, canonical pending/paid Purchase settlement, Paddle one-time payments, safe unauthenticated sellable catalog reads, explicit customer Organization entry, server-authoritative public checkout, direct exact-origin browser checkout UX, and purchaser-safe Paddle return/reconciliation against canonical Purchase state.

Production learner-code execution remains disabled: repository-side F7 runner/profile/sandbox artifacts are present, but activation still requires the exact production image digest plus a green real-cluster verification record in a separate deployment change.

Latest architectural decision at this checkpoint: ADR-0051.

Latest ordered migration at this checkpoint: `000039_purchaser_purchase_reconciliation.sql`.

The baseline above is an orientation marker, not permission to skip checking the live `main` head.

## Foundation frontier

### F0-F3 — architecture, identity/tenancy, immutable curriculum, Delivery: established

The modular-monolith constitution, module ownership, ADR process, PostgreSQL/RLS tenancy, users/sessions/memberships/authorization, immutable published curriculum, LearningOffering/Enrollment/CourseRun/Group/Session/Attendance/Assignment delivery model, and delivery-history hardening are established.

### F4 — Activity / Attempt / Evidence learner vertical: implemented

The canonical learner path remains:

```text
Assignment / recommendation
  -> Attempt started
  -> immutable Submission
  -> ValidationResult
  -> normalized Evidence
  -> Mastery projection
  -> learner-facing skill state
```

ValidationResult and Evidence remain separate. Only completed trusted decisive validation can normalize into automated Evidence; infrastructure `system_error` and non-decisive review state never become negative learner Evidence. Mastery is organization-wide by stable Skill identity, while Enrollment/CourseVersion select learner presentation context. LearningEvent is a separate append-only product history journal from the integration outbox.

### F5 — Guided Build: implemented API-level learner vertical

Guided Build composes with the ordinary Attempt/Submission lifecycle. Protected hints/solutions are immutable curriculum state; assistance exposure is Attempt-scoped, append-only, and not Evidence. Professional compare is derived read state. Transfer work starts a separate ordinary Attempt through Learning Progress rather than a parallel learner-state model.

### F6 — GitHub Projects: implemented Project activity vertical

Integrations owns GitHub external identity, trusted setup/mapping, webhook ingress/routing, and durable processing. Projects owns Team/Project/repository-binding history and normalized immutable PR/review/check facts. External GitHub activity is not Learning Evidence. Historical Project attribution uses immutable webhook receive time and the repository binding active at that time.

### F7 — Grader hardening: repository-side foundation complete; production activation still gated

The repository has versioned authenticated Grader Gateway admission, Validation-owned durable grader-job intent plus lease/retry/dead-letter state, authenticated Worker dispatch, lease-fenced atomic system-owned ValidationResult recording, hardened Kubernetes/gVisor provider controls, a separate trusted Go runner, reproducible digest-pinned release artifacts, security-contract tests, and a fail-closed real-cluster verification harness.

Production execution remains off by default. `GRADER_SANDBOX_PROVIDER` remains unavailable unless a separate deployment activation proves the exact image/runtime/node/admission/network/resource/security envelope.

### F8 — recommendations / instructor intelligence / progression: implemented foundation

F8 composes versioned derived policies rather than persisting a second learner-state model:

- `ordered-mastery@1` plus `fixed-interval-review@1` review scheduling;
- `repeated-trusted-failure@1` suspected-misconception signal from normalized trusted Evidence;
- authored CourseVersion Skill-to-Activity remediation plus `repeated-failure-remediation@1` action override;
- `course-progression-readiness@1` derived readiness;
- `offering-readiness-triage@1` instructor/mentor Offering overview;
- `course-readiness-enrollment-completion@1` enforced self-completion gate.

Readiness, misconception, intervention, review schedule, and overview remain derived. Enrollment persistence remains Delivery-owned.

### F9 — Commerce/public launch: checkout return + purchaser reconciliation implemented

F9 preserves:

```text
Product != Price != Purchase != Entitlement != Enrollment
External provider state != canonical Commerce state
```

The implemented F9 vertical now includes:

- ADR-0044 provider-independent `CommerceProduct` plus immutable `CommercePrice`;
- ADR-0045 canonical Commerce-owned Purchase with `pending -> paid` lifecycle and purchase-backed Entitlement settlement;
- ADR-0046 stateless, fail-closed Public Catalog composition over safe Organization + Commerce + Delivery application reads;
- ADR-0047 explicit Organization-owned `customerEntryPolicy` and authenticated role-less customer self-entry;
- ADR-0048 active Paddle one-time payment adapter, trusted Purchase-to-provider mapping, signed durable `transaction.completed` ingress, and lease-fenced worker settlement;
- ADR-0049 browser-safe public checkout by `organizationSlug + productSlug + exact priceId + idempotencyKey`, with all tenant/internal identity, money, provider, and settlement state server-owned;
- ADR-0050 direct credentialed Web -> API browser transport constrained to exact `WEB_APP_ORIGIN`, existing secure HttpOnly session authentication, explicit customer entry, attempt-scoped browser idempotency, and Product-to-Paddle checkout UX;
- ADR-0051 server-owned Paddle payment-link/return boundary and authenticated purchaser-safe canonical Purchase reconciliation.

The current paid path is:

```text
public Product route
  -> optional registration/login through HttpOnly API session
  -> explicit customer entry when Organization policy is open
  -> exact-origin public checkout command
  -> pending canonical Purchase with immutable server-owned terms
  -> Paddle transaction created outside DB transaction
  -> trusted (provider, transaction id) mapping
  -> configured application payment-link page + exact _ptxn
  -> Paddle.js opens the provider transaction
  -> success navigation to /purchases/:purchaseId
  -> authenticated GET /v1/me/purchases/:purchaseId
  -> pending is normal while webhook/worker settlement catches up
  -> signed transaction.completed durable webhook
  -> lease-fenced amount/currency-verified settlement
  -> Purchase paid + purchase-backed Entitlement atomically
  -> no Enrollment
```

F9.8 invariants now established:

- the Paddle adapter sets transaction `checkout.url` to the configured application origin and exact `/checkout/paddle/:purchaseId` path;
- the returned provider URL is rejected unless origin/path remain exact and `_ptxn` equals the returned Paddle transaction id;
- provider transaction identity remains Integrations-owned and is used by the browser only to operate Paddle Checkout;
- Paddle redirect/query/browser state never marks a Purchase paid and never grants access;
- only existing signed durable webhook + worker settlement may perform canonical `pending -> paid`;
- `GET /v1/me/purchases/:purchaseId` is Commerce-owned and returns the existing safe `PublicPurchase` projection only;
- `purchaseId` is a locator, not tenant/payment authority;
- migration `000039` adds a narrow `commerce.resolve_owned_purchase_organization(uuid)` `SECURITY DEFINER` capability, `search_path = pg_catalog`, revoked from `PUBLIC`, executable only by `platform_app`, and bound to transaction-local authenticated purchaser identity;
- after tenant resolution Commerce rechecks active User plus canonical purchaser relation in a read-only tenant transaction;
- foreign and unknown Purchase ids fail closed as the same not-found outcome;
- historical own-Purchase reconciliation does not depend on current Organization Membership; Membership remains required when opening a new Purchase;
- the return UI boundedly polls canonical Purchase state and treats `pending` as normal;
- no new canonical payment status, checkout entity, outbox event, Entitlement lifecycle, or Enrollment behavior is introduced.

Still deferred from the first paid vertical: Purchase-history listing/recovery beyond an exact Purchase, explicit cancel/close presentation, refunds/adjustments/disputes and Entitlement reversal semantics, subscriptions, supported discounts/coupons, provider-customer synchronization, distributed auth abuse protection, marketing/SEO, and broader production launch hardening.

## Durable architecture facts

These are continuation guardrails, not substitutes for the accepted ADRs.

- Nexus is a modular monolith. A module owns its business state; application code does not integrate by reading another module's repositories/tables.
- PostgreSQL is canonical business state. RLS and transaction-local actor/organization context are defense in depth beneath application authorization.
- Cross-module synchronous collaboration targets public application/query interfaces. Deferred consequences use events/outbox.
- Migrations are ordered and append-only; applied migration history is never rewritten.
- Published curriculum is immutable **what**; Delivery is **how / when / to whom**.
- `Attempt != Submission`; Submission is immutable committed learner work against an exact ActivityVersion.
- `ValidationResult != Evidence`; only normalized learning signal changes Mastery semantics.
- System/infrastructure failure must remain `system_error`, never learner failure.
- Mastery is organization-wide by stable Skill identity; learner/course context does not create a second mastery source of truth.
- Guided Build assistance is not Evidence and does not directly rewrite Mastery.
- Recommendation/readiness/intervention are versioned derived decisions, not canonical progress state.
- `Group != Team` and GitHub Project facts are not Learning Evidence.
- GitHub external ids remain Integration identities; Project ids remain platform identities.
- Untrusted learner code never executes in Web/API/Worker; only the separately gated Grader boundary may execute it.
- `Product != Price != Purchase != Entitlement != Enrollment`.
- Price commercial meaning is immutable; changed terms require a new Price identity.
- Purchase pins immutable server-priced commercial terms. Paddle/provider state is Integrations-owned rather than canonical Purchase meaning.
- External Paddle transaction creation occurs outside the PostgreSQL business transaction; canonical Purchase idempotency plus the unique trusted provider mapping arbitrate application retries.
- Merchant-of-Record tax remains provider state. Settlement compares the normalized commercial amount/currency against immutable Purchase terms and fails closed on mismatch.
- Webhook HTTP ingress is verify/dedupe/persist/return; canonical paid settlement is asynchronous and lease-fenced.
- Paid Purchase + purchase-backed Entitlement + their outbox events commit atomically; settlement never auto-enrolls.
- Public catalog state is presentation/discovery, never membership, access, or checkout authority.
- Customer entry is explicit Organization policy, creates only a role-less active Membership, and never creates Purchase/Entitlement/Enrollment.
- Browser credentialed transport is allowed only for exact configured `WEB_APP_ORIGIN`; Web never stores the opaque session token.
- Public checkout revalidates current server-owned Organization/Product/Price/Offering/Membership/Entitlement conditions in its own authority transaction.
- Browser checkout idempotency is attempt-scoped and reuses one UUID for ambiguous retries of the same route/Price.
- Payment return navigation is not payment evidence.
- A purchaser-facing Purchase id is only a locator. Tenant context for `/me/purchases/:purchaseId` may be resolved only by the narrow purchaser-bound database capability, followed by ordinary tenant/RLS revalidation.
- Provider transaction id, webhook processing state, provider customer identity, tax state, and checkout mapping are not exposed through purchaser reconciliation.
- Refund/reversal support requires an explicit canonical Purchase/Entitlement lifecycle decision before provider reversal events may change access.

## Active F4 compatibility windows

Do not remove these without an explicit cleanup slice/migration and proven caller migration.

1. Historical `learning_progress.attempts.submission` and `submitted_at` remain for migration compatibility; dedicated `learning_progress.submissions` is source of truth for new writes.
2. The transition create-Attempt command may still carry a submission payload and must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event; deprecated `attempt.submitted` remains only as an integration alias and is not materialized as a learner LearningEvent.
4. Evidence-by-Submission is canonical API direction; Evidence-by-Attempt remains temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to imitate LearningEvent history.

## Next recommended slice

**F9.9 Public-launch hardening baseline — make the completed public paid path observable and verifiable before expanding commercial product scope.**

F9.8 closes the Product -> Paddle -> application return -> canonical purchaser reconciliation loop. The next coherent Foundation work should harden that completed path for production operations rather than immediately invent refunds, subscriptions, discount models, or provider-customer state.

Before coding:

- fresh-audit the merged public catalog/auth/customer-entry/checkout/payment-link/Paddle webhook/payment-worker/reconciliation path plus current deployment/telemetry/runbook boundaries;
- define low-cardinality, redacted operational signals for public request health, checkout creation, webhook acceptance, worker settlement outcomes, reconciliation latency, and fail-closed security errors without logging session secrets, raw provider payloads, purchaser PII, or learner data;
- define measurable load/latency/error budgets for the public read/write and webhook/worker path before adding infrastructure merely for scale;
- verify accessibility of Product, payment-link, and Purchase-status UX including keyboard/focus/live-region/error states;
- verify the complete security boundary: exact-origin CORS/browser writes, HttpOnly session behavior, provider checkout-URL validation, raw-body webhook signature verification, purchaser 404 isolation, and least-privilege DB/worker capabilities;
- add launch-oriented verification/runbooks only where they close a concrete operational gap; avoid duplicating canonical business state into monitoring tables;
- keep refunds/reversals, subscriptions, discounts/coupons, provider-customer synchronization, broader marketing/SEO, and F7 production grader activation outside F9.9 unless a fresh audit proves a correctness dependency.
