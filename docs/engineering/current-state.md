# Nexus current state

This document is the maintained architectural checkpoint for continuing development across chats, agents, and work sessions. It summarizes what has landed and what frontier comes next.

It is **not live GitHub telemetry**. Before doing work, always verify the current `main`, open PRs, CI, migrations, tests, and implementation through GitHub as required by `AGENTS.md`.

## Checkpoint baseline

Last maintained: 2026-10-01.

Baseline repository state: includes the completed F4 core learner path, the completed F5 Guided Build API-level learner vertical, an end-to-end F6 GitHub Projects foundation from trusted GitHub ingress through repository-backed Projects, immutable normalized PR/review/check facts, and an authorized Project activity read model, plus the completed repository-side F7 grader-hardening foundation, the completed F8 recommendation/instructor/progression foundation, and the F9 Commerce foundation through Product/immutable Price, canonical paid Purchase settlement, and a safe unauthenticated public sellable-catalog read boundary. F7 now has a versioned authenticated Grader Gateway admission/profile boundary, a Validation-owned durable grader-job ledger with tenant-safe scheduling plus worker lease/retry/dead-letter state, authenticated Worker -> Gateway dispatch with lease-fenced atomic system-owned ValidationResult recording, a hardened Kubernetes/gVisor sandbox control plane/provider with fixed protected placement and admission/RBAC/network/resource envelopes, and a separate trusted Go grader runner with a capability-minimal `goja` runtime, bounded result channel, reproducible `scratch` OCI build, CI-proven canonical `js-sum-v1@1` digest, repository security-contract tests, and a fail-closed real-cluster verification harness/runbook. **Production learner-code execution remains disabled:** the checked-in profile is inert, `GRADER_SANDBOX_PROVIDER` still defaults to `unavailable`, and activation still requires publishing the exact runner digest plus green target-cluster verification evidence in a separate deployment change. F8 now composes the unchanged `ordered-mastery@1` recommendation policy with derived `fixed-interval-review@1` scheduling based on Mastery-owned `lastEvidenceAt`, a conservative `repeated-trusted-failure@1` suspected-misconception signal derived only from normalized trusted validation Evidence, the first explicit `repeated-failure-remediation@1` action-changing policy backed by immutable CourseVersion-authored Skill-to-Activity remediation mappings, derived `course-progression-readiness@1` over distinct scored Attempts, pinned Mastery semantics, scored-Evidence freshness, and the existing repeated-trusted-failure signal, plus Offering-scoped `offering-readiness-triage@1` over active learner readiness decisions for instructor/mentor operational intelligence, and the first enforced `course-readiness-enrollment-completion@1` ProgressionGate protecting explicit learner-requested Enrollment completion. Review/signal/intervention/readiness/overview/gate state remains derived rather than persisted; the only new canonical F8 state after F8.2 is authored curriculum remediation intent. A fresh post-F8.6 audit found no concrete staff completion override or durable completion-history product/audit requirement, so F8 is closed without inventing another progression slice. F9 now builds on the existing Entitlement foundation with provider-independent Product/immutable Price authoring, the first canonical Purchase -> Stripe Checkout -> durable webhook -> lease-fenced paid Entitlement settlement vertical, and a strict fail-closed public projection derived from current Organization/Product/Price/Offering state without adding a second catalog source of truth. Verify the live `main` head before relying on any SHA or PR number.

Latest architectural decision at this checkpoint: ADR-0046.

Latest ordered migration at this checkpoint: `000034_public_catalog_reads.sql`.

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

### F7 — Grader hardening: repository-side foundation complete; production activation still gated

F7 now has five explicit repository-side layers while intentionally keeping production learner-code execution disabled.

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

The Kubernetes/gVisor sandbox layer establishes:

- deterministic one-shot Kubernetes Jobs in fixed namespace `platform-grader-sandbox` with exact `platform-gvisor` RuntimeClass selection;
- `platform-gvisor` is contractually bound to operator-configured `runsc-nonet` on dedicated sandbox nodes;
- learner Pods use credential-free `grader-sandbox-runner`, receive no ServiceAccount token or application/database credential, and expose no host namespace/socket/mount escape path;
- restricted Pod Security, fail-closed ValidatingAdmissionPolicy, default-deny ingress/egress, ResourceQuota/LimitRange, read-only root filesystem, bounded `emptyDir`, and narrow Gateway RBAC form the control-plane envelope;
- the provider enforces digest-pinned image identity, argv-only execution, deterministic source/result resource naming, one-vCPU/memory/storage/PID envelopes, outer timeout, replay ownership, cleanup, and explicit infrastructure `system_error` classification;
- Gateway Kubernetes credentials are projected, short-lived, and reread from the token file rather than embedded in long-lived configuration.

