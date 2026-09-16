# ADR-0032: Project activity read model

- Status: Accepted
- Date: 2026-09-16
- Owners: Projects
- Related: ADR-0006, ADR-0030, ADR-0031

## Context

ADR-0031 established immutable Projects-owned GitHub pull-request, review, check-run, and check-suite facts. Those facts are durable Project state, but they are not yet exposed as a Project-facing read surface.

The first read model must not accidentally introduce semantics that the fact layer deliberately avoided. In particular, webhook receive order is not a universal provider causal order and the fact layer does not define a mutable current PR/check state. The read API also must not bypass Project authorization merely because a caller knows a GitHub repository identity.

## Decision

### Scope and ownership

Projects exposes a Project-scoped activity timeline over its own normalized immutable facts.

The read model does not query the Integrations webhook inbox and never returns raw webhook payload. It exposes only normalized Project fields plus safe source provenance already stored in Projects.

### Authorization and tenant isolation

The endpoint uses the existing `ProjectOperator` policy. Repository possession, GitHub actor identity, or provider installation identity does not grant access.

`platform_app` receives SELECT-only access to `projects.github_project_facts`. PostgreSQL RLS restricts reads to `platform_internal.current_organization_id()`. No UPDATE or DELETE privilege is added.

### Stable pagination

The activity timeline is ordered by:

`(source_received_at DESC, fact_id DESC)`

The cursor is an opaque encoding of exactly `(sourceReceivedAt, factId)`. The pair is stable because facts are immutable and `fact_id` is unique. Equal receive timestamps therefore still have deterministic ordering.

This ordering is a read/pagination order only. It is not interpreted as GitHub causal order or provider object version order.

### Historical facts and current repository context

Historical activity remains readable after the current repository mapping becomes suspended or removed and after the Project repository binding is disconnected. Those lifecycle changes do not rewrite or hide already attributed facts.

The page returns the current Project view alongside activity items. Therefore current repository availability is explicit when an active binding exists, while a disconnected Project returns `repository: null` without losing historical activity.

### External identity

GitHub subject and sender identities remain explicitly external GitHub identities. This read model does not map them to Nexus users, learners, Team members, Evidence actors, or graders.

### No current-state projection or Learning interpretation

This slice does not collapse fact history into a mutable latest PR/review/check projection. A future projection must define event-family-specific reconciliation semantics before claiming current provider state.

The activity read model is not Learning Evidence, LearningEvent, Mastery input, grading output, recommendation input, or instructor learning analytics.

## Consequences

### Positive

- Project operators can inspect durable repository activity without exposing raw webhook payload.
- Pagination remains deterministic across equal receive timestamps and immutable history.
- Historical facts survive repository lifecycle changes.
- Authorization remains anchored in Nexus Project policy rather than GitHub identity.
- Application reads gain only the minimum database privilege required.

### Trade-offs

- The timeline order is deterministic but not a claim about provider causal order.
- Consumers that need current PR/check state still require a separate projection/reconciliation design.
- External GitHub actors remain unlinked to Nexus users.

## Rejected alternatives

### Order only by `source_received_at`

Rejected because multiple facts may share a receive timestamp, which would make cursor pagination unstable without a unique tie-breaker.

### Order by provider timestamps across all fact families

Rejected because there is no single provider timestamp with common monotonic semantics across PR, review, check-run, and check-suite facts.

### Read the webhook inbox directly

Rejected because raw webhook ingress remains Integrations-owned and because doing so would violate the module boundary established by ADR-0031.

### Let repository or GitHub identity imply authorization

Rejected because external provider identity is not a Nexus authorization grant.

### Hide historical facts after disconnect/suspension/removal

Rejected because those facts were validly attributed at receive time and repository lifecycle changes must not rewrite Project history.
