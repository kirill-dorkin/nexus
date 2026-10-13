# ADR-0031: Normalized GitHub Project facts

- Status: Accepted
- Date: 2026-09-16
- Owners: Projects / Integrations
- Related: ADR-0006, ADR-0027, ADR-0028, ADR-0029, ADR-0030

## Context

Nexus already accepts authenticated GitHub App webhooks into an immutable Integrations-owned inbox, maintains trusted installation/repository routing, and owns Nexus Project/Team repository bindings in Projects.

The next Foundation 6 boundary needs pull-request, review, and check activity to become stable Nexus Project data. That data must not be confused with Learning Evidence: GitHub activity is external delivery/product activity until a later learning-domain policy explicitly interprets it.

GitHub webhook deliveries may be retried and may arrive out of causal order. A single portable monotonic version field is not available across pull-request, review, check-run, and check-suite actions. Using webhook receive order or mutable last-write-wins rows as canonical truth would therefore allow a stale delivery to roll a newer state backward.

Repository bindings are history preserving. Project attribution also needs deterministic semantics across connect/disconnect and delayed processing.

## Decision

### Ownership

Integrations continues to own:

- the immutable verified GitHub webhook inbox;
- trusted tenant/repository routing;
- provider installation/repository identities;
- per-consumer durable delivery state for the Project-fact consumer.

Projects owns:

- normalized immutable GitHub Project facts;
- Project attribution through repository-binding history;
- the normalization policy for Project-level PR/review/check activity.

Projects depends on an Integrations delivery contract and never reads Integrations tables directly from application code.

### Supported fact families

The first fact layer normalizes these already-accepted webhook families:

- `pull_request`;
- `pull_request_review`;
- `check_run`;
- `check_suite`.

Each accepted source delivery produces at most one Project fact. The fact keeps stable provenance and normalized identifiers/state, but does not copy the raw webhook payload into Projects.

### Attribution time

Project attribution is resolved against the repository-binding interval containing the immutable webhook `received_at` timestamp:

`connected_at <= received_at < disconnected_at`, with an open upper bound for an active binding.

Consequences:

- a later repository connection cannot retroactively claim older GitHub activity;
- a later disconnect does not invalidate a fact that was attributable when accepted;
- reconnect history remains deterministic even if processing is delayed;
- current GitHub availability does not rewrite historical Project attribution.

The Integrations route must still be trusted/mapped. A mapped delivery may use the historical repository mapping identity even if that mapping is later suspended or removed, matching ADR-0029's historical routing authority rule.

### Idempotency and processing state

Project-fact consumption has a processing row separate from lifecycle processing. It uses the same durable state family established by ADR-0029:

- `pending`;
- `processing`;
- `blocked`;
- `retryable`;
- `completed`;
- `rejected`;
- `dead_letter`.

Claims use worker-only leases with `FOR UPDATE SKIP LOCKED`. Expired leases are reclaimable. Only transient processor failures consume the failure budget.

`source_inbox_id` and GitHub `delivery_id` are unique on Project facts. The normalized fact insert and `completed` acknowledgement occur in the same database transaction. A lease loss therefore rolls back the fact insert, and a retry cannot create a duplicate committed fact.

Deliveries blocked on an unmapped trusted route become claimable again when routing later becomes `mapped`; immutable inbox routing history is not rewritten.

### Ordering and stale events

This slice deliberately does not create a mutable `latest PR/review/check state` projection.

Each webhook delivery is normalized into an immutable event snapshot. Provider timestamps such as PR `updated_at`, review `submitted_at`, and check timestamps are preserved as data, but no universal causal ordering is inferred from `received_at` or from a field that is not monotonic across all event families.

Therefore an out-of-order or stale delivery cannot overwrite a newer canonical fact. A later read model may build current-state projections only when it defines an event-family-specific ordering/reconciliation policy, potentially including GitHub API reconciliation where webhook payloads alone are insufficient.

### External actor identity

GitHub sender/subject IDs and logins are stored as external identities only. This slice does not map them to Nexus users, learners, team members, or evidence actors.

### No Learning Evidence or scoring

Normalized GitHub Project facts are not `LearningEvent`, `LearningEvidence`, mastery input, grader output, or score input. No learner attribution, rubric interpretation, mastery update, or grading behavior is introduced here.

No Project-fact outbox contract for Learning is introduced in this slice. A later slice must explicitly define the transformation from Project facts into learning-domain evidence and its replay/idempotency semantics.

## Consequences

### Positive

- Raw GitHub ingress and normalized Project state have explicit ownership boundaries.
- Retries and worker crashes are durable and idempotent.
- Historical repository binding semantics are deterministic.
- Out-of-order webhooks cannot roll canonical state backward because the first layer is append-only.
- Projects stores only normalized metadata, reducing coupling to GitHub payload shape and avoiding unnecessary raw-content duplication.
- Learning-domain interpretation stays deferred behind a clear boundary.

### Trade-offs

- Consumers that need a current PR/check snapshot must not treat the newest received fact as authoritative without an ordering policy.
- Historical deliveries accepted before a Project binding are intentionally not backfilled into that Project.
- The fact layer keeps GitHub-specific normalized identifiers; provider-independent Product Delivery Intelligence remains a later abstraction.
- Worker execution remains explicit infrastructure and is not yet a general queue runtime abstraction.

## Rejected alternatives

### Let Projects query `integrations.github_webhook_inbox` directly

Rejected because it breaks module ownership and couples Projects to Integrations persistence details.

### Reuse lifecycle processing state

Rejected because lifecycle mutation and Project-fact normalization are independent consumers with independent acknowledgement/retry semantics.

### Upsert a mutable latest-state row by webhook arrival order

Rejected because GitHub webhook arrival order is not a safe causal ordering mechanism and stale deliveries could roll state backward.

### Attribute using the repository binding active at processing time

Rejected because delayed processing or later reconnects would change historical ownership and could retroactively claim activity that predates the Nexus Project binding.

### Emit Learning Evidence immediately

Rejected because repository activity is not itself proof of learning. Learning interpretation needs a separate policy, attribution, and replay boundary.
