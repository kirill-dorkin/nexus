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

## Trusted runner and canonical first profile

ADR-0037 defines the trusted runner boundary. `apps/grader-runner` is a separate static Go executable in a `scratch` image. The first deliberately narrow executable mode is `js-sum-v1`: learner source must provide `/workspace/source/main.js` with a global `solve(input)` function, while the hidden harness remains compiled into the immutable runner image.

The embedded JavaScript runtime is pinned `goja` without the Node compatibility layer. Learner code receives no `process`, `require`, filesystem, network, worker, child-process, shell, timer/event-loop, native-addon, platform credential, or arbitrary host API. gVisor remains the outer OS isolation boundary.

CI proves the Linux binary and OCI image reproducible. The canonical first profile is checked in at `infra/grader/execution-profiles/js-sum-v1-v1.json` and is bound to the CI-proven image digest `sha256:0d22faa894b6bb73347dddef5c19ec5240c06ac893c6e9d5791fb9621edcb9d5`. CI rebuilds the image and fails if the fresh reproducible digest differs from the checked-in profile.

The checked-in profile is **release material, not automatic activation**. `GRADER_SANDBOX_PROVIDER` still defaults to `unavailable`, and the profile is not silently injected into production configuration.

## Operator prerequisites

Do not enable `GRADER_SANDBOX_PROVIDER=kubernetes-gvisor` for production execution until all of the following are independently verified on the real target cluster:

1. Kubernetes supports the deployed `admissionregistration.k8s.io/v1` ValidatingAdmissionPolicy resources.
2. `platform-gvisor` resolves to the intended gVisor `runsc-nonet` handler on only dedicated sandbox nodes.
3. The handler has networking disabled at the gVisor runtime layer. NetworkPolicy is defense in depth, not the primary `network: off` guarantee.
4. Every dedicated sandbox node uses the documented kubelet per-Pod PID limit and it exactly equals the executable profile PID budget accepted by Gateway.
5. Kubernetes API data encryption at rest is enabled because learner source is transported through short-lived immutable Secrets.
6. The Gateway control-plane ServiceAccount exists in `platform-system` and receives only the RoleBinding permissions in `rbac.yaml`.
7. Admission policies and bindings are active and reject intentionally weakened test Pods/Jobs.
8. The default-deny NetworkPolicy is deployed and enforced by the target networking implementation.
9. ResourceQuota and LimitRange are deployed with the expected finite sandbox envelopes.
10. The exact canonical runner digest has been published to the deployment-owned OCI repository used by Gateway.
11. The real-cluster verification procedure in `REAL_CLUSTER_VERIFICATION.md` is green for the exact target kube context/node pool/runtime configuration/profile digest.

Run `infra/grader/scripts/verify-real-cluster.sh` only against a real target cluster. It intentionally requires live Kubernetes access plus operator-controlled gVisor runtime/network and Secret-encryption evidence. It must never be replaced by a fake `runsc`/ordinary-container simulation on a generic GitHub runner.

## Execution invariants

Sandbox baseline: gVisor-class kernel isolation, ephemeral execution, non-root UID/GID, all Linux capabilities dropped, `RuntimeDefault` seccomp, read-only image root, bounded writable `emptyDir`, read-only Secret-projected source, no host namespaces/mounts, one digest-pinned runner container, one Job completion, no internal retry, no network, and deterministic cleanup/replay identity.

Learner-facing wall-clock, cumulative process CPU, output, source-layout, and control-document semantics belong to the trusted runner. `profile.limits.pids` remains the outer Pod task/PID envelope from ADR-0036; `js-sum-v1` is stricter because it exposes no learner process-spawn API.

Provider, scheduling, image-pull, quota, disappearing-resource, outer-timeout, malformed-result, and cleanup ambiguity remain infrastructure `system_error`; they are never converted into learner `failed`. Durable retry/dead-letter policy remains owned by the Worker/Validation job lifecycle.

A Firecracker-class microVM backend remains compatible with the Grader Gateway provider seam if future public multi-tenant risk, workload diversity, or scale warrants a stronger or differently operated isolation boundary.
