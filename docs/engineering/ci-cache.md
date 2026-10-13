# CI cache policy

CI persists two classes of non-authoritative cache:

1. the pnpm content-addressable store, keyed by `pnpm-lock.yaml`;
2. Turborepo and Next.js build caches, restored from the current branch and then from `main`.

Caches are performance optimizations only. They are never a source of dependency truth; the committed lockfile is. Cache misses must not change build output or test results.

A brand-new repository/cache namespace can emit Next.js' `No build cache found` diagnostic on the first cold build. The CI configuration resolves the underlying cause by persisting `.turbo` and `apps/web/.next/cache`; subsequent runs can restore them. We do not suppress the diagnostic with an environment flag or stderr filtering.

Once Foundation 1's dependency changes are reflected in `pnpm-lock.yaml`, CI must use `pnpm install --frozen-lockfile`.
