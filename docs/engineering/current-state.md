# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed and what frontier comes next.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

## Checkpoint baseline

Last maintained: 2026-09-16.

Baseline repository state: includes the completed F4 core learner path, the completed F5 Guided Build API-level learner vertical, an end-to-end F6 GitHub Projects foundation from trusted GitHub ingress through repository-backed Projects, immutable normalized PR/review/check facts, and an authorized Project activity read model, plus four F7 grader-hardening slices. F7 now has a versioned authenticated Grader Gateway admission/profile boundary, a Validation-owned durable grader-job ledger with tenant-safe scheduling plus worker lease/retry/dead-letter state, authenticated Worker -> Gateway dispatch with lease-fenced atomic system-owned ValidationResult recording, and a hardened Kubernetes/gVisor sandbox control plane/provider with fixed protected placement and admission/RBAC/network/resource envelopes. **Production learner-code execution remains disabled because the trusted grader-runner artifact/image and real-cluster verification gate are still intentionally absent.** Verify the live `main` head before relying on any SHA or PR number.

Latest architectural decision at this checkpoint: ADR-0036.

Latest ordered migration at this checkpoint: `000029_grader_result_learning_history.sql`.

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

### F6 — GitHub projects: implemented Project activity vertical

F6 now establishes a working vertical from trusted GitHub ingress to an authorized Project-facing activity timeline, without treating external repository activity as learning state:

- `Integrations` owns GitHub App external identity, setup/mapping management, webhook ingress, retained-routing projection, installation/repository lifecycle processing, and separate durable delivery state for Project-fact normalization;
- `Projects` owns Nexus `Team`, `TeamMembership`, `Project`, repository-binding history, immutable normalized GitHub Project facts, and the Project-scoped activity read model;
- GitHub installation/repository identifiers remain external Integration identities and are never reused as Nexus Project/Team ids;
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
- immutable inbox routing facts are separate from mutable `github_webhook_routing_state`, lifecycle processing, and Project-fact processing projections;
- retained `unmapped_installation` / `unmapped_repository` deliveries may be explicitly re-evaluated after trusted mapping changes without rewriting their original inbox routing facts;
- lifecycle and Project-fact claims use worker-only narrow PostgreSQL functions, `FOR UPDATE SKIP LOCKED`, unique leases, retry/backoff/dead-letter state, and lease expiry for crash recovery;
- each consumer acknowledges the same immutable webhook independently, so lifecycle work cannot accidentally complete Project-fact work or vice versa;
- mapping mutation and successful lifecycle `completed` acknowledgement commit atomically in one PostgreSQL transaction;
- Project-fact insert and successful Project-fact `completed` acknowledgement also commit atomically, while source inbox/delivery uniqueness prevents duplicate committed facts on retry;
- repository status distinguishes `active`, temporary `suspended`, and durable `removed`;
- local administrator suspension and GitHub-originated suspension are distinguished internally so an external unsuspend cannot override local administrator intent;
- Team is explicitly distinct from Learning Delivery Group: Team membership is an Organization-user collaboration relation and never creates or mutates Enrollment/GroupMembership;
- Team members must be active Organization members when added;
- Project operator policy admits organization owners/admins/instructors through existing Organization or exact Team/Project role assignments; mentor/learner org-wide Project access remains deliberately absent;
- Projects application code resolves repository availability only through the public `GitHubRepositoryReferenceQuery`; it does not query Integration tables/repositories directly;
- one Project has at most one active repository binding and one trusted repository mapping can belong to at most one active Project;
- repository connect requires current tenant-consistent `active` trusted mapping state and is idempotent for the exact same active binding;
- PostgreSQL independently guards active binding against foreign, suspended, or removed Integration mappings as defense in depth;
- repository disconnect is non-destructive and idempotent: it closes binding history without deleting Project, Team, Integration mapping state, or already attributed historical facts;
- external repository/installation suspension or removal does not rewrite Project binding history; Project views compose the active binding with current Integration availability (`active`, `suspended`, or `removed`);
- normalized fact families are `pull_request`, `pull_request_review`, `check_run`, and `check_suite`; raw webhook payload remains Integrations-owned and is not copied into Projects;
- Project attribution is resolved against the repository binding interval that contains immutable webhook `received_at`, so connecting a repository later cannot retroactively claim older GitHub activity and disconnecting later cannot erase activity that was attributable when received;
- GitHub actor ids/logins remain external actor identity and are not silently converted into Nexus learner/user identity;
- Project facts are immutable event snapshots rather than last-write-wins provider state; out-of-order/stale deliveries are preserved with provider timestamps instead of rolling a mutable projection backward;
- there is no assumed universal monotonic GitHub ordering key across PR/review/check event families;
- Project activity is exposed through a tenant-safe Project-scoped HTTP read model authorized by the existing `ProjectOperator` policy;
- activity pagination is deterministic by `(source_received_at DESC, fact_id DESC)` with an opaque cursor; that ordering is a pagination contract, not a claim about GitHub causal order;
- the Project activity API returns only normalized Project-owned fields and safe source provenance, never raw Integrations webhook payload;
- historical activity remains readable after repository suspension/removal or Project disconnect; current Project repository context is composed separately, so a disconnected Project returns `repository: null` without losing history;
- `platform_app` has SELECT-only access to `projects.github_project_facts` under tenant RLS; no UPDATE/DELETE privilege is added by the read model;
- no mutable latest PR/review/check projection is introduced; any future current-state projection must define event-family-specific reconciliation semantics;
- no Project outbox event is introduced because there is still no downstream asynchronous consumer contract in F6;
- normalized GitHub Project facts and their read model are **not** Learning Evidence and create no LearningEvent, Evidence, Mastery mutation, grader/scoring policy, or instructor recommendation;
- BullMQ/Redis scheduling remains an execution adapter to wire later; PostgreSQL processing/routing state remains canonical.

