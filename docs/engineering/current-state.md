# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed and what frontier comes next.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

## Checkpoint baseline

Last maintained: 2026-09-16.

Baseline repository state: includes the completed F5 Guided Build API-level learner vertical plus the F6 GitHub integration ingress, trusted GitHub App setup/mapping, and durable installation/repository lifecycle-processing foundations on top of the completed F4 core learner path. Verify the live `main` head before relying on any SHA or PR number.

Latest architectural decision at this checkpoint: ADR-0029.

Latest ordered migration at this checkpoint: `000023_github_lifecycle_trust_guards.sql`.

The baseline above is an orientation marker, not permission to skip checking the live `main` head.

## Foundation frontier

### F0 — Constitution and architecture: established

The repository has the modular-monolith boundary model, ADR process, security baseline, roadmap, domain documentation, and engineering conventions needed to evolve the platform deliberately.

### F1 — Identity, organization, authorization, database: implemented foundation

Identity/session, organization/membership, authorization, tenant context, PostgreSQL/RLS, migration, and transactional infrastructure are established and used by later slices.

### F2 — Immutable curriculum + knowledge graph: implemented foundation

Published curriculum/versioning and the skill/knowledge relationships required by the learning loop are established. Published versions are treated as immutable snapshots.

### F3 — Delivery: implemented

The delivery foundation includes:

- `LearningOffering` as required delivery context;
- `Enrollment` as the learner's delivery relationship;
- optional `CourseRun` where a separate run lifecycle is required;
- `GroupSet` / `Group` membership for delivery grouping;
- `Session` / `Attendance` for instructor-led delivery history;
- `Assignment` with explicit audiences and cancellation semantics;
- delivery-history hardening and least-privilege update rules.

F3 proves self-paced and instructor-led delivery through one model rather than separate product architectures.

### F4 — Activity / Attempt / Evidence vertical slice: core learner path implemented

The core F4 learner path now includes:

- Attempts pin an exact immutable `ActivityVersion`;
- Attempt and Submission are separate domain lifecycles;
- an Attempt may exist before learner submission;
- a Submission is immutable committed learner work and F4 v1 allows at most one Submission per Attempt;
- validator identity/version/config is pinned by immutable `ActivityVersion.config` and supported through an exact-version code-backed registry;
- raw `ValidationResult` is append-only and pins the exact Submission, ActivityVersion, validator version/config snapshot, idempotency key, result status, registry-derived Evidence trust, actor, and timestamp;
- validation distinguishes completed learner outcomes from `system_error`; infrastructure failure cannot be persisted as learner failure/score;
- `manual-review@1` proves the authorized-user validation path without executing learner code;
- only `completed` + `trusted` + decisive (`passed` / `failed`) ValidationResults normalize into automated Evidence;
- automated normalization uses the exact immutable ActivityVersion skill mapping and creates one Evidence record per assessed skill;
- explicit validator score is preserved; otherwise `passed -> 1` and `failed -> 0` provide deterministic normalized scores;
- raw validator payload is not copied into Evidence; automated Evidence carries only stable normalized semantics plus exact ValidationResult provenance;
- Evidence distinguishes `manual` from `validation_result` provenance and validation-derived Evidence is unique per `(ValidationResult, skill)` at the PostgreSQL layer;
- `needs_review`, `system_error`, and advisory results do not become automated Evidence;
- Evidence is append-only normalized learning evidence and requires the exact Submission it evaluates;
- newly materialized Evidence refreshes Mastery without changing the existing Mastery algorithm, while idempotent replays do not double-count;
- Mastery is an organization-wide learner+Skill projection derived from Evidence and supports recomputation from append-only history;
- the current v1 mastery algorithm is intentionally separate from learner presentation and remains replaceable/versioned;
- `LearningEvent` has a dedicated canonical append-only journal separate from `events.outbox` and telemetry;
- learner history journals `attempt.started`, `submission.submitted`, completed `validation.result_recorded`, and `evidence.recorded` with normalized/redacted semantics;
- `system_error`, deprecated `attempt.submitted`, raw Submission/validator/Evidence payloads, outbox metadata, and mutable Mastery projection changes are excluded from learner LearningEvent history;
- existing immutable Attempt/Submission/completed ValidationResult/Evidence state is backfilled into the canonical journal by migration `000017` without rewriting historical outbox rows;
- LearningEvent ordering and pagination are stable by `(occurredAt, lifecycleOrder, eventId)`;
- learner history is scoped to the owning Enrollment and remains readable after the Enrollment is no longer active;
- recommendation retry counts count submitted attempts rather than abandoned started attempts;
- lifecycle mutations continue to emit transactional outbox events for integration/deferred-work concerns independently of LearningEvent history;
- the learner runner exposes an Enrollment-scoped read model for effective Assignments and their pinned immutable Activities;
- effective Assignment audiences are resolved for offering, Enrollment, Group, and CourseRun without making Assignment an access grant;
- CourseRun audience resolution uses explicit time-bounded GroupMembership placement rather than inventing a hidden RunMembership;
- Assignment timing is exposed as `upcoming`, `available`, or `past_due`, while lateness enforcement remains undecided;
- starting an Attempt does not globally require an effective Assignment, preserving self-paced and recommendation-driven work;
- the Student skill progress read model is Enrollment-scoped through the Offering's pinned published CourseVersion while Mastery itself remains organization-wide by stable Skill identity;
- Student skill progress composes Delivery, Content, and Mastery only through public application interfaces and introduces no duplicate persistence;
- every immutable `CourseVersionSkill` is returned, including zero-Evidence skills;
- learner-facing skill states are explicit: `unobserved`, `observed_unscored`, and `assessed`;
- missing Evidence never becomes an artificial mastery score of `0`;
- learner skill presentation comes from immutable `CourseVersionSkill` title/description/position snapshots rather than mutable canonical Skill presentation;
- learner-facing skill progress exposes mastery score/evidence counts/last evidence time but hides algorithm key/version and projection `computedAt` internals;
- the v1 Student skill progress endpoint is own-Enrollment only and uses `mastery.read` on Offering scope; instructor/mentor read-others remains a separate future product policy;
- skill progress remains readable after Enrollment completion/withdrawal/cancellation, but it represents current organization-wide Skill Mastery rather than a historical completion-time snapshot;
- Recommendations and Learning History remain separate read models rather than being folded into StudentSkillState.