The trusted runner/release layer establishes:

- `apps/grader-runner` is a separate static Go executable and never runs inside Web/API/Worker/Gateway;
- the first executable mode is deliberately narrow `js-sum-v1`, backed by pinned pure-Go `goja` without `goja_nodejs` or Node host APIs;
- hidden tests are compiled into the immutable runner image and cannot be supplied by learner source, environment, metadata, or caller-selected argv;
- learner `console.log`/`console.error` are bounded internal result data; process stdout remains a single bounded protocol-v1 control document;
- learner wall-clock, cumulative process CPU, output, and source-layout semantics are enforced inside the runner while memory, filesystem/network, outer timeout, and Pod task containment remain Kubernetes/gVisor responsibilities;
- `profile.limits.pids` remains the ADR-0036 outer Pod task/PID envelope; `js-sum-v1` is stricter because learner code has no process-spawn host API;
- trusted-runner configuration/accounting/internal failures exit non-zero and remain infrastructure `system_error`, never learner `failed`;
- production artifact construction pins Go 1.26.8, `CGO_ENABLED=0`, `-buildvcs=false`, `-trimpath`, empty Go build id, deterministic OCI timestamps, and a `scratch` image; CI byte-compares two binaries and requires two OCI builds to produce the same manifest digest;
- canonical `js-sum-v1@1` is checked in at `infra/grader/execution-profiles/js-sum-v1-v1.json` and pinned to CI-proven digest `sha256:0d22faa894b6bb73347dddef5c19ec5240c06ac893c6e9d5791fb9621edcb9d5`;
- repository security-contract tests tie digest/argv/runtime/limits to the Gateway/provider contract and assert that the canonical profile remains inert while the default sandbox provider is unavailable;
- `infra/grader/scripts/verify-real-cluster.sh` plus `REAL_CLUSTER_VERIFICATION.md` provide a fail-closed target-cluster gate for actual RuntimeClass/`runsc-nonet`, dedicated-node placement, admission rejection, token absence, kubelet PID ceiling, network policy, quota/limits, operator gVisor evidence, Secret encryption-at-rest evidence, replay/cleanup, and hostile-code E2E through the exact runner image; ordinary GitHub CI does not simulate that gate.

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

The repository-side executable path is now defined end to end:

```text
Worker durable lease
  -> authenticated Grader Gateway
  -> exact server-owned profile + fingerprint fence
  -> Kubernetes/gVisor sandbox provider
  -> digest-pinned trusted grader runner
  -> one bounded protocol-v1 result
  -> infrastructure failures remain system_error
```

Production still does not execute learner code by default. The canonical profile is release material only, `GRADER_SANDBOX_PROVIDER` defaults to `unavailable`, and a separate deployment activation must publish the exact digest and produce a green real-cluster verification record for the target context/node pool/runtime configuration before enabling `kubernetes-gvisor`.

### F8 — Recommendations / instructor intelligence / progression: review, signal, intervention, readiness, Offering triage, and gated completion implemented

F8 now has five derived intelligence layers plus one explicit enforced progression layer without creating a second learner-state model: derived review scheduling, derived trusted misconception signals, one authored-remediation-driven action-changing intervention policy, a separate derived CourseVersion progression-readiness decision, an Offering-scoped instructor/mentor readiness overview over active Enrollments, and readiness-gated learner-requested Enrollment completion.

The review-scheduling layer establishes:

- ADR-0013 remains authoritative: Recommendation is derived, explainable state and Mastery remains the learning-state projection;
- `ordered-mastery@1` remains unchanged with mastery target `0.8` and continues to take precedence while any CourseVersion Skill is unobserved or below target;
- `fixed-interval-review@1` is a separate versioned policy with a seven-day interval and runs only after the ordered-mastery target is met for all relevant Skills;
- review timing derives from Mastery-owned `lastEvidenceAt`; Recommendations do not read Learning Progress tables directly and do not persist a duplicate review schedule;
- one server-owned `evaluatedAt` instant is passed to the pure policy, making a decision deterministic for the same canonical inputs and evaluation time;
- review candidates order by earliest `reviewDueAt`, then immutable CourseVersion Skill position, then stable Skill id;
- due review Activities reuse the existing deterministic ordering by Enrollment attempt count, Activity position, and stable Activity id;
- a due review is explained by machine reason `focus_skill_review_due` with `lastEvidenceAt` and `reviewDueAt`; when nothing is due, `mastery_target_met` remains distinct from completion and exposes the earliest derived `nextReviewAt`;
- a due Skill without a practice Activity remains `no_practice_activity_available` and carries review timing so the content gap is explainable;
- the existing Enrollment-scoped endpoint, `recommendation.read` / `recommendation.read_others` capabilities, Offering scope, tenant/RLS boundary, and read-only `REPEATABLE READ` transaction remain unchanged;
- no database migration, schedule/recommendation table, background worker, outbox event, canonical LearningEvent, notification, intervention, or new instructor visibility policy is introduced by this slice;
- the v1 timestamp semantic deliberately uses the latest normalized Evidence timestamp already exposed by Mastery; changing to scored-only/retrieval-success/adaptive timing requires a new explicit projection/interface and review policy version.

The first review-scheduling exit path is:

```text
mastered Skill
  -> derived nextReviewAt
  -> review becomes due
  -> explainable Activity recommendation
  -> new normalized Evidence refreshes Mastery.lastEvidenceAt
  -> next derived review moves forward
```

The first misconception-signal layer establishes:

- ADR-0039 distinguishes an observed/derived learner signal from a canonical curriculum-authored misconception concept and from a later intervention consequence;
- `repeated-trusted-failure@1` is an explicit versioned detection policy with minimum two consecutive failed distinct Attempts for the same stable Skill;
- its output is deliberately `status = suspected` with machine code `repeated_trusted_failure`; it is not a named diagnosis, causal explanation, or confidence probability;
- the signal consumes only Learning Progress-owned validation-derived Evidence that already passed the existing `completed + trusted + passed|failed` normalization boundary;
- raw `ValidationResult.payload`, raw grader payload, Submission source, Guided Build exposure, UI telemetry, GitHub Project facts, LLM output, `system_error`, `needs_review`, and advisory validation state are excluded from v1 misconception inputs;
- Learning Progress exposes a dedicated public `TrustedValidationEvidenceQuery`, so Recommendations does not query foreign tables/repositories or Validation internals;
- observations are organization-wide by learner + stable Skill, matching Mastery identity, while Recommendation evaluates only its already selected focus Skill;
- multiple decisive validation-derived Evidence rows for the same `(Skill, Attempt)` collapse to the latest observation at the public read boundary, preventing validation retry/correction from manufacturing a repeated-failure streak;
- a later trusted `passed` Attempt clears the active consecutive-failure streak;
- the signal is recomputed inside the existing tenant-scoped read-only `REPEATABLE READ` Recommendation transaction and is not persisted;
- `ordered-mastery@1` / `fixed-interval-review@1` continue to select the action exactly as before; F8.2 attaches misconception signal metadata only and does not reorder Activities, mutate Mastery, decide readiness, or automate remediation;
- the existing Enrollment-scoped Recommendation authorization remains authoritative; no new instructor/mentor cross-user intelligence endpoint or capability is introduced;
- canonical Knowledge-owned misconception taxonomy/entities/relations and any exact diagnostic-code mapping remain later explicit architecture decisions.

The first misconception-signal exit path is:

```text
trusted failed ValidationResult on Attempt A
  -> normalized failed Evidence for Skill
trusted failed ValidationResult on Attempt B
  -> normalized failed Evidence for same Skill
  -> repeated-trusted-failure@1 suspected signal
  -> existing Activity recommendation remains selected and becomes more explainable
trusted passed ValidationResult on later Attempt C
  -> normalized passed Evidence
  -> active repeated-failure signal clears
```

The first action-changing intervention layer establishes:

- ADR-0040 keeps detection and consequence separate: `repeated-trusted-failure@1` remains unchanged while `repeated-failure-remediation@1` owns only the remediation action override;
- Learning Content owns an immutable CourseVersion-authored `Skill -> ordered stable Activity identities` remediation mapping rather than letting Recommendations infer remediation from titles, positions, raw payloads, source code, telemetry, GitHub activity, or LLM output;
- every remediation Activity must belong to the same CourseVersion and already assess the target Skill; PostgreSQL enforces that relation against the existing CourseVersion Skill and Activity-Skill graph;
- remediation mappings are editable only while the CourseVersion is draft, inherit the existing tenant/RLS and published-graph immutability boundary, and clone into the next CourseVersion by stable Activity identity;
- authoring uses a per-Skill serialized, materially idempotent replace-set command under existing `activity.manage` Course scope; an actual mapping change emits one transactional `course_version.skill_remediations_replaced@1` outbox event while an identical sequential or concurrent retry is a no-op;
- ordinary `ordered-mastery@1` / `fixed-interval-review@1` first select the baseline focus Skill and action; intervention composition runs only afterward and never rewrites Mastery, Evidence, the signal, or focus Skill;
- with an active repeated-failure signal, alternate authored remediation Activities order by lowest Enrollment Attempt count, authored remediation position, then stable Activity id;
- if no alternate authored remediation exists, or the authored target is already the baseline Activity, the baseline recommendation remains unchanged and no intervention metadata is emitted;
- when the Activity changes, the existing baseline reason code remains intact, its `attemptCount` reflects the Activity actually returned, and additive structured intervention metadata records the signal code, displaced baseline ActivityVersion, remediation position, and intervention policy version;
- recommendation computation remains a tenant-scoped read-only `REPEATABLE READ` derivation; there is no persisted learner-intervention state, intervention LearningEvent, learner-state outbox event, queue, notification, or worker;
- learner/other-learner recommendation authorization remains the existing `recommendation.read` / `recommendation.read_others` Offering-scoped boundary; no instructor dashboard or aggregation surface is added;
- readiness remains explicitly separate from Mastery, misconception signal, intervention occurrence, and course completion.

The first remediation-intervention exit path is:

```text
authored CourseVersion Skill -> remediation Activity relation
  -> two trusted failed Attempts for the Skill
  -> repeated-trusted-failure@1 suspected signal
  -> ordinary baseline Activity selected
  -> repeated-failure-remediation@1 selects authored remediation Activity
  -> structured intervention explains the displaced baseline action
  -> later trusted passed Evidence clears the repeated-failure signal
  -> intervention clears
  -> ordinary baseline sequencing resumes
```

The first progression-readiness layer establishes:

- ADR-0041 defines readiness as a separate derived capability rather than a Recommendation status, Mastery alias, Enrollment completion flag, or intervention consequence;
- `course-progression-readiness@1` pins `mean-scored-evidence@1`, mastery target `0.8`, at least two distinct scored Attempts per CourseVersion Skill, and a seven-day scored-Evidence freshness window;
- Evidence sufficiency counts distinct Attempts rather than Evidence rows, preventing multiple rows from one Attempt from masquerading as independent observations;
- readiness freshness uses latest **scored** normalized Evidence, intentionally distinct from F8.1 review scheduling's broader Mastery `lastEvidenceAt` semantics;
- an active `repeated-trusted-failure@1` is a definitive not-ready blocker once evidence is sufficient, even when historical passing Evidence keeps mean Mastery at or above the target;
- `insufficient_evidence`, `not_ready`, and `ready` remain distinct machine states; a known blocker outranks uncertainty at overall CourseVersion level;
- a ready decision exposes `readyUntil`, the earliest freshness boundary across ready Skills;
- Learning Readiness consumes Delivery, Content, Mastery, Learning Progress, and Recommendations only through public application/query boundaries and never reads foreign tables directly;
- `readiness.read` / `readiness.read_others` preserve the existing Offering-scoped self-versus-other learner visibility pattern;
- Assignment timing, Enrollment completion, intervention occurrence, raw validator/grader payload, Guidance exposure, UI telemetry, GitHub Project activity, and LLM output are not readiness evidence;
- readiness is evaluated in a tenant-scoped read-only `REPEATABLE READ` transaction with server-owned `evaluatedAt` and is not persisted;
- no readiness table/projection, learner-state event, outbox record, queue, worker, notification, automatic ProgressionGate, Enrollment completion, or aggregation is introduced by the individual-readiness slice.

The first readiness exit path is:

```text
active Enrollment + published CourseVersion Skill
  -> fewer than 2 scored distinct Attempts => insufficient_evidence
  -> 2 fresh scored Attempts + Mastery >= 0.8 + no active failure signal => ready
  -> two newest trusted failed Attempts while historical Mastery remains 0.8
  -> repeated-trusted-failure@1 active
  -> readiness => not_ready
  -> later trusted passed Attempt clears signal
  -> readiness => ready again
  -> Enrollment remains active
```

