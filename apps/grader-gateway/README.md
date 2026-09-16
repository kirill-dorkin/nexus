# Grader Gateway

Trusted control plane for hostile learner-code execution. The gateway accepts only authenticated, runtime-validated evaluation jobs and delegates execution to a sandbox provider behind a separate security boundary.

## Security boundary

- Web/API/Worker never execute learner code.
- The Grader Gateway process itself never executes learner code directly.
- Job callers can reference only an exact server-owned executable profile; they cannot supply runner images, commands, network policy, mounts, credentials, or resource limits.
- Worker transports the durable job's stored execution-profile fingerprint in authenticated dispatch metadata. Gateway must resolve the same fingerprint before any sandbox provider call, so a deployment profile drift cannot execute different semantics under already-recorded provenance.
- Executable profiles require network OFF, ephemeral workspace, read-only root filesystem, immutable image digest, argv-only runner strategy, and bounded CPU/memory/process/time/output/source limits.
- Job identity is content-addressed from the immutable request specification. Provider retries use deterministic Kubernetes resource identity rather than starting an intentionally different execution.
- Provider/infrastructure failure is returned as `system_error`, never as learner `failed` outcome.

## Runtime configuration

`GRADER_GATEWAY_SERVICE_TOKEN` is required and must contain at least 32 bytes. `/v1/jobs` accepts `Authorization: Bearer <token>` and fails closed when authentication is missing or invalid. `/health` remains public for infrastructure health checks.

The default sandbox provider remains `unavailable`. Enabling the Kubernetes/gVisor provider is explicit:

- `GRADER_SANDBOX_PROVIDER=kubernetes-gvisor`;
- `GRADER_KUBERNETES_API_URL` — HTTPS is mandatory in production; non-production HTTP is accepted only on loopback for tests;
- `GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY` — repository only, without tag or digest; the exact profile-owned `sha256` digest is appended by the provider;
- `GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE` — readable Gateway control-plane credential file; the client rereads it for every request so projected token rotation is honored;
- `GRADER_KUBERNETES_CA_FILE` — required for HTTPS;
- bounded optional poll/request/startup/cleanup/ephemeral-storage/PID settings.

Sandbox placement is deliberately **not** configurable at runtime. The provider is compiled to use:

- namespace `platform-grader-sandbox`;
- RuntimeClass `platform-gvisor`;
- learner Pod ServiceAccount `grader-sandbox-runner` with token automount disabled.

This prevents a deployment typo from routing hostile code into an unprotected namespace or ordinary runtime.

## Production enablement gate

This repository slice provides the hardened Kubernetes/gVisor control plane and provider adapter. It does **not** yet contain the trusted grader-runner artifact/image build that executes the validator harness and emits the bounded protocol-v1 result document.

Therefore production learner-code execution must remain disabled until a later independently verified runner slice provides:

1. the trusted runner implementation and reproducible image build;
2. an immutable image digest bound to an exact executable profile version;
3. runner enforcement of wall/CPU/PID/output semantics and separation of learner stdout/stderr from the single control result document;
4. end-to-end execution tests against the hardened provider;
5. real-cluster verification of the gVisor runtime handler, node PID envelope, admission policies, default-deny networking, and Kubernetes API data encryption at rest.

There must be no production database credentials, user sessions, direct domain repositories, Docker/containerd/CRI sockets, KVM devices, or host-runtime credentials in the Gateway runtime container.