The canonical learner lifecycle remains:

```text
Assignment / recommendation
  -> Attempt started
  -> Submission submitted
  -> ValidationResult recorded
  -> normalized Evidence
  -> Mastery projection
  -> StudentSkillState presentation
```

The F4 slices deliberately do **not** execute learner code, start grader/sandbox jobs, authenticate grader services, introduce a general outbox worker runtime, invent a confidence model, change Mastery semantics merely for UI needs, decide retry/lateness policy, add strict Assignment-to-Attempt association, or add instructor/mentor read-others learner surfaces.

### F5 — Guided Build: implemented API-level learner vertical

The F5 foundation now composes Guided Build with the existing immutable curriculum and Attempt/Submission lifecycle rather than creating a parallel learning model:

- Guided Build is optional for an exact immutable `ActivityVersion`;
- protected steps, hints, professional solution material, and optional transfer linkage are owned by Learning Content and kept outside learner-visible `CourseVersionActivity.config`;
- protected definitions are immutable with the published ActivityVersion and clone across CourseVersions by stable Activity identity, including remapped transfer ActivityVersion references;
- Learning Guidance owns append-only Attempt-scoped `GuidanceExposure` facts and disclosure policy;
- learner state is derived as `working -> submitted -> reviewing`;
- only the next ordered hint may be revealed and no new hints are allowed after Submission;
- hint/solution disclosure commands are retry-safe through explicit idempotency keys;
- professional solution exposure requires the same Attempt to have an immutable Submission and does not require validation success;
- each new hint/solution exposure appends a normalized `guidance.hint_revealed` / `guidance.solution_revealed` LearningEvent atomically without copying protected content into learner history;
- GuidanceExposure remains assistance context, not Evidence, and does not directly change Mastery;
- learner access is own-Attempt only and requires `guidance.use` in Offering scope;
- PostgreSQL tenant/RLS/source/disclosure invariants defend protected content and append-only exposure state independently of application policy;
- professional compare is a pure derived read over the immutable Submission plus the already revealed professional solution;
- opening compare creates no GuidanceExposure, LearningEvent, outbox row, Evidence, or Mastery mutation;
- an optional transfer challenge becomes available after source Submission without requiring solution exposure, preserving an unassisted transfer path;
- transfer discovery returns a safe handoff to the exact configured transfer ActivityVersion and stable Activity identity;
- transfer work starts through the existing Learning Progress Attempt command, preserving one owner for Attempt creation, normal `attempt.started` LearningEvent/outbox semantics, authorization, attempt numbering, and immutable ActivityVersion pinning;
- transfer work has its own ordinary Submission / ValidationResult / Evidence / Mastery lifecycle rather than becoming hidden state inside the source Guided Build Attempt;
- F5 v1 does not persist a source-Attempt-to-transfer-Attempt relation because no current product invariant requires one;
- compare-panel opening, scrolling/editor focus/copy actions, and similar UI telemetry are not canonical LearningEvents;
- F5 does not execute learner code, infer struggle, weight Mastery by assistance, or pull F7 sandbox/grader policy forward.

The resulting learner path can support:

