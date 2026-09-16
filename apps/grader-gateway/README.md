# Grader Gateway

Trusted control plane for hostile learner-code execution. The gateway accepts only authenticated, validated evaluation jobs and delegates execution to a sandbox provider behind a separate security boundary.

## Security boundary

- Web/API/Worker never execute learner code.
- The Grader Gateway process itself does not execute learner code directly.
- Job callers can reference only an exact server-owned executable profile; they cannot supply runner images, commands, network policy, mounts, credentials, RuntimeClass, namespace, service account, or resource limits.
- Executable profiles require network OFF, ephemeral workspace, read-only root filesystem, immutable image digest, argv-only runner strategy, and bounded CPU/memory/process/time/output/source limits.
- Job identity is content-addressed from the immutable request specification. Validation owns canonical durable de-duplication; the Kubernetes provider additionally reuses a deterministic Job while its bounded result-retention window remains available.
- Provider/infrastructure failure is returned as `system_error`, never as learner `failed` outcome.
- There must be no production database credentials, user sessions, direct domain repositories, host Docker socket, or host-process learner runner in the Gateway runtime.

## Runtime configuration

`GRADER_GATEWAY_SERVICE_TOKEN` is required and must contain at least 32 bytes. `/v1/jobs` accepts `Authorization: Bearer <token>` and fails closed when authentication is missing or invalid. `/health` remains public for infrastructure health checks.

`GRADER_EXECUTION_PROFILES_JSON` is the server-owned exact-version profile catalog. API scheduling and Grader Gateway admission must be deployed from the same immutable profile configuration. Changing runner image/runtime/strategy/limits requires a new profile version; do not rebind an existing `(key, version)`.

`GRADER_SANDBOX_PROVIDER` defaults to `unavailable`, so deploying the Gateway alone never enables learner-code execution. The only executable provider mode in this slice is `kubernetes-gvisor`.

For `kubernetes-gvisor` configure:

- `GRADER_SANDBOX_NAMESPACE` (default `nexus-grader-sandbox`);
- `GRADER_SANDBOX_RUNTIME_CLASS` (default `gvisor`, which must resolve to a verified gVisor/runsc-class runtime);
- `GRADER_SANDBOX_SERVICE_ACCOUNT` (default `grader-sandbox`);
- `GRADER_SANDBOX_RUNNER_IMAGE_REPOSITORY` (required OCI repository without tag/digest; the exact profile supplies the immutable `sha256` digest);
- `GRADER_SANDBOX_STARTUP_TIMEOUT_MS` (default `10000`);
- `GRADER_SANDBOX_POLL_INTERVAL_MS` (default `250`);
- `GRADER_SANDBOX_RESULT_RETENTION_SECONDS` (default `300`);
- optional `GRADER_KUBERNETES_TOKEN_PATH` and `GRADER_KUBERNETES_CA_PATH` when the in-cluster service-account paths are non-standard.

The provider uses the in-cluster Kubernetes API only. It creates deterministic batch Jobs plus immutable source ConfigMaps, mounts source read-only at `/workspace`, gives the runner only bounded ephemeral `/scratch`, and reads a bounded stdout result. Learner source is never put into argv, environment variables, labels, annotations, or logs by the Gateway.

## Production enablement gate

ADR-0036 defines the Kubernetes + gVisor control architecture, but this slice does not ship a real production exercise/test-suite runner image. Keep `GRADER_SANDBOX_PROVIDER=unavailable` until the target production cluster has independently proved:

- the configured RuntimeClass is actually gVisor/runsc-class isolation;
- the sandbox namespace NetworkPolicy denies egress under the installed CNI;
- Restricted Pod Security controls are enforced;
- CPU/memory/pid/wall/output/ephemeral-storage controls behave as intended;
- digest-pinned runner images emit only the grader protocol-v1 result contract;
- timeout/capacity/image/provider failures map to `system_error` rather than learner failure.

See `infra/grader/kubernetes/sandbox-boundary.yaml` and ADR-0036 for the deployment boundary.
