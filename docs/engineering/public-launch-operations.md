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

Existing CI integration/unit suites already exercise items 1-9. ADR-0052 event-shape tests add item 10. A later external/synthetic probe may repeat these checks against a deployed environment without replacing repository-level proof.

## Accessibility verification boundary

The current Product/checkout/reconciliation UI already uses native labels/fieldset/buttons plus live status/alert semantics. F9.9 does not introduce a browser-test dependency solely to claim automated accessibility coverage.

Before public production launch, a separate browser verification slice must add keyboard/focus behavior checks and automated accessibility analysis for:

- public Product/Authentication/checkout panel;
- Paddle payment-link loading/error state around the third-party overlay;
- purchaser pending/paid/error reconciliation states.

That slice must distinguish first-party accessibility assertions from Paddle's third-party overlay behavior.

## Incident diagnosis

Routine operational events intentionally cannot answer "which Purchase/user was this?". If aggregate signals show a problem:

1. identify the affected time window and outcome class from operational telemetry;
2. use authorized canonical database/provider support tooling for case-specific investigation;
3. do not widen standard telemetry fields as an incident shortcut;
4. if a new diagnostic dimension is truly required, update ADR-0052 with its cardinality/privacy/retention rationale before emitting it broadly.
