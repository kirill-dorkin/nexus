# ADR 0013 — Explainable recommendations and versioned sequencing policies

## Status

Accepted

## Context

Nexus must be able to determine the next useful learning action for a learner from canonical learning state.

The recommendation layer depends on several existing bounded contexts:

- Delivery establishes the active Enrollment and the LearningOffering.
- Learning Content provides the immutable CourseVersion learning graph.
- Learning Progress provides Attempts and Evidence.
- Mastery provides the recomputable learner-skill projection.

Recommendations must not become another source of truth for learning progress, duplicate mastery state, or bypass module boundaries.

The recommendation mechanism must also remain replaceable. A simple deterministic sequencing policy used during the foundation stage must be able to evolve later into prerequisite-aware sequencing, spaced review, misconception-aware interventions, or more advanced models without rewriting the surrounding learning loop.

## Decision

### Recommendation is derived state

A Recommendation is an explainable computed next learning action.

It is not canonical learner state and is not a source of truth.

The initial implementation does not persist recommendations in a recommendation table.

Canonical state remains owned by the modules that produced it:

- Enrollment and LearningOffering by Delivery.
- CourseVersion, Skill, and Activity by Learning Content.
- Attempt and Evidence by Learning Progress.
- Mastery by Mastery.

Recommendation history or telemetry may be introduced later as append-only observational data, but must not become the authoritative learning state.

### Enrollment is the recommendation context

Recommendations are requested in the context of an Enrollment.

The Enrollment resolves the learner and LearningOffering, and the LearningOffering pins the immutable published CourseVersion.

The public HTTP shape therefore uses an enrollment-scoped resource rather than an arbitrary user/course pair.

Conceptually:

`Enrollment -> LearningOffering -> CourseVersion -> Recommendation`

### Recommendation policies are explicit and versioned

Sequencing logic is represented as an explicit domain policy.

The first policy is:

`ordered-mastery@1`

A recommendation response identifies the policy key and version that produced the result.

Policy configuration such as mastery targets belongs to the policy definition or explicit policy configuration. It must not be scattered through controllers or application services.

The fixed mastery target for `ordered-mastery@1` is `0.8`. Changing that target requires an explicit policy/configuration version change rather than a silent implementation edit.

### ordered-mastery@1

The first policy operates on:

- CourseVersion skills ordered by position and stable identifier.
- CourseVersion activities and their assessed skills.
- current learner Mastery for those skills.
- attempt counts for activities in the current Enrollment.

The policy selects the first skill whose mastery is either unobserved or below the configured mastery target.

Activities assessing that focus skill are ranked by:

1. lowest attempt count;
2. lowest activity position;
3. stable activity identifier.

This makes the result deterministic.

A learner who already demonstrates sufficient mastery for an earlier skill may skip directly to a later skill.

Retry semantics remain unchanged: performing an activity again creates a new Attempt.

### Recommendations are explainable

Recommendation output contains machine-readable reason information.

Examples include:

- `focus_skill_unobserved`
- `focus_skill_below_target`
- `no_practice_activity_available`

Human-readable or localized prose is not part of the recommendation domain decision.

Presentation layers, and later optionally an LLM, may transform structured reasons into learner-facing explanations, but they must not silently change the selected action.

### Mastery target met is not course completion

When all relevant skills satisfy the policy mastery target, the recommendation result may report:

`mastery_target_met`

It must not report that the course is completed.

Completion and Mastery are separate concepts and may have different policies and evidence requirements.

### Module boundaries remain strict

The Recommendations module must not query tables or repositories owned by neighboring modules.

It consumes public application interfaces exposed by Delivery, Learning Content, Learning Progress, and Mastery.

Domain code must remain independent of infrastructure and framework concerns.

The sequencing policy itself is implemented as a pure domain function so that it can be exhaustively unit tested.

### Consistent computation

Recommendation computation uses a consistent transactional view of the required canonical state.

The initial implementation evaluates a recommendation inside one tenant-scoped, read-only `REPEATABLE READ` PostgreSQL transaction. Cross-module application queries receive that caller-owned transaction rather than creating unrelated nested transactions.

Evidence recording and Mastery projection refresh remain responsible for maintaining canonical learning state before a subsequent recommendation is computed.

### Authorization remains separate from policy

Authorization capabilities and recommendation policy are different concepts.

The initial authorization model introduces:

- `recommendation.read`
- `recommendation.read_others`

A learner may read recommendations for their own Enrollment when authorized.

Instructor, mentor, administrator, or owner access to recommendations for another learner is controlled independently through authorization policy.

Feature flags, if introduced later, are also separate from both authorization and sequencing policy.

## Consequences

The initial recommendation system remains deterministic, explainable, inexpensive to compute, and straightforward to test.

No new database migration is required solely to create canonical recommendation state.

The recommendation algorithm can evolve behind an explicit policy boundary without changing the ownership of Content, Delivery, Progress, or Mastery.

More advanced capabilities such as prerequisite graphs, spaced repetition, misconception models, instructor interventions, experiments, machine learning ranking, and LLM-generated explanations can be added later without making them prerequisites for the foundation.

The initial vertical exit criterion is:

`Activity -> Attempt -> Evidence -> Mastery -> Recommendation -> next Activity`

A full integration test must demonstrate that new Evidence can change Mastery and consequently change the recommended next Activity.
