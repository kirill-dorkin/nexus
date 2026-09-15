# ADR 0019: Learner runner effective Assignment policy

- Status: Accepted
- Date: 2026-09-15

## Context

Foundation 4 needs a learner-facing runner read model that can answer which assigned activities apply to one concrete Enrollment without making Assignment an access grant or collapsing Delivery into Learning Progress.

Assignments already support offering, CourseRun, Group, and Enrollment audiences. Enrollment intentionally remains participation in a LearningOffering, and ADR-0015 deliberately does not introduce an implicit CourseRun membership. GroupMembership is the existing explicit, time-bounded relation that can place an Enrollment inside a concrete CourseRun.

The existing Attempt flow also supports self-paced and recommendation-driven work that is not necessarily assigned. Retry, lateness, validation, and grading policy are not yet settled.

## Decision

### Runner access is Enrollment-scoped

The learner runner is requested for one Enrollment.

The application must require:

- an active authenticated user;
- an active Enrollment;
- the authenticated user to own that Enrollment; and
- the existing `attempt.submit` capability on the parent LearningOffering.

Assignment is not an access grant. The runner does not replace Enrollment or authorization checks.

ADR-0014 remains unchanged: entitlement is enforced when an entitlement-required Enrollment is created. This slice does not introduce a new runtime entitlement-revocation policy for already-active Enrollments.

### Effective audience resolution is explicit

For an active Enrollment and one evaluation timestamp, a non-cancelled Assignment is audience-applicable when:

- `offering`: the Assignment belongs to the Enrollment's LearningOffering;
- `enrollment`: the Assignment targets that exact Enrollment;
- `group`: the Enrollment has a GroupMembership in the target Group at the evaluation timestamp;
- `course_run`: the Enrollment has a GroupMembership at the evaluation timestamp in any Group whose GroupSet belongs to the target CourseRun.

The CourseRun rule uses existing explicit delivery placement and does not invent a hidden RunMembership. Consequently, a CourseRun Assignment has no effective learner recipient when no Enrollment has explicit GroupMembership placement in that run. For cohort work that should apply to every Enrollment without group placement, use an offering-level Assignment. Introducing a separate explicit CourseRun-participation concept later requires its own architecture decision and migration.

Historical GroupMembership intervals remain authoritative for point-in-time audience reconstruction.

### Timing is a read-model state, not lateness policy

The runner classifies each audience-applicable Assignment at the evaluation timestamp as:

- `upcoming` when `availableAt` is in the future;
- `available` when it is not upcoming and `dueAt` is absent or has not passed;
- `past_due` when `dueAt` has passed.

Cancelled Assignments are omitted.

`past_due` is informational. This slice does not reject late Attempts, define extensions, or infer retry policy. Those remain future policy decisions.

### Runner output composes public immutable content

The read model returns each applicable Assignment together with its pinned immutable CourseVersionActivity and timing state. Delivery may consume Learning Content only through its public application query interface; it must not read Learning Content tables or repositories directly.

The response includes the evaluation timestamp so timing classifications are explainable.

### Assignment does not globally gate Attempt creation

Starting an Attempt continues to require active Enrollment ownership, authorization, and an Activity from the Offering's pinned CourseVersion.

An effective Assignment is not required for every Attempt. This preserves self-paced and recommendation-driven flows and avoids turning Assignment into a universal access gate.

If a future assigned-only workflow needs strict Assignment-to-Attempt enforcement or durable association, that is a separate policy slice.

## Consequences

- No database migration is required for this slice.
- Learner Assignment reads no longer need the manager-only Assignment endpoint.
- Effective audience semantics are deterministic and testable without crossing bounded-context repositories.
- CourseRun targeting is intentionally meaningful only for explicitly placed learners under the current model.
- Retry, lateness enforcement, validator selection, automated Evidence, and grader execution remain outside this decision.