The trusted integration path is:

```text
GitHub delivery
  -> HMAC verify raw bytes
  -> immutable durable inbox fact
  -> receive-time trusted routing result
  -> explicit retained-routing projection
  -> worker lease/claim
  -> Integration-owned lifecycle mutation + processor acknowledgement atomically
```

The Projects-owned repository path is:

```text
Organization operator
  -> Team + explicit TeamMembership
  -> Project
  -> resolve trusted repository mapping through Integrations public query
  -> one active Project <-> repository binding
  -> current repository availability composed at read time
```

The normalized Project activity path is:

```text
trusted GitHub PR/review/check delivery
  -> independent Integrations Project-fact lease/claim
  -> validate payload identity against trusted routing
  -> resolve Project repository binding at webhook received_at
  -> normalize immutable Projects-owned activity fact
  -> atomically acknowledge delivery processing
```

The completed Project activity read path is:

```text
Project operator
  -> authorize against Nexus Project scope
  -> tenant/RLS-scoped immutable Project facts
  -> deterministic (source_received_at, fact_id) cursor pagination
  -> normalized activity page + separately composed current Project repository context
```

### F7 — Grader hardening: hardened sandbox control plane established; trusted runner still gated

F7 now has four explicit layers while intentionally keeping production learner-code execution disabled.

The Grader Gateway control-plane boundary establishes:

