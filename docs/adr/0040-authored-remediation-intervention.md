# ADR 0040 — Authored CourseVersion remediation and repeated-failure intervention

## Status

Accepted

## Context

F8.2 introduced `repeated-trusted-failure@1` as a conservative suspected-misconception signal derived only from normalized trusted validation Evidence. ADR-0039 deliberately kept that signal separate from recommendation sequencing: repeated failure could make the existing recommendation more explainable, but it could not silently change the next action.

The next F8 vertical requires one explainable action-changing intervention.

The current published learning graph contains immutable CourseVersion Skill snapshots, Activity snapshots, and Skill-to-Activity assessment mappings. It does not contain a general remediation relation. The existing Guided Build `transferActivityVersionId` is a separate transfer-learning concept and cannot be reused as a generic remediation mechanism without collapsing distinct curriculum semantics.

Recommendations also cannot infer remediation Activities from title text, Activity order, raw validator/grader payload, source code, UI telemetry, GitHub Project facts, or LLM output. A remediation action must therefore come from an explicit authored curriculum fact.

At the same time, a remediation choice is not a canonical learner diagnosis. The existing repeated-failure signal remains a derived hypothesis, Mastery remains the learner-skill projection, and Recommendation remains derived next-action state.

## Decision

### CourseVersion owns authored remediation intent

F8.3 introduces an immutable published CourseVersion remediation mapping:

`CourseVersion + Skill -> ordered stable Activity identities`

The mapping is owned by Learning Content because it is authored curriculum intent for one immutable CourseVersion. It is not a Knowledge-owned named misconception taxonomy or a universal Skill relation.

Each remediation target must:

- belong to the same CourseVersion;
- already assess the target Skill through the existing Activity-Skill mapping;
- be referenced by stable `activity_id`, not by the CourseVersion-specific ActivityVersion id.

Using stable Activity identity means the authored remediation intent can be cloned into the next CourseVersion while the target ActivityVersion snapshot is regenerated for that version.

### PostgreSQL enforces graph integrity and immutability

The canonical relation is stored in `learning_content.course_version_skill_remediations`.

PostgreSQL independently enforces that every remediation row refers to:

- an attached Skill in the same CourseVersion; and
- an Activity-Skill mapping for the same CourseVersion, stable Activity identity, and Skill.

The existing draft-only learning-graph trigger protects INSERT/UPDATE/DELETE. After publication, remediation mappings are immutable together with the rest of the CourseVersion graph.

Tenant RLS applies to the table. The application role receives only the privileges required for the replace-set authoring flow.

### Authoring is an idempotent replace-set command

The authoring API replaces the complete ordered remediation set for one Skill in one draft CourseVersion.

It uses the existing `activity.manage` capability on Course scope. No new authorization capability is introduced.

Before persistence, Learning Content validates that every supplied Activity belongs to the same CourseVersion and assesses the target Skill.

Replace-set commands serialize on the CourseVersion Skill row before comparing current state. Repeating the exact same ordered set, including a concurrent retry that observes an earlier writer after the row lock is acquired, is materially idempotent: it performs no canonical mutation and emits no duplicate integration event.

A real mapping change commits atomically with one outbox event:

`course_version.skill_remediations_replaced@1`

The event describes curriculum mutation only. It does not claim that a learner intervention happened.

### Remediation intent clones by stable Activity identity

When Learning Content creates the next draft CourseVersion from the latest published graph, remediation rows clone after CourseVersion Skills, Activities, and Activity-Skill mappings.

Because the relation stores stable Activity identity, no hidden semantic inference or positional remapping is needed. The new CourseVersion receives its own ActivityVersion snapshots while preserving the authored remediation intent.

### Detection and intervention remain separate versioned policies

The existing detection policy remains unchanged:

`repeated-trusted-failure@1`

F8.3 introduces a separate recommendation consequence policy:

`repeated-failure-remediation@1`

Changing failure-detection semantics does not silently redefine remediation action semantics, and changing intervention ordering requires a new intervention policy version rather than a hidden edit.

### Intervention composes after baseline sequencing

Recommendation computation first evaluates the existing sequencing stack:

