# ADR 0043 — Readiness-gated Enrollment completion

## Status

Accepted

## Context

ADR-0041 introduced `course-progression-readiness@1` as a derived decision answering whether a learner is currently ready to progress beyond the Skill set pinned by an active Enrollment's published CourseVersion.

ADR-0042 added Offering-scoped operational aggregation without changing that individual decision.

Neither ADR created an enforced transition. In particular:

- `ReadinessDecision` was not Enrollment completion;
- Learning Readiness did not mutate Delivery state;
- no generic ProgressionGate engine existed;
- no public command transitioned an Enrollment from `active` to `completed`.

The Delivery model already contains `Enrollment.status = completed` and `completedAt`, but before this slice there was no application-level completion command.

The first enforced progression rule therefore needs one concrete protected transition rather than a generic policy framework.

## Decision

### The first protected transition is Enrollment completion

F8.6 introduces one explicit transition:

`Enrollment active -> completed`

through:

`POST /v1/organizations/:organizationId/enrollments/:enrollmentId/complete`

The transition is learner-requested, self-only, and synchronous.

It does not automatically complete an Enrollment when readiness becomes ready.

### Learning Progression owns gate orchestration

A new Learning Progression module owns:

- the versioned completion-gate policy;
- the completion command use case;
- orchestration across authorization, Readiness, and Delivery.

It does not own:

- Readiness calculation;
- Enrollment persistence;
- Mastery/Evidence;
- authorization role storage;
- certification or entitlement state.

This avoids a dependency cycle. Learning Readiness already depends on Delivery context, so Delivery must not depend back on Learning Readiness.

The dependency direction is:

```text
Learning Progression
  -> Learning Readiness public query
  -> Learning Delivery public query/command
```

Learning Readiness may continue to depend on Delivery for Enrollment context.

### Readiness exposes a transaction-level public query

Learning Readiness exports a public application query that evaluates one active Enrollment inside a caller-owned transaction.

The query reuses the exact existing `course-progression-readiness@1` evaluator.

The Progression module does not duplicate Mastery, Evidence, freshness, or repeated-failure logic.

The existing individual readiness HTTP endpoint is also routed through this public query so the read surface and completion gate use the same decision path.

### Delivery owns the canonical completion mutation

Learning Delivery exports a narrow transaction-level command for Enrollment completion.

The Delivery command:

- changes `status` from `active` to `completed`;
- sets server-owned `completedAt`;
- emits exactly one transactional `enrollment.completed@1` outbox event;
- does not know why the caller decided completion was allowed.

Learning Progression decides eligibility; Delivery owns canonical state mutation.

### Gate policy is explicit and versioned

The first enforced policy is:

`course-readiness-enrollment-completion@1`

It consumes only the status of the exact `course-progression-readiness@1` decision evaluated for the target active Enrollment in the same transaction.

Rules:

- `ready` -> allow;
- `insufficient_evidence` -> block;
- `not_ready` -> block.

Unknown evidence therefore fails closed.

The gate does not reinterpret Skill reasons or invent a second readiness model.

### Authorization is separate from pedagogical eligibility

A new Offering-scoped capability is introduced:

`progression.complete`

The learner role receives this capability.

The completion endpoint additionally requires that the authenticated user owns the Enrollment.

Therefore:

- readiness alone never grants permission;
- permission alone never bypasses readiness;
- organization owner authority does not let an owner complete another learner's Enrollment through this self-only endpoint;
- instructor/mentor override is not introduced.

A future staff override requires a separate explicit policy and capability.

### Completion uses one writable consistent snapshot

The command runs in one tenant-scoped writable `REPEATABLE READ` transaction.

One server-owned instant is used as both:

- readiness `evaluatedAt`;
- Enrollment `completedAt`.

The transaction order is:

```text
active identity
  -> Enrollment ownership
  -> progression.complete authorization
  -> current Enrollment lifecycle
  -> course-progression-readiness@1
  -> completion gate policy
  -> Delivery completion mutation
  -> enrollment.completed@1 outbox
  -> commit
```

A gate denial rolls back the entire command and emits no completion outbox event.

### Completion retries are materially idempotent

If the same learner repeats the completion command after the Enrollment is already completed, the existing completed Enrollment is returned.

No readiness recomputation is required for that retry and no second `enrollment.completed` event is emitted.

Withdrawn and cancelled Enrollments cannot complete through this command.

PostgreSQL serialization failure is translated into a retryable conflict response rather than silently changing gate semantics.

### Enrollment terminal lifecycle is protected in PostgreSQL

Migration `000031_enrollment_terminal_lifecycle.sql` adds a Delivery-owned trigger that enforces:

- only `active` may transition to a terminal Enrollment status;
- terminal statuses are immutable;
- a completed Enrollment's `completedAt` is immutable.

Allowed first terminal transitions remain:

- `active -> completed`;
- `active -> withdrawn`;
- `active -> cancelled`.

This is defense in depth for canonical Delivery state and does not encode Readiness policy in PostgreSQL.

### Denials remain explainable but gate state is not persisted

A blocked completion returns machine-readable information containing:

- code `progression_gate_denied`;
- exact gate policy identity;
- the exact readiness decision that caused the denial.

No ProgressionGate table, snapshot, history row, LearningEvent, queue, worker, or notification is created.

The readiness decision remains derived.

### Completion is not certification or entitlement

Enrollment completion does not:

- grant or revoke Commerce entitlement;
- issue a certificate;
- close the LearningOffering;
- complete a CourseRun;
- complete Assignments;
- mutate Mastery;
- change Recommendation state;
- create a separate learning achievement projection.

Those require separate product decisions.

### Existing learner work remains unaffected before completion

Starting Attempts remains governed by the existing active-Enrollment plus `attempt.submit` rule.

F8.6 does not gate individual Activities by Course readiness and does not turn Recommendations or Assignments into access grants.

After completion, existing active-Enrollment guards naturally prevent new Attempts.

## Consequences

Nexus now has one real enforced progression transition with explicit ownership and policy boundaries.

`ReadinessDecision != ProgressionGate != Enrollment completion` remains true:

- Readiness says whether the learner is ready;
- ProgressionGate decides whether this particular transition is allowed;
- Delivery records the canonical lifecycle transition.

The gate is synchronous and derived; no generic gate engine is introduced.

The first completion path is:

```text
active Enrollment
  -> insufficient readiness => completion blocked, no mutation
  -> definitive not_ready => completion blocked, no mutation
  -> readiness ready
  -> course-readiness-enrollment-completion@1 allows
  -> Enrollment completed
  -> one enrollment.completed@1 outbox event
  -> retry returns same completed Enrollment without duplicate event
```

## Deferred

Separate decisions remain required for:

- instructor/admin completion override;
- forced completion and its audit requirements;
- withdrawal/cancellation application commands;
- completion history/read-model snapshots;
- certificates or credentials;
- Commerce consequences;
- Group/CourseRun progression;
- Activity-level prerequisite gates;
- automatic completion when readiness becomes ready;
- notification/escalation workflows;
- general reusable gate engines;
- F7 production grader activation.
