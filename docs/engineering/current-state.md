# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed and what frontier comes next.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

## Checkpoint baseline

Last maintained: 2026-09-15.

Baseline repository state: `main` immediately after squash merge of PR #25, `feat(f4): split attempts and submissions`, commit `7a05fbf3d4ea72c769a026a0f583f1b4038b9710`.

Latest architectural decision at this checkpoint: ADR-0018.

Latest ordered migration at this checkpoint: `000014_attempt_submissions.sql`.

The SHA above is an orientation marker, not permission to skip checking the live `main` head.

## Foundation frontier

### F0 — Constitution and architecture: established

The repository has the modular-monolith boundary model, ADR process, security baseline, roadmap, domain documentation, and engineering conventions needed to evolve the platform deliberately.

### F1 — Identity, organization, authorization, database: implemented foundation

Identity/session, organization/membership, authorization, tenant context, PostgreSQL/RLS, migration, and transactional infrastructure are established and used by later slices.

### F2 — Immutable curriculum + knowledge graph: implemented foundation

Published curriculum/versioning and the skill/knowledge relationships required by the learning loop are established. Published versions are treated as immutable snapshots.

### F3 — Delivery: implemented

The delivery foundation now includes:

- `LearningOffering` as required delivery context;
- `Enrollment` as the learner's delivery relationship;
- optional `CourseRun` where a separate run lifecycle is required;
- `GroupSet` / `Group` membership for delivery grouping;
- `Session` / `Attendance` for instructor-led delivery history;
- `Assignment` with explicit audiences and cancellation semantics;
- delivery-history hardening and least-privilege update rules.

F3 proved self-paced and instructor-led delivery through one model rather than separate product architectures.

### F4 — Activity / Attempt / Evidence vertical slice: in progress

Landed capabilities include:

- Attempts pin an exact immutable `ActivityVersion`;
- Attempt and Submission are separate domain lifecycles;
- an Attempt may exist before learner submission;
- a Submission is immutable committed learner work and F4 v1 allows at most one Submission per Attempt;
- Evidence is append-only normalized learning evidence and requires the exact Submission it evaluates;
- Mastery is a projection derived from Evidence and supports recomputation from append-only history;
- recommendation retry counts count submitted attempts rather than abandoned started attempts;
- lifecycle mutations emit canonical transactional outbox events.

The current lifecycle target is:

```text
Assignment / recommendation
  -> Attempt started
  -> Submission submitted
  -> validation
  -> normalized Evidence
  -> Mastery projection
```

The Attempt/Submission split deliberately did **not** decide Assignment gating, retry policy, lateness, validator configuration, automated scoring, or grader execution.

### F5–F9 — not the active Foundation frontier

Guided Build, GitHub projects, grader hardening, recommendation/instructor intelligence expansion, and commerce/public-launch work remain later roadmap foundations. Supporting primitives may already exist, but do not pull later-foundation policy into F4 without an explicit architectural reason.

## Durable architecture facts

These are high-value reminders, not substitutes for their ADRs.

- Nexus is a modular monolith. A module owns its business state and does not integrate by reaching into another module's repositories/tables.
- PostgreSQL is the canonical source of truth for business state.
- Tenant isolation is defense in depth: application authorization plus PostgreSQL/RLS with transaction-local organization/actor context.
- Cross-module synchronous collaboration targets public application interfaces. Deferred consequences use events/outbox.
- Canonical business state and its canonical outbox event are committed in the same transaction.
- Migrations are ordered and append-only. Applied history is not rewritten.
- Published Curriculum is the immutable **what**; Delivery is the **how / when / to whom**.
- `Purchase != Entitlement != Enrollment`.
- `Group != Team`.
- `Assignment` schedules or targets learner work; it does not itself grant entitlement, enrollment, access, or group membership.
- `Attempt` is one learner try against an exact `ActivityVersion`.
- `Attempt != Submission`.
- `Submission` is immutable committed learner work for an Attempt.
- Evidence evaluates a Submission; Mastery is derived from normalized Evidence rather than raw validator/grader payloads.
- Grader/sandbox hardening belongs to the separate security boundary described by ADR-0007 and the F7 roadmap unless an earlier slice needs only a safe application-level contract.

## Active F4 compatibility windows

Do not remove these merely because the canonical model has moved on. Each requires an explicit cleanup slice/migration once its callers are proven migrated.

1. Historical `learning_progress.attempts.submission` and `submitted_at` columns remain for migration compatibility, but dedicated `learning_progress.submissions` is the source of truth for new application writes.
2. During the transition window, the existing create-Attempt command may still carry a submission payload; the application must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event. `attempt.submitted` remains only as a deprecated transition alias and carries `submissionId`.
4. Evidence-by-Submission is the canonical API direction; the older Evidence-by-Attempt endpoint is retained temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to mimic the new event model.

## Next recommended slice

**F4 learner runner read model / effective Assignment policy.**

The goal is to let the learner runner determine what activity work is currently available/effective without collapsing Delivery and Learning Progress or making Assignment itself an access grant.

Before implementing it, re-establish the current repository truth and answer from existing code/ADRs rather than assuming policy:

- how effective Assignments are resolved for offering, course-run, group, and enrollment audiences;
- how learner Enrollment/entitlement/authorization gates runner access independently from Assignment;
- whether starting an Attempt requires an effective Assignment for every activity or only for assigned flows;
- what read model/API the runner needs without introducing premature recommendation or grader policy;
- how retry/lateness policy should be deferred or represented if not yet decided.

Keep this as a focused F4 slice. Validator registry/results, automated Evidence production, canonical LearningEvent history, and Student skill UI should remain independent follow-up slices unless the design proves a hard dependency.

## Remaining F4 follow-up frontier

After the runner/effective-Assignment slice, the currently identified F4 work is:

- validator registry and validation-result model;
- automated normalized Evidence generation from trusted validation results;
- canonical learner-facing LearningEvent history/read model;
- Student skill UI over the established Mastery projection.

Sandbox execution hardening itself remains F7.

## Relevant ADR reading map

Always inspect the live `docs/adr/` directory; this map is only a starting point.

- Core architecture: ADR-0001 through ADR-0006.
- Grader security boundary: ADR-0007.
- Offering/delivery context: ADR-0010.
- Database foundation and tenant/role mechanics: ADR-0004 and ADR-0012.
- Explainable recommendations: ADR-0013.
- Entitlement vs Enrollment access: ADR-0014.
- Course runs and delivery groups: ADR-0015.
- Sessions and attendance: ADR-0016.
- Assignments: ADR-0017.
- Attempt / Submission lifecycle: ADR-0018.

For any new durable decision, add or amend architecture documentation through a new ADR rather than silently encoding policy only in implementation.

## Maintenance rule

Update this document in the same PR whenever a merged slice changes the Foundation frontier, adds/removes a compatibility window, changes the latest durable lifecycle, or changes the recommended next slice. Do not turn it into a changelog; Git history already records history. Keep only the state a new engineer or agent needs to continue safely.
