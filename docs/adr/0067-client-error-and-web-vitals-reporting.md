# ADR-0067: Client error and Web Vitals reporting

- Status: Accepted
- Date: 2026-11-04

## Context

The API and the payment worker report launch-critical behaviour through low-cardinality operational log events (ADR-0052). The browser reported nothing: a JavaScript error on a lesson page, a render failure caught by the error boundary, or slow pages for real visitors were invisible unless a learner wrote in. `@platform/observability` was an empty placeholder.

## Decision

The Web app reports two kinds of client events, and the API writes them to the process log under the same rules as ADR-0052.

### Events

`web.client_error` — `release, kind, errorName, source, route`:

- `kind`: `error` (uncaught), `unhandled_rejection`, or `render` (caught by `app/error.tsx`);
- `errorName`: the error's `name` from a closed list of standard and browser names, else `other`; a thrown non-Error is `non_error`;
- `source`: `app`, or `external` when the throwing script came from another origin (a browser extension, an embedded player).

`web.vital` — `release, name, rating, value, route` for CLS, FCP, INP, LCP and TTFB from Next's `useReportWebVitals`, with the library's `good / needs-improvement / poor` rating.

`route` is the route template (`/courses/[course]/[lesson]`), from a closed list (`webRouteSchema`), else `other`. `release` is the deployed commit (12 characters) or `local`.

### What is never sent

No error message or stack, no URL, path, query, slug or identifier, no user, session or cookie, no user agent or IP-derived data. These are excluded by the contract itself: `webTelemetryBatchSchema` is strict, so a batch with any other field is rejected with 400. This follows ADR-0052: messages may carry personal or secret data, and global telemetry must not become a searchable record of people. Counting errors by name, route and release is enough to see a regression after a deploy; finding the cause uses reproduction, tests and the release diff.

### Transport

The client batches events (at most 20 per request, sent after 5 seconds, when full, or when the page is hidden) with `fetch(…, { keepalive: true, credentials: "omit" })` to `POST /v1/telemetry/web`. The same error is sent once per page, and a page sends at most 20 error events, so a crash loop cannot flood the API. Sending is best effort and never throws.

The API accepts a batch only when its `Origin` equals `WEB_APP_ORIGIN` (503 when that is not configured), validates it with the contract, answers 204, and logs one line per event: errors at warn level, vitals at log level. Nothing is stored; no table, outbox event or migration is added. Like ADR-0052, a later collector can turn these log lines into metrics without changing the contract.

### Bundle cost

The client imports contract types and one plain list of error names (`web-telemetry-names.ts`, no zod), so reporting adds no validation library to pages; the performance budgets (web quality phase 6) enforce it.

## Consequences

- Client regressions after a deploy show up as `web.client_error` counts per release and route; slow pages as `web.vital` ratings per route.
- The endpoint is unauthenticated. The Origin check stops other sites' pages from posting; a non-browser client can still send well-formed batches, which only adds bounded log lines. Rate limiting belongs to the edge if that ever matters.
- No error text means some errors need reproduction to diagnose. That is a deliberate privacy trade-off; changing it requires a new decision about redaction and retention.

## Alternatives considered

- A hosted error tracker (Sentry and similar) — rejected for now: it sends messages, stacks and URLs to a third party, which ADR-0052's rules exclude, and adds a vendor script to every page.
- Logging only on the server — cannot see errors that happen after the page is delivered.