- ADR-0007 remains the governing security boundary: learner code never executes in Web/API/Worker;
- Grader Gateway owns versioned grader admission, server-owned executable profiles, and the sandbox-provider control boundary;
- protocol v1 accepts only protocol version, content-addressed job identity, exact execution-profile reference, immutable Submission/ActivityVersion ids, and bounded untrusted source files;
- source paths are normalized relative POSIX paths; traversal, duplicate paths, per-file overflow, and aggregate source overflow are rejected before provider interaction;
- `jobId` is a SHA-256 content address over canonical immutable job material; source-file ordering is normalized for identity;
- executable profiles are server-owned and exact-versioned; they own language/runtime identity, immutable runner-image digest, argv-only runner strategy, network/filesystem policy, and resource limits;
- callers cannot supply commands, runner images, network policy, mounts, credentials, provider options, or resource limits;
- profile admission requires network `off`, ephemeral filesystem, read-only root filesystem, immutable `sha256` image identity, no general-purpose shell entrypoint, and bounded wall time/CPU/memory/process/output/source limits;
- `/v1/jobs` fails closed behind a deployment-supplied bearer service credential; the process refuses a missing/too-short credential and exact credentials are compared in constant time when lengths match;
- `/health` remains unauthenticated for infrastructure health checks;
- the sandbox provider is an explicit adapter seam; the default provider intentionally executes nothing and returns `system_error`;
- sandbox-provider exceptions, malformed protocol output, wrong result job identity, and oversized result payload normalize to infrastructure `system_error`, never learner `failed` outcome;
- provider output is runtime-validated instead of trusted merely because an adapter satisfies a TypeScript interface;
- no production database credentials, user sessions, domain repositories, Docker socket, host-process runner, or provider-specific execution runtime are introduced.

The durable grader-job layer establishes:

- Learning Validation owns canonical grader-job state because the job evaluates an immutable Submission under the exact validator binding pinned by its ActivityVersion;
- `code-grader@1` is an exact-version system validator and only becomes schedulable when its immutable validator config resolves an exact server-owned execution profile;
- learner scheduling is own-Submission only and continues to use existing Organization/Offering authorization plus public Learning Progress and Learning Content application queries rather than reaching into foreign repositories;
- executable source is accepted only through explicit `Submission.payload.source.files`; arbitrary Submission payload fields are never guessed as source;
- the learner/API request cannot choose runtime, image, command, network, filesystem, credentials, mounts, provider options, or resource limits;
- durable admission returns `202 Accepted`; scheduling does not claim that execution occurred;
- immutable `learning_validation.grader_jobs` records content-addressed job identity plus exact Organization/Submission/ActivityVersion, validator config, registry-derived Evidence trust, profile key/version/fingerprint, canonical request payload, requester, and creation time;
- mutable `learning_validation.grader_job_processing` is separate from immutable job provenance and owns pending/processing/retry/terminal state plus the terminal ValidationResult link;
- repeated scheduling of the same logical Submission/validator returns the existing job only when immutable material still matches; deployment/profile drift under the same profile key/version becomes a conflict instead of silently rewriting provenance;
- `platform_app` can insert/read tenant-scoped immutable jobs and read processing state under RLS but cannot mutate lease/status state;
- `platform_worker` cannot update grader tables directly and advances processing only through narrow PostgreSQL security-definer functions;
- claim uses `FOR UPDATE SKIP LOCKED`, unique lease tokens, expiry-based crash recovery, and bounded attempt count;
- stale workers cannot fail or terminally acknowledge a newly re-leased job because both failure and terminal acknowledgement require the current unexpired lease token;
- five exhausted attempts transition to database-owned `dead_letter` state together with one canonical system-owned `system_error` ValidationResult;
- PostgreSQL remains canonical asynchronous work state; BullMQ/Redis may later be a wake-up/scheduling adapter but must not become grader-job truth.

The authenticated Worker dispatch/result layer establishes:

- `apps/worker` claims durable grader jobs only through the worker-only lease function and transports the immutable persisted protocol request without executing, rewriting, or interpreting learner code;
- Worker receives no Docker socket, sandbox-host privilege, runner image selection, mount, network-policy, or provider credential capability;
- Gateway endpoint, bearer service identity, transport timeout, lease budget, polling interval, and retry backoff are explicit configuration; production Gateway transport requires HTTPS;
- Worker sends the ADR-0033 bearer service credential and never logs the credential or learner source;
- every Gateway response is runtime-validated through the shared protocol implementation against protocol v1 and the exact expected content-addressed `jobId`;
- transport/HTTP/protocol failures and retryable Gateway `system_error` results return to durable retry state rather than becoming learner failure;
- terminal acknowledgement is a narrow `platform_worker` SECURITY DEFINER boundary fenced by the current lease token and lease expiry;
- terminal grader processing state, exactly one system-owned ValidationResult, and its `validation.result_recorded` outbox event commit atomically;
- a completed system-owned ValidationResult also appends the canonical learner `validation.result_recorded` LearningEvent in that same transaction, while `system_error` remains excluded from learner history;
- commit-uncertain duplicate terminal acknowledgement is materially checked and returns the existing result, while conflicting replay fails closed;
- grader ValidationResult provenance is unique per grader job and app-role callers cannot forge grader-job provenance;
- existing ADR-0021 Evidence semantics remain authoritative: only `completed + trusted + passed|failed` is eligible for normalized Evidence, while `needs_review` and `system_error` are not; Evidence normalization remains a separate idempotent consequence rather than part of the Worker terminal transaction;
- the default Gateway sandbox provider still executes nothing, so authenticated dispatch alone does not enable learner-code execution.

