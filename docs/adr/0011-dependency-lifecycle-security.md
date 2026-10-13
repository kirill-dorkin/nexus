# ADR 0011: Dependency lifecycle scripts are an explicit trust boundary

- Status: Accepted
- Date: 2026-09-13

## Context

Package-manager lifecycle scripts execute third-party code during dependency installation. The initial repository bootstrap exposed three unreviewed scripts: `esbuild`, `@scarf/scarf`, and `msgpackr-extract`. The same dependency graph also contained deprecated `cron-parser@4.9.0` through an unused BullMQ dependency.

Silencing these messages would hide the engineering decision instead of resolving it.

## Decision

1. Pin pnpm to `10.34.5`, the reviewed pnpm 10 line used by local development and CI.
2. Enable `strictDepBuilds: true`. Any new dependency with an unreviewed install script makes installation fail.
3. Use `allowBuilds` as the committed source of truth for reviewed lifecycle scripts.
4. Allow `esbuild` because the executable setup is required by the development/test toolchain (`tsx` and Vitest/Vite).
5. Explicitly deny `@scarf/scarf`. Its script exists for install analytics, not application functionality. The root manifest also sets `scarfSettings.enabled=false` so the privacy decision remains explicit outside pnpm.
6. Remove BullMQ and ioredis from the worker until a queue adapter is actually implemented. Unused dependencies are not architectural placeholders. When queue implementation begins, the current queue version and its dependency graph must be reviewed in the same change.
7. Placeholder `test` scripts that only return exit code 0 are prohibited. The repository uses real Vitest assertions from the foundation stage.
8. CI uses Node's bundled Corepack to activate the exact pnpm version declared by the repository. We do not add a separate package-manager setup action when the runtime already provides this capability.
9. GitHub Actions are pinned to immutable reviewed commit SHAs. CI setup actions must use the Node.js 24 action runtime line.

## Consequences

- Dependency installation fails closed when a new lifecycle script appears.
- Every lifecycle-script approval is reviewable in version control.
- Install telemetry from Swagger UI's Scarf dependency is disabled.
- Deprecated transitive dependencies are removed by eliminating the unused parent dependency rather than muting deprecation warnings.
- Queue dependencies will be introduced only together with queue code, tests, and a dependency review.
- Test success now means assertions actually executed.
- CI does not execute an extra package-manager installer with its own dependency graph and audit surface.

## Review procedure

When pnpm reports or rejects a new lifecycle script:

1. Run `pnpm why -r <package>` and identify the direct owner in the dependency graph.
2. Inspect the package's lifecycle script and upstream documentation.
3. Decide whether the dependency is needed at all.
4. If needed, explicitly allow or deny the exact package in `allowBuilds` and document material security/privacy implications.
5. If the package is deprecated, prefer upgrading or removing the owning dependency. Do not use a warning-suppression setting as the fix.

`dangerouslyAllowAllBuilds` and blanket script approval are forbidden.
