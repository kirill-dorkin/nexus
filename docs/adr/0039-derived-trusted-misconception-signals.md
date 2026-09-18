# ADR 0039 — Derived trusted misconception signals

## Status

Accepted

## Context

F8 requires a misconception model, but Nexus does not yet have a canonical misconception taxonomy or an authored mapping from validator diagnostics to specific misconception identities.

The repository already has a strong learning-data trust boundary:

- Validation owns immutable raw `ValidationResult` attribution and may retain validator-specific payload.
- Learning Progress normalizes only `completed + trusted + passed|failed` ValidationResults into Evidence.
- validation-derived Evidence intentionally carries only stable normalized semantics and exact provenance; arbitrary raw validator/grader payload is not copied into Evidence.
- Mastery is recomputed from normalized Evidence.
- Recommendations are derived explainable state and must not become a second learning-state source of truth.
- module boundaries reserve canonical misconception/knowledge definitions for the Knowledge side of the learning graph rather than Recommendations.

A first misconception vertical must therefore provide useful, testable learner intelligence without pretending that repeated failure proves a particular conceptual misconception and without weakening the established validation/evidence boundary.

## Decision

### The first model is a signal, not a diagnosis

F8.2 introduces the explicit versioned policy:

`repeated-trusted-failure@1`

Its output is a **suspected misconception signal** with machine code:

`repeated_trusted_failure`

The signal means only that the learner has a current streak of repeated trusted failed observations for the same stable Skill.

It does **not** identify a named misconception, infer a causal explanation, assign a confidence probability, or claim that the learner certainly holds an incorrect mental model.

A future canonical misconception taxonomy remains a separate Knowledge-owned concern.

### Trusted normalized Evidence is the only v1 signal source

The v1 signal consumes only Learning Progress-owned validation-derived Evidence that already passed the existing trusted normalization boundary.

Eligible observations therefore come only from Evidence where:

- `sourceType = validation_result`;
- the normalized Evidence payload has stable `outcome = passed | failed` semantics;
- the Evidence exists because the source ValidationResult was `completed + trusted + decisive` under the existing normalizer.

The signal does not consume:

- raw `ValidationResult.payload`;
- raw grader protocol payload;
- Submission source or arbitrary learner payload;
- Guided Build hint/solution exposure;
- UI telemetry;
- GitHub Project facts;
- LLM output;
- infrastructure/system errors;
- `needs_review` or advisory validation state.

### Observations are organization-wide by stable Skill

Mastery is organization-wide by learner + stable Skill identity. The misconception signal follows the same knowledge-state scope.

Recommendations still evaluate the signal only for the current Enrollment's selected focus Skill, but the evidence observation query may use the learner's trusted normalized Evidence for that stable Skill across Enrollments in the same Organization.

This avoids creating an Enrollment-local alternate knowledge model.

### One decisive observation per Attempt

Multiple immutable ValidationResults may exist for one submitted Attempt. Counting every result independently could allow validation retries or corrections for one Attempt to manufacture a repeated-failure streak.

The public Learning Progress observation query therefore exposes only the latest trusted decisive validation-derived Evidence for each `(Skill, Attempt)` pair, ordered deterministically by Evidence time and stable Evidence id.

This is a read semantic only; no Evidence is rewritten or deleted.

### Threshold and clearing semantics

`repeated-trusted-failure@1` uses:

- minimum consecutive failed Attempts: `2`;
- observations ordered newest first;
- a later trusted `passed` Attempt ends the active failure streak;
- one failed Attempt alone produces no signal.

When active, the signal exposes only stable explainability fields:

- `status = suspected`;
- `code = repeated_trusted_failure`;
- stable `skillId`;
- consecutive failure count;
- first and last observation timestamps for the active streak.

Changing the threshold or streak semantics requires a new explicit policy version rather than a silent code edit.

### Signal computation is derived and recomputable

No misconception-signal table is introduced.

The signal is recomputed inside the existing tenant-scoped, read-only `REPEATABLE READ` recommendation transaction from canonical normalized Evidence plus the current focus Skill.

Learning Progress exposes a dedicated public `TrustedValidationEvidenceQuery`. Recommendations do not query Learning Progress tables or Validation repositories directly.

### Signal does not change sequencing in F8.2

The existing recommendation action remains authoritative:

- `ordered-mastery@1` still chooses unobserved/below-target work first;
- `fixed-interval-review@1` still applies only after the mastery target is met;
- the misconception signal is additive explainability metadata for the already selected focus Skill.

F8.2 does not introduce a remediation/intervention policy, reorder Activities, lower/raise Mastery, or convert the signal into completion/readiness state.

A later intervention slice may consume explicit misconception signals, but that policy must be separately versioned and explainable.

### Authorization and visibility remain unchanged

The signal is returned only through the existing Enrollment-scoped Recommendation read.

Existing `recommendation.read` / `recommendation.read_others`, Offering scope, tenant context, RLS, and recommendation visibility rules remain authoritative.

No new instructor/mentor read surface or capability is introduced.

## Consequences

The first misconception model is intentionally conservative. It creates useful structured intelligence while preserving the distinction between observation, hypothesis, and diagnosis.

It is deterministic, inexpensive, recomputable, and testable from trusted learning state.

No database migration, background worker, new canonical LearningEvent, outbox event, signal persistence, or alternate Mastery projection is required.

Raw grader/validator details remain available only in their owning Validation boundary and cannot silently become learning intelligence.

The vertical exit criterion is:

```text
trusted failed ValidationResult on Attempt A
  -> normalized failed Evidence for Skill
trusted failed ValidationResult on Attempt B
  -> normalized failed Evidence for same Skill
  -> repeated-trusted-failure@1 suspected signal
  -> existing Activity recommendation remains selected and becomes more explainable
trusted passed ValidationResult on later Attempt C
  -> normalized passed Evidence
  -> active repeated-failure signal clears
```

## Deferred

Separate future decisions are required for:

- canonical Knowledge-owned misconception taxonomy/entities and relations;
- immutable CourseVersion snapshots of authored misconception definitions where curriculum reproducibility requires them;
- exact-version validator diagnostic codes and explicit mappings from trusted diagnostics to named misconceptions;
- evidence aggregation beyond the v1 consecutive-attempt rule;
- calibrated confidence/probability models;
- intervention/remediation sequencing that changes the next action;
- readiness policy;
- instructor/mentor aggregation and new read-others product surfaces;
- persisted recommendation/signal exposure history, experiments, analytics, reminders, or notifications;
- any use of assistance telemetry, raw grader payload, source-code heuristics, GitHub Project facts, or LLM inference as misconception evidence.
