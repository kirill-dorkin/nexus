# ADR 0015: Course runs and delivery groups are operational delivery structure

## Status

Accepted.

## Context

Nexus already separates immutable content from delivery. A `LearningOffering` points at one published `CourseVersion`, and an `Enrollment` records that a user participates in the offering. That is enough for self-paced delivery, but instructor-led delivery needs a concrete scheduled execution and learner grouping without changing the meaning of either Offering or Enrollment.

The foundation roadmap explicitly includes `CourseRun`, `GroupSet`, and `Group`. The architecture also reserves a separate future `Team` concept for collaborative/project work. Treating all of these as one generic container would collapse distinct lifecycles and make authorization, evidence, scheduling, and GitHub-project integration ambiguous.

The core invariants for this slice are:

- `LearningOffering != CourseRun`;
- `Enrollment != GroupMembership`;
- `Group != Team`;
- adding a learner to a group never creates or changes access rights;
- a group member must already have an active enrollment in the same offering as the run.

## Decision

### 1. CourseRun is a concrete execution of a cohort offering

`LearningOffering` remains the durable delivery/access context for a published course version. A `CourseRun` is a concrete scheduled execution underneath one cohort offering.

Self-paced offerings do not require a run. Cohort offerings can have one or more runs, allowing the same offering definition and enrollment boundary to support repeated instructor-led executions without cloning content or coupling scheduling to Commerce.

A run has its own stable identity, slug, name, start, and end. Its schedule must be valid and, when the parent offering defines a schedule window, must remain inside that window.

The database independently rejects runs attached to non-cohort or non-open offerings so this invariant is not only an HTTP/application convention.

### 2. Enrollment remains offering participation

`Enrollment` continues to answer: "is this learner participating in this LearningOffering?"

A run does not replace or own Enrollment. This preserves the existing access boundary and the invariant `Purchase != Entitlement != Enrollment`.

Being enrolled does not automatically place a learner into a run group. Group placement is an explicit delivery operation with its own identity and outbox event.

### 3. GroupSet models an independent grouping dimension

A `GroupSet` belongs to one CourseRun and represents one grouping dimension, for example lab sections, discussion sections, or instructor-defined cohorts.

A `Group` belongs to exactly one GroupSet. Within a GroupSet, one active Enrollment can belong to at most one Group at a time. The same Enrollment may belong to groups in different GroupSets, which supports overlapping dimensions without overloading one hierarchy.

This exclusivity is enforced by a partial unique database index over active memberships, not only by application code.

### 4. GroupMembership references Enrollment, not User

A `GroupMembership` points to an `Enrollment`. This makes the participation prerequisite explicit and prevents a group from becoming an alternate enrollment/access mechanism.

For an active membership:

- the Enrollment must exist in the same tenant;
- the Enrollment must be active;
- the Enrollment's offering must equal the CourseRun's offering;
- the Group must belong to the referenced GroupSet.

The database validates the cross-table offering/enrollment invariant in addition to the application service.

Membership rows are not deletable by the application role. The model includes `endedAt` so future reassignment/removal can close a membership while preserving delivery history.

### 5. Group is not Team

A delivery Group exists to organize learners inside a CourseRun. It does not own source repositories, project submissions, pull requests, reviews, or collaboration identity.

A future `Team` remains a separate aggregate for collaborative/project work and GitHub integration. If a product flow later wants to create Teams from Groups, that must be an explicit mapping/process rather than shared identity or a renamed table.

### 6. Authorization stays at the Offering delivery boundary

This slice uses existing `offering.read` and `offering.manage` capabilities at the Offering scope for CourseRun and grouping operations.

No new capability is introduced merely because new entities exist. Capability names describe authority; policy decides which roles receive it; resource hierarchy remains a separate concern.

Future group-scoped mentor/instructor delegation may introduce dedicated group capabilities when there is a concrete policy requirement. It is not inferred prematurely here.

### 7. Module boundary and persistence

CourseRun, GroupSet, Group, and GroupMembership are owned by the existing Learning Delivery module. Other modules must consume future public application/query interfaces rather than Delivery repositories or tables.

PostgreSQL remains source of truth. All new tables are tenant-scoped and protected by RLS. Mutations emit transactional outbox events:

- `course_run.created`;
- `group_set.created`;
- `group.created`;
- `group_membership.assigned`.

## Consequences

- Self-paced delivery remains simple and runless.
- Instructor-led delivery gains a concrete execution context without redefining Enrollment.
- Repeated cohorts can reuse one immutable course version and one offering boundary.
- Multiple independent learner grouping dimensions are possible without nested-group hacks.
- Group placement cannot manufacture enrollment or commercial entitlement.
- The future Team/GitHub-project model remains free to evolve around collaboration rather than classroom organization.
- Session, Attendance, and Assignment can be added next against a stable CourseRun/Group delivery context.