The first Offering readiness-intelligence layer establishes:

- ADR-0042 keeps readiness-specific operational aggregation inside Learning Readiness rather than prematurely creating a general Analytics module;
- `GET /v1/organizations/:organizationId/offerings/:offeringId/readiness` evaluates only active Enrollments and requires existing `readiness.read_others` at Offering scope;
- every learner row is still produced by the unchanged `course-progression-readiness@1` policy; aggregation cannot reinterpret Mastery, Evidence sufficiency, freshness, repeated-failure blockers, or `readyUntil`;
- one tenant-scoped read-only `REPEATABLE READ` transaction supplies one server-owned `evaluatedAt`, one immutable CourseVersion graph, and one consistent snapshot for the whole Offering;
- batch public queries replace N+1 endpoint/service composition: Delivery supplies active target Enrollments plus learner-to-Enrollment mappings, Mastery supplies batch learner+Skill projections, Learning Progress supplies enrollment-mapped scored-Evidence/trusted observations, and Recommendations reuses the exact repeated-failure detector in batch;
- the new readiness batch path does not add another Learning Progress -> Delivery table join; Delivery-owned Enrollment mappings are passed explicitly into Progress queries;
- cross-module reads on the shared PostgreSQL transaction client are sequential rather than concurrent `Promise.all` calls, avoiding deprecated concurrent client usage;
- `offering-readiness-triage@1` orders `not_ready -> insufficient_evidence -> ready`; within one status it uses `enrolledAt` then stable Enrollment id, and deliberately does not rank blocker reasons by severity;
- the overview contract exposes exact readiness/triage policy versions, status counts, attention count, learner/enrollment identity, and existing Skill-level explanations while leaving display-name/email enrichment outside readiness semantics;
- completed/withdrawn/cancelled Enrollments are excluded from the current-attention population rather than reclassified;
- Assignment timing, Attendance, UI telemetry, GitHub Project activity, raw grader payload, LLM output, and intervention occurrence remain excluded from readiness evidence and triage ranking;
- no overview snapshot table, migration, LearningEvent, outbox event, worker, queue, notification, Assignment, bulk intervention, or automatic progression action is introduced.

The first instructor/mentor readiness-intelligence exit path is:

```text
one LearningOffering
  -> active Enrollments only
  -> one consistent course-progression-readiness@1 evaluation instant
  -> learner A: Mastery 0.8 + two newest trusted failures => not_ready
  -> learner B: insufficient scored Attempts => insufficient_evidence
  -> learner C: sufficient fresh evidence => ready
  -> offering-readiness-triage@1
  -> not_ready, then insufficient_evidence, then ready
  -> summary counts match ordered learner rows
  -> read creates no canonical learner state or outbox event
```

The first enforced progression layer establishes:

- ADR-0043 selects one concrete transition, `Enrollment active -> completed`, instead of introducing a generic gate engine;
- a new Learning Progression module owns only gate policy and orchestration, while Learning Readiness still owns `course-progression-readiness@1` and Learning Delivery still owns canonical Enrollment persistence;
- Learning Readiness exposes a transaction-level public query so Progression consumes the exact readiness evaluator rather than copying Mastery/Evidence/freshness/repeated-failure rules;
- Learning Delivery exposes a narrow transaction-level completion command that changes status, sets `completedAt`, and emits exactly one `enrollment.completed@1` outbox event;
- `course-readiness-enrollment-completion@1` allows only `ready`; `insufficient_evidence` and `not_ready` fail closed;
- authorization remains independent through new Offering-scoped `progression.complete`; the first command is self-only for the owning learner, so readiness is never an access grant and organization/instructor authority is not an implicit override;
- the completion command runs in one writable tenant-scoped `REPEATABLE READ` transaction and uses one server-owned instant for both readiness `evaluatedAt` and Enrollment `completedAt`;
- blocked completion returns machine-readable gate/readiness context, mutates no Enrollment state, and emits no completion outbox event;
- a retry after successful completion is materially idempotent: it returns the same completed Enrollment and does not emit a second completion event;
- migration `000031_enrollment_terminal_lifecycle.sql` makes terminal Enrollment status immutable and keeps `completedAt` immutable after completion while still allowing the first `active -> completed|withdrawn|cancelled` transition;
- starting Attempts remains unchanged before completion; after completion, existing active-Enrollment guards prevent new Attempts;
- no gate table/history, automatic completion, instructor override, certificate, Commerce consequence, notification, queue, worker, or generic ProgressionGate framework is introduced.

