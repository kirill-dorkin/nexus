# Free learning deployment

For the proposed Web/API Vercel Services alternative, see `vercel-services.md` and ADR-0058. Its topology awaits maintainer confirmation and it still needs an external PostgreSQL 18 target and configured HTTPS origin. The instructions below remain the standalone Docker profile.

This profile runs the existing modular monolith: PostgreSQL 18 with the established migrator/app/worker roles, production Next.js, production API and a Caddy HTTPS edge. Web and API share one HTTPS origin; `/v1/*` goes directly to API at the edge. No Next.js session proxy/BFF or cookie policy change is introduced. API CORS explicitly permits existing POST/PUT/PATCH commands only for the exact configured Web origin; endpoint authorization and write-Origin guards remain decisive. The compiled API origin must equal `WEB_APP_ORIGIN`. A provider's DNS hostname is sufficient; a custom domain is optional.

The free quiz lifecycle completes synchronously through canonical Attempt/Submission, ValidationResult, Evidence and Mastery. It needs no grader, Redis, object storage, GitHub integration or payment provider. Canonical outbox records remain committed; this profile introduces no invented generic event consumer. `PAYMENT_PROVIDER=unavailable` explicitly leaves paid checkout inactive. The optional `commerce` profile runs the existing payment webhook worker; activating Paddle additionally needs its existing API/provider credentials and acceptance gates. `worker start` is the grader dispatcher and is deliberately unavailable in this entrypoint. Production learner-code execution remains disabled.

## Infrastructure audit

Checked the connected Vercel team `bhvgfs-projects`: no Nexus project; its installed integration is Upstash, with no PostgreSQL integration. The repository had local PostgreSQL/Redis Compose and independently gated grader manifests, but no Web/API production container, deployment target or production database provisioning. No production credentials were read or printed. A frontend-only URL would not satisfy this launch.

The deployable alternative is one Linux Docker host with a reachable provider DNS hostname and ports 80/443. PostgreSQL is private to the Compose network and persisted in `postgres_data`. Generated role secrets preserve the existing role separation without development passwords or broad RLS privileges. Host access is currently unavailable through the connected tools. **External blocker: access to the production Docker host (including its provider DNS hostname).** Once that single environment is available, this profile provisions the database and processes there. No public deployment or deployed learner smoke has yet been claimed.

## First deployment

Use a reviewed exact `main` commit whose full CI and maintainer browser gate passed. On the production host, check out that commit. The examples below use variables for the target; never commit secrets or put them in CLI arguments. A secret manager may populate the same mounted files instead of the local bootstrap. The generated directory is mode 0700 and is excluded from Git and Docker build contexts; mounted files are readable by the unprivileged container users. Protect host access and backups accordingly.

```bash
export PUBLIC_HOST=your-provider-hostname
export PUBLIC_ORIGIN="https://${PUBLIC_HOST}"
node infra/production/create-secrets.mjs
# Build one image for Web/API/migration; the public origin is not a credential.
docker build -f infra/production/Dockerfile --build-arg PUBLIC_ORIGIN="$PUBLIC_ORIGIN" -t platform-launch:release .
export PLATFORM_IMAGE="$(docker image inspect platform-launch:release --format '{{.Id}}')"
docker compose -f infra/production/compose.yml config --quiet
docker compose -f infra/production/compose.yml up -d postgres
# This one-shot process alone receives the migrator URL.
docker compose -f infra/production/compose.yml --profile migration run --rm migrate
docker compose -f infra/production/compose.yml --profile migration run --rm migrate
docker compose -f infra/production/compose.yml up -d web api proxy
node scripts/smoke-production.mjs "$PUBLIC_ORIGIN"
```

Do not run secret generation again on an existing deployment. PostgreSQL bootstrap runs only with a fresh volume; replacing files does not rotate existing database passwords. Secrets and PostgreSQL/Caddy volumes must survive release replacement. Before upgrading, record the current image digest, backup PostgreSQL using approved infrastructure tooling, verify recovery, and apply ordered migrations once before replacing app processes. Never delete volumes as a release/rollback action. Code rollback is valid only while the applied migrations remain backward compatible; restore the prior tested image and matching origin. Keep migration credentials out of persistent Web/API containers.

## First real learner acceptance

After HTTPS smoke, register the author through `/studio`, explicitly create an Organization, author/import the small example manifest, preview, save and publish. Publication does not open public access. As the authorized owner, create a `self_paced` / `membership` Offering pinned to that published version through the existing `POST /v1/organizations/:id/offerings`, explicitly `PATCH .../:offeringId/visibility` with `{ "visibility": "public" }`, and `PUT /v1/organizations/:id/customer-entry-policy` with `{ "policy": "open" }`. These are existing authenticated canonical APIs; there is no direct production SQL content seeding. Offering configuration is presently API-level, not a Studio control.

In a separate browser profile, open `/learn/:organizationSlug/:offeringSlug/:lessonSlug` anonymously. Check video/Markdown, register and return to that exact Lesson, explicitly join, then separately enroll. Submit wrong and correct quizzes; verify saved progress on `/me/learning`, continue to the next required Lesson, reload, logout and login. Verify another principal has no enrollment/progress. All task passes must leave Enrollment active. Inspect the API host-only Secure/HttpOnly/SameSite=Strict cookie and confirm answers/author explanations never appear in public responses. Record exact commit/image, HTTPS origin, migration result, smoke and acceptance result before calling the launch complete.

CI also builds the delivery image and starts its actual migration, API and Web entrypoints against a separate PostgreSQL container with generated role credentials, checks migration idempotency and public database reads, then removes only those disposable CI volumes. Caddy certificate issuance still requires the real public hostname.

The repository's `pnpm test:browser-launch` automates this canonical author/learner loop against isolated PostgreSQL and local HTTPS. Its older deterministic Commerce/ambiguous-network UX fixtures remain separate and are not deployed business state. The read-only production smoke proves public Web/API/DB reachability, not authenticated writes or completion of the deployed acceptance flow.
