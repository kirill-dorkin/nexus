# Grader trust boundary

Student code is hostile by definition.

Every evaluation profile must declare immutable runtime/image identity, runner/test strategy, CPU, memory, pids, stdout/stderr and wall-clock limits, filesystem policy and network policy. Provider-level ephemeral-storage limits are an additional hard ceiling and must never be learner-selectable.

Sandbox baseline: ephemeral, non-root, dropped capabilities, read-only base filesystem, temporary writable workspace, network OFF by default, no host mounts, no Docker socket, destroyed after bounded result retention. Start with OCI + gVisor-class isolation; consider microVM isolation when public multi-tenant risk/scale justifies it.

## Kubernetes + gVisor production boundary

ADR-0036 selects Kubernetes Jobs with an explicitly configured gVisor-class `RuntimeClass` for the first production provider architecture. `kubernetes/sandbox-boundary.yaml` contains the least-privilege namespace/RBAC/network baseline:

- `nexus-grader-control/grader-gateway` is the only service account granted sandbox control-plane permissions;
- `nexus-grader-sandbox` is labeled for Restricted Pod Security admission;
- the sandbox namespace has default-deny ingress and egress with no grader allow-egress policy;
- the sandbox `grader-sandbox` service account has token automount disabled and receives no RBAC;
- Gateway RBAC is limited to creating/reading Jobs and source ConfigMaps, listing Pods, and reading bounded Pod logs; it cannot read Secrets or exec/attach into Pods.

The cluster must install and verify the configured gVisor/runsc RuntimeClass independently. The manifest intentionally does not create or mutate a RuntimeClass because runtime installation is a cluster security concern, not an application-service privilege.

NetworkPolicy is only a real egress boundary when the production CNI enforces Kubernetes NetworkPolicy. Before enabling an executable profile, production verification must prove gVisor isolation, deny-by-default egress, resource enforcement, cleanup, and failure semantics on the actual target cluster.
