# Public launch operations baseline

This runbook defines the first operational verification contract for the public paid path. It complements ADR-0052 and the canonical Commerce/Integrations ADRs; it does not replace them.

## Scope

The observed path is:

```text
public catalog
  -> authenticated customer entry when required
  -> public checkout
  -> Paddle payment-link page
  -> signed Paddle webhook ingress
  -> payment worker settlement
  -> purchaser reconciliation
```

Operational telemetry is derived process output only. PostgreSQL remains canonical business truth.

## Safe operational events

### `public_launch.http`

Allowed dimensions:

- `operation`: `catalog_list | catalog_detail | customer_entry | checkout | paddle_webhook | purchaser_reconciliation`;
- `outcome`: `success | rejected | failed`;
- `statusCode`;
- `durationMs` as a measurement, not an aggregation label.

A `4xx` response is `rejected`; a `5xx`/unclassified runtime failure is `failed`. Expected client/security rejection must not be merged into server-failure rate.

### `public_launch.security`

Allowed dimensions:

- `operation=browser_write_origin`;
- `outcome=allowed | rejected | misconfigured`;
- `reason=origin_match | origin_missing_or_invalid | origin_mismatch | web_origin_unavailable`.

Never emit the actual Origin value.

### `public_launch.payment_worker`

Allowed dimensions:

- bounded `outcome`;
- `paymentStatus` when processing completed;
- bounded `errorCode` when the canonical worker returned a known blocked/rejected/retry state;
- bounded `errorClass` for unexpected runtime/startup failure;
- `durationMs` as a measurement.

No inbox/Purchase/provider id is permitted in routine worker events.

### `web.client_error` and `web.vital` (ADR-0067)

Sent by the Web app to `POST /v1/telemetry/web` and logged by the API (`WebTelemetry` context): errors at warn level, vitals at log level.

- `web.client_error`: `release`, `kind=error | unhandled_rejection | render`, bounded `errorName`, `source=app | external`, `route` template.
- `web.vital`: `release`, `name=CLS | FCP | INP | LCP | TTFB`, `rating=good | needs-improvement | poor`, `value`, `route` template.

Read them per `release` and `route`: a new `errorName` or a jump in `poor` ratings right after a deploy points at that release. Errors with `source=external` come from browser extensions or embedded players and usually need no action. No message, URL or identifier is ever present; the contract rejects them.

### `public_launch.reconciliation`

Allowed dimensions:

- `purchaseStatus=pending | paid`;
- `ageBucket=lt_30s | 30s_2m | 2m_5m | 5m_15m | gte_15m`.

This is an aggregate user-path signal. It is not payment evidence and does not isolate provider, webhook, or worker latency by itself.

## Initial rollout budgets

These are conservative first-rollout alert/acceptance thresholds, not permanent contractual SLOs. Revisit them after real production traffic provides a stable baseline.

| Boundary | Initial p95 duration | Initial failed/server-error budget |
|---|---:|---:|
| catalog list/detail | <= 500 ms | < 0.5% over 15 min |
| customer entry | <= 750 ms | < 0.5% over 15 min |
| public checkout | <= 3000 ms | < 1.0% over 15 min |
| Paddle webhook ingress | <= 500 ms | < 0.1% over 15 min |
| purchaser reconciliation | <= 750 ms | < 0.5% over 15 min |
| non-idle payment-worker cycle | <= 1000 ms | `dead_letter` must alert immediately |

Additional rollout signals:

- `public_launch.security outcome=misconfigured`: immediate configuration alert;
- sustained `origin_mismatch`/`origin_missing_or_invalid`: security/traffic investigation, not automatic user attribution;
- `payment_worker outcome=dead_letter`: immediate investigation;
- repeated `payment_worker outcome=retryable` or `blocked` across consecutive observation windows: investigate database/provider/mapping health;
- growth in `reconciliation purchaseStatus=pending ageBucket=gte_15m`: investigate the end-to-end user path, but do not conclude webhook failure from this signal alone.

