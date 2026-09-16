# ADR-0036: Production grader sandbox control uses Kubernetes Jobs behind a dedicated gVisor boundary

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0007 requires hostile learner code to execute outside Web/API/Worker and outside the Grader Gateway process itself. ADR-0033 established exact-version server-owned execution profiles and a sandbox-provider seam. ADR-0034 and ADR-0035 established durable grader jobs, authenticated Worker -> Gateway dispatch, retry/dead-letter processing, and lease-fenced terminal ValidationResult recording.

The next F7 boundary is the production sandbox control plane. Nexus needs a provider that can eventually execute a trusted grader runner without giving application services a Docker/containerd/CRI socket, host namespace access, production database credentials, cloud instance credentials, or a general-purpose privileged execution API.

This ADR selects and constrains that provider architecture. It deliberately does **not** declare production learner-code execution enabled: the repository still needs a separately verified trusted runner implementation/image and real-cluster verification before any executable production profile is activated.

## Decision

### 1. The first production provider is Kubernetes Job orchestration with a dedicated gVisor RuntimeClass

Grader Gateway supports an explicit `kubernetes-gvisor` provider. Each execution is represented by an ephemeral Kubernetes Job whose Pod must use the dedicated `platform-gvisor` RuntimeClass.

Kubernetes/containerd owns the privileged `runsc` integration. Grader Gateway does **not** receive a Docker socket, containerd socket, CRI socket, KVM device, host PID/network namespace, or direct `runsc` process capability.

Cluster operators configure the RuntimeClass handler `runsc-nonet` so networking is disabled at the gVisor runtime layer. The sandbox namespace also has default-deny ingress and egress NetworkPolicy as defense in depth; NetworkPolicy alone is not treated as the primary `network: off` guarantee.

A Firecracker-class microVM provider remains compatible with the provider seam if future public multi-tenant risk, workload diversity, or scale justifies a different isolation boundary.

### 2. Sandbox placement is fixed, not deployment-selectable

Hostile execution may run only with these compile-time identities:

- namespace `platform-grader-sandbox`;
- RuntimeClass `platform-gvisor`;
- learner Pod ServiceAccount `grader-sandbox-runner`.

Gateway configuration cannot override those values. This prevents a deployment typo from redirecting learner code to an ordinary namespace or runtime that lacks the required admission/network/security controls.

The namespace enforces Kubernetes `restricted` Pod Security. Fail-closed ValidatingAdmissionPolicy bindings target the immutable Kubernetes namespace-name label `kubernetes.io/metadata.name=platform-grader-sandbox`, so removing a custom operational label cannot silently bypass admission.

Pod admission requires at least:

- exact `platform-gvisor` RuntimeClass;
- exact credential-free `grader-sandbox-runner` ServiceAccount;
- `automountServiceAccountToken: false`;
- no host network/PID/IPC or shared process namespace;
- one runner container and no init/ephemeral containers;
- non-root UID/GID, no privilege escalation, all capabilities dropped;
- `RuntimeDefault` seccomp and read-only root filesystem;
- digest-pinned image;
- explicit CPU/memory/ephemeral-storage requests and limits;
- only read-only Secret-projected source plus bounded `emptyDir` scratch;
- source projection may not smuggle ServiceAccount token, ConfigMap, or downward-API projections;
- only literal trusted runner-control environment variables;
- bounded termination grace.

Job admission requires exactly one completion/parallelism, `backoffLimit: 0`, bounded outer lifetime and TTL cleanup, no suspension, and non-indexed completion semantics.

The namespace additionally has finite ResourceQuota and LimitRange envelopes. These are defense-in-depth capacity controls, not substitutes for durable Worker retry/backpressure.

### 3. Gateway Kubernetes credentials are narrow and rotating; learner Pods are credential-free

Grader Gateway uses a dedicated control-plane ServiceAccount whose namespace-scoped Role is limited to:

- create/get/delete grader Jobs;
- create/get short-lived source Secrets;
- get/list resulting Pods;
- get result logs.

The Kubernetes API client rereads the mounted ServiceAccount token file for every request so normal projected-token rotation does not require Gateway restart.

That credential is never mounted into learner Pods. The separate `grader-sandbox-runner` ServiceAccount has token automount disabled and receives no RBAC in this slice. Learner Pods receive no production application/database credentials, user sessions, provider secrets, or cloud credentials.