The first enforced progression exit path is:

```text
active Enrollment
  -> insufficient_evidence => completion denied, no mutation/outbox
  -> not_ready => completion denied, no mutation/outbox
  -> course-progression-readiness@1 => ready
  -> course-readiness-enrollment-completion@1 => allowed
  -> Delivery marks Enrollment completed
  -> one enrollment.completed@1 outbox event
  -> repeated completion request => same completed Enrollment, no duplicate event
```

Adaptive spacing, canonical named misconception taxonomy, readiness history, recommendation/intervention history, reminders/notifications, Group/CourseRun readiness filters, dashboards, reason-specific urgency ranking, bulk instructor actions, automatic completion, staff completion override/audit policy, and learn-vs-review balancing remain separate future slices.

### F9 — Commerce/public launch: Product/Price + Purchase settlement + public catalog implemented

F8 is closed. F9 continues from ADR-0014 Entitlement/access semantics through provider-independent commercial terms, paid settlement, and the first unauthenticated discovery boundary.

The implemented Commerce/public-launch foundation now includes:

- ADR-0044 provider-independent `CommerceProduct` and immutable `CommercePrice`;
- Product targets one existing LearningOffering in v1 without creating a Commerce -> Delivery application dependency;
- one active immutable Price per `(Product, currency, billingType)`; changed terms require archive + new Price identity;
- organization-scoped `commerce.manage` remains separate from `entitlement.manage`;
- ADR-0045 introduces canonical Commerce-owned `Purchase` with the first lifecycle `pending -> paid`;
- Purchase pins exact Product, Price, Offering, purchaser, server-owned amount/currency/billing terms, and client idempotency identity;
- checkout is authenticated self-purchase by an active Organization member and accepts only exact Price identity plus idempotency key; caller-supplied money fields are rejected;
- Stripe Checkout is the first payment-provider adapter behind Integrations-owned ports/mappings rather than becoming Commerce domain state;
- external Checkout Session creation occurs outside PostgreSQL transactions and uses Purchase identity as the provider idempotency anchor;
- signed Stripe webhook ingress validates raw bytes before trusting payload fields, deduplicates by provider event id, persists only normalized settlement/routing fields plus payload hash, and returns after durable inbox acceptance;
- payment webhook processing is separate lease/retry/dead-letter worker state, executed by a dedicated payment-worker process entrypoint that does not require grader gateway configuration; unmapped Checkout deliveries block durably and are reactivated when the exact trusted Checkout mapping appears;
- only normalized `payment_status=paid` can settle Purchase, and provider amount/currency must exactly match canonical Purchase terms;
- the payment worker can mutate payment state only through narrow SECURITY DEFINER claim/finish/acknowledge functions, not broad Commerce table privileges, and remains runtime-independent from the disabled F7 grader path;
- the winning paid acknowledgement atomically commits Purchase `paid`, a purchase-backed Offering Entitlement, `purchase.paid@1`, and `entitlement.granted@1`;
- Entitlement provenance now distinguishes `manual` human grants from `purchase` grants linked to source Purchase;
- paid settlement never creates Enrollment, preserving `Purchase != Entitlement != Enrollment`;
- ADR-0046 defines a stateless Public Catalog composition boundary rather than exposing internal Commerce/Delivery DTOs;
- public routing uses globally unique Organization slug plus Organization-scoped Product slug and never tenant UUID as visitor authority;
- the public projection exposes only Organization name/slug, Product name/slug, safe Offering presentation fields, and active immutable Price terms plus the exact opaque Price id required by a future checkout command;
- public sellability is derived fail-closed from active Organization + active Product + at least one active Price + open `entitlement_required` Offering, while membership-only Offerings are deliberately excluded from the current paid vertical;
- strict public schemas reject accidental Product/Offering/tenant lifecycle, ownership, audit, CourseVersion, Purchase, Entitlement, Enrollment, or provider-field disclosure;
- Public Catalog owns no canonical table and composes Organizations, Commerce, and Learning Delivery only through public application query ports, avoiding a Commerce -> Delivery dependency cycle;
- anonymous database access does not add broad table SELECT/RLS policy: narrow schema-owned `STABLE SECURITY DEFINER` functions expose only the fields required for public composition, and the active Organization slug -> tenant UUID resolver is not executable by `platform_app`;
- public composition runs sequentially inside one read-only `REPEATABLE READ` snapshot;
- v1 public catalog responses use `Cache-Control: no-store` so archive, suspension, Offering closure, and Price withdrawal are not prolonged by shared-cache staleness;
- catalog visibility is discovery/presentation only: it is not an access grant or checkout authorization, and any future visitor checkout must revalidate exact current sellability server-side rather than trusting a previously returned document;
- visitor/customer onboarding, Organization self-join policy, unaffiliated-user checkout, checkout UI, refunds/reversals, subscriptions, taxes, discounts, provider customer identity, reconciliation, marketing, caching optimization, and launch hardening remain separate F9 slices.

