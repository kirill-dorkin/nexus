# ADR 0017: Assignments are durable delivery instructions

## Status

Accepted.

## Context

Nexus separates immutable curriculum from delivery. A published `CourseVersion` contains exact `ActivityVersion` snapshots; a `LearningOffering` is the universal delivery context; `CourseRun`, `GroupSet`, `Group`, `Session`, and `Attendance` add optional instructor-led structure without redefining curriculum or access.

The final F3 delivery concept is `Assignment`. It must work for both self-paced and cohort delivery and must not collapse curriculum, access, learner work, or evidence into one record.

The core invariants for this slice are:

- `Assignment != ActivityVersion`;
- `Assignment != Attempt`, `Submission`, or `Evidence`;
- every Assignment belongs to exactly one `LearningOffering`;
- an Assignment references the exact ActivityVersion from the CourseVersion pinned by that Offering;
- an Assignment may target the whole Offering, one CourseRun, one delivery Group, or one Enrollment;
- Assignment never creates Enrollment, GroupMembership, Entitlement, Attempt, Submission, Evidence, or mastery state;
- Assignment structural meaning is durable once created;
- cancellation is explicit, one-way, and auditable through the transactional outbox.

## Decision

### 1. Assignment belongs to LearningOffering

`LearningOffering` is the mandatory root delivery context for Assignment.

Assignment does not require a CourseRun. This is necessary because self-paced offerings are intentionally runless unless they need a separate execution lifecycle. Requiring `course_run_id` would recreate separate self-paced and instructor-led assignment models and violate ADR 0010.

A CourseRun, Group, or Enrollment may narrow the Assignment audience, but none replaces the parent Offering.

### 2. Assignment pins an exact ActivityVersion

The create command addresses the stable curriculum `Activity` identity within the Offering's pinned CourseVersion. The application resolves that identity to the exact `course_version_activities.id` snapshot and persists that exact ActivityVersion ID.

PostgreSQL independently requires the persisted ActivityVersion to belong to the same CourseVersion as the parent Offering.

Assignment does not copy activity instructions, validators, scoring configuration, or skill mappings. Those remain immutable curriculum state. Operational fields such as Assignment name and schedule do not become a second curriculum source of truth.

### 3. Audience is explicit and referentially constrained

Assignment has exactly one audience type:

- `offering` — all applicable participants in the parent Offering;
- `course_run` — one CourseRun belonging to the parent Offering;
- `group` — one delivery Group whose GroupSet and CourseRun resolve to the parent Offering;
- `enrollment` — one Enrollment belonging to the parent Offering.

Persistence uses explicit nullable foreign keys plus a constrained `audience_type`, not a generic `(resource_type, resource_id)` pair. PostgreSQL enforces that exactly the columns required by the chosen audience type are present.

A group Assignment targets the Group as a delivery container. This slice does not materialize recipient snapshots and does not create or alter GroupMembership. Historical membership intervals remain available for a future learner-effective-assignment policy.

A CourseRun Assignment does not introduce a hidden `RunMembership` concept. Enrollment remains participation in the Offering as defined by ADR 0015.

### 4. Scheduling is optional and does not redefine run windows

Assignment may define:

- `availableAt` — when the task is intended to become available;
- `dueAt` — the intended deadline.

If both are present, `dueAt` must be later than `availableAt`.

Assignment schedule is deliberately not forced inside the parent CourseRun or Offering schedule. Pre-work before a cohort begins and follow-up work after a scheduled run are valid delivery patterns. A future policy may determine learner visibility or lateness without changing the structural meaning of Assignment.

### 5. Assignment is immutable except for one-way cancellation

The initial Assignment fixes:

- parent Offering;
- exact ActivityVersion;
- audience;
- slug and operational name;
- availability and due schedule;
- creator and creation time.

These fields are not runtime-editable in this foundation slice. A semantic correction creates a new Assignment and may cancel the old one. This avoids mutable historical meaning before Nexus has an explicit Assignment revision model and prevents future Attempts from referring to a delivery instruction that was silently rewritten.

Cancellation is a one-way transition. A cancelled Assignment cannot be reactivated or rewritten. The cancellation actor must match the transaction principal. The application role has no DELETE privilege.

### 6. Creation requires an open Offering but later lifecycle changes preserve history

A new Assignment may only be created while its parent Offering is `open`. PostgreSQL independently enforces that rule at insert time.

Closing or archiving an Offering later does not delete or rewrite existing Assignments. Assignment is a durable delivery record.

### 7. Assignment does not gate Attempts in F3

The existing Attempt flow remains unchanged in this slice. Learners can still submit an Attempt for an Activity in their active Enrollment according to the existing F4 learning-loop policy.

Determining which Assignments are effective for one Enrollment at a point in time, whether an Assignment is required before an Attempt, lateness semantics, retry limits, rubric/scoring rules, and Assignment-to-Attempt association belong to the next explicit Activity/Attempt/Evidence design work. They are not inferred prematurely by Delivery.

This keeps F3 focused on delivery structure and prevents Assignment from becoming a hidden assessment or progress engine.

### 8. Authorization remains at the Offering boundary

Assignment management reuses `offering.manage` at the parent Offering scope.

This slice intentionally does not expose a learner-facing "my assignments" query through generic `offering.read`. A future public query must resolve effective audience for a concrete Enrollment so an individual Assignment cannot be disclosed merely because a learner knows its UUID.

### 9. Persistence, tenant isolation, and events

Assignment is owned by the existing Learning Delivery bounded context. Other modules must use public application/query boundaries or events and must not query Delivery tables directly.

PostgreSQL remains source of truth. Assignment rows are tenant-scoped and protected by RLS. Composite foreign keys and database validation reject cross-tenant and cross-Offering targets independently of application checks.

Mutations emit transactional outbox events in the same transaction as business state:

- `assignment.created`;
- `assignment.cancelled`.

No recipient fan-out, notification, Attempt creation, or mastery mutation is performed synchronously by Assignment.

## Consequences

- F3 has one Assignment model for self-paced and instructor-led delivery;
- self-paced Assignment does not require synthetic CourseRuns;
- Assignment preserves an exact immutable curriculum snapshot without duplicating curriculum content;
- run/group/enrollment targeting remains explicit and database-verifiable;
- Assignment cannot manufacture access or group membership;
- future Attempts and analytics can rely on stable historical Assignment meaning;
- cancellation preserves history instead of deleting it;
- F4 can define effective-assignment and Attempt association semantics deliberately rather than inheriting accidental F3 behavior.
