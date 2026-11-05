# ADR-0079: Production migrations run automatically before each deploy

- Status: Accepted (owner, 2026-11-05)
- Date: 2026-11-05

## Context

Main deployed to Vercel on every push, but deploys never ran migrations. The owner applied them by hand through `scripts/launch-course.mjs`. Two consequences followed:
- code that needed a migration had to wait for the owner;
- a missed step could put code in production ahead of its schema.

The owner asked not to run migrations by hand any more.

## Decision

1. **Production deploys of `main` come only from `.github/workflows/deploy-production.yml`.**
   - `vercel.json` turns off Vercel's automatic Git deployment for `main`.
   - Preview deployments of other branches are unchanged.
2. **On every push to `main` the workflow:**
   - applies pending migrations with the `platform_migrator` role (`pnpm db:migrate`);
   - then triggers the Vercel production deploy hook for that commit.
   - If migrating fails, it stops: nothing is deployed and the previous release keeps serving.
   - Runs are serialized and never cancelled halfway.
3. **The migrator credentials live only in a GitHub repository secret, `PRODUCTION_DATABASE_MIGRATION_URL`.**
   - They are not in the Vercel runtime environment: the API and Web keep running with `platform_app` only.
   - The deploy hook URL is the secret `VERCEL_PRODUCTION_DEPLOY_HOOK`.
4. **Ordering is safe because migrations stay additive and backward-aware** (AGENTS.md). For the minutes between migrating and the new release going live, the previous release runs on the new schema.
5. **`launch-course.mjs` still migrates first.** That is idempotent: with nothing pending it only says the schema is current.

## Consequences

- PRs that add a migration and the code using it can be merged together; the migration lands first.
- A migration that is not backward-compatible with the running release is now an outage risk at merge time, not just at the owner's run. Review migrations for that.
- **One-time setup by the owner:** the two repository secrets; the deploy hook is created in Vercel → Project → Settings → Git → Deploy Hooks, branch `main`. Until they exist the workflow fails with a clear message and nothing deploys.
- The production smoke (`production-smoke.yml`) still waits until `/v1/health` reports the pushed commit, so a deploy that never happens shows up as a red smoke.
