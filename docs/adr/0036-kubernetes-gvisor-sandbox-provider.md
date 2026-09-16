# ADR-0036: Production grader sandbox control uses Kubernetes Jobs with a gVisor RuntimeClass

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0007 requires hostile learner code to execute only behind Grader Gateway. ADR-0033 establishes exact server-owned execution profiles and a sandbox-provider seam. ADR-0034 and ADR-0035 establish durable Validation-owned grader-job state plus authenticated Worker -> Gateway dispatch and lease-fenced terminal ValidationResult recording. The remaining F7 security boundary is production sandbox execution itself.

The provider must not introduce a Docker socket, host-process execution, production database access, or learner-controlled infrastructure options. It must preserve retry identity across ambiguous Worker/Gateway transport outcomes and must keep infrastructure failures distinct from learner outcomes.

## Decision

### 1. Kubernetes Jobs are the production sandbox control-plane primitive

Grader Gateway may use an explicitly enabled `kubernetes-gvisor` sandbox provider. The provider talks to the Kubernetes API with a dedicated service account. Web, API, and Worker receive no Kubernetes sandbox credentials.

Each grader `jobId` maps to a deterministic Kubernetes Job name. Replays reuse the existing matching Job instead of intentionally launching another sandbox. Material identity is fenced with annotations containing the exact content-addressed grader job id and resolved execution-profile fingerprint; a name collision with different material fails closed.

Kubernetes is orchestration, not canonical learning state. Validation's PostgreSQL grader ledger and terminal ValidationResult remain authoritative.

### 2. The runtime boundary is a gVisor-class RuntimeClass

Every sandbox Pod sets the deployment-owned `runtimeClassName` configured for gVisor/runsc-class isolation. The RuntimeClass is cluster-provisioned and must not be writable by Grader Gateway.

A cluster that cannot provide the configured RuntimeClass is not a degraded execution mode. The sandbox fails as infrastructure `system_error`; there is no fallback to ordinary runc, Docker socket execution, or host processes.

The selected image is assembled only from a deployment-owned OCI repository plus the execution profile's immutable `sha256` digest. Tags never choose executable content.

### 3. Sandbox namespace is dedicated and deny-by-default

Sandbox Pods run in a dedicated namespace separate from the Grader Gateway control workload. The namespace must be provisioned with:

- default-deny ingress and egress NetworkPolicy;
- restricted Pod Security admission labels;
- a sandbox ServiceAccount with token automount disabled and no business-system RBAC;
- no allow-egress policy for grader Pods.

The runner receives no Kubernetes token, production credential, host mount, host namespace, Docker socket, or secret volume. Network remains `off`; DNS is not specially allowed.

NetworkPolicy enforcement is a cluster/CNI deployment prerequisite and must be verified independently in the target production cluster before any executable profile is enabled.

### 4. Pod security and resources are provider-owned hard controls

Every sandbox Pod is non-root, drops all Linux capabilities, disallows privilege escalation, uses `RuntimeDefault` seccomp, has a read-only root filesystem, disables service links, avoids host PID/IPC/network namespaces, and uses only ephemeral volumes.

The exact execution profile continues to own wall-time, CPU-time, memory, pid, output, and source limits. Kubernetes independently enforces wall time and memory plus a provider hard cap on ephemeral storage and CPU quota. The immutable trusted runner image is responsible for applying the profile's process-level CPU-time/pid/output policy before learner code is started; learner input cannot change those values.

The provider hard ephemeral-storage cap is an additional safety ceiling derived from already fingerprinted profile limits. It is not learner-selectable and does not weaken the exact profile.

### 5. Source ingress uses read-only ConfigMaps; writable state is separate and ephemeral

Learner source is partitioned into bounded ConfigMaps with generated safe keys and projected into the sandbox at the already validated relative POSIX paths. Source ConfigMaps are read-only. Writable build/test state is a size-limited `emptyDir` scratch volume.

Source contents are never placed in command-line arguments, environment variables, logs, annotations, labels, or Kubernetes object names.

ConfigMaps are attached to the deterministic Job with owner references after Job creation. Job TTL garbage collection therefore removes the completed Job/Pod and its source objects after a bounded replay window.

### 6. Runner ABI is server-owned

The provider passes only server-derived metadata and limits to the immutable runner image. The runner reads source from `/workspace`, uses `/scratch` for writable ephemeral state, and emits exactly one grader protocol-v1 JSON result on stdout.

A valid learner failure must be represented by the trusted runner as a protocol `completed` result with `outcome=failed`. Container/runtime crashes, malformed output, image failures, scheduling failures, provider/API failures, and provider wall-time exhaustion remain `system_error`.

Provider stdout collection is bounded before parsing. Provider-specific Kubernetes objects never become canonical ValidationResult payloads.

### 7. Ambiguous outcomes and capacity fail closed

Retryable Kubernetes API/provider unavailability, throttling, scheduling capacity failure, and an ambiguous control-plane timeout return retryable `system_error`.

Configuration/authentication failure, image identity/pull failure, resource identity conflict, and provider wall-time exhaustion return non-retryable `system_error` unless a more specific retry-safe condition is known.

A replay within the Job retention window observes the deterministic existing Job/result. This reduces duplicate physical execution after an ambiguous transport outcome while the Validation ledger still provides the canonical one-result guarantee.

### 8. Production execution remains explicitly gated

The default provider remains `unavailable`. Enabling `kubernetes-gvisor` requires explicit deployment configuration, the dedicated Kubernetes boundary, and at least one exact server-owned execution profile.

This ADR does not ship a production learner exercise/test-suite image. A later executable-profile/runner-image slice must build and verify digest-pinned runner images and real-cluster gVisor containment/egress/resource conformance before production learner-code execution is considered enabled.

## Security impact

- Sandbox control credentials exist only in Grader Gateway.
- No host Docker socket or host-process learner execution is introduced.
- Sandbox network is deny-by-default and production credentials are absent.
- The container runtime is selected explicitly through a gVisor-class RuntimeClass with no fallback.
- Learner source cannot select image, command, mount, runtime class, network policy, service account, namespace, resources, or provider options.
- Infrastructure failure remains `system_error` and cannot directly create negative Evidence.

## Consequences

- Nexus has a concrete production sandbox provider architecture rather than an abstract seam.
- The provider is Kubernetes-specific behind the existing `SandboxProvider` interface; canonical grader/learning state remains provider-neutral.
- Production clusters must independently prove RuntimeClass installation and NetworkPolicy enforcement.
- Physical execution reuse is bounded by Kubernetes Job retention; canonical de-duplication remains the Validation ledger's responsibility.
- A separate runner-image/executable-profile verification slice is still required before public production execution.

## References

- Kubernetes RuntimeClass: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes NetworkPolicy default deny: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- gVisor Kubernetes integration: https://gvisor.dev/docs/user_guide/quick_start/kubernetes/