The established Gateway control-plane boundary is:

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

The durable scheduling boundary is:

```text
own learner Submission
  -> exact ActivityVersion validator binding
  -> exact server-owned execution profile
  -> explicit bounded source envelope
  -> immutable Validation-owned grader job
  -> separate worker lease/retry/dead-letter processing state
```

The authenticated dispatch/result boundary is:

```text
platform_worker lease claim
  -> persisted protocol request
  -> authenticated Grader Gateway /v1/jobs
  -> shared runtime validation + exact jobId check
  -> retryable infrastructure failure -> durable retry
  -> accepted terminal result -> lease-fenced atomic ValidationResult + terminal state
  -> completed result -> canonical learner ValidationResult history
  -> separate existing trusted-result Evidence normalization boundary
```

At this checkpoint Worker does call Grader Gateway, but the default Gateway provider still executes nothing. Therefore no production learner code is executed even though durable authenticated dispatch and terminal ValidationResult recording are established.

### F8–F9 — upcoming foundations

Recommendation/instructor intelligence expansion and commerce/public-launch work remain later roadmap foundations. Supporting primitives may already exist, but do not pull later-foundation policy into an earlier slice without an explicit architectural reason.

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
- GitHub lifecycle worker state and Project-fact worker state are separate from the inbox and from each other; both use lease/retry/dead-letter semantics and BullMQ/Redis is not canonical state.
- A GitHub-originated unsuspend cannot override an explicit local administrator suspension.
- Project/Team ids are Nexus identities; GitHub repository ids remain Integration identities.
- A Project repository binding is stable Project history, while current external repository availability is composed from Integrations at read time.
- A Project repository binding must not be silently moved between Projects; active repository ownership is one-to-one.
- `GitHubProjectFact != LearningEvidence`: PR/review/check activity is external Project history until a separate explicit learning policy decides otherwise.
- GitHub Project attribution uses the repository binding active at immutable webhook receive time; later connect/disconnect must not rewrite historical attribution.
- Normalized GitHub Project facts are immutable event snapshots; stale or reordered provider deliveries do not overwrite a mutable latest-state row.
- Project activity cursor ordering is deterministic presentation/pagination ordering, not provider causal ordering.
- Historical Project activity remains historical even when the repository is later suspended, removed, or disconnected.
- Untrusted learner code never executes in Web/API/Worker; ADR-0007 places it behind the Grader Gateway security boundary.
- Grader Gateway admission/profiles are a separate security-control boundary; Learning Validation owns canonical durable grader-job intent/processing plus ValidationResult attribution, while Learning Progress owns normalized Evidence.
- Grader `jobId` is content-addressed immutable identity; durable logical scheduling/de-duplication is provided by the Validation-owned grader-job ledger, and terminal result de-duplication is lease-fenced plus materially idempotent per grader job.
- Grader execution-profile `(key, version)` semantics are immutable. A material image/runtime/runner/policy/limit change requires a new version rather than rebinding an existing one; the persisted profile fingerprint makes drift detectable.
- Caller-supplied source is hostile data. Commands, image identity, network/mount/credential/provider/resource policy are server-owned and never accepted from learner-controlled input.
- Grader-job immutable intent/provenance is separate from mutable worker lease/retry/dead-letter state.
- Worker mutation of grader processing state is function-scoped; `platform_worker` does not receive direct grader-table UPDATE privilege.
- Sandbox-provider output is untrusted adapter output and must satisfy protocol/runtime/output-size validation plus exact `jobId` matching before the lease-fenced ValidationResult writer may consume it.
- Grader/sandbox infrastructure failure remains `system_error`; it never becomes learner failure merely because transport or a provider failed.
- Authenticated dispatch and lease-aware terminal result recording are established.
- ADR-0036 establishes the first hardened production sandbox control plane: deterministic Kubernetes Jobs in fixed `platform-grader-sandbox`, exact `platform-gvisor` RuntimeClass selection, credential-free `grader-sandbox-runner` Pods, restricted Pod Security, fail-closed admission, default-deny networking, finite namespace capacity, and narrow Gateway RBAC.
- Worker transports the durable scheduling-time profile fingerprint as trusted dispatch metadata; Gateway refuses provider execution when its locally resolved exact profile fingerprint differs, so recorded provenance cannot silently execute different profile material.
- Kubernetes control-plane credentials rotate through a reread token file; learner Pods receive no ServiceAccount token or application/database credentials.
- Provider replay validates deterministic Job/Secret/result-Pod ownership and keeps disappearance, capacity, transport, timeout, and malformed provider behavior in explicit `system_error` semantics.
- Production learner-code execution remains disabled: this repository still has no trusted grader-runner implementation/reproducible image build, no activated production executable profile, and no real-cluster verification of the gVisor/admission/PID/network/encryption boundary.

