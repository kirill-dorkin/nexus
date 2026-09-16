# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed and what frontier comes next.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

## Checkpoint baseline

Last maintained: 2026-09-16.

Baseline repository state: includes the completed F4 core learner path, the completed F5 Guided Build API-level learner vertical, an end-to-end F6 GitHub Projects foundation, and the first F7 Grader Gateway security/admission contract. F7 now has a versioned authenticated job protocol and server-owned execution-profile boundary, but **no production learner-code execution is enabled yet**. Verify the live `main` head before relying on any SHA or PR number.

Latest architectural decision at this checkpoint: ADR-0033.

Latest ordered migration at this checkpoint: `000026_project_activity_read_model.sql`.

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
- a Submission is immutable committed learner work and F4 v1 allows at most one Submission per Attempt;
- validator identity/version/config is pinned by immutable `ActivityVersion.config` and supported through an exact-version code-backed registry;
- raw `ValidationResult` is append-only and pins exact Submission, ActivityVersion, validator version/config, idempotency key, result status, Evidence trust, actor, and timestamp;
- validation distinguishes completed learner outcomes from `system_error`; infrastructure failure cannot be persisted as learner failure/score;
- `manual-review@1` proves the authorized-user validation path without executing learner code;
- only `completed` + `trusted` + decisive (`passed` / `failed`) ValidationResults normalize into automated Evidence;
- Evidence is append-only normalized learning evidence and evaluates an exact Submission;
- Evidence refreshes versioned/recomputable organization-wide learner+Skill Mastery while idempotent replays do not double-count;
- `LearningEvent` is a dedicated append-only learner product journal separate from outbox/telemetry;
- learner history journals normalized lifecycle events while excluding infrastructure failures and raw payloads;
- learner history ordering/pagination is stable and remains readable after Enrollment is no longer active;
- lifecycle mutations continue to use transactional outbox independently from LearningEvent history;
- the learner runner exposes effective Assignment state over immutable ActivityVersions;
- Student skill progress composes Delivery, Content, and Mastery without duplicate persistence;
- zero Evidence is `unobserved`, never an artificial mastery score of `0`;
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

F4 deliberately does **not** execute learner code inside Web/API/Worker. Grader/sandbox execution belongs to the separate F7 security boundary.

### F5 — Guided Build: implemented API-level learner vertical

The F5 foundation composes Guided Build with the existing immutable curriculum and Attempt/Submission lifecycle rather than creating a parallel learning model:

- Guided Build is optional for an exact immutable `ActivityVersion`;
- protected steps, hints, professional solution material, and optional transfer linkage are immutable Learning Content;
- Learning Guidance owns append-only Attempt-scoped `GuidanceExposure` facts and disclosure policy;
- only the next ordered hint may be revealed and no new hints are allowed after Submission;
- professional solution exposure requires the same Attempt to have an immutable Submission;
- new hint/solution exposures append normalized LearningEvents atomically without copying protected content into learner history;
- GuidanceExposure is assistance context, not Evidence, and does not directly change Mastery;
- professional compare is derived read state, not a new canonical lifecycle;
- optional transfer work uses a separate ActivityVersion/Attempt and the normal F4 lifecycle;
- F5 does not execute learner code, infer struggle, or weight Mastery by assistance.

### F6 — GitHub projects: implemented Project activity vertical

F6 establishes a working vertical from trusted GitHub ingress to an authorized Project-facing activity timeline, without treating external repository activity as learning state:

- `Integrations` owns GitHub App identity, setup/mapping, webhook ingress/routing, lifecycle processing, and durable Project-fact delivery processing;
- `Projects` owns Team, TeamMembership, Project, repository-binding history, immutable normalized GitHub Project facts, and the Project activity read model;
- raw webhook bytes are HMAC verified and accepted deliveries are immutable durable inbox facts;
- trusted setup/mappings are tenant-scoped and cannot be reassigned across Organizations;
- lifecycle and Project-fact consumers have independent lease/retry/dead-letter state;
- Project repository bindings are history-preserving and one-to-one while active;
- normalized fact families are `pull_request`, `pull_request_review`, `check_run`, and `check_suite`;
- attribution uses the repository binding active at immutable webhook receive time, preventing retroactive attribution after later connect/disconnect;
- GitHub actor identity remains external identity and is not silently converted to Nexus user identity;
- Project facts are immutable event snapshots; stale/out-of-order provider deliveries never overwrite mutable latest-state rows;
- Project activity is authorized by existing `ProjectOperator`, tenant/RLS scoped, and paginated deterministically by `(source_received_at DESC, fact_id DESC)`;
- historical activity survives repository suspension/removal/disconnect while current repository context is composed separately;
- `GitHubProjectFact != LearningEvidence`; F6 creates no LearningEvent, Evidence, Mastery, grading policy, or recommendation.

