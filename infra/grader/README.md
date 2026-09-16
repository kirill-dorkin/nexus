# Grader trust boundary

Learner code is hostile by definition.

Every executable evaluation profile must pin its trusted runtime image digest and argv strategy and declare bounded wall-clock, CPU-time, memory, PID, output, source-size, source-file, filesystem, and network semantics.

## Kubernetes/gVisor control plane

ADR-0036 defines the first production sandbox provider architecture. The manifests in `infra/grader/kubernetes/` establish a dedicated control plane around ephemeral Kubernetes Jobs:

- namespace `platform-grader-sandbox` with `restricted` Pod Security enforcement;
- RuntimeClass `platform-gvisor` backed by an operator-configured `runsc-nonet` CRI handler;
- immutable namespace-targeted ValidatingAdmissionPolicy rules for grader Pods and Jobs;
- a credential-free `grader-sandbox-runner` ServiceAccount for learner Pods;
- default-deny ingress and egress NetworkPolicy as defense in depth;
- finite ResourceQuota and LimitRange capacity envelopes;
- namespace-scoped Gateway RBAC for only Job/Secret/Pod observation and result-log operations.

The Gateway itself never receives a Docker, containerd, CRI, KVM, or direct `runsc` socket. Learner Pods receive no Kubernetes ServiceAccount token and no application/database credentials.

## Operator prerequisites

Do not enable `GRADER_SANDBOX_PROVIDER=kubernetes-gvisor` for production execution until all of the following are independently verified on the real cluster:

1. Kubernetes is new enough to support the `admissionregistration.k8s.io/v1` ValidatingAdmissionPolicy resources used here (stable from Kubernetes 1.30).
2. `platform-gvisor` resolves to the intended gVisor `runsc-nonet` handler on only the dedicated sandbox nodes.
3. The handler has networking disabled at the gVisor runtime layer. NetworkPolicy is defense in depth, not the primary `network: off` guarantee.
4. Every dedicated sandbox node uses the documented kubelet per-Pod PID limit and it equals the executable profile PID budget accepted by Gateway.
5. Kubernetes API data encryption at rest is enabled because learner source is transported through short-lived immutable Secrets.
6. The Gateway control-plane ServiceAccount exists in `platform-system` and receives only the RoleBinding permissions in `rbac.yaml`.
7. Admission policies and bindings are active and reject intentionally weakened test Pods/Jobs.
8. The default-deny NetworkPolicy is enforced by a conformant networking implementation.
9. A trusted, reproducibly built grader-runner image exists and its immutable digest is pinned by an exact executable profile version.

The current repository slice deliberately stops before item 9: it provides the hardened provider/control plane but not the trusted runner artifact or production executable profile enablement.

## Execution invariants

Sandbox baseline: gVisor-class kernel isolation, ephemeral execution, non-root UID/GID, all Linux capabilities dropped, `RuntimeDefault` seccomp, read-only image root, bounded writable `emptyDir`, read-only Secret-projected source, no host namespaces/mounts, one digest-pinned runner container, one Job completion, no internal retry, no network, and deterministic cleanup/replay identity.

Provider, scheduling, image-pull, quota, disappearing-resource, timeout, malformed-result, and cleanup ambiguity remain infrastructure `system_error`; they are never converted into learner `failed`. Durable retry/dead-letter policy remains owned by the Worker/Validation job lifecycle.

A Firecracker-class microVM backend remains compatible with the Grader Gateway provider seam if future public multi-tenant risk, workload diversity, or scale warrants a stronger or differently operated isolation boundary.