```text
Attempt
  -> optional ordered hints
  -> Submission
  -> professional solution reveal
  -> compare

Submission
  -> optional transfer handoff
  -> separate transfer Attempt
  -> normal F4 learning lifecycle
```

### F6 — GitHub projects: trusted integration lifecycle established

The first three F6 slices establish the GitHub trust boundary, trusted installation lifecycle, and durable Integration-owned webhook processing before Project/review intelligence depends on GitHub data:

- `Integrations` owns GitHub App external identity, setup/mapping management, webhook ingress, retained-routing projection, and installation/repository lifecycle processing; `Projects` remains the owner of future Nexus project/team/milestone state;
- GitHub installation and repository identifiers are external identities and are not Nexus Project/Team ids;
- webhook HMAC-SHA256 is verified against the raw request body before parsed payload content is trusted;
- only an explicit allowlist of F6-relevant GitHub event families is accepted;
- accepted deliveries are append-only durable inbox facts keyed by GitHub delivery UUID;
- identical retries are idempotent while delivery-id reuse with different content is treated as an integrity conflict;
- inbox rows retain replay/audit payload, payload hash, event/action, external ids, receive-time routing result, tenant id where safely resolved, and receive time, but never persist the webhook secret or signature;
- trusted setup binds Nexus Organization authorization and GitHub-authenticated user access before exact installation/repository mappings are created or refreshed;
- `integration.manage` is Organization-scoped and granted by default only to `organization_owner` and `organization_admin`;
- GitHub setup and OAuth state are short-lived, single-use, user-bound, and persisted only as SHA-256;
- GitHub user access tokens are ephemeral adapter credentials and are never persisted or exposed outside Integrations;
- trusted installation/repository mappings are tenant-scoped through RLS, idempotent by exact external id, and cannot be reassigned across Organizations;
- immutable inbox routing facts are no longer overloaded with worker state: current rerouting lives in `github_webhook_routing_state`, while `github_webhook_lifecycle_processing` owns lease/retry/terminal state;
- retained `unmapped_installation` / `unmapped_repository` deliveries may be explicitly re-evaluated after trusted mapping changes without rewriting their original inbox routing facts;
- already-mapped historical deliveries are not silently de-authorized by later removal/suspension; `repository_mismatch` is never silently repaired or cross-routed;
- lifecycle claims use worker-only narrow PostgreSQL functions, `FOR UPDATE SKIP LOCKED`, unique leases, and lease expiry for crash recovery;
- processing outcomes are explicit: `pending`, `processing`, `blocked`, `retryable`, `completed`, `rejected`, and `dead_letter`;
- `blocked` means trusted routing authority is not available yet and does not consume transient-failure dead-letter budget;
- mapping mutation and successful `completed` acknowledgement commit atomically in one PostgreSQL transaction;
- worker mapping writes still require exact transaction-local Organization context and RLS;
- `installation.deleted`, GitHub-originated suspend, and repository add/remove events update Integration-owned mappings non-destructively/idempotently;
- repository status distinguishes `active`, temporary `suspended`, and durable `removed`;
- local administrator suspension and GitHub-originated suspension are distinguished internally so an external unsuspend cannot override local administrator intent;
- trusted setup completion and active repository additions can reroute retained deliveries, including future PR/check/review inputs, without processing those higher-level event families yet;
- accepting or processing GitHub lifecycle deliveries creates no Project state, LearningEvent, Evidence, Mastery mutation, or speculative downstream outbox contract;
- BullMQ/Redis scheduling remains an execution adapter to wire later; PostgreSQL processing/routing state is canonical and independently testable.

The trusted integration path is now:

```text
GitHub delivery
  -> HMAC verify raw bytes
  -> immutable durable inbox fact
  -> receive-time trusted routing result
  -> explicit retained-routing projection
  -> worker lease/claim
  -> Integration-owned lifecycle mutation + processor acknowledgement atomically
```

Trusted setup remains the only first-binding authority:

```text
Nexus owner/admin
  -> short-lived user-bound setup state
  -> GitHub installation/update UI
  -> GitHub user authorization
  -> verify exact installation + permissions + repositories
  -> tenant transaction synchronizes mappings
  -> retained unmapped deliveries are explicitly re-evaluated
```

### F7–F9 — upcoming foundations

