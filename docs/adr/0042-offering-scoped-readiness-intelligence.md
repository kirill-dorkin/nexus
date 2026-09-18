# ADR 0042 — Offering-scoped readiness intelligence

## Status

Accepted

## Context

ADR-0041 introduced one derived individual CourseVersion progression-readiness decision for an active Enrollment. That decision deliberately did not define cohort aggregation, instructor dashboards, bulk intervention, or progression enforcement.

The next F8 question is operational and narrower:

> Which active learners in one LearningOffering currently require instructor or mentor attention, and why?

Answering that question by calling the individual HTTP endpoint once per Enrollment would be architecturally weak:

- each learner would be evaluated in a different transaction and at a different `evaluatedAt`;
- the same CourseVersion graph would be reloaded repeatedly;
- Mastery, scored-Evidence summaries, and trusted-failure observations would become N+1 reads;
- authorization would be redundantly re-evaluated for a capability that is already Offering-scoped.

At the same time, introducing a general Analytics bounded context solely for this first operational readiness view would create a premature abstraction. The aggregation is still specifically about readiness semantics.

## Decision

### Learning Readiness owns readiness-specific Offering aggregation

The Learning Readiness module now owns two related read capabilities:

1. the existing individual `course-progression-readiness@1` decision;
2. a derived Offering-scoped operational overview composed from those exact individual semantics.

This does not make Learning Readiness the owner of general analytics, historical reporting, dashboards, attendance analytics, or canonical learner state.

The public Offering endpoint is conceptually:

`LearningOffering -> active Enrollments -> individual readiness decisions -> deterministic triage overview`

### Scope is one LearningOffering and active Enrollments only

The overview includes only Enrollments whose current Delivery status is `active`.

Completed, withdrawn, and cancelled Enrollments are excluded from the current-attention population. They are not reclassified as ready or not-ready.

The Offering may be self-paced or cohort. F8.5 does not require a CourseRun and does not add Group/CourseRun filtering.

### Authorization reuses readiness.read_others

The caller must be an active identity and hold `readiness.read_others` for the Offering scope.

No new capability is introduced.

One Offering-scoped authorization check covers the same population that individual other-learner readiness reads would expose under the existing policy. Learners with only `readiness.read` cannot read the aggregate.

### Individual readiness semantics do not change

Every learner row is produced by the same `course-progression-readiness@1` policy introduced by ADR-0041.

The aggregate does not reinterpret:

- Mastery target;
- evidence sufficiency;
- scored-Evidence freshness;
- repeated-trusted-failure blocking;
- `readyUntil`;
- Skill-level reasons.

Aggregation cannot turn `insufficient_evidence` into `not_ready`, cannot clear blockers, and cannot infer new evidence.

### One consistent snapshot and one evaluatedAt

The Offering overview is evaluated inside one tenant-scoped, read-only `REPEATABLE READ` transaction.

All active learner decisions share one server-owned `evaluatedAt`.

The immutable published CourseVersion graph is loaded once for the Offering.

The individual endpoint is refactored to use the same evaluator so both surfaces remain behaviorally aligned.

### Batch public queries avoid N+1 composition

The aggregation uses bounded public application/query interfaces rather than calling HTTP endpoints or foreign repositories.

Delivery adds public queries for:

- requiring an Offering;
- listing active Enrollments for one Offering;
- listing all Enrollments for a set of learner user IDs.

Mastery adds a batch projection query by learner IDs and Skill IDs.

Learning Progress adds batch scored-Evidence and trusted-validation-observation queries that accept a caller-supplied `(learnerUserId, enrollmentId)` mapping.

Recommendations exposes a batch repeated-trusted-failure signal query over those trusted observations.

This keeps the number of database query round-trips independent of learner count for the readiness composition path.

### Delivery supplies learner-to-Enrollment mapping

Mastery and readiness evidence are organization-wide by stable learner + Skill identity.

Therefore the active target Enrollment is not the only historical source of learning evidence. Before reading Evidence and trusted observations, Learning Readiness asks Delivery for all Enrollments belonging to the target learner IDs in the Organization.

Learning Progress receives that mapping as input and reads its own Attempt/Evidence tables. The new batch path does not introduce a new direct Learning Progress -> Delivery table join.

Existing historical learning-loop queries that predate this slice are not redesigned here.

### Sequential reads on one PostgreSQL transaction client

The evaluator performs its cross-module reads sequentially on the caller-owned transaction.

It does not issue `Promise.all` concurrent queries through the same `pg` client. This removes the deprecated concurrent-client usage observed during F8.4 local integration runs and keeps behavior compatible with the upcoming pg 9 restriction.

### Triage is explicit, deterministic, and conservative

The first aggregation policy is:

`offering-readiness-triage@1`

Its status order is:

1. `not_ready`;
2. `insufficient_evidence`;
3. `ready`.

Within one status bucket, ordering uses only stable Delivery context:

1. `enrolledAt`;
2. stable `enrollmentId`.

The ordering is an operational presentation policy, not a statement that one learner is more capable, more severe, or more important than another.

F8.5 deliberately does **not** rank individual blocker reasons such as `active_repeated_trusted_failure`, `mastery_below_target`, or `scored_evidence_stale` against each other.

### Contract exposes summary plus explainable learner rows

The Offering overview exposes:

- Organization, Offering, CourseVersion, and one `evaluatedAt`;
- the exact readiness policy;
- the exact triage policy;
- counts for active, attention, not-ready, insufficient-evidence, and ready Enrollments;
- ordered learner rows containing Enrollment ID, learner user ID, enrolledAt, overall readiness status, readyUntil, and the existing Skill-level readiness explanations.

`attentionCount = notReadyCount + insufficientEvidenceCount`.

Identity presentation such as display name or email is not copied into this first contract. A later UI-facing identity enrichment boundary can be designed without coupling readiness semantics to Identity storage.

### Aggregation remains derived state

No readiness-overview table, snapshot history, LearningEvent, outbox event, worker, queue, notification, Assignment, or intervention is created by this read.

No database migration is required for F8.5.

The existing Enrollment indexes are sufficient for the Foundation access pattern; additional indexes require measured need rather than speculative schema growth.

## Consequences

Instructor and mentor clients can answer the first operational readiness question with one authorized Offering request and one consistent learning-state snapshot.

The individual and aggregate readiness surfaces share the same evaluator and policy semantics.

A learner with historical passes that keep Mastery at `0.8` while two newest trusted decisive Attempts are failures remains `not_ready` in the Offering overview for the same reason as in the individual endpoint.

Unknown evidence remains distinguishable from known blockers.

No new canonical learner state is created.

## Deferred

Separate future decisions remain required for:

- Group or CourseRun scoped readiness views;
- pagination or large-Offering materialization after measured scale requirements;
- learner identity/display enrichment;
- dashboards and UI presentation;
- reason-specific urgency ranking;
- bulk intervention or Assignment creation;
- alerts, escalation, reminders, or notifications;
- historical readiness snapshots and trend analytics;
- automatic ProgressionGate enforcement;
- Enrollment completion based on readiness;
- F7 production grader activation.
