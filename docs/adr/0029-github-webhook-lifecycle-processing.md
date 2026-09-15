# ADR-0029: GitHub webhook lifecycle processing and retained routing

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0027 established an immutable, authenticated GitHub webhook inbox. ADR-0028 established trusted GitHub App installation/repository mappings. The inbox deliberately contains no mutable retry/worker state, and setup deliberately does not apply GitHub-originated uninstall or repository-selection events.

F6 now needs the first durable processor that can turn verified Integration-owned GitHub lifecycle inputs into Integration-owned mapping changes without introducing Nexus Project state yet.

ADR-0006 requires processors to be idempotent, retryable, crash-safe, and capable of dead-letter handling. Redis/BullMQ may schedule execution, but PostgreSQL remains the source of truth.

## Decision

### 1. Immutable source input remains separate from mutable processing state

`integrations.github_webhook_inbox` remains append-only source input. Processing never rewrites its payload, receive-time tenant id, or receive-time `routing_status`.

Two separate mutable models are introduced:

- `github_webhook_routing_state` — the current explicitly evaluated routing projection for a retained delivery;
- `github_webhook_lifecycle_processing` — lease/retry/terminal state for the Integration lifecycle processor.

Existing inbox rows are backfilled into routing state, and existing `installation` / `installation_repositories` rows receive lifecycle processing state. A trigger initializes both models for future accepted deliveries in the same transaction as inbox persistence.

### 2. Retained unmapped deliveries may be explicitly re-evaluated

Only deliveries whose current routing projection is `unmapped_installation` or `unmapped_repository` may be re-evaluated after trusted mappings change. Their original inbox routing fact is never replaced.

Trusted setup completion explicitly refreshes retained routes for the verified installation. Repository-add and GitHub-originated unsuspend processing may do the same after they create active routing authority.

Already-mapped historical deliveries are not retroactively revoked merely because a repository is later removed or an installation is later suspended. Their receive-time authority remains auditable and stable.

`repository_mismatch` is not silently repaired or cross-routed.

### 3. Lifecycle processing is worker-only and lease based

Cross-tenant claiming and processing-state mutation are exposed only through narrow `platform_internal` functions granted to `platform_worker`.

The processor claims one eligible delivery using `FOR UPDATE SKIP LOCKED`, a unique lease token, and an expiring lease. A crashed claim becomes eligible again after lease expiry.

Worker mapping mutations still run under an exact transaction-local Organization context and RLS. The worker role does not receive unrestricted mapping writes without tenant context.

### 4. Processing outcomes are explicit

Lifecycle processing state distinguishes:

- `pending` — ready for first processing;
- `processing` — currently leased;
- `blocked` — valid retained input without current trusted routing authority; it waits for explicit route refresh rather than consuming dead-letter budget;
- `retryable` — transient processor/transaction failure with backoff;
- `completed` — Integration-owned consequence committed;
- `rejected` — deterministic routing/payload/action violation;
- `dead_letter` — transient failure exhausted the retry limit.

Only normalized error codes are persisted; raw exceptions, secrets, tokens, or payload copies are not written into processing metadata.

### 5. Mapping mutation and successful acknowledgement are atomic

For a mapped delivery, the Integration mapping mutation and transition to `completed` occur in the same PostgreSQL transaction. A crash before commit changes neither canonical mapping state nor completion state. A crash after commit cannot leave a committed side effect with an unacknowledged processor row.

Unexpected transaction failures roll back mapping changes and become `retryable` or `dead_letter` according to attempt count.

### 6. This processor owns only GitHub installation/repository lifecycle

The first processor handles only `installation` and `installation_repositories` events.

Supported Integration-owned consequences are:

- `installation.deleted` -> installation `removed`, repositories `removed`;
- `installation.suspend` -> installation `suspended`, currently active repositories `suspended`;
- `installation.unsuspend` -> reactivates only GitHub-originated temporary suspension; local administrator suspension remains authoritative;
- `installation_repositories.added` -> inserts/reactivates exact repository mappings without cross-Organization reassignment;
- `installation_repositories.removed` -> repository mappings become `removed`.

`installation.created` and `installation.new_permissions_accepted` do not create trusted mappings; trusted setup remains the only authority for first binding.

Repository status therefore distinguishes `active`, `suspended`, and `removed`. Temporary GitHub installation suspension no longer destroys the distinction between a temporarily unavailable repository and a genuinely removed repository.

### 7. Local suspension cannot be undone by GitHub

Installation persistence records an internal suspension source (`local` or `github`). PostgreSQL guards the transition so a `platform_worker` unsuspend cannot reactivate a locally suspended installation. A later trusted owner/admin setup may explicitly reactivate it.

The suspension source is internal Integration state and is not exposed as a public product contract.

### 8. Project and learning consequences remain deferred

This processor creates no Nexus Project/Team state, LearningEvent, Evidence, Mastery mutation, or PR/check/review intelligence.

Pull request, review, and check deliveries may gain a trusted rerouted projection after setup/repository mapping changes, but they remain otherwise unprocessed until the future Projects slice owns a concrete downstream contract.

BullMQ/Redis scheduling remains deferred. The processor logic and PostgreSQL worker boundary are independently testable and can later be invoked by the worker composition root without changing canonical semantics.

## Consequences

- GitHub uninstall/suspend/repository-selection changes can be applied durably without mutating immutable inbox facts.
- Crash recovery is lease-based and duplicate processing is idempotent at the mapping/state boundary.
- Retained pre-setup webhook deliveries can become safely tenant-routable after trusted setup without falsifying their original routing history.
- Local integration suspension cannot be overridden by an external unsuspend event.
- The next F6 slice may introduce the minimal Nexus Project/Team model and consume GitHub repository/PR/check/review information only through explicit Integrations-owned boundaries.