Do not use `4xx` rejections as server availability failures. Authentication expiry, closed entry policy, stale Price selection, purchaser-safe 404 isolation, and exact-Origin rejection are valid fail-closed outcomes.

## Security verification before launch

The release gate must retain automated proof of:

1. exact configured credentialed CORS; no wildcard credentialed origin;
2. authenticated browser writes rejecting missing/invalid/mismatched Origin;
3. HttpOnly host-only session behavior and no browser bearer-token storage;
4. server-owned checkout amount/currency/Product/Offering/purchaser authority;
5. Paddle checkout URL exact origin/path and `_ptxn` validation;
6. raw-body Paddle signature verification before payload trust;
7. webhook HTTP ingress remaining verify/dedupe/persist/return;
8. payment worker narrow SECURITY DEFINER mutation boundary and lease fencing;
9. purchaser reconciliation returning 404 for foreign and unknown Purchase ids;
10. routine operational events containing no stable business/provider identifiers, PII, secrets, raw payloads, or exception messages.

API/database integration and unit suites retain the canonical security proof for items 1-10. F9.10 additionally exercises the exact credentialed CORS boundary and the stored `Secure`/`HttpOnly`/`SameSite=Strict` session behavior from a real browser; it does not replace the lower-level host-only cookie and authority tests. A later external/synthetic probe may repeat these checks against a deployed environment without replacing repository-level proof.

## Accessibility verification boundary

F9.10 adds a deterministic real-Chrome release gate for the Nexus-owned Product/authentication/checkout, Paddle payment-link shell, and purchaser reconciliation surfaces.

The browser gate verifies:

- keyboard traversal and visible focus for launch-critical first-party controls;
- native label/fieldset/control naming and duplicate-id checks;
- covered interactive names through Chrome's accessibility tree/DOM audit;
- first-party live/error state rendering for payment-link and pending/paid/not-found reconciliation states.

The detailed topology and assertions live in `docs/engineering/f9-browser-launch-verification.md`.

This focused automation is not a complete WCAG certification or assistive-technology matrix. The repository also does not own Paddle's third-party overlay internals: CI stubs only the external Paddle script boundary and verifies the Nexus-owned loading/handoff/success-locator behavior. Provider overlay accessibility must not be reported as a Nexus browser-test result.

## Performance verification boundary

F9.11 applies the initial rollout p95 durations above as bounded repository-level acceptance guardrails for catalog list/detail, customer entry, checkout, signed Paddle webhook ingress, purchaser reconciliation, and a non-idle payment-worker cycle.

The gate is deliberately deterministic: it measures the real Nest/Fastify application and PostgreSQL paths through Fastify injection plus the real payment-worker processor, with isolated fixtures and deterministic provider seams. F9.10 remains the separate owner of real-browser HTTPS/CORS/session behavior. The F9.11 result therefore detects repository-level latency regressions without pretending to measure Internet, CDN, regional, live-provider, or deployed-infrastructure latency.

Each covered boundary uses a small warm-up followed by bounded sequential samples and records p50/p95/max plus unexpected-operation errors. The result is release evidence only: it is not persisted as canonical state, is not emitted to `events.outbox`, and contains no stable business/provider identifiers.

A green F9.11 run is **not** a production throughput/capacity claim and does not turn the initial rollout thresholds into permanent SLOs. Sustained/concurrent/distributed load, production traffic simulation, external synthetic monitoring, live Paddle performance, and capacity planning remain separate future concerns.

The detailed verification topology and claim limits live in `docs/engineering/f9-launch-performance-verification.md`.

## Incident diagnosis

Routine operational events intentionally cannot answer "which Purchase/user was this?". If aggregate signals show a problem:

1. identify the affected time window and outcome class from operational telemetry;
2. use authorized canonical database/provider support tooling for case-specific investigation;
3. do not widen standard telemetry fields as an incident shortcut;
4. if a new diagnostic dimension is truly required, update ADR-0052 with its cardinality/privacy/retention rationale before emitting it broadly.