1. `ordered-mastery@1`;
2. `fixed-interval-review@1` where applicable.

That result remains the baseline recommendation and determines the focus Skill.

The existing trusted-Evidence observation path then derives the current repeated-failure signal for that focus Skill.

If the baseline status is `recommended`, `repeated-failure-remediation@1` may replace only the selected Activity. It never changes the focus Skill, Mastery, Evidence, or the signal itself.

If there is no active repeated-failure signal, the baseline action is returned unchanged.

If the only authored remediation candidate is already the baseline Activity, no action-changing intervention is reported.

### Remediation selection is deterministic

For the active focus Skill, alternate authored remediation Activities are ranked by:

1. lowest Attempt count in the current Enrollment;
2. lowest authored remediation position;
3. stable Activity identity.

This preserves the existing preference for less-retried practice while making curriculum author intent the deterministic tie-break before stable identity.

The selected Activity's Attempt count replaces the baseline count in the existing recommendation reason so the reason remains truthful about the Activity actually returned.

### Action changes are separately explainable

The existing baseline reason code remains unchanged. For example, a below-target Skill remains explained by `focus_skill_below_target`.

When remediation changes the Activity, the response additionally exposes:

- intervention policy key/version;
- `code = repeated_trusted_failure_remediation`;
- `signalCode = repeated_trusted_failure`;
- the displaced baseline `replacedActivityVersionId`;
- the authored `remediationPosition`.

The contract requires the intervention to have a matching active signal for the same focus Skill and requires the displaced ActivityVersion to differ from the selected ActivityVersion.

Presentation prose or a future LLM may explain this structured decision, but it must not alter the action.

### Intervention remains derived state

No learner-intervention table is introduced.

The intervention is recomputed inside the existing tenant-scoped read-only `REPEATABLE READ` recommendation transaction from:

- immutable published CourseVersion graph;
- Enrollment Attempt counts;
- Mastery;
- normalized trusted validation Evidence;
- explicit versioned policies.

No intervention LearningEvent, learner-state outbox event, queue, notification, or background worker is created.

The curriculum authoring event is separate from learner recommendation computation.

### Authorization and visibility remain unchanged

Learner recommendation reads remain Enrollment-scoped and use the existing:

- `recommendation.read` for the learner's own Enrollment;
- `recommendation.read_others` for an authorized other-learner read under Offering scope.

F8.3 adds no instructor dashboard, cohort aggregation, mentor workflow, or new read-others capability.

### Readiness remains a separate future policy

An active or cleared intervention does not mean the learner is ready, complete, mastered, or not ready.

Readiness requires a separate explicit policy with its own inputs, semantics, versioning, explainability, and authorization surface.

## Consequences

The first action-changing F8 intervention is curriculum-authored, deterministic, explainable, tenant-safe, and recomputable.

Recommendations do not become curriculum authors and do not invent remediation meaning.

Learning Content gains one small canonical relation and one ordered migration. The relation is immutable after CourseVersion publication and clones with versioned curriculum.

The vertical exit criterion is:

```text
authored CourseVersion Skill -> remediation Activity relation
  -> two trusted failed Attempts for the Skill
  -> repeated-trusted-failure@1 suspected signal
  -> ordinary baseline Activity selected
  -> repeated-failure-remediation@1 overrides to authored remediation Activity
  -> structured intervention explains the displaced baseline action
  -> trusted passed Evidence on a later Attempt
  -> repeated-failure signal clears
  -> intervention clears
  -> ordinary baseline sequencing resumes
```

## Deferred

Separate future decisions are required for:

- readiness policy and any readiness projection;
- instructor/mentor intervention aggregation and workflow;
- canonical Knowledge-owned named misconception taxonomy;
- validator diagnostic-code mappings to named misconceptions;
- remediation relations keyed by named misconceptions rather than Skill;
- persisted intervention exposure/history, experiments, notifications, reminders, or assignments;
- intervention completion/escalation lifecycles;
- assistance telemetry, raw grader payload, source-code heuristics, GitHub Project facts, or LLM inference as intervention inputs;
- adaptive intervention strategies beyond the explicit authored v1 mapping.
