# ADR-0037: Trusted grader runner and first executable JavaScript profile

- Status: Accepted
- Date: 2026-09-17

## Context

ADR-0007 requires hostile learner code to execute outside Web/API/Worker processes. ADR-0033 defines strict grader protocol v1 and immutable server-owned execution profiles. ADR-0034/0035 make the Validation-owned grader job ledger and authenticated Worker -> Grader Gateway dispatch durable and provenance-fenced. ADR-0036 adds the first hardened Kubernetes/gVisor sandbox control plane while deliberately leaving production learner-code execution disabled until a trusted runner/image and real-cluster verification exist.

The sandbox provider now creates one digest-pinned `runner` container with:

- fixed `platform-gvisor` RuntimeClass and `runsc-nonet` runtime handler contract;
- no ServiceAccount token, host namespaces, extra capabilities, privilege escalation, or writable image root;
- projected read-only learner source plus bounded scratch storage;
- one-vCPU outer ceiling, memory/storage bounds, a kubelet per-Pod PID ceiling, and an outer Job deadline;
- default-deny Kubernetes networking as defense in depth;
- a single bounded result document read from container logs.

What is still missing is the security-sensitive executable inside that container. That executable must turn hostile source plus trusted profile controls into exactly one grader protocol-v1 result without letting learner code control the result channel, hidden tests, host APIs, credentials, or infrastructure-failure classification.

A second design issue must be resolved before implementation: `profile.limits.pids` is already the configured **outer Pod task ceiling** in ADR-0036. A trusted language runtime itself can consume OS tasks/threads, so the same number cannot simultaneously mean “exact learner subprocess count” without reserving trusted runtime overhead. The durable profile field therefore needs one unambiguous meaning while runner-specific learner process capabilities remain stricter where possible.

## Decision

### 1. The trusted runner is a separate executable artifact

Add `apps/grader-runner` as a security-sensitive Go executable. It is not linked into Web, API, Worker, or Grader Gateway and receives no production database, cloud, Kubernetes-control-plane, learner-session, or platform-service credentials.

The production build is a static Linux binary (`CGO_ENABLED=0`) in a `scratch` OCI image. The image contains only the runner binary plus required third-party license notices. The runner image is immutable and referenced by `sha256` digest from an exact execution profile version.

Go is pinned separately from the Node/pnpm workspace. Production builds use an exact Go patch release and `-trimpath` with an empty build id. OCI construction uses `SOURCE_DATE_EPOCH=0` and disables nondeterministic provenance/SBOM attachment in the reproducibility comparison. CI must build the binary and OCI manifest twice and require identical hashes/digests.

### 2. The first executable profile is intentionally narrow

The first supported mode is `js-sum-v1`, a constrained JavaScript function exercise used to prove the complete security and result path before generalizing the runtime.

Its source contract is:

- exactly the server-owned profile selects the mode; the learner cannot choose argv or harness;
- learner source is `/workspace/source/main.js` from the validated protocol-v1 source envelope;
- the file must define a global `solve(input)` function;
- hidden test cases are compiled into the immutable trusted runner image;
- the runner invokes `solve` with JSON-like inputs and compares returned primitive values in trusted Go code;
- changing the hidden harness, runtime semantics, runner binary, command, limits, or image requires a new image digest and execution-profile version.

This first mode is not advertised as Node.js compatibility. It is a constrained ECMAScript runtime. A general Node/npm project profile and dynamic per-Activity hidden-test bundle transport are separate future slices.

### 3. Learner JavaScript runs in an embedded capability-minimal runtime

Use the pure-Go `goja` ECMAScript runtime pinned to a reviewed immutable pseudo-version. Do **not** install the companion Node.js compatibility layer.

The runner exposes only the JavaScript language runtime plus a bounded virtual `console.log` / `console.error`. It does not install `process`, `require`, filesystem, network, worker, child-process, shell, timer/event-loop, native-addon, or platform credential APIs.

This is not treated as the sole sandbox boundary: hostile code still executes inside the gVisor-isolated Pod required by ADR-0036. The embedded capability model is an additional inner boundary that reduces reachable attack surface and prevents learner code from reading the runner binary/hidden tests through language host APIs.

### 4. stdout is a control channel, not learner output

Container stdout/stderr are not a safe learner-output channel because the current provider reads Kubernetes container logs as the single control document.

Therefore:

- learner `console.log` and `console.error` are captured into bounded in-memory buffers;
- learner output is never written directly to process stdout/stderr;
- normal runner completion writes **exactly one** grader protocol-v1 JSON document to stdout;
- the JSON payload may contain bounded learner stdout/stderr strings and only non-secret diagnostic reason codes;
- the encoded control result must itself fit `profile.limits.outputBytes`;
- if learner output exhausts the internal budget, the learner result is deterministic `completed/failed` with reason `output_limit_exceeded`;
- trusted-runner configuration, CPU-accounting, encoding, or internal failures exit non-zero rather than manufacturing learner failure. The outer provider therefore records infrastructure `system_error`.

No hidden inputs, expected values, source text, credentials, stack traces, or arbitrary trusted-runner diagnostics are placed in the successful control payload.

### 5. Learner limits and infrastructure limits stay distinct

The runner is authoritative for learner-facing execution semantics of this profile:

- wall time starts immediately before source evaluation and hidden-harness execution and is enforced with an uncatchable runtime interrupt;
- cumulative CPU is measured from process user+system CPU for the same evaluation window, sampled by a watchdog and checked again before a passing result;
- the runner pins `GOMAXPROCS=1`, matching the provider’s one-vCPU outer ceiling and preventing parallel JavaScript execution;
- output is bounded before it enters the control document;
- source layout is validated before evaluation;
- unavailable host APIs mean learner code has no subprocess creation capability at all in this first profile.

