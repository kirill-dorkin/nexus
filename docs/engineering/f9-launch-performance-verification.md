# F9.11 bounded launch performance verification

F9.11 adds a repository-owned regression gate for the initial public-launch performance budgets defined in `docs/engineering/public-launch-operations.md`.

It is deliberately **not** a production capacity test, sustained load test, synthetic-monitoring system, or permanent SLO definition.

## Ownership and purpose

The verification layer owns only deterministic release evidence. It does not own Commerce, Integrations, Organization, authentication, Delivery, or Worker business state.

Canonical authority remains unchanged:

- Commerce owns Product, immutable Price, Purchase, and Entitlement state;
- Integrations owns provider mapping and durable Paddle webhook inbox state;
- Organizations owns Membership/customer-entry policy;
- the payment worker uses the existing narrow lease-fenced settlement capabilities;
- PostgreSQL remains canonical business truth;
- operational measurements are derived verification evidence only.

No migration, canonical performance table, domain event, outbox contract, telemetry backend, or new production authority is introduced.

## Covered boundaries

The CI gate exercises the warm-state launch boundaries that already have F9.9 acceptance budgets:

| Boundary | p95 acceptance budget |
|---|---:|
| public catalog list | <= 500 ms |
| public catalog detail | <= 500 ms |
| authenticated customer entry | <= 750 ms |
| public checkout | <= 3000 ms |
| signed Paddle webhook ingress | <= 500 ms |
| purchaser reconciliation | <= 750 ms |
| non-idle payment-worker cycle | <= 1000 ms |

`/v1/health` remains a readiness/smoke precondition rather than a separate F9.11 performance claim. Authentication/session creation also has no independent F9.9 budget and is therefore setup, not a measured boundary.

## Deterministic topology

The suite lives in `tests/public-launch-performance/` and is isolated behind `vitest.launch-performance.config.ts` plus `pnpm test:launch-performance`.

For HTTP boundaries it uses the real Nest/Fastify application through Fastify injection and the real PostgreSQL application role. This intentionally removes TCP/TLS/browser scheduling variance from the CI timing sample while preserving controllers, guards, application services, repositories, transactions, RLS/capability calls, serialization, and database work.

F9.10 already owns the complementary real-browser proof for HTTPS/CORS/session-cookie/accessibility behavior. F9.11 does not duplicate that surface or pretend socket-free measurements describe Internet latency.

For authenticated fixture requests, the suite uses the existing test-only principal hook. This is an identity setup seam only; authorization, tenant, Origin, membership, checkout authority, purchaser isolation, and database boundaries remain production code. Exact browser session behavior continues to be proven by F9.10 and the authentication/browser suites.

Public checkout uses the existing deterministic `PAYMENT_PROVIDER=test` seam, so no provider network call enters the measurement. Paddle webhook ingress still uses a correctly HMAC-signed raw webhook body and persists through the real durable ingress path. Payment-worker timing uses the real `PaymentWebhookProcessor.processOne()` claim/lease/settle/ack path with isolated Paddle-mapped fixtures.

## Sampling and budgets

Each boundary receives:

- 3 warm-up operations excluded from measurement;
- 20 sequential measured operations;
- nearest-rank p50 and p95;
- maximum observed duration;
- measured sample count;
- unexpected-operation error count.

A boundary fails the gate when:

- any measured operation returns an unexpected result; or
- measured p95 exceeds the existing F9.9 acceptance budget.

The suite prints one bounded machine-readable `PUBLIC_LAUNCH_PERFORMANCE_EVIDENCE=...` record containing only boundary names and aggregate timing/error fields. It contains no user, tenant, Purchase, provider-event, checkout, slug, URL, credential, raw payload, or other stable business identifier.

Twenty samples are enough for a small deterministic regression guard but not enough to justify p99, throughput, or capacity claims. Sequential sampling is intentional: concurrency/load behavior is outside this slice.

## Fixture and security invariants

Migration-role access is used only for isolated setup/cleanup and for constructing provider/worker fixtures that cannot be produced without a live provider. Measured application and worker operations use their ordinary runtime roles and narrow capabilities.

The suite preserves these invariants:

- no broad RLS bypass is added;
- browser/provider input does not become canonical authority;
- money/currency/Product/Offering/purchaser authority remains server-owned;
- webhook ingress remains verify -> durable inbox -> asynchronous processing;
- no external provider call occurs inside a PostgreSQL business transaction;
- worker settlement remains lease-fenced and amount/currency checked;
- Purchase settlement may emit its existing canonical outbox events, but performance evidence itself never enters `events.outbox`;
- all synthetic rows are isolated test fixtures and cleaned after verification.

Stateful measured paths use fresh data where it matters. Customer entry measures first-time membership creation rather than only an idempotent replay. Checkout uses fresh idempotency keys. Worker samples are backed by distinct pending purchases so the measured non-idle cycle includes the canonical settlement path rather than only idle polling.

## What this evidence means

A green F9.11 run means that, on the pinned GitHub CI environment and isolated PostgreSQL service, the bounded warm-state repository scenarios completed without unexpected errors and their measured p95 stayed inside the initial rollout acceptance thresholds.

It does **not** prove:

- a particular production RPS or concurrent-user capacity;
- p95/p99 Internet latency;
- cold-start behavior of deployed infrastructure;
- CDN, DNS, TLS, regional, or cross-region performance;
- live Paddle API or overlay performance;
- sustained/soak behavior;
- production database sizing or noisy-neighbor behavior;
- a permanent SLO.

Those claims require production telemetry and/or separately designed load/synthetic verification after deployment topology and traffic assumptions are known.

## Deferred

Intentionally deferred from F9.11:

- sustained or soak testing;
- concurrent/distributed load generation;
- production traffic simulation and capacity planning;
- external synthetic monitoring;
- persistent benchmark-history storage;
- CDN/edge/region/network budgets;
- live Paddle API and Paddle overlay timing;
- automatic budget recalibration;
- refunds/reversals, subscriptions, discounts/coupons, provider-customer synchronization, and broader marketing/SEO.

## ADR decision

No new ADR is required for F9.11 because it changes verification infrastructure only. It does not create a new production authority, persistence model, business lifecycle, security capability, integration protocol, or operational telemetry contract. If a later slice turns these measurements into a production SLO, telemetry backend, durable benchmark store, or capacity policy, that decision must be evaluated separately.
