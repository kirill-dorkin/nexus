# ADR-0058: Vercel Services transport

- Status: Accepted (maintainer authorized this deployment topology on 2026-10-07)
- Date: 2026-10-07

## Context

The private repository now belongs to `kirill-dorkin/nexus`. Vercel Services can build the existing Web and NestJS/Fastify API together on one domain. The inferred starter omitted API and treated the batch grader runner as an HTTP service. The runner consumes one trusted job and exits; the gateway dispatches Kubernetes/gVisor Jobs and is called by the separately gated grader worker. Neither is required for free learning.

## Decision

Deploy two services, `web` and `api`. Public rewrites preserve `/v1` and `/v1/*` for API and send the remaining paths to Web. API's root OpenAPI document is not publicly routed. This includes existing API webhook ingress; it does not activate Commerce or its worker.

The Web build explicitly compiles `NEXT_PUBLIC_API_ORIGIN=/`. Browser requests therefore use same-origin `/v1/*` with the existing credentials policy. Authentication remains direct REST at the edge; no Next.js BFF, session forwarding or new identity authority is introduced. API still requires exact `WEB_APP_ORIGIN` and retains its host-only Secure/HttpOnly/SameSite=Strict cookie, endpoint authorization and tenant/actor RLS.

Web declares a caller-side `web -> api` URL binding named `API_INTERNAL_URL`. A server-only adapter reads it at request time for anonymous public Learning and Product queries. No binding is read during builds or in middleware, manually assigned in deployment configuration, exposed to browser bundles, or treated as authentication. Dynamic pages avoid public data fetches at build time. Malformed bindings fail closed. Standalone deployments retain the explicit absolute `NEXT_PUBLIC_API_ORIGIN` fallback; same-origin server reads require the binding.

Service build commands build workspace dependencies through Turbo. Public build variables participate in the build cache key. The API respects platform `PORT`, with `API_PORT` and 4000 retained for standalone use. No schema, migration, canonical state, outbox or module ownership changes occur.

PostgreSQL 18 remains external, with established app/migrator/worker roles. Migrations run separately before release. Grader gateway/runner and continuous grader/payment workers stay outside this Services deployment. Production learner-code execution stays independently gated.

## Verification and consequences

Transport tests cover browser credentials/path, internal binding selection, binding prefix preservation, standalone compatibility and fail-closed configuration. Vercel local development must start both services and inject the binding; public `/v1/health`, Web pages and an API 404 must route correctly. A real PostgreSQL-backed deployed learner acceptance remains necessary before claiming launch completion.

The maintainer authorized implementation and deployment of this topology. Vercel project environment still needs an app-role database URL and exact HTTPS Web origin; preview authorization origins are not automatically inferred. An explicit one-time Neon bootstrap command implements the existing role policy and migrations from a trusted maintainer terminal. It is not part of service builds or runtime, and does not itself deploy or prove deployed learner acceptance.
