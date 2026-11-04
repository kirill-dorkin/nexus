# ADR-0071: The outbox before its first consumer

- Status: Accepted
- Date: 2026-11-04

## Context

Every module that changes canonical state appends its event to `events.outbox` in the same transaction (ADR-0001, `AGENTS.md`). Nothing reads the outbox yet: there is no relay and no consumer. Deferred consequences that exist today are computed in the same transaction (Mastery projection, LearningEvent history) or by dedicated lease-fenced processors over their own tables (grader jobs, Paddle webhooks, GitHub webhook inbox).

Two processors are not started anywhere: `GitHubWebhookLifecycleProcessor` (Integrations) and `GitHubProjectFactProcessor` (Projects). They run only in integration tests. Production runs Vercel Services Web and API only; no worker process is deployed (ADR-0058, `vercel-services.md`).

Without a decision, the rule «deferred consequences use events/outbox» reads as if a relay existed, and the GitHub pipeline reads as if it ran.

## Decision

- The outbox stays the canonical, append-only record of business events, written atomically with the state it describes. That part of the rule is unchanged and enforced.
- There is no relay until the first consumer needs one. The first slice that consumes outbox events adds the relay, its delivery guarantees (at-least-once, idempotent consumers keyed by outbox id), its lease and retention, and its hosting, in one ADR.
- Until then a new deferred consequence is implemented like the existing ones: in the same transaction when it is cheap and must not lag, or as a lease-fenced processor over the owning module's own table.
- The GitHub App pipeline (webhook inbox, lifecycle and project-fact processors) is **inactive in production**: webhooks are not configured there and its processors have no host. Activating it requires the worker hosting decision (spec A6) and is a separate slice.

## Consequences

- Readers of `current-state.md` and the spec know that outbox rows accumulate without being delivered, and that this is intended.
- Outbox rows are never rewritten or deleted to simulate delivery; historical aliases (`attempt.submitted`) stay as written.
- The first consumer pays the cost of the relay once, with the hosting it needs.

## Alternatives

- **Build a relay now.** Rejected: there is no consumer to define its semantics, and no host for a long-running process.
- **Drop the outbox until it is needed.** Rejected: atomic event recording is cheap, already tested, and cannot be reconstructed later for past changes.
