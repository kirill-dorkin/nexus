# ADR-0033: Grader Gateway admission is versioned, server-owned, and fail-closed

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0007 places hostile learner code behind a separate Grader Gateway security boundary. Before selecting a sandbox provider, Nexus needs an enforceable protocol that prevents Web/API/Worker or learner-controlled data from choosing infrastructure details and preserves the existing rule that infrastructure failure is not learner failure.

The current Grader Gateway is only a Fastify health scaffold. Learning Validation already distinguishes `completed` from `system_error`, but there is no system-owned grader execution path yet.

## Decision

### 1. Protocol v1 is owned by Grader Gateway

`POST /v1/jobs` accepts a strict versioned job envelope containing only:

- protocol version;
- content-addressed job identity;
- exact server-owned execution-profile key/version;
- immutable Submission and ActivityVersion identifiers;
- bounded untrusted source files.

Learner-controlled requests do not contain runner image references, commands, test strategy, network configuration, resource limits, filesystem policy, credentials, mounts, or provider options.

Source paths are normalized relative POSIX paths. Traversal, duplicates, oversized files, and oversized source bundles are rejected before any sandbox-provider interaction.

### 2. Job identity is content-addressed

The v1 job id is `sha256:<digest>` over canonical immutable job specification material. Source file ordering is normalized before hashing.

This gives retries a stable identity and prevents the same job id from being reused for materially different source or immutable context.

This is **identity idempotency**, not yet durable execution de-duplication. A future grader job ledger/provider integration must use this identity to ensure at-most-one logical execution/result across retries and crashes.

### 3. Executable profiles are server-owned and exact-versioned

A Grader Gateway execution profile owns:

- language/runtime identity;
- immutable runner image digest;
- argv-only runner entrypoint/strategy;
- network policy;
- filesystem policy;
- CPU, wall-clock, memory, process, output, source-byte, and source-file limits.

Profiles are addressed by exact `(key, version)` and a version must never be rebound to materially different semantics. A changed runner image, runtime, strategy, or limit set requires a new profile version.

The gateway hard safety envelope requires:

- network `off`;
- ephemeral filesystem;
- read-only root filesystem;
- image pinned by `sha256` digest;
- no general-purpose shell entrypoint;
- bounded wall time, CPU time, memory, process count, output, source bytes, and source file count.

The job may request only a profile reference. It cannot weaken the selected profile.

### 4. Service authentication fails closed

The job route requires a bearer service credential supplied from deployment secrets. The gateway refuses to boot if the configured service credential is missing or too short and compares credentials in constant time when lengths match.

The health endpoint remains unauthenticated for infrastructure health checks. Job request bodies and credentials must not be logged as application telemetry.

Transport encryption/private service routing remains a deployment requirement; this ADR does not treat a bearer token as a substitute for network-layer protection.

### 5. Sandbox execution remains behind a provider abstraction

This slice defines the sandbox-provider boundary but does not select or run Docker, gVisor, a microVM, host processes, or an in-process evaluator.

The default provider is intentionally unavailable and returns protocol `system_error`. Provider exceptions are normalized to `system_error` rather than `failed` learner outcome.

No production database credential or Docker socket is introduced into Grader Gateway.

### 6. Learning state remains outside this slice

This admission contract does not register a new executable validator, create grader jobs in PostgreSQL, call the gateway from API/Worker, record ValidationResult, create Evidence, update Mastery, or append LearningEvent/outbox state.

Those require later F7 slices with explicit ownership, durable retry/idempotency, and transactional semantics.

## Consequences

- Provider selection can now be evaluated against a concrete, testable security contract instead of defining policy ad hoc in provider code.
- A malicious learner cannot choose command, image, network, resource, or mount configuration through the v1 protocol.
- Replays have stable content-addressed identity, while durable execution de-duplication remains explicitly unfinished rather than falsely implied by an in-memory registry.
- Infrastructure failure remains distinct from negative learning evidence.
- Production execution remains disabled until a later slice deliberately wires a hardened provider and durable job lifecycle.