The completed F6 path is:

```text
trusted GitHub delivery
  -> durable verified inbox/routing
  -> independent Project-fact processor
  -> receive-time Project attribution
  -> immutable normalized Project fact
  -> authorized tenant-safe Project activity read model
```

### F7 — Grader hardening: admission/security contract established

The first F7 slice establishes the Grader Gateway control-plane contract while intentionally keeping production learner-code execution disabled:

- ADR-0007 remains the governing security boundary: learner code never executes in Web/API/Worker;
- Grader Gateway now owns versioned grader admission, server-owned executable profiles, and the sandbox-provider control boundary;
- protocol v1 accepts only protocol version, content-addressed job identity, exact execution-profile reference, immutable Submission/ActivityVersion ids, and bounded source files;
- source paths must be normalized relative POSIX paths; traversal, duplicates, oversized files, and oversized source bundles are rejected before provider interaction;
- `jobId` is a SHA-256 content address over canonical immutable job material, including source and exact profile reference; source-file ordering is normalized for identity;
- content-addressed job identity provides stable retry identity but **does not yet provide durable execution de-duplication**;
- executable profiles are server-owned, exact-versioned contracts selecting language/runtime, immutable runner-image digest, argv-only runner strategy, network/filesystem policy, and resource limits;
- callers cannot supply or weaken runner commands, image identity, network policy, mounts, credentials, provider options, or resource limits;
- profile admission requires network `off`, ephemeral filesystem, read-only root filesystem, immutable `sha256` image identity, no general-purpose shell entrypoint, and bounded wall time/CPU/memory/process/output/source limits;
- `/v1/jobs` is fail-closed behind a deployment-supplied bearer service credential; the process refuses a missing/too-short credential and exact credentials are compared in constant time when lengths match;
- `/health` remains unauthenticated for infrastructure health checks;
- the sandbox provider is an explicit adapter seam; the default provider intentionally executes nothing and returns `system_error`;
- sandbox-provider exceptions, malformed protocol output, mismatched job identity, and oversized result payload are normalized to infrastructure `system_error`, never learner `failed` outcome;
- provider output is runtime-validated instead of trusted merely because an adapter satisfies a TypeScript interface;
- Grader Gateway receives no production database credentials, user sessions, domain repositories, or Docker socket in this slice;
- there is no new persistence, outbox, LearningEvent, ValidationResult, Evidence, or Mastery mutation yet;
- production sandbox-provider selection, durable grader jobs, API/Worker dispatch, executable validator registration, and system-owned ValidationResult recording remain later F7 slices.

The established F7 control-plane boundary is:

```text
trusted service caller
  -> authenticated protocol-v1 Grader Gateway admission
  -> verify content-addressed job identity
  -> resolve exact server-owned execution profile
  -> enforce transport/profile resource policy
  -> sandbox-provider boundary
  -> runtime-validate provider result
  -> completed | system_error protocol result
```

At this checkpoint the default provider stops at `system_error`; no learner code is executed.

### F8–F9 — upcoming foundations

Recommendation/instructor intelligence expansion and commerce/public-launch work remain later roadmap foundations. Supporting primitives may already exist, but do not pull later-foundation policy into an earlier slice without an explicit architectural reason.

## Durable architecture facts

These are high-value reminders, not substitutes for their ADRs.

- Nexus is a modular monolith. A module owns its business state and does not integrate by reaching into another module's repositories/tables.
- PostgreSQL is the canonical source of truth for business state.
- Tenant isolation is defense in depth: application authorization plus PostgreSQL/RLS with transaction-local organization/actor context.
- Cross-module synchronous collaboration targets public application interfaces. Deferred consequences use events/outbox.
- Canonical LearningEvent history is separate from `events.outbox` and telemetry.
- Migrations are ordered and append-only. Applied history is not rewritten.
- Published Curriculum is the immutable **what**; Delivery is the **how / when / to whom**.
- `Purchase != Entitlement != Enrollment`.
- `Group != Team`.
- `Attempt != Submission`.
- Validator binding is immutable curriculum meaning and validator registry versions are exact.
- `ValidationResult != LearningEvidence`: validation is raw attributable result state; Evidence is normalized learning signal.
- Infrastructure/system failure and non-decisive review state never become negative learner Evidence; `system_error` is excluded from learner LearningEvent history.
- Mastery is organization-wide by stable Skill identity; zero Evidence means `unobserved`, not mastery `0`.
- Guided Build assistance is Attempt-scoped and does not directly rewrite Mastery.
- GitHub is an external integration source, not canonical learning state.
- GitHub Project facts are immutable external Project history, not Learning Evidence.
- Project activity cursor ordering is deterministic presentation/pagination ordering, not provider causal ordering.
- Untrusted learner code never executes in Web/API/Worker; ADR-0007 places execution behind the Grader Gateway security boundary.
- Grader Gateway admission/profiles are a separate security-control boundary; Learning Validation remains the owner of canonical ValidationResult attribution and Learning Progress remains the owner of normalized Evidence.
- Grader `jobId` is content-addressed immutable identity; **job identity != durable execution de-duplication**. Durable retry/lease/state must be added explicitly before asynchronous production dispatch.
- Grader execution-profile `(key, version)` semantics are immutable. A material image/runtime/runner/policy/limit change requires a new version rather than rebinding an existing one.
- Caller-supplied source is hostile data. Commands, image identity, network/mount/credential/provider/resource policy are server-owned and are never accepted from learner-controlled input.
- Sandbox-provider output is untrusted adapter output and must satisfy protocol/runtime/output-size validation before any later ValidationResult writer may consume it.
- Grader/sandbox infrastructure failure remains `system_error`; it never becomes learner failure merely because a provider failed.
- Production learner-code execution remains disabled until a hardened provider and durable job lifecycle are explicitly implemented and verified.

