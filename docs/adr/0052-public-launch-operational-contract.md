# ADR-0052: Public-launch operational event contract

- Status: Accepted
- Date: 2026-10-03

## Context

F9.1-F9.8 establish a complete first paid path from public discovery through authenticated customer entry, canonical Purchase checkout, Paddle transaction handoff, signed webhook settlement, purchase-backed Entitlement grant, and purchaser-safe reconciliation.

The runtime has no explicit public-launch observability contract. API boundaries rely on ordinary Nest logging, while the payment worker historically logged durable `inboxId` and `purchaseId` values and exception messages. That is useful during development but is a poor production telemetry contract: those values are high-cardinality, stable identifiers, and exception messages may include database/provider details that should not become routine operational dimensions.

Introducing Prometheus, OpenTelemetry, a vendor agent, a monitoring database, or distributed tracing before defining what is safe and useful to observe would couple the architecture to tooling before the operational contract is known.

## Decision

### Operational events are runtime observations, not business state

Public-launch operational events are emitted to the process logger only. They are not `events.outbox`, LearningEvent, Audit state, Commerce state, Integrations webhook state, or a new canonical monitoring table. Emission must never participate in authorization, checkout, webhook acknowledgement, Purchase settlement, Entitlement grant, or Enrollment behavior.

A failed log write must not become payment authority. Business correctness continues to come from the existing PostgreSQL state and signed webhook/worker boundaries.

### Events use an explicit low-cardinality allowlist

The API emits `public_launch.http` only for the launch-critical boundaries:

- public catalog list/detail;
- explicit customer Organization entry;
- public checkout initiation;
- Paddle webhook ingress;
- purchaser Purchase reconciliation.

The allowed fields are only:

```text
event, operation, outcome, statusCode, durationMs
```

Purchaser reconciliation may additionally emit `public_launch.reconciliation` with only:

```text
event, purchaseStatus, ageBucket
```

`ageBucket` is coarse (`<30s`, `30s-2m`, `2m-5m`, `5m-15m`, `>=15m`) rather than a timestamp or Purchase identifier. For a paid Purchase it represents creation-to-settlement age; for a pending Purchase it represents creation-to-observation age. It is a user-path health signal, not proof of provider processing latency.

The browser-write Origin guard emits `public_launch.security` with categorical allow/reject/misconfiguration reasons. It never logs the configured or supplied Origin value.

The payment worker emits `public_launch.payment_worker` with only bounded outcome/error/payment-status/duration fields. Runtime failures collapse to `runtime_error | unknown_error`; exception names/messages are not operational dimensions.

### Routine launch events deliberately exclude identifying and secret material

The standard event contract must not include:

- User, Organization, Product, Price, Offering, Purchase, inbox, event-delivery, or provider transaction/customer identifiers;
- organization/product slugs;
- checkout URLs or Origin values;
- email/display name or other purchaser PII;
- session cookies/tokens, Paddle client/server credentials, webhook signatures, or request headers;
- request/response bodies or raw provider webhook payloads;
- exception messages or database/provider error text.

When an operator needs case-specific diagnosis, they must use authorized canonical database/provider support tooling rather than turning global operational telemetry into a searchable identity ledger.

### Tooling remains replaceable

ADR-0052 defines event semantics, not a telemetry vendor. The API may use the Nest process logger and the payment worker may use its existing Pino logger. A later deployment can collect and transform these process logs into metrics/traces without changing Commerce/Integrations semantics.

A future Prometheus/OpenTelemetry/vendor choice must preserve the same redaction and cardinality rules. Distributed correlation identifiers are deferred until their privacy, retention, and cardinality contract is explicit.

## Operational consequences

- HTTP duration and status/outcome allow aggregate latency/error monitoring of launch-critical boundaries.
- payment-worker outcome and duration reveal blocked/rejected/retry/dead-letter behavior without leaking durable ids.
- reconciliation status/age buckets expose prolonged pending UX as an aggregate signal without pretending browser state proves payment.
- origin rejection/misconfiguration becomes observable without logging origin strings.
- existing business idempotency, RLS, webhook verification, lease fencing, and settlement semantics remain unchanged.

## Compatibility

This change is additive to business behavior and requires no migration. Existing HTTP response contracts, Purchase lifecycle, Paddle mapping, webhook inbox, worker database capabilities, Entitlement settlement, and Enrollment behavior are unchanged.

## Deferred

- telemetry backend/vendor selection and retention policy;
- distributed tracing/correlation ids;
- browser E2E and automated accessibility tooling;
- synthetic production probes and external uptime monitoring;
- refunds/reversals, subscriptions, discounts/coupons, and provider-customer synchronization.
