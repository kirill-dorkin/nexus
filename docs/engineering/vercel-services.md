# Vercel Services deployment

The proposed root `vercel.json` deploys `apps/web` as `web` and `apps/api` as `api`. Set the Vercel project Root Directory to the repository root. Build/runtime commands belong to each service; no project-level build override is needed. Both services install the frozen pnpm workspace and build their dependencies. API uses the native NestJS preset with its existing Fastify adapter.

API's production command builds only its workspace dependencies (`@platform/api^...`). Vercel bundles `src/main.ts` with the service's TypeScript configuration, preserving Nest decorator metadata. `outputDirectory: "."` keeps the native source bundle in use even if local development left a `dist` directory behind. This avoids adopting a relocated raw `dist/main.js` whose workspace dependency paths would not resolve in the function artifact. Local API development still builds and runs the ordinary compiled entrypoint. The native API function artifact has been reconstructed and its health endpoint verified independently of the repository's node_modules.

Public routing preserves the original path: `/v1` and `/v1/*` go to API; the final catch-all goes to Web. Browser API calls remain `/v1/*`. Root `/openapi-json` is not exposed by these rewrites. `web` calls `api` through its `API_INTERNAL_URL` binding for anonymous server reads. Vercel generates this variable at function runtime; do not add it to project environment, `.env` files, build commands or middleware. Binding access does not bypass API authorization.

## Environment and database

Configure `DATABASE_URL` with the established PostgreSQL 18 **app role**, including provider-required TLS settings. Use the separate migrator credential outside persistent services to apply ordered migrations with `pnpm db:migrate` before deploying. Never put the migrator/superuser or worker database credential into Web/API runtime configuration. Follow existing role/bootstrap and backup requirements from `learning-deployment.md` and ADR-0012.

For a new Neon project provisioned in Vercel Marketplace, connect its generated variables with the `NEON` prefix to Production only. Generated owner credentials are bootstrap inputs, not application credentials. If connected as Secret, they cannot be retrieved through the Vercel environment API. Run `pnpm db:bootstrap:neon` on the maintainer's trusted terminal; it verifies the exact Nexus Vercel project before asking for the direct `DATABASE_URL_UNPOOLED` through hidden input. It creates the dedicated `platform` database and restricted app/migrator/worker roles via SQL, applies the existing checksummed migrations, verifies the pooled app connection, and saves only app-role `DATABASE_URL` as a Production Secret. The pinned CLI may first require `pnpm dlx --allow-build=esbuild vercel@62.7.0 login`. The isolated `dlx` installation explicitly permits only the already-approved `esbuild` lifecycle script; repository dependency-script policy remains strict. CI verifies this CLI installation independently of Vercel authentication. No deployment starts from this command.

The command saves a private, gitignored checkpoint in `.tmp/neon-bootstrap/credentials.json` before database changes. Store it in the maintainer's password manager for migration/worker credential recovery. It never persists the Neon owner credential or prints URLs/passwords. It refuses to adopt existing bootstrap resources without its checkpoint, change existing credentials, resume against a different endpoint, or continue with unsafe role privileges/membership. Keep the checkpoint until provisioning is complete; resumption requires the original role credentials. At the final CLI prompt, confirm disconnection of the Marketplace owner-variable connection. This removes the generated `NEON_*` variables and deployment actions from Nexus, retaining the Neon resource and the separate app-role `DATABASE_URL`. The command verifies disconnection before reporting success. Use a separate database branch and credentials for Preview. The project function region should match the Neon resource region.

Set `WEB_APP_ORIGIN` to the exact canonical HTTPS project/domain origin. Do not include a path or trailing slash. Configure each environment's intended origin explicitly; arbitrary preview hostnames do not automatically receive authenticated write permission. Public page reads need no browser session. Production cookie verification requires HTTPS.

External Google/GitHub login is optional. Set `OAUTH_CALLBACK_ORIGIN` to the same canonical shared-edge origin, then register the exact callback paths `/v1/auth/oauth/google/callback` and `/v1/auth/oauth/github/callback` with the providers. Configure only complete `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` and `GITHUB_OAUTH_CLIENT_ID`/`GITHUB_OAUTH_CLIENT_SECRET` pairs. An absent or incomplete pair hides that provider and leaves password login working. Use dedicated credentials and a stable alias for Preview; never add Production provider secrets to an arbitrary Preview URL. Provider access tokens are transient and are not stored.

The Web service build/dev commands set the public API mode to `/`, so no public internal hostname is compiled into browser JavaScript. Runtime server reads consume only the binding. The older Docker/standalone profile still compiles an absolute `NEXT_PUBLIC_API_ORIGIN` and uses that origin for server reads when no binding exists. Turbo hashes all three existing public Web build variables.

Set `RATE_LIMIT_KEY` (Production, Secret) to a long random value, for example the output of `openssl rand -base64 48`, after migration `000048` is applied; without it login and registration are not rate limited (ADR-0070). Rotating it resets the counters.

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