The first paid path is:

```text
authenticated active Organization member
  -> active Product + exact immutable Price
  -> pending Purchase with server-owned terms
  -> Stripe hosted Checkout outside DB transaction
  -> trusted Checkout mapping
  -> signed durable webhook inbox
  -> worker lease/retry processing
  -> paid amount/currency match
  -> Purchase paid + purchase-backed Entitlement atomically
  -> no Enrollment
```

The first public discovery path is:

```text
organizationSlug + optional productSlug
  -> active Organization public identity
  -> active Product + active immutable Price candidates
  -> open entitlement_required Offering filter
  -> strict public projection
  -> no access grant, membership mutation, Purchase, Entitlement, or Enrollment
```

F7 production grader activation remains an independent deployment/security gate.

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
- Commerce Product is provider-independent commercial packaging; in F9.1 it targets one Offering but does not itself grant access or create an Enrollment.
- Commerce Price is immutable commercial meaning. Amount/currency/billing terms are never rewritten; a changed offer gets a new Price identity after the previous Price is archived.
- At most one active Price exists per Product/currency/billing type, and archived Product/Price lifecycle is terminal.
- `commerce.manage != entitlement.manage`: authoring an offer and manually granting access are separate authorities.
- `Purchase != Entitlement != Enrollment`: paid commercial fact, current access right, and delivery participation keep independent identities/lifecycles.
- Purchase pins immutable server-priced Product/Price terms; provider objects/statuses are Integrations state rather than Purchase semantics.
- Payment webhook HTTP ingress is verify/dedupe/persist/return; canonical settlement is lease-fenced asynchronous worker processing.
- A paid Purchase and its purchase-backed Entitlement plus their integration events commit atomically; settlement never auto-enrolls.
- Public catalog projection is derived presentation state, not canonical Product/Price/Offering state and not a second source of truth.
- Public sellability is fail-closed current-state composition: active Organization + active Product + active Price + open `entitlement_required` Offering.
- Public catalog visibility does not grant Organization membership, Entitlement, Enrollment, or checkout authority; a future public checkout must revalidate exact current commercial/Offering state server-side.
- Organization slug + Product slug is the stable public route identity; opaque Price id selects immutable commercial terms but is never tenant authority.
- Anonymous read capability must remain narrower than ordinary tenant-table access; targeted SECURITY DEFINER reads do not justify broad public RLS policies.
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
- Recommendation is derived explainable state and must not become a second source of truth for learner progress or Mastery.
- Recommendation and review policies are explicit/versioned; `ordered-mastery@1` remains unchanged while `fixed-interval-review@1` derives seven-day due times from Mastery-owned `lastEvidenceAt` only after the mastery target is met.
- Review scheduling is recomputable from canonical learning state plus an explicit evaluation instant; no persisted schedule is canonical in the first F8 vertical.
- A recommendation reason may expose stable machine timing/provenance needed to explain a due review, but presentation prose/LLM output must not silently change the selected action.
- A suspected misconception signal is derived explainability state, not a diagnosis, Mastery mutation, or canonical Knowledge misconception entity.
- `repeated-trusted-failure@1` uses only normalized trusted decisive validation-derived Evidence and counts distinct Attempts; raw validator/grader payload and assistance/external/LLM telemetry are not signal inputs.
- Misconception detection and misconception-aware intervention are separate policies: `repeated-trusted-failure@1` detects a suspected pattern while `repeated-failure-remediation@1` may separately change the Activity only from explicit published remediation intent.
- CourseVersion remediation mappings are authored Learning Content state, not learner state or named misconception taxonomy; they use stable Activity identity, require the target Activity to assess the Skill, become immutable on publication, and clone with the versioned learning graph.
- An intervention remains derived recommendation state: it may replace only the baseline Activity, preserves the focus Skill and baseline reason semantics, and exposes structured provenance for the displaced action rather than persisting a learner intervention record.
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
- ADR-0036 establishes the hardened Kubernetes/gVisor sandbox control plane: deterministic Jobs in fixed `platform-grader-sandbox`, exact `platform-gvisor` RuntimeClass selection, credential-free `grader-sandbox-runner` Pods, restricted Pod Security, fail-closed admission, default-deny networking, finite namespace capacity, and narrow Gateway RBAC.
- Worker transports the durable scheduling-time profile fingerprint as trusted dispatch metadata; Gateway refuses provider execution when its locally resolved exact profile fingerprint differs, so recorded provenance cannot silently execute different profile material.
- Kubernetes control-plane credentials rotate through a reread token file; learner Pods receive no ServiceAccount token or application/database credentials.
- Provider replay validates deterministic Job/Secret/result-Pod ownership and keeps disappearance, capacity, transport, timeout, and malformed provider behavior in explicit `system_error` semantics.
- ADR-0037 establishes the separate trusted runner and first constrained executable JavaScript profile; hidden harness, host-capability surface, learner limit semantics, result-channel integrity, reproducible artifact construction, and production activation gates are explicit.
- The canonical `js-sum-v1@1` profile is pinned to a CI-proven reproducible OCI digest and is checked by repository security-contract tests; changing runner/runtime/harness/limits after release requires a new exact profile version.
- Real-cluster verification is intentionally external to ordinary CI and must fail closed on missing live RuntimeClass/node/PID/admission/network/quota/token/encryption evidence.
- Production learner-code execution remains disabled until the exact canonical digest is published to the deployment-owned repository and the separate target-cluster activation gate is green; repository presence of the runner/profile alone is not activation.

