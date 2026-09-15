# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed and what frontier comes next.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

## Checkpoint baseline

Last maintained: 2026-09-15.

Baseline repository state: includes the F4 canonical learner LearningEvent history/read-model slice described by ADR-0022. Verify the live `main` head before relying on any SHA or PR number.

Latest architectural decision at this checkpoint: ADR-0022.

Latest ordered migration at this checkpoint: `000017_learning_event_history.sql`.

The baseline above is an orientation marker, not permission to skip checking the live `main` head.

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
- validator identity/version/config is pinned by immutable `ActivityVersion.config` and supported through an exact-version code-backed registry;
- raw `ValidationResult` is append-only and pins the exact Submission, ActivityVersion, validator version/config snapshot, idempotency key, result status, registry-derived Evidence trust, actor, and timestamp;
- validation result publication is tenant-scoped and idempotent, and contradictory reuse of an idempotency key is rejected;
- validation distinguishes completed learner outcomes from `system_error`; infrastructure failure cannot be persisted as learner failure/score;
- `manual-review@1` proves the authorized-user validation path without executing learner code;
- `validation.result_recorded` remains a transactional integration outbox event for newly persisted results;
- only `completed` + `trusted` + decisive (`passed` / `failed`) ValidationResults normalize into automated Evidence;
- automated normalization uses the exact immutable ActivityVersion skill mapping and creates one Evidence record per assessed skill;
- explicit validator score is preserved; otherwise `passed -> 1` and `failed -> 0` provide deterministic normalized scores;
- raw validator payload is not copied into Evidence; automated Evidence carries only stable normalized semantics plus exact ValidationResult provenance;
- Evidence distinguishes `manual` from `validation_result` provenance, and validation-derived Evidence is unique per `(ValidationResult, skill)` at the PostgreSQL layer;
- recording a raw ValidationResult commits before normalization; retrying the same idempotent result safely re-attempts missing normalization without duplicating already-created Evidence;
- `needs_review`, `system_error`, and advisory results do not become automated Evidence;
- Evidence is append-only normalized learning evidence and requires the exact Submission it evaluates;
- newly materialized Evidence refreshes Mastery without changing the existing Mastery algorithm, while idempotent replays do not double-count;
- Mastery is a projection derived from Evidence and supports recomputation from append-only history;
- `LearningEvent` now has a dedicated canonical append-only journal separate from `events.outbox` and telemetry;
- F4 learner history currently journals `attempt.started`, `submission.submitted`, completed `validation.result_recorded`, and `evidence.recorded` with normalized/redacted semantics;
- `system_error`, deprecated `attempt.submitted`, raw Submission/validator/Evidence payloads, outbox metadata, and mutable Mastery projection changes are excluded from learner LearningEvent history;
- existing immutable Attempt/Submission/completed ValidationResult/Evidence state is backfilled into the canonical journal by migration `000017` without rewriting historical outbox rows;
- LearningEvent ordering and pagination are stable by `(occurredAt, lifecycleOrder, eventId)`, so same-transaction Attempt/Submission timestamps remain causally ordered;
- learner history is scoped to the owning Enrollment and remains readable after the Enrollment is no longer active;
- recommendation retry counts count submitted attempts rather than abandoned started attempts;
- lifecycle mutations continue to emit transactional outbox events for integration/deferred-work concerns independently of LearningEvent history;
- the learner runner exposes an Enrollment-scoped read model for effective Assignments and their pinned immutable Activities;
- effective Assignment audiences are resolved for offering, Enrollment, Group, and CourseRun without making Assignment an access grant;
- CourseRun audience resolution uses explicit time-bounded GroupMembership placement rather than inventing a hidden RunMembership;
- Assignment timing is exposed as `upcoming`, `available`, or `past_due`, while lateness enforcement remains undecided;
- starting an Attempt does not globally require an effective Assignment, preserving self-paced and recommendation-driven work.

The current lifecycle is:

```text
Assignment / recommendation
  -> Attempt started
  -> Submission submitted
  -> ValidationResult recorded
  -> normalized Evidence
  -> Mastery projection
```

The canonical learner-facing LearningEvent journal exposes the stable historical parts of this lifecycle without treating the mutable Mastery projection or integration outbox as learner history.

The F4 validation/evidence/history slices deliberately do **not** execute learner code, start grader/sandbox jobs, authenticate grader services, introduce a general outbox worker runtime, change Mastery semantics, decide retry/lateness policy, add strict Assignment-to-Attempt association, or add instructor/mentor read-others history policy.

### F5–F9 — not the active Foundation frontier

Guided Build, GitHub projects, grader hardening, recommendation/instructor intelligence expansion, and commerce/public-launch work remain later roadmap foundations. Supporting primitives may already exist, but do not pull later-foundation policy into F4 without an explicit architectural reason.

## Durable architecture facts

These are high-value reminders, not substitutes for their ADRs.

