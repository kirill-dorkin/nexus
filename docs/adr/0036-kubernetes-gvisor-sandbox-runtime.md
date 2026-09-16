# ADR-0036: Production grader execution uses Kubernetes Jobs behind a dedicated gVisor runtime boundary

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0007 requires hostile learner code to execute outside Web/API/Worker and outside the Grader Gateway process itself. ADR-0033 established exact-version server-owned execution profiles and a sandbox-provider seam. ADR-0034 and ADR-0035 then established durable grader jobs, authenticated Worker -> Gateway dispatch, retry/dead-letter processing, and lease-fenced terminal ValidationResult recording.

The remaining F7 security boundary is real learner-code execution. Nexus needs a production provider that can enforce the existing profile contract without giving application services a Docker/containerd socket, host namespace access, production database credentials, cloud instance credentials, or a general-purpose privileged execution API.

The repository is not otherwise coupled to a specific cloud or Kubernetes distribution. The provider choice therefore needs to remain behind the existing Grader Gateway abstraction and must not leak provider-specific state into Learning Validation.

## Decision

### 1. The first production provider is Kubernetes Job orchestration with a dedicated gVisor RuntimeClass

The Grader Gateway may be configured with a `kubernetes-gvisor` sandbox provider. Each execution is represented by an ephemeral Kubernetes Job whose Pod is required to use a dedicated gVisor RuntimeClass.

Kubernetes/containerd owns the privileged `runsc` integration. The Grader Gateway does **not** receive a Docker socket, containerd socket, CRI socket, KVM device, host PID namespace, host network namespace, or direct `runsc` process capability.

The gVisor runtime handler is configured by cluster operators with networking disabled at the runtime layer. A namespace-level default-deny NetworkPolicy is required as defense-in-depth; NetworkPolicy alone is not treated as the primary `network: off` guarantee.

This is the initial production isolation architecture. A Firecracker-class microVM provider remains a compatible future hardening option if public multi-tenant risk, workload diversity, or scale justifies the additional control-plane and host-operations surface.

### 2. Sandbox execution is confined to a dedicated namespace with admission-enforced invariants

Production sandbox Jobs run only in a dedicated namespace that enforces Kubernetes `restricted` Pod Security.

The namespace also carries fail-closed ValidatingAdmissionPolicy bindings for both grader Jobs and their Pods. Pod admission requires the dedicated gVisor RuntimeClass and rejects specifications that weaken the sandbox contract. Job admission independently prevents parallel fan-out, internal retry, unbounded execution lifetime, and unbounded terminal retention.

Every grader Pod is created with at least these immutable controls:

- `automountServiceAccountToken: false`;
- no host network, host PID, or host IPC namespace;
- non-root UID/GID;
- `allowPrivilegeEscalation: false`;
- all Linux capabilities dropped;
- `RuntimeDefault` seccomp;
- read-only container root filesystem;
- no `hostPath`, persistent volume, device, or host mount;
- only read-only projected source input plus bounded ephemeral writable storage;
- digest-pinned runner image;
- explicit CPU, memory, ephemeral-storage, and outer wall-clock limits;
- `restartPolicy: Never`, a one-second maximum termination grace, and no application-level retry inside the Job.

The dedicated sandbox nodes must configure one consistent kubelet per-Pod PID limit. The provider accepts a production profile only when its declared `pids` value exactly matches that configured sandbox-node limit. This prevents the profile from claiming a PID budget that Kubernetes cannot enforce per Pod.

The namespace also has finite ResourceQuota and LimitRange envelopes. These are defense-in-depth capacity controls against accidental or compromised control-plane fan-out; they do not replace durable Worker retry/backpressure policy.

### 3. Gateway Kubernetes credentials are narrow, rotating, and never enter learner execution

The Grader Gateway uses a dedicated namespace-scoped Kubernetes ServiceAccount. Its Role is limited to the resource verbs required to create/read/delete grader Jobs and their short-lived input Secrets, observe the resulting Pod, and read the Pod result log.

The Gateway reads the projected bound ServiceAccount token from its mounted token file for every Kubernetes API request rather than caching the token value at process startup. This preserves normal Kubernetes token rotation and avoids turning token expiry into a hidden Gateway restart requirement.

The Gateway ServiceAccount token is never mounted into learner Pods. Learner Pods receive no Kubernetes credentials, production application credentials, cloud instance credentials, database credentials, or application secrets.

A compromised Gateway therefore has a constrained Kubernetes API capability rather than a host runtime socket. Cluster admission policy remains an independent defense if the Gateway attempts to submit a weaker or resource-amplifying Job specification.