## Active F4 compatibility windows

Do not remove these merely because the canonical model has moved on. Each requires an explicit cleanup slice/migration once its callers are proven migrated.

1. Historical `learning_progress.attempts.submission` and `submitted_at` columns remain for migration compatibility, but dedicated `learning_progress.submissions` is the source of truth for new application writes.
2. During the transition window, the existing create-Attempt command may still carry a submission payload; the application must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event. `attempt.submitted` remains only as a deprecated transition integration alias and carries `submissionId`; it is never materialized as a learner LearningEvent.
4. Evidence-by-Submission is the canonical API direction; the older Evidence-by-Attempt endpoint is retained temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to mimic the canonical LearningEvent journal.

## Next recommended slice

**F7 durable grader job lifecycle + system-owned dispatch.**

Build on ADR-0007 and ADR-0033 without selecting a weak execution mechanism merely to make code run:

- decide and document the canonical owner of durable grader-job state at the Validation / execution boundary before adding tables;
- persist an idempotent grader job keyed by the content-addressed protocol `jobId`, with exact Organization, Submission, ActivityVersion, validator binding, executable-profile identity/fingerprint, and source provenance required for replay/audit;
- define explicit queued/processing/completed/system-error/retry/dead-letter semantics with leases and bounded retries so crashes cannot create ambiguous execution state;
- register an executable system validator only when its server-owned configuration can deterministically resolve an exact Grader Gateway profile;
- make API/Worker dispatch system-owned: user sessions/learner requests may trigger application intent, but only trusted backend identity may call Grader Gateway;
- preserve the current rule that Web/API/Worker never execute learner source and never receive Docker socket/sandbox-host privileges;
- keep the gateway request material derived from immutable canonical Submission/ActivityVersion/validator state rather than accepting infrastructure configuration from the learner;
- on Gateway `system_error`, record infrastructure failure through the canonical Validation boundary without creating negative Evidence or learner LearningEvent history;
- on a valid completed Gateway result, record one idempotent system-owned ValidationResult and let the existing trusted-result -> Evidence path decide whether normalized Evidence is materialized;
- prove replay/idempotency, crash recovery, lease loss, cross-tenant isolation, exact profile provenance, and `system_error` non-Evidence semantics in integration tests;
- keep production sandbox-provider selection/execution as a separate hardened step unless the durable lifecycle exposes a concrete provider requirement that can be implemented without weakening ADR-0007.

Only after durable dispatch/result recording is safe should Nexus enable a production sandbox provider and end-to-end executable validator profile.

## Remaining F4 follow-up frontier

Retry/lateness enforcement and strict assigned-only Attempt association remain explicit product policy decisions if product flows require them. They are not prerequisites for the implemented core F4 learner path.

Instructor/mentor read-others history/skill views should be added only with an explicit authorization/product requirement rather than inferred from self-read APIs.

The active compatibility windows above should be removed only through explicit cleanup slices once callers are proven migrated.

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
- Project, Team, and trusted repository binding: ADR-0030.
- Normalized GitHub Project facts: ADR-0031.
- Project activity read model: ADR-0032.
- Grader Gateway admission/security contract: ADR-0033.

For any new durable decision, add or amend architecture documentation through a new ADR rather than silently encoding policy only in implementation.

## Maintenance rule

Update this document in the same PR whenever a merged slice changes the Foundation frontier, adds/removes a compatibility window, changes the latest durable lifecycle, or changes the recommended next slice. Do not turn it into a changelog; Git history already records history. Keep only the state a new engineer or agent needs to continue safely.