## Active F4 compatibility windows

Do not remove these merely because the canonical model has moved on. Each requires an explicit cleanup slice/migration once its callers are proven migrated.

1. Historical `learning_progress.attempts.submission` and `submitted_at` columns remain for migration compatibility, but dedicated `learning_progress.submissions` is the source of truth for new application writes.
2. During the transition window, the existing create-Attempt command may still carry a submission payload; the application must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event. `attempt.submitted` remains only as a deprecated transition integration alias and carries `submissionId`; it is never materialized as a learner LearningEvent.
4. Evidence-by-Submission is the canonical API direction; the older Evidence-by-Attempt endpoint is retained temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to mimic the canonical LearningEvent journal.

## Next recommended slice

**F7 trusted grader runner + digest-pinned executable image and real sandbox end-to-end.**

Build on ADR-0007, ADR-0033, ADR-0034, ADR-0035, and ADR-0036 without widening the Gateway/Worker trust boundary:

- implement the trusted runner as a separate executable artifact; learner code must still never execute in Web/API/Worker/Gateway;
- define a deterministic runner/test-harness contract for the first supported executable profile, including source layout, fixed trusted command, result schema, and validator-owned hidden-test material;
- enforce exact learner-facing wall-clock, cumulative CPU-time, PID, and output budgets inside the runner while the Kubernetes/gVisor provider remains the outer containment envelope;
- capture learner stdout/stderr as bounded result data rather than allowing learner output to become the container control log; stdout used by Gateway must contain exactly one bounded protocol-v1 result document;
- add a reproducible OCI build for the runner and bind the resulting immutable `sha256` digest to a new exact executable profile version; never use mutable tags as canonical provenance;
- prove passed/failed learner outcomes, compile/test failures, runner crash, timeout, fork/resource abuse, oversized output, malformed result, network attempts, filesystem escape attempts, and provider loss end-to-end without turning infrastructure failure into learner failure;
- add real-cluster verification for `platform-gvisor -> runsc-nonet`, fixed sandbox nodes/PID limits, ValidatingAdmissionPolicy behavior, restricted Pod Security, default-deny egress, quotas, token rotation, Secret encryption at rest, cleanup, and replay;
- keep the production provider default-disabled until the trusted runner digest and cluster verification are both green;
- leave Evidence/Mastery semantics unchanged: only existing trusted decisive completed ValidationResults may normalize into Evidence.

Production learner-code execution should be enabled only after the trusted runner/image slice and real-cluster security verification are independently green.