A compromised Gateway therefore has a constrained Kubernetes API capability rather than host-runtime privilege. Admission remains an independent enforcement layer if Gateway attempts to submit a weaker Job/Pod shape.

### 4. Source transport is ephemeral, read-only, bounded, and data-only

Learner source remains data, never infrastructure policy.

The provider creates one immutable Secret per source file. Each Secret contains only that file's bytes, is owner-referenced to the exact deterministic Job, and is projected read-only at the already-normalized protocol-v1 path beneath `/workspace/source`.

Source is not placed in command arguments, environment variables, labels, annotations, or logging configuration. Production clusters must enable Kubernetes API data encryption at rest because source bytes transit the Kubernetes API/Secret store.

Protocol source-size/file-count limits remain authoritative. Job deletion or TTL garbage collection owns source cleanup; partial setup failure best-effort deletes a newly created Job so owner-referenced Secrets cascade.

### 5. Scheduling-time profile provenance is fenced at dispatch

The exact execution profile remains the source of truth for runtime/language identity, runner image digest, trusted argv strategy, network/filesystem policy, and wall/CPU/memory/PID/output/source limits.

`runnerImageDigest` is canonical executable-content provenance. The provider combines that digest with a deployment-owned repository location. Changing runner/test/runtime bytes requires a new digest and exact profile version rather than rebinding an existing `(key, version)`.

Sharing the parser implementation between API and Gateway is necessary but insufficient: two deployments could still be configured with different material under the same profile key/version. Therefore:

1. Learning Validation persists the scheduling-time profile fingerprint in the durable grader job;
2. Worker transports that fingerprint in authenticated `x-grader-profile-fingerprint` metadata while preserving the persisted protocol-v1 JSON body unchanged;
3. Gateway resolves its local exact profile and compares the received fingerprint before calling any provider;
4. missing, malformed, or mismatched provenance fails closed as non-retryable `system_error` and the sandbox is not started.

Provider-specific outer ephemeral-storage policy is not added retroactively to profile-v1 provenance. If per-profile storage must become canonical later, that requires an explicit profile-contract version decision.

### 6. Kubernetes/gVisor is an outer containment envelope; exact CPU-time semantics belong to the trusted runner

The provider enforces an outer envelope:

- memory limit from the exact profile;
- fixed one-vCPU request/limit;
- bounded provider-owned ephemeral storage and `emptyDir` scratch;
- node-level kubelet per-Pod PID limit that must exactly equal the profile's `pids` budget;
- Job `activeDeadlineSeconds` from profile wall time plus bounded startup allowance;
- gVisor kernel boundary and runtime-level network off.

The fixed one-vCPU ceiling deliberately does not convert `cpuTimeMs / wallTimeMs` into a permanent cgroup throttle. Exact cumulative `cpuTimeMs` semantics remain a trusted-runner responsibility.

The future digest-pinned trusted runner must also enforce learner-facing wall/PID/output semantics, capture learner stdout/stderr separately from control output, and emit exactly one bounded protocol-v1 result document. Runner crash, malformed/oversized result, outer timeout, or resource-envelope termination remains infrastructure `system_error`; Gateway never infers learner failure from sandbox infrastructure behavior.

### 7. Provider lifecycle is deterministic, replay-safe, and fail-closed

Kubernetes resource names derive from content-addressed `jobId`. Job metadata records full job id, exact profile fingerprint, and a provider-spec fingerprint that also includes fixed placement/security identities and provider envelope inputs.

Lifecycle:

1. create the deterministic Job or verify an existing Job's immutable identity;
2. create each immutable source Secret or verify its content and exact Job ownerReference;
3. observe the Job to terminal state or bounded provider deadline;
4. on completion, accept exactly one succeeded Pod whose ownerReference matches the exact Job name and UID;
5. read only that Pod's runner log under the profile output-byte ceiling;
6. return raw JSON to the existing Gateway result validator, including exact `jobId` validation;
7. rely on bounded Job TTL plus owner references for terminal garbage collection.

A retry may observe the same running/completed Job rather than start a second execution. If deterministic resources disappear or have been garbage-collected, that condition is retryable infrastructure failure; a later durable retry may recreate the same content-addressed execution.

Error classes remain infrastructure semantics:

- Kubernetes 401 -> retryable control-plane authentication error;
- 403 -> retryable control-plane forbidden/authorization-or-policy infrastructure error, without mislabeling every 403 as authentication;
- 404 for an expected resource -> retryable resource-unavailable/disappeared error;
- 429 -> retryable sandbox capacity error;
- timeout/transport/5xx -> retryable control-plane unavailable;
- admission 422 -> non-retryable sandbox-policy rejection;
- immutable identity conflict -> non-retryable resource conflict;
- malformed/missing/oversized runner output -> non-learner `system_error`.

Retry/dead-letter bounds remain owned by ADR-0035's durable Worker/Validation lifecycle.

A caller disconnect or Worker retry does not grant cancellation authority over an already-created deterministic Job. The Job remains bounded by its active deadline and can be re-observed by a retry. A future explicit product cancellation command would require its own authorization and durable-state semantics rather than being inferred from transport disconnect.

### 8. This slice delivers the provider/control plane, not the trusted executable runner

The repository now contains the Kubernetes/gVisor provider adapter and deployment security manifests, but no trusted grader-runner implementation or reproducible runner image build.

Therefore `GRADER_SANDBOX_PROVIDER` remains `unavailable` by default, and production executable profiles must not be enabled yet.

The next independent slice must provide at least:

- trusted runner implementation;
- reproducible OCI image build and immutable digest provenance;
- validator/test-harness execution contract;
- exact wall/CPU/PID/output enforcement and learner stdout/stderr capture;
- single bounded protocol-v1 control result;
- end-to-end tests through the real Gateway provider boundary;
- real-cluster verification of RuntimeClass/`runsc-nonet`, admission, node PID limits, network isolation, quotas, token behavior, and Secret encryption at rest.

Only after that slice and deployment verification may a production executable profile be activated.

### 9. Canonical learning state remains unchanged

Kubernetes state is provider infrastructure, not canonical learning state.

Worker still transports the immutable persisted request and validates exact result `jobId`. Learning Validation still owns durable grader jobs and ValidationResult. Learning Progress still owns Evidence normalization. No Pod/Job/node/provider credential or provider-specific response becomes canonical Validation/Evidence/Mastery state.

No database migration is required by this slice.

## Verification requirements

Before merging this provider/control-plane slice, repository verification must prove:

- shared profile parser/fingerprint parity between API and Gateway;
- scheduling-time fingerprint dispatch fence blocks drift before provider invocation;
- provider configuration is explicit and bounded while sandbox namespace/runtime/runner-SA placement is non-configurable;
- Kubernetes control-plane token is reread so projected rotation is honored;
- generated Job/Pod uses fixed protected placement and hardened security/resource shape;
- deterministic replay verifies Job, Secret, and result-Pod ownership/identity;
- source exists only in immutable owner-referenced Secret data and read-only projection;
- disappearing resources and capacity/provider failures are retryable infrastructure errors;
- malformed/oversized output and policy/identity conflicts remain `system_error`, never learner `failed`;
- repository tests pin critical namespace/RuntimeClass/ServiceAccount/admission/RBAC/network/capacity manifest invariants.

Before production execution is enabled, operators must additionally prove on a real cluster that:

- the Kubernetes version supports the deployed ValidatingAdmissionPolicy resources;
- `platform-gvisor` resolves to the intended `runsc-nonet` CRI handler only on dedicated sandbox nodes;
- gVisor networking is disabled at the runtime layer;
- sandbox nodes share the documented kubelet per-Pod PID limit;
- default-deny NetworkPolicy is enforced by the cluster networking implementation;
- admission actually rejects intentionally weakened Pod/Job fixtures;
- Kubernetes API data encryption at rest is enabled;
- the trusted runner slice and exact digest-pinned production profile have independently passed their verification gates.

## Consequences

- Nexus gains a concrete hardened sandbox **control plane/provider** without placing host-runtime privilege in Web/API/Worker/Gateway.
- Deployment mistakes cannot select an arbitrary namespace or RuntimeClass through Gateway environment configuration.
- gVisor provides a materially stronger kernel boundary than ordinary `runc` containers while retaining Kubernetes operational tooling.
- Kubernetes remains an implementation dependency of this provider only; a later microVM backend can use the same Gateway seam.
- Scheduling-time profile provenance is actively fenced at execution rather than assumed from matching key/version configuration.
- Runner images become security-sensitive build artifacts whose digest/profile version are canonical provenance.
- Production learner-code execution remains disabled until the separate trusted-runner and real-cluster verification gate is complete.