By contrast, Kubernetes/gVisor remains the outer containment layer for memory, Pod tasks/PIDs, filesystem mounts, network isolation, image-root immutability, startup, and catastrophic timeout/termination.

`profile.limits.pids` therefore retains the meaning already implemented by ADR-0036: the maximum **Pod-level task/PID envelope** that must equal the dedicated nodes’ kubelet per-Pod PID limit. It is not reinterpreted as a learner subprocess allowance. A runner may impose a stricter learner capability model; `js-sum-v1` exposes no process-spawn API, which is strictly stronger than the outer numeric ceiling.

An inner learner timeout/CPU/output violation is a learner `completed/failed` result. An outer Job deadline, Pod OOM/termination, runner crash, malformed/missing control result, Kubernetes/provider loss, or trusted-runner internal failure remains infrastructure `system_error` and must never become negative learning evidence.

### 6. The first hidden harness is image-owned, not request-owned

Protocol v1 intentionally does not allow callers to supply commands, test strategy, hidden tests, mounts, or provider options. The durable grader job snapshots Validation-owned `validatorConfig`, but that config is not part of the authenticated Gateway protocol-v1 request or content-addressed job identity.

For this slice, hidden test material is therefore compiled into the immutable runner image selected by the exact execution profile. This preserves the existing protocol and provenance model: a harness change changes the runner artifact/digest and requires a new profile version.

A future generalized grader may introduce a separately content-addressed, authenticated, validator-owned test-bundle reference. That requires an explicit protocol/ledger ADR and must not be smuggled through learner source, environment variables, Kubernetes metadata, or unauthenticated side channels.

### 7. Reproducible build and profile binding are release gates

The repository must provide:

1. deterministic unit/security tests for pass/fail, syntax/runtime failure, wall/CPU limits, bounded output, source-path escape, and absence of host APIs;
2. a reproducible Linux binary build;
3. a reproducible `scratch` OCI image build producing a stable manifest digest;
4. a checked-in exact profile example/manifest bound to that digest before production activation;
5. repository security-contract tests tying the profile argv/digest/limits to Gateway/provider assumptions;
6. a real-cluster verification procedure proving the actual `platform-gvisor -> runsc-nonet` handler, admission denial, restricted Pod Security, default-deny egress, kubelet PID envelope, quotas, credential-free runner ServiceAccount, projected-token rotation for Gateway, Secret encryption-at-rest policy, deterministic replay/cleanup, and hostile-code cases.

A CI-built OCI digest alone does not prove a cluster is correctly hardened. Conversely, a hardened cluster does not prove the runner artifact is reproducible or profile-bound. Both gates are independent.

### 8. Production remains fail-closed

`GRADER_SANDBOX_PROVIDER` continues to default to `unavailable`. This slice does not silently inject an executable profile into production configuration and does not change database state.

Production learner-code execution may be enabled only after:

- the exact runner OCI digest is published to the deployment-owned repository;
- the deployment uses an exact profile version carrying that digest and fixed argv;
- the real-cluster verification record is green for the target cluster/node pool;
- the Gateway/Worker exact-profile fingerprint fence remains green end-to-end.

## Consequences

### Positive

- Hostile learner code remains outside all product/application processes and behind gVisor.
- Hidden tests and the result channel are not writable or selectable by learners.
- The first runtime has a much smaller host capability surface than a general Node.js process.
- Learner time/output failures are distinguished from infrastructure failure before ValidationResult recording.
- Image/profile provenance can be reproduced and independently checked.
- The existing strict protocol v1 and durable ledger need no database migration.

### Trade-offs

- `js-sum-v1` is deliberately a vertical proof, not a general JavaScript/Node project environment.
- Hidden tests embedded in an image mean a test change currently requires a new runner image and profile version.
- Userspace CPU watchdogs have sampling granularity; the semantic boundary is the measured process CPU window and final limit check, while the one-vCPU cgroup remains defense in depth.
- Memory remains enforced by the outer sandbox, not by the embedded JavaScript runtime.
- A future multi-language or arbitrary-project runner will need additional profile-specific process/file/runtime design rather than weakening this profile.

## Rejected alternatives

### Execute learner code inside Web/API/Worker/Gateway

Rejected by ADR-0007 and the established module boundary.

### Use Node.js `vm` as the trust boundary for hidden tests

Rejected. The runner needs a hostile-code boundary with a minimal host API surface; Node’s VM/context facilities are not a security boundary for hostile code, and exposing a full Node host makes result-channel and hidden-test integrity substantially harder.

### Depend on the Node.js permission model as the security boundary

Rejected. The Node.js documentation explicitly treats its permission model as a seat belt for trusted code, not a malicious-code security guarantee. gVisor remains the OS boundary; the first embedded runtime avoids exposing Node host capabilities entirely.

### Send hidden tests in protocol-v1 learner source or environment variables

Rejected because learner source is untrusted/persisted submission material and the current admission contract deliberately prevents caller-controlled test strategy and trusted execution inputs.

### Reinterpret `profile.limits.pids` as an exact learner subprocess count

Rejected because the trusted language runtime itself consumes Pod tasks/threads and ADR-0036 already binds this value to the kubelet per-Pod PID ceiling. The first profile instead exposes no subprocess capability and preserves the outer PID envelope semantics.

### Enable the Kubernetes provider automatically once the runner exists

Rejected. Artifact correctness and real-cluster configuration are independent security gates, so production remains explicitly disabled until both are verified.
