# Grader Gateway

Trusted control plane for hostile learner-code execution. The gateway accepts only authenticated, validated evaluation jobs and delegates execution to a sandbox provider behind a separate security boundary.

## Security boundary

- Web/API/Worker never execute learner code.
- The Grader Gateway process itself does not execute learner code directly.
- Job callers can reference only an exact server-owned executable profile; they cannot supply runner images, commands, network policy, mounts, credentials, or resource limits.
- Executable profiles require network OFF, ephemeral workspace, read-only root filesystem, immutable image digest, argv-only runner strategy, and bounded CPU/memory/process/time/output/source limits.
- Job identity is content-addressed from the immutable request specification. This gives retries a stable identity; durable execution de-duplication is a later job-ledger/provider concern.
- Provider/infrastructure failure is returned as `system_error`, never as learner `failed` outcome.

## Runtime configuration

`GRADER_GATEWAY_SERVICE_TOKEN` is required and must contain at least 32 bytes. `/v1/jobs` accepts `Authorization: Bearer <token>` and fails closed when authentication is missing or invalid. `/health` remains public for infrastructure health checks.

The current default sandbox provider is intentionally unavailable, so no learner code is executed by this slice. Production provider selection (gVisor-class isolation or stronger), durable grader jobs, API/Worker caller wiring, and system-owned ValidationResult recording are separate F7 work.

There must be no production database credentials, user sessions, direct domain repositories, or Docker socket in the runtime container.