### 4. Source transport is ephemeral, read-only, bounded, and never placed in Pod metadata or logs

Learner source stays data, never infrastructure policy.

The provider creates one immutable Kubernetes Secret per source file. Each Secret contains only that file's bytes and is owner-referenced to the grader Job. The Job mounts those Secrets through a read-only projected volume at the normalized source paths already accepted by protocol v1.

This design avoids putting learner source in command arguments, environment variables, labels, annotations, or Pod logging configuration. Because Kubernetes Secrets are persisted by the control plane, production clusters must enable encryption at rest for Kubernetes API data. Job deletion/TTL garbage collection cascades to source Secrets, while provider setup failures also attempt best-effort Job cleanup.

The existing protocol source-size and file-count limits remain authoritative. One Secret per source file keeps each Kubernetes object below the existing protocol file-size ceiling rather than using Kubernetes object limits to silently widen the accepted source envelope.

### 5. Scheduling-time profile provenance is fenced at dispatch

The immutable execution profile v1 remains the source of truth for:

- language/runtime identity;
- runner image digest;
- trusted argv strategy;
- network and filesystem policy;
- wall-clock, CPU, memory, PID, output, source-byte, and source-file limits.

`runnerImageDigest` remains the canonical image-content identity recorded in the profile fingerprint. The Kubernetes provider combines that digest with a deployment-owned runner image repository; changing registry location without changing image bytes is an infrastructure-routing change, while changing executable bytes requires a new digest and therefore a new profile version.

Profile image + argv jointly pin trusted grader/test-suite semantics. Any material runner, hidden-test, runtime, command, or existing profile-policy change requires a new exact profile version rather than rebinding an existing one.

Using the same parser implementation in API and Gateway is necessary but insufficient: two deployments could still be configured with different material under the same `(profile key, version)`. Therefore the Worker transports the durable ledger's scheduling-time `profile_fingerprint` in the authenticated `x-grader-profile-fingerprint` HTTP metadata while keeping the persisted protocol-v1 JSON request unchanged. Grader Gateway resolves its local exact profile and refuses provider execution unless that dispatched fingerprint is syntactically valid and exactly equals the resolved profile fingerprint. Missing or mismatched fingerprint is a non-retryable protocol `system_error`, never learner failure.

This slice does **not** silently add a new field to the existing profile fingerprint. Already-persisted grader jobs retain the profile semantics and fingerprint under which they were scheduled. Kubernetes ephemeral-storage capacity is therefore a provider-owned outer hard envelope configured by deployment, bounded by the same fail-closed provider configuration and namespace LimitRange. If Nexus later needs a per-profile storage budget as canonical grader provenance, that requires an explicit new profile-contract/version decision rather than retroactively changing profile v1.

### 6. Resource limits use both runtime/container controls and the trusted runner contract

Kubernetes/gVisor provides the outer containment envelope:

- memory through the container cgroup limit derived from the exact profile;
- CPU through a fixed one-vCPU cgroup ceiling;
- ephemeral storage through a provider-owned bounded container `ephemeral-storage` limit plus bounded `emptyDir` scratch space;
- PID exhaustion through the dedicated sandbox-node kubelet per-Pod PID limit, which must equal the profile's declared `pids` budget;
- outer execution lifetime through Job `activeDeadlineSeconds` derived from profile wall time plus a bounded infrastructure startup allowance;
- host/kernel isolation through gVisor.

The one-vCPU outer ceiling deliberately does not reinterpret profile `cpuTimeMs` as a cgroup quota ratio. The profile already requires `cpuTimeMs <= wallTimeMs`; cumulative CPU-time semantics therefore remain the responsibility of the digest-pinned trusted runner instead of being silently changed into permanent CPU throttling by the provider.

The digest-pinned trusted runner inside the sandbox remains responsible for interpreting the exact profile argv, enforcing learner-facing wall/CPU/PID/output semantics within that outer envelope, capturing learner stdout/stderr rather than streaming it directly as container logs, and emitting exactly one bounded protocol-v1 result document on stdout.

If the trusted runner violates that contract, exits without a valid result, exceeds the outer Job deadline/storage envelope, or produces malformed/oversized output, Gateway returns `system_error`; it does not infer learner failure from sandbox infrastructure behavior.

### 7. Provider lifecycle is deterministic and fail-closed

Kubernetes resource names derive from the content-addressed grader `jobId`. Resource metadata also records the full job identity, profile fingerprint, and provider-spec fingerprint so a name collision or pre-existing foreign resource fails closed.

Provider behavior is:

