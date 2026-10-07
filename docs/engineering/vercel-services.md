# Vercel Services deployment

The proposed root `vercel.json` deploys `apps/web` as `web` and `apps/api` as `api`. Set the Vercel project Root Directory to the repository root. Build/runtime commands belong to each service; no project-level build override is needed. Both services install the frozen pnpm workspace and build their dependencies. API uses the native NestJS preset with its existing Fastify adapter.

API's production command builds only its workspace dependencies (`@platform/api^...`). Vercel bundles `src/main.ts` with the service's TypeScript configuration, preserving Nest decorator metadata. `outputDirectory: "."` keeps the native source bundle in use even if local development left a `dist` directory behind. This avoids adopting a relocated raw `dist/main.js` whose workspace dependency paths would not resolve in the function artifact. Local API development still builds and runs the ordinary compiled entrypoint. The native API function artifact has been reconstructed and its health endpoint verified independently of the repository's node_modules.

Public routing preserves the original path: `/v1` and `/v1/*` go to API; the final catch-all goes to Web. Browser API calls remain `/v1/*`. Root `/openapi-json` is not exposed by these rewrites. `web` calls `api` through its `API_INTERNAL_URL` binding for anonymous server reads. Vercel generates this variable at function runtime; do not add it to project environment, `.env` files, build commands or middleware. Binding access does not bypass API authorization.

## Environment and database

Configure `DATABASE_URL` with the established PostgreSQL 18 **app role**, including provider-required TLS settings. Use the separate migrator credential outside persistent services to apply ordered migrations with `pnpm db:migrate` before deploying. Never put the migrator/superuser or worker database credential into Web/API runtime configuration. Follow existing role/bootstrap and backup requirements from `learning-deployment.md` and ADR-0012. This profile does not provision PostgreSQL.

Set `WEB_APP_ORIGIN` to the exact canonical HTTPS project/domain origin. Do not include a path or trailing slash. Configure each environment's intended origin explicitly; arbitrary preview hostnames do not automatically receive authenticated write permission. Public page reads need no browser session. Production cookie verification requires HTTPS.

The Web service build/dev commands set the public API mode to `/`, so no public internal hostname is compiled into browser JavaScript. Runtime server reads consume only the binding. The older Docker/standalone profile still compiles an absolute `NEXT_PUBLIC_API_ORIGIN` and uses that origin for server reads when no binding exists. Turbo hashes all three existing public Web build variables.

Keep `PAYMENT_PROVIDER=unavailable` for the free-learning launch. Paddle activation and webhook settlement still require the existing separate credentials and payment worker acceptance. The grader gateway, one-shot runner and continuous workers are omitted; no production learner-code activation is implied.

## Local and deployed checks

From the repository root, with the existing local database schema and app-role `DATABASE_URL` available, run:

```bash
pnpm install --frozen-lockfile
WEB_APP_ORIGIN=http://localhost:3000 vercel dev -L
```

For linked development use `vercel dev`, which also loads the project's Development environment. Both commands start both services and inject the binding. Do not use `pnpm dev` to test Services routing. Stop/restart local API after editing it: its Services dev command builds the production API and starts that entrypoint. Web retains Next.js hot reload.

Check `/v1/health`, `/login`, `/courses` (database-backed server read through binding), and `/v1/unknown` (API 404 with no Web fallback). Test browser registration/login only with HTTPS when verifying the unchanged Secure cookie. The canonical browser suite and PostgreSQL boundary tests still cover the domain/session flow.

After topology confirmation and repository CI/local gates, deploy a reviewed commit to the confirmed project and origin, then run `node scripts/smoke-production.mjs https://your-project-domain`. Complete the canonical author/learner acceptance in `learning-deployment.md` before calling the launch complete. No deployment, database provisioning or deployed acceptance is performed merely by adding this configuration.
