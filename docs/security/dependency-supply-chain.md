# Dependency supply-chain policy

Dependency installation and executable build inputs are treated as code execution and therefore as security boundaries.

## Invariants

- New dependency lifecycle scripts are denied until reviewed.
- `strictDepBuilds` remains enabled.
- `dangerouslyAllowAllBuilds` must never be enabled.
- `pnpm approve-builds` is not used as a blind interactive acceptance step; the dependency graph and script purpose are investigated first.
- Deprecated dependencies are traced to their owning direct dependency and upgraded, replaced, or removed where practical.
- Unused dependencies are removed instead of kept for hypothetical future work.
- Analytics/telemetry install scripts are denied unless there is an explicit product decision to enable them.
- A successful `test` command must execute real assertions; no placeholder success scripts are permitted.
- GitHub Actions are pinned to reviewed release commit SHAs rather than mutable major tags.
- CI uses Corepack from the pinned Node.js runtime for pnpm activation; an extra package-manager installer action is avoided.
- CI dependency/build caching is enabled only when a committed lockfile exists and can serve as a deterministic cache key.
- Security-sensitive runner toolchains and runtime dependencies are pinned independently of the Node workspace.
- Canonical executable grader profiles use immutable OCI `sha256` digests, never mutable tags, as executable-content provenance.
- Changing trusted runner/runtime/harness bytes requires a new reproducible digest and an exact profile-version decision; an existing `(key, version)` must not be rebound silently.

## Reviewed lifecycle packages

| Package | Decision | Reason |
| --- | --- | --- |
| `esbuild` | allow | Required by the TypeScript development/test toolchain; its install step prepares the platform-specific executable. |
| `@scarf/scarf` | deny | Used by Swagger UI for install analytics; not required for runtime functionality. `scarfSettings.enabled=false` records the same privacy decision at package level. |

## Trusted grader runner supply chain

`apps/grader-runner` is a security-sensitive executable artifact with its own pinned Go toolchain (`go1.26.8`) and Go module graph. The first embedded ECMAScript runtime is `github.com/dop251/goja v0.0.0-20260106131823-651366fbe6e3`; the Node compatibility package `goja_nodejs` is intentionally excluded from the dependency graph and CI fails if it appears.

The production runner build is static Linux (`CGO_ENABLED=0`) with `-trimpath` and an empty Go build id. The final OCI image is `scratch` and contains only the runner binary and required third-party notices. Reproducibility verification builds the binary twice and byte-compares it, builds the OCI image twice with deterministic timestamp handling, and requires the same OCI manifest digest.

CI writes reproducibility evidence containing the binary SHA-256 and OCI image digest, publishes that evidence as a short-retention GitHub Actions artifact, and separately compares the freshly rebuilt OCI digest to `infra/grader/execution-profiles/js-sum-v1-v1.json`. The canonical `js-sum-v1@1` profile is currently pinned to `sha256:340105917cd1f1d258f8344ef1581929fb0a4395bcb06d3fdefe4f75d45bde2d`.

This digest binding does not publish or activate the image by itself. Production activation remains a separate deployment gate requiring the exact digest to exist in the deployment-owned repository and the target-cluster verification record to be green.

## Current queue decision

The worker does not yet implement a queue adapter, so BullMQ and ioredis are intentionally not installed. This removed the unused BullMQ v5 chain that introduced deprecated `cron-parser@4.9.0` and `msgpackr-extract` lifecycle behavior.

When queue work starts, add the queue client and Redis client in the same change that introduces the adapter, integration tests, retry/idempotency semantics, and dependency review. Architecture may target BullMQ, but architecture intent is not a reason to carry unused runtime dependencies.

## CI action review

The CI workflow currently pins these reviewed releases by immutable commit SHA:

- `actions/checkout` v7.0.1 — `3d3c42e5aac5ba805825da76410c181273ba90b1`
- `actions/setup-node` v7.0.0 — `820762786026740c76f36085b0efc47a31fe5020`
- `actions/setup-go` v7.0.0 — `b7ad1dad31e06c5925ef5d2fc7ad053ef454303e`
- `docker/setup-buildx-action` v4.2.0 — `bb05f3f5519dd87d3ba754cc423b652a5edd6d2c`
- `actions/upload-artifact` v4.6.2 — `ea165f8d65b6e75b540449e92b4886f43607fa02`
- `actions/cache` v5 — `caa296126883cff596d87d8935842f9db880ef25`

Selected Node-based actions use the reviewed Node.js action runtime of their pinned releases. pnpm itself is activated with Corepack from Node 24 and then version-asserted against the repository pin.

Changing an action requires reviewing its release notes and updating both the SHA and version comment in the same commit.

## Telemetry

CI explicitly opts out of Turborepo and Next.js anonymous telemetry with their documented environment controls. Swagger UI install analytics are disabled separately through `scarfSettings` and pnpm's denied lifecycle-script policy. These are explicit privacy decisions, not warning suppression.

See ADR `0011-dependency-lifecycle-security.md` and ADR `0037-trusted-grader-runner.md`.