Grader hardening, recommendation/instructor intelligence expansion, and commerce/public-launch work remain later roadmap foundations. Supporting primitives may already exist, but do not pull later-foundation policy into an earlier slice without an explicit architectural reason.

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
- Mastery is organization-wide by stable Skill identity; CourseVersion/Enrollment scope selects learner presentation context rather than creating a second mastery model.
- Zero Evidence means `unobserved`, not mastery `0`.
- Student skill UI contracts hide Mastery implementation metadata unless a future product requirement explicitly needs it.
- Guided Build protected content is immutable curriculum content and must not leak through generic learner Activity config/read models.
- Guided Build assistance state is Attempt-scoped; hint/solution exposure is not Evidence and must not directly rewrite Mastery.
- Professional compare is derived read state, not a new canonical learner lifecycle.
- Professional solution exposure requires an immutable Submission; transfer challenge work uses a separate ActivityVersion/Attempt lifecycle.
- Learning Guidance never becomes an alternate Attempt writer; transfer starts through Learning Progress.
- GitHub is an external integration source, not canonical learning state.
- GitHub installation/repository ids are external identities; trusted mapping is required before tenant business state may depend on a delivery.
- GitHub setup-return `installation_id` is an untrusted candidate; trusted mapping requires both current Nexus Organization authorization and GitHub-authenticated user access to the exact installation.
- GitHub user access tokens used during setup are ephemeral adapter credentials and never become canonical Nexus state, inbox/outbox payload, Project state, or learning data.
- A verified webhook inbox fact is not Project state, LearningEvent, Evidence, or Mastery. Derivation requires an idempotent processor and the owning module's public boundary.
- Receive-time GitHub routing facts are immutable; retained unroutable deliveries use a separate explicit routing projection rather than rewriting history.
- GitHub lifecycle worker state is separate from the inbox and uses lease/retry/dead-letter semantics; BullMQ/Redis is not canonical state.
- A GitHub-originated unsuspend cannot override an explicit local administrator suspension.
- Grader/sandbox hardening belongs to the separate security boundary described by ADR-0007 and the F7 roadmap unless an earlier slice needs only a safe application-level contract.

## Active F4 compatibility windows

Do not remove these merely because the canonical model has moved on. Each requires an explicit cleanup slice/migration once its callers are proven migrated.

1. Historical `learning_progress.attempts.submission` and `submitted_at` columns remain for migration compatibility, but dedicated `learning_progress.submissions` is the source of truth for new application writes.
2. During the transition window, the existing create-Attempt command may still carry a submission payload; the application must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event. `attempt.submitted` remains only as a deprecated transition integration alias and carries `submissionId`; it is never materialized as a learner LearningEvent.
4. Evidence-by-Submission is the canonical API direction; the older Evidence-by-Attempt endpoint is retained temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to mimic the canonical LearningEvent journal.

## Next recommended slice

**F6 minimal Project / Team model and repository-backed project vertical.**

Build the smallest Projects-owned slice that can safely depend on the now-trusted Integrations boundary:

- introduce Nexus `Project` and `Team` identities owned by `Projects`; never reuse GitHub repository/team ids as internal aggregate ids;
- define the minimum relationship between Organization, Project, Team, and a trusted GitHub repository mapping without letting Projects query Integration tables directly;
- expose a narrow Integrations public query/reference contract that resolves an active trusted repository mapping for Projects;
- define explicit project/team authorization scopes and least-privilege owner/admin/instructor policy required by the first vertical;
- create one repository-backed Project lifecycle with idempotent binding and non-destructive disconnect semantics;
- keep GitHub PR/check/review facts outside learning Evidence until a later slice defines exact Project facts and attribution policy;
- prove cross-tenant repository binding rejection, duplicate/idempotent binding, repository suspension/removal behavior, Team-vs-Delivery-Group separation, and module-boundary enforcement through integration tests;
- do not yet add grader execution, code-review scoring, PR/check-derived learning Evidence, or instructor analytics.

After the minimal Project/Team vertical is durable, the next F6 slice can materialize normalized PR/check/review Project facts through an explicit Integrations -> Projects boundary before deciding which of those facts may become learning Evidence.

## Remaining F4 follow-up frontier

Retry/lateness enforcement and strict assigned-only Attempt association remain explicit product policy decisions if product flows require them. They are not prerequisites for the implemented core F4 learner path.

Instructor/mentor read-others history/skill views should be added only with an explicit authorization/product requirement rather than inferred from self-read APIs.

The active compatibility windows above should be removed only through explicit cleanup slices once callers are proven migrated.

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
- Student skill progress/read model: ADR-0023.
- Guided Build state and solution exposure: ADR-0024.
- Protected Guided Build content and GuidanceExposure persistence: ADR-0025.
- Guided Build compare and transfer handoff: ADR-0026.
- GitHub integration ingress and durable webhook inbox: ADR-0027.
- GitHub App trusted setup and mapping lifecycle: ADR-0028.
- GitHub webhook lifecycle processing and retained routing: ADR-0029.

For any new durable decision, add or amend architecture documentation through a new ADR rather than silently encoding policy only in implementation.

## Maintenance rule

Update this document in the same PR whenever a merged slice changes the Foundation frontier, adds/removes a compatibility window, changes the latest durable lifecycle, or changes the recommended next slice. Do not turn it into a changelog; Git history already records history. Keep only the state a new engineer or agent needs to continue safely.