1. create or materially verify the deterministic Job;
2. create or materially verify owner-referenced immutable source Secrets;
3. observe the Job until terminal state or provider deadline;
4. on completion, identify exactly one succeeded Pod whose ownerReference points to the exact Job UID;
5. read only that owned sandbox Pod's runner result log under a strict byte limit;
6. return raw provider output to the existing Gateway runtime validator;
7. retain a completed Job only for the bounded TTL replay window, after which Kubernetes owner-reference garbage collection removes the Job's Pod and source Secrets.

Retrying the same durable grader job may observe an already-running or already-finished deterministic Kubernetes Job instead of starting a second concurrent execution. If Kubernetes resources have already been garbage-collected, a later retry may re-execute the same content-addressed job; runtime-level network-off and ephemeral-storage rules make that execution externally side-effect-free by construction.

Capacity pressure, scheduling failure, image-pull failure, Kubernetes API failure, ambiguous provider state, and outer timeout are infrastructure failures and remain `system_error`. Retryability is explicit per error classification and is still bounded by the durable Worker retry/dead-letter lifecycle from ADR-0035.

### 8. Canonical learning state remains unchanged

Kubernetes resource state is provider infrastructure, not canonical learning state.

Grader Gateway still returns only protocol-v1 `completed` or `system_error`. Worker still transports the immutable persisted request unchanged and runtime-validates the exact result `jobId`; the additional profile-fingerprint header is trusted orchestration provenance from the durable ledger, not learner-controlled execution policy. Learning Validation still owns the durable grader ledger and ValidationResult. Learning Progress still owns Evidence normalization. No Kubernetes identifier, Pod state, node identity, provider credential, or provider-specific payload becomes canonical Validation/Evidence/Mastery state.

No database migration is required by this slice.

## Verification requirements

Before a production executable profile is considered enabled, tests and deployment checks must prove at least:

- Gateway and API use the same shared execution-profile parser/fingerprint implementation;
- Worker transports the durable scheduling-time profile fingerprint and Gateway refuses provider execution on missing/mismatched fingerprint;
- production provider configuration fails closed when namespace/runtime/image/PID/storage controls are absent or invalid;
- projected Kubernetes ServiceAccount token rotation does not require Gateway restart;
- generated Jobs always use the required gVisor RuntimeClass and hardened Pod security context;
- Job admission prevents parallel fan-out, internal retries, and unbounded lifetime;
- ServiceAccount token automount, host namespaces, host mounts, privilege escalation, added capabilities, writable root filesystem, arbitrary volume types, and secret-backed environment injection cannot appear in generated sandbox Pods;
- source content is present only in owner-referenced Secret data and mounted read-only, not in metadata/env/commands/logging configuration;
- image references are deployment repository plus exact profile `sha256` digest;
- memory and outer-deadline limits derive from the exact profile, Kubernetes CPU remains a one-vCPU containment ceiling, exact cumulative `cpuTimeMs` remains runner-enforced, and the deployment-owned ephemeral-storage envelope remains separately bounded;
- existing-resource replay checks full job/profile/provider identity and fails closed on conflict;
- result-log selection verifies the succeeded Pod belongs to the exact deterministic Job UID;
- completed provider output still passes through protocol/runtime validation and exact `jobId` checking;
- malformed output, timeout, capacity/provider failure, and cleanup ambiguity remain `system_error` rather than learner `failed`;
- deployment manifests enforce restricted Pod Security, default-deny networking, least-privilege RBAC, finite namespace capacity, and gVisor-only admission.

A real production cluster must additionally verify the configured RuntimeClass resolves to `runsc`, the `runsc` handler has networking disabled, sandbox nodes have the documented per-Pod PID limit, and Kubernetes API data encryption at rest is enabled.

## Consequences

- Nexus gains a concrete production sandbox control plane without placing host runtime privilege in Web/API/Worker/Gateway.
- gVisor provides a materially stronger kernel boundary than ordinary `runc` containers while retaining OCI/Kubernetes operational tooling.
- Kubernetes becomes an implementation dependency of this provider only; the Grader Gateway provider seam remains capable of supporting a later microVM backend.
- Dedicated sandbox-node and control-plane policy configuration is part of the security boundary and must be deployed before enabling production profiles.
- Runner images become security-sensitive build artifacts: their digest and exact profile version are canonical provenance, and runner/test changes require new profile versions.
- Scheduling-time profile provenance is actively fenced at execution rather than merely assumed from matching profile key/version configuration.
- Existing profile-v1 fingerprints remain stable; provider-specific outer storage policy is not smuggled into canonical provenance retroactively.
- Production execution remains fail-closed when the hardened provider or an executable profile is not explicitly configured.