## Active F4 compatibility windows

Do not remove these merely because the canonical model has moved on. Each requires an explicit cleanup slice/migration once its callers are proven migrated.

1. Historical `learning_progress.attempts.submission` and `submitted_at` columns remain for migration compatibility, but dedicated `learning_progress.submissions` is the source of truth for new application writes.
2. During the transition window, the existing create-Attempt command may still carry a submission payload; the application must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event. `attempt.submitted` remains only as a deprecated transition integration alias and carries `submissionId`; it is never materialized as a learner LearningEvent.
4. Evidence-by-Submission is the canonical API direction; the older Evidence-by-Attempt endpoint is retained temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to mimic the canonical LearningEvent journal.

## Next recommended slice

**F9.4 Visitor/customer onboarding and Organization membership entry boundary — define how an unaffiliated visitor becomes an authenticated customer eligible to enter the existing checkout flow without weakening tenant or membership authority.**

F9.3 makes exact sellable offers discoverable without authentication. The next smallest public-launch slice should establish the identity/membership transition needed before exposing checkout initiation to visitors who are not already active Organization members.

Before coding:

- fresh-audit the live F9.3 main plus Identity, Organizations, Authentication, Authorization, Commerce checkout, session/cookie, abuse/rate-limit, and tenant-routing boundaries;
- decide whether v1 supports account creation, sign-in-only, invitation, explicit Organization self-join, or a combination, and keep Organization membership creation an explicit authoritative transition rather than a side effect of catalog reads;
- define which Organizations are allowed to accept public customer entry and whether that requires a new explicit Organization policy/configuration rather than inferring from the existence of a Product;
- distinguish authenticated Nexus user identity from Organization membership and from paid Entitlement; `User != Membership != Purchase != Entitlement != Enrollment`;
- define duplicate/replay/idempotency semantics for registration and membership entry, including concurrent requests;
- preserve tenant authority server-side from the public Organization slug; never accept tenant UUID, amount, currency, Product/Offering ids, or membership role from visitor-controlled input;
- define enumeration/privacy behavior for email/account lookup, session establishment, verification/recovery, CSRF/origin protections, and abuse controls before adding public write endpoints;
- do not let a stale catalog response authorize checkout: the later public checkout command must revalidate current Organization/Product/Price/Offering sellability and exact immutable Price identity at command time;
- keep visitor onboarding separate from checkout UI, refunds/subscriptions/tax/discounts/marketing, and F7 production grader activation unless the audit proves a minimal dependency is required for correctness.

