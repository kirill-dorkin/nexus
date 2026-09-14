# ADR 0016: Sessions and attendance are scheduled delivery facts

## Status

Accepted.

## Context

Nexus already separates immutable curriculum from delivery. `LearningOffering` defines the access/delivery context for one published `CourseVersion`; `CourseRun` is a concrete cohort execution; `GroupSet` and `Group` organize enrolled learners inside a run without changing access rights.

Instructor-led delivery still needs two concepts from the F3 roadmap:

- a scheduled teaching event inside a CourseRun;
- a durable record of whether an enrolled learner attended that event.

These concepts must not be collapsed into curriculum `Activity`, learner `Attempt`, or group membership. Curriculum is immutable instructional definition; a Session is operational scheduling. Attendance is an observed delivery fact, not evidence of mastery or completion.

The core invariants for this slice are:

- `Session != Activity`;
- `Attendance != Attempt` and `Attendance != Evidence`;
- every Session belongs to exactly one CourseRun;
- a Session may target the whole CourseRun or one delivery Group from that same CourseRun;
- Session time must remain inside the CourseRun window;
- Attendance references an Enrollment, never a raw User;
- Attendance never creates enrollment or group membership;
- one current Attendance exists per `(Session, Enrollment)`;
- corrections must retain an audit trail.

## Decision

### 1. Session is an operational event inside a CourseRun

A `Session` represents one scheduled instructor-led event such as a lecture, lab, workshop, review, or synchronous meeting. It belongs to exactly one CourseRun and has a stable identity, slug, name, start, and end.

Session is deliberately not linked to a curriculum Activity in this foundation slice. A future product flow may associate instructional material or assignments with a Session, but such a relation must remain explicit. Scheduling a class must never mutate or duplicate immutable curriculum.

A Session must start and end inside its parent CourseRun window. PostgreSQL independently enforces this boundary.

### 2. Session audience is run-wide or one delivery Group

A Session has an optional `groupId`.

- `groupId = null` means the Session is addressed to the whole CourseRun.
- a non-null `groupId` means the Session is addressed to one delivery Group.

The Group must resolve through its GroupSet to the same CourseRun as the Session. The database validates this hierarchy so a Group from another run cannot be attached through direct SQL or a future alternate application path.

This does not turn Group into a collaboration Team. ADR 0015 remains authoritative: delivery Group and future project Team have separate identities and lifecycles.

### 3. Attendance references Enrollment, not User

An `Attendance` records the attendance state of one Enrollment at one Session. This preserves the existing delivery/access boundary:

`Purchase != Entitlement != Enrollment != Attendance`.

The Enrollment must belong to the LearningOffering that owns the Session's CourseRun. It must also have been created no later than the Session start. Current Enrollment status is intentionally not used as a historical-time proxy because the existing Enrollment model does not yet carry a complete status timeline; otherwise a later completion or withdrawal could make legitimate historical attendance impossible to record or correct.

### 4. Group-scoped attendance uses membership at Session start

For a group-scoped Session, the Enrollment must have a GroupMembership in the Session's Group at the instant the Session starts.

Membership uses a half-open interval:

`assignedAt <= session.startsAt < endedAt`,

with `endedAt = null` meaning the membership remains active.

This gives historical attendance deterministic semantics even if a learner is reassigned later. Attendance does not create, extend, or repair GroupMembership.

### 5. Attendance status is explicit, not boolean

Attendance uses the explicit states:

- `present`;
- `absent`;
- `late`;
- `excused`.

A boolean would lose operational meaning and immediately force ambiguous side channels for late or excused learners.

Exactly one current Attendance row is allowed for each `(Session, Enrollment)` pair.

### 6. Corrections preserve audit history

The primary `attendances` row is the current operational state. Correcting its status does not erase the previous state.

A PostgreSQL trigger writes every status transition into append-only `attendance_revisions` with previous status, new status, timestamp, and the application actor when available. The application role can read revision history but cannot insert, update, or delete revision rows directly.

The application exposes initial recording and correction as separate commands. This keeps duplicate initial recording distinguishable from a deliberate correction and gives downstream consumers distinct outbox events.

### 7. Authorization remains at the Offering boundary

Session and Attendance operations reuse existing `offering.read` and `offering.manage` capabilities at the parent Offering scope.

No new capability is introduced merely because new entity types exist. If Nexus later supports delegated attendance takers or group-scoped instructors, that concrete policy requirement can justify narrower capabilities and scopes.

### 8. Module boundary, persistence, and events

Session, Attendance, and attendance revision history belong to the existing Learning Delivery bounded context.

PostgreSQL remains source of truth. All tables are tenant-scoped and RLS-protected. Application mutations emit transactional outbox events:

- `session.created`;
- `attendance.recorded`;
- `attendance.corrected`.

Other modules must consume public application/query interfaces or events rather than reading Learning Delivery tables directly.

## Consequences

- instructor-led runs gain a real scheduled-event model without contaminating curriculum Activity;
- run-wide and group-specific teaching events share one Session model;
- Attendance cannot become an alternate access or grouping mechanism;
- historical group placement determines eligibility for group-scoped attendance deterministically;
- completion, mastery, Attempts, Evidence, and Attendance remain separate concepts;
- attendance correction is operationally convenient while remaining auditable;
- the final F3 Assignment slice can later decide explicitly how curriculum Activities are assigned to a run, group, or enrollment without overloading Session.