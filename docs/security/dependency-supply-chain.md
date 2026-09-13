# Dependency supply-chain policy

Dependency installation is treated as code execution and therefore as a security boundary.

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

## Reviewed lifecycle packages

| Package | Decision | Reason |
| --- | --- | --- |
| `esbuild` | allow | Required by the TypeScript development/test toolchain; its install step prepares the platform-specific executable. |
| `@scarf/scarf` | deny | Used by Swagger UI for install analytics; not required for runtime functionality. `scarfSettings.enabled=false` records the same privacy decision at package level. |

## Current queue decision

The worker does not yet implement a queue adapter, so BullMQ and ioredis are intentionally not installed. This removed the unused BullMQ v5 chain that introduced deprecated `cron-parser@4.9.0` and `msgpackr-extract` lifecycle behavior.

When queue work starts, add the queue client and Redis client in the same change that introduces the adapter, integration tests, retry/idempotency semantics, and dependency review. Architecture may target BullMQ, but architecture intent is not a reason to carry unused runtime dependencies.

## CI action review

The CI workflow currently pins these reviewed releases by immutable commit SHA:

- `actions/checkout` v7.0.1 — `3d3c42e5aac5ba805825da76410c181273ba90b1`
- `actions/setup-node` v7.0.0 — `820762786026740c76f36085b0efc47a31fe5020`

Both selected action lines use the Node.js 24 action runtime. pnpm itself is activated with Corepack from Node 24 and then version-asserted against the repository pin.

Changing an action requires reviewing its release notes and updating both the SHA and version comment in the same commit.

## Telemetry

CI explicitly opts out of Turborepo and Next.js anonymous telemetry with their documented environment controls. Swagger UI install analytics are disabled separately through `scarfSettings` and pnpm's denied lifecycle-script policy. These are explicit privacy decisions, not warning suppression.

See ADR `0011-dependency-lifecycle-security.md`.
