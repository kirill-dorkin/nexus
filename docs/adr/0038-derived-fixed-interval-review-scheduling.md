# ADR 0038 — Derived fixed-interval review scheduling

## Status

Accepted

## Context

F8 expands the existing explainable Recommendations foundation with review scheduling before Nexus introduces misconception models, interventions, readiness, or instructor intelligence surfaces.

ADR-0013 already establishes several constraints that remain authoritative:

- Recommendation is derived, explainable state rather than canonical learner state;
- `ordered-mastery@1` is an explicit versioned sequencing policy;
- Mastery is derived from normalized Evidence and remains the learning-state projection;
- recommendation computation composes Delivery, Learning Content, Learning Progress, and Mastery only through public application interfaces;
- recommendation reads use a tenant-scoped read-only `REPEATABLE READ` transaction;
- authorization is separate from sequencing policy.

A review scheduler adds time as an input. Persisting a queue, `next_review_at` table, or background jobs before the policy semantics are established would create unnecessary canonical state and could accidentally become a second source of truth beside Evidence/Mastery.

The current Mastery public projection already exposes `lastEvidenceAt`, derived from the latest normalized Evidence timestamp for the learner and Skill. That timestamp is sufficient for a deliberately simple first review policy without reading raw validator payloads, LearningEvent history, grader state, or GitHub Project facts.

## Decision

### Keep `ordered-mastery@1` unchanged and compose a second policy

The existing sequencing policy remains exactly `ordered-mastery@1` with mastery target `0.8`.

F8 introduces a separate review policy:

`fixed-interval-review@1`

with a fixed interval of seven days.

The recommendation response identifies both policies when the review-aware path is active. Keeping the policies separate avoids silently changing the meaning of `ordered-mastery@1` and leaves future review strategies independently replaceable.

### Mastery gaps take precedence over review

Recommendation computation first evaluates `ordered-mastery@1`.

If that policy finds an unobserved or below-target Skill, its existing decision and deterministic Activity ordering remain authoritative.

The review policy is evaluated only when `ordered-mastery@1` reports `mastery_target_met` for the CourseVersion learning graph.

This first F8 slice therefore does not introduce a learn-vs-review balancing model. A future policy may make that trade-off explicitly under a new policy/version.

### Review scheduling is derived, not persisted

`fixed-interval-review@1` stores no schedule rows and creates no background work.

For each mastered CourseVersion Skill:

`reviewDueAt = lastEvidenceAt + 7 days`

The policy receives one explicit `evaluatedAt` instant from the application service. For identical canonical inputs and the same `evaluatedAt`, the result is deterministic.

The HTTP caller cannot supply or override `evaluatedAt`.

`lastEvidenceAt` remains Mastery-owned derived state. Recommendations do not query Learning Progress tables directly for timestamps and do not create an alternate review-history projection.

### Due ordering is deterministic

When all Skills meet the mastery target, review candidates are ordered by:

1. earliest `reviewDueAt`;
2. lowest CourseVersion Skill position;
3. stable Skill identifier.

A candidate is due when `reviewDueAt <= evaluatedAt`.

If no review is due, the recommendation result remains `mastery_target_met` and exposes the earliest `nextReviewAt`. That status continues to mean only that the sequencing mastery target is currently met; it is not course completion.

When a review is due, practice Activities assessing the selected Skill use the existing deterministic ordering from `ordered-mastery@1`:

1. lowest attempt count in the current Enrollment;
2. lowest Activity position;
3. stable Activity identifier.

### Review recommendations are explainable

A due review recommendation uses the machine-readable reason:

`focus_skill_review_due`

and includes:

- `attemptCount`;
- `lastEvidenceAt`;
- `reviewDueAt`.

If the due Skill has no practice Activity, the existing `no_practice_activity_available` outcome is retained and carries `lastEvidenceAt` plus `reviewDueAt` so the content gap remains explainable.

No learner-facing prose is generated in the domain policy.

### The trusted input is normalized learning state

The policy uses CourseVersion Skill/Activity snapshots, Enrollment attempt counts, and Mastery projections derived from normalized Evidence.

It does not derive review timing from:

- raw ValidationResult or grader payloads;
- grader-job state;
- GitHub Project activity;
- UI telemetry;
- LLM output.

The current Mastery `lastEvidenceAt` is the latest normalized Evidence timestamp, including normalized Evidence that may be unscored. This is an explicit v1 review-policy semantic. If later learning science requires “last scored Evidence”, successful retrieval, confidence, or adaptive spacing stages, those inputs require an explicit new projection/public interface and a new review policy version rather than reinterpretation of `fixed-interval-review@1`.

### Authorization and tenant boundaries do not change

The existing Enrollment-scoped recommendation endpoint and capabilities remain authoritative:

- own learner reads use `recommendation.read`;
- other-learner reads use `recommendation.read_others` under the existing Offering scope.

No new instructor dashboard, mentor visibility, cross-learner aggregation, or authorization capability is introduced by this slice.

The computation stays inside the existing tenant-scoped read-only `REPEATABLE READ` transaction and continues to call neighboring modules only through their public application queries.

### No persistence, migration, event, or worker is introduced

This slice adds:

- no database migration;
- no recommendation/review table;
- no outbox event;
- no canonical LearningEvent;
- no queue or worker job;
- no notification or intervention automation.

A future need for reminders, historical recommendation exposure, experiments, or durable interventions must define its own ownership, idempotency, audit, and event semantics before persistence is added.

## Consequences

The first F8 review vertical is cheap to compute, deterministic for explicit inputs, explainable, and recomputable from existing canonical state.

A newly recorded Evidence item can refresh Mastery `lastEvidenceAt` and therefore move the next derived review time without any schedule-row mutation.

The seven-day interval is intentionally simple rather than an implied optimal spaced-repetition algorithm. Changing the interval or introducing staged/adaptive spacing requires a new review policy version.

The first review-scheduling exit criterion is:

`mastered Skill -> derived nextReviewAt -> due review -> explainable Activity recommendation -> new Evidence/Mastery timestamp -> derived review moves forward`

The repository must cover policy determinism, due/not-due behavior, review explainability, and preservation of the existing HTTP recommendation path.

## Deferred

- adaptive or multi-stage spaced repetition;
- prerequisite-aware learn-vs-review balancing;
- a canonical misconception model;
- readiness/intervention policy;
- instructor/mentor intelligence aggregation and any new read-others authorization surface;
- notifications, reminders, persisted recommendation history, experiments, or background scheduling;
- using assistance telemetry, raw grader facts, or GitHub Project activity as learning signals.
