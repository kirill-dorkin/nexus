# ADR-0034: Learning Validation owns the durable grader-job ledger and worker lease state

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0007 requires hostile learner code to remain outside Web/API/Worker, behind the Grader Gateway security boundary. ADR-0033 establishes the fail-closed Gateway protocol, content-addressed `jobId`, exact server-owned execution profiles, service authentication, and sandbox-provider seam, but deliberately leaves durable execution de-duplication and application dispatch unfinished.

Nexus now needs a durable boundary between immutable learner Submission state and future trusted Worker -> Grader Gateway dispatch. That boundary must survive request retries and worker crashes, preserve exact validator/profile provenance, remain tenant-safe, and avoid turning infrastructure failures into learner failures.

The Grader Gateway is intentionally DB-less and must not become the owner of canonical learning or job orchestration state. Learning Progress owns Submission/Attempt state, while Learning Validation already owns validator semantics and canonical ValidationResult attribution.

## Decision

### 1. Learning Validation owns canonical grader-job state

A grader job exists because an exact immutable Submission must be evaluated by the exact system validator pinned by its ActivityVersion. Therefore Learning Validation owns the durable grader-job ledger.

The ledger records immutable execution intent/provenance:

- content-addressed `jobId`;
- Organization, Submission, and ActivityVersion ids;
- exact validator key/version/config snapshot;
- exact execution-profile key/version/fingerprint;
- canonical protocol-v1 request payload;
- requesting learner identity;
- creation time.

The Grader Gateway remains DB-less and owns admission/security/provider control, not durable job state. Learning Progress remains the owner of Attempt/Submission and normalized Evidence/Mastery concerns.

### 2. Immutable job identity is separate from mutable processing state

`learning_validation.grader_jobs` is immutable application-owned intent/provenance. `learning_validation.grader_job_processing` contains mutable asynchronous processing state.

This separation prevents retry/lease mechanics from rewriting the immutable specification that explains what was requested.

One logical grader job exists per `(organization, submission, validator key, validator version)`. Replays return the existing job only when its material immutable configuration still matches. A changed profile fingerprint or other material immutable input under the same logical identity is a configuration conflict, not a silent replacement.

### 3. Scheduling derives execution material from canonical state

The learner may trigger scheduling only for their own immutable Submission and only through existing authorization/cross-module application queries.

The scheduling command derives:

- ActivityVersion from the Submission's Attempt;
- exact validator binding from immutable ActivityVersion config;
- system-executable validator capability from the exact-version Validation registry;
- exact profile reference from server-authored validator config;
- profile semantics/fingerprint from deployment-owned profile configuration;
- source only from the explicit `Submission.payload.source.files` envelope.

Arbitrary Submission fields are never guessed as executable source. Learner requests cannot supply image identity, runtime, command/argv, network, mounts, credentials, resource limits, provider options, or sandbox-host configuration.

The HTTP scheduling surface returns `202 Accepted`: durable admission is established, but this slice does not claim that execution has occurred.

### 4. Worker mutation is constrained to narrow lease functions

`platform_app` may insert/read immutable grader jobs and read tenant-scoped processing state. It cannot update processing state.

`platform_worker` receives no direct table UPDATE privilege. It may mutate processing state only through narrow `SECURITY DEFINER` PostgreSQL functions.

Claim semantics use `FOR UPDATE SKIP LOCKED`, a unique lease token, lease expiry, and bounded attempt count. An expired lease may be reclaimed by a later worker. A stale worker cannot fail a newly re-leased job because acknowledgement/failure requires the current lease token.

Attempts are bounded at five. Exhausted jobs transition to `dead_letter` under database-owned policy rather than caller-selected terminal state.

### 5. This slice stops before dispatch and result recording

The durable ledger makes future asynchronous dispatch safe to build, but it does not yet:

- call Grader Gateway;
- enable production learner-code execution;
- choose a production sandbox provider;
- acknowledge a completed Gateway result;
- record a system-owned ValidationResult;
- create Evidence or update Mastery;
- append a learner LearningEvent for grader infrastructure state.

No outbox event is introduced merely to represent the queue because the PostgreSQL processing row is already the canonical asynchronous work state. A later adapter may use BullMQ/Redis for wake-up/scheduling, but such infrastructure must not become canonical job state.

### 6. Infrastructure failure remains separate from learner outcome

Retryable transport/provider failures belong to grader-job processing until terminal handling is explicitly designed. Future Gateway `system_error` handling must preserve existing Validation semantics: infrastructure failure cannot be converted into negative learner Evidence or a learner failure score.

The next F7 slice must define trusted Worker -> Gateway transport, authenticated dispatch, and an atomic lease-aware terminal acknowledgement that records the exact system-owned ValidationResult without double-recording on retry.

## Consequences

- Nexus now has durable execution de-duplication/provenance instead of relying only on content-addressed identity.
- Worker crashes and duplicate scheduling requests cannot silently create a second logical grader job.
- Exact profile fingerprint provenance makes deployment drift observable and prevents silent rebinding under an existing profile version.
- Grader Gateway stays outside canonical learning persistence and keeps no production DB credential.
- Learner/API identities may express scheduling intent, but only trusted backend worker identity can advance asynchronous processing state.
- Production learner-code execution remains disabled; the system has established admission/lease state, not a sandbox execution implementation.
- The next slice can focus narrowly on authenticated dispatch and terminal ValidationResult recording over a proven durable ledger.