- Nexus is a modular monolith. A module owns its business state and does not integrate by reaching into another module's repositories/tables.
- PostgreSQL is the canonical source of truth for business state.
- Tenant isolation is defense in depth: application authorization plus PostgreSQL/RLS with transaction-local organization/actor context.
- Cross-module synchronous collaboration targets public application interfaces. Deferred consequences use events/outbox.
- Canonical LearningEvent history is a separate append-only product journal; `events.outbox` is an integration/deferred-work transport boundary and is not a learner read model.
- Canonical source state and its corresponding LearningEvent are committed in the same transaction when the lifecycle event is learner-visible.
- Canonical business state and its integration outbox event are committed in the same transaction where that event contract applies.
- Migrations are ordered and append-only. Applied history is not rewritten.
- Published Curriculum is the immutable **what**; Delivery is the **how / when / to whom**.
- `Purchase != Entitlement != Enrollment`.
- `Group != Team`.
- `Assignment` schedules or targets learner work; it does not itself grant entitlement, enrollment, access, or group membership.
- `Attempt` is one learner try against an exact `ActivityVersion`.
- `Attempt != Submission`.
- `Submission` is immutable committed learner work for an Attempt.
- Validator binding is curriculum meaning and is pinned by immutable ActivityVersion configuration; validator registry versions are exact, not floating aliases.
- `ValidationResult != LearningEvidence`: validation is raw attributable result state; Evidence is normalized learning signal.
- Evidence evaluates a Submission; Mastery is derived from normalized Evidence rather than raw validator/grader payloads.
- Automated Evidence pins exact ValidationResult provenance and is idempotent per result/skill; manual Evidence remains an independent explicitly labeled signal.
- Infrastructure/system failure and non-decisive review state never become negative learner Evidence; `system_error` is also excluded from learner LearningEvent history.
- Grader/sandbox hardening belongs to the separate security boundary described by ADR-0007 and the F7 roadmap unless an earlier slice needs only a safe application-level contract.

## Active F4 compatibility windows

Do not remove these merely because the canonical model has moved on. Each requires an explicit cleanup slice/migration once its callers are proven migrated.

1. Historical `learning_progress.attempts.submission` and `submitted_at` columns remain for migration compatibility, but dedicated `learning_progress.submissions` is the source of truth for new application writes.
2. During the transition window, the existing create-Attempt command may still carry a submission payload; the application must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event. `attempt.submitted` remains only as a deprecated transition integration alias and carries `submissionId`; it is never materialized as a learner LearningEvent.
4. Evidence-by-Submission is the canonical API direction; the older Evidence-by-Attempt endpoint is retained temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to mimic the canonical LearningEvent journal.

## Next recommended slice

**F4 Student skill UI/read model over the established Mastery projection.**

The learning lifecycle, normalized Evidence, Mastery projection, effective Assignment runner, and canonical learner history now provide the backend foundations needed for the final identified F4 presentation/read slice.

Before implementing it, re-establish the current repository truth and answer from code/ADRs:

- which learner-facing skill state belongs in the first UI/read contract (`masteryScore`, confidence/evidence counts, last evidence time, review/next-step context) and which model internals remain hidden;
- how canonical Skill identity/title and immutable course-version skill presentation are combined without duplicating curriculum ownership in Progress;
- whether the read is Enrollment/course-version scoped, organization-wide, or exposes both explicit views;
- how skills with zero Evidence are represented alongside skills with Mastery projections;
- how the UI distinguishes assessed progress from insufficient evidence without inventing false certainty;
- how the existing recommendation and LearningEvent history read models link to skill state without folding them into Mastery ownership;
- what authorization is required for the learner's own skill view while leaving instructor/mentor read-others policy explicit.

Keep this slice focused on the learner skill presentation/read contract. Do not change the Mastery algorithm merely to fit a UI shape.

## Remaining F4 follow-up frontier

After the Student skill UI/read-model slice, retry/lateness enforcement and strict assigned-only Attempt association remain explicit product policy decisions if flows require them; they are not prerequisites for closing the currently identified core F4 learner read path.

Instructor/mentor read-others history/skill views should be added only with an explicit authorization/product requirement rather than inferred from self-read APIs.

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
- Learner runner / effective Assignment policy: ADR-0019.
- Validator registry / immutable ValidationResult: ADR-0020.
- Trusted ValidationResult -> normalized Evidence: ADR-0021.
- Canonical learner LearningEvent history/read model: ADR-0022.

For any new durable decision, add or amend architecture documentation through a new ADR rather than silently encoding policy only in implementation.

## Maintenance rule

Update this document in the same PR whenever a merged slice changes the Foundation frontier, adds/removes a compatibility window, changes the latest durable lifecycle, or changes the recommended next slice. Do not turn it into a changelog; Git history already records history. Keep only the state a new engineer or agent needs to continue safely.
