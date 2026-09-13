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

## Reviewed lifecycle packages

| Package | Decision | Reason |
| --- | --- | --- |
| `esbuild` | allow | Required by the TypeScript development/test toolchain; its install step prepares the platform-specific executable. |
| `@scarf/scarf` | deny | Used by Swagger UI for install analytics; not required for runtime functionality. `scarfSettings.enabled=false` records the same privacy decision at package level. |

## Current queue decision

The worker does not yet implement a queue adapter, so BullMQ and ioredis are intentionally not installed. This removed the unused BullMQ v5 chain that introduced deprecated `cron-parser@4.9.0` and `msgpackr-extract` lifecycle behavior.

When queue work starts, add the queue client and Redis client in the same change that introduces the adapter, integration tests, retry/idempotency semantics, and dependency review. Architecture may target BullMQ, but architecture intent is not a reason to carry unused runtime dependencies.

See ADR `0011-dependency-lifecycle-security.md`.
