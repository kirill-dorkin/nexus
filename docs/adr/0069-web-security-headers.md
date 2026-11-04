# ADR-0069: Web security headers

- Status: Accepted
- Date: 2026-11-04

## Context

Web pages were served with only the HSTS header Vercel adds. Nothing stopped another site from framing Nexus (clickjacking on sign-in or Studio), a page from loading scripts from any origin after an injection, or a page from sending data to any origin. `docs/security/baseline.md` expects defense in depth on the browser side as well.

Three things constrain a Content Security Policy here:

- Next.js App Router streams its data in inline `<script>` tags. A strict `script-src` needs a per-request nonce, which forces every page to render dynamically.
- Lesson practice runs the learner's HTML and JavaScript in `srcdoc` frames (ADR-0064). A `srcdoc` document inherits the policy of the page, and its scripts are inline learner code that cannot carry a nonce.
- The SQL practice runs PostgreSQL compiled to WebAssembly in a Web Worker (ADR-0065).

## Decision

`apps/web/next.config.ts` builds and sends the headers on every page. They are built inside the config on purpose: the production container runs `next start apps/web` from the repository root, and Next resolves relative imports of the config from the working directory, so an imported module is not found there.

- `Content-Security-Policy`:
  - `default-src 'self'`, `manifest-src 'self'`;
  - `connect-src 'self'`, plus `NEXT_PUBLIC_API_ORIGIN` when it is an absolute origin (ADR-0058 allows the API on its own origin; production uses one origin);
  - `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`: no external script origin; inline scripts stay allowed for the reasons above; WebAssembly compiles; `eval` stays forbidden;
  - `style-src 'self' 'unsafe-inline'`, `font-src 'self' data:`;
  - `img-src` and `media-src`: `'self' data: blob: https:` (learners' practice pages may show any image);
  - `frame-src 'self' https://www.youtube-nocookie.com`, `worker-src 'self' blob:`;
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
- The Paddle checkout pages (`/checkout/paddle/*`) receive the same policy plus Paddle's script, style, connect and frame origins. Other pages never allow Paddle.
- `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` denying camera, microphone, geolocation and USB (payment only for the site itself).

zod 4 probes `new Function` before its first parse. The probe is caught, but the browser still reports a violation. The browser therefore runs zod in its `jitless` mode (`parseWithoutEvalInBrowser()` in `@platform/contracts`, called by the Web browser API module). Servers keep the fast path.

## Consequences

- Clickjacking, plugin content, foreign form targets, `<base>` hijacking and exfiltration through `fetch` to other origins are blocked. Script injection is limited to inline code on our own origin.
- `tests/e2e/specs/security-headers.spec.ts` checks the headers and fails on any policy violation on the key pages, including the HTML, JavaScript and SQL practice. A new external origin needs a change here and a reason in review.
- Inline scripts remain the weak point. Moving the application pages to nonces is possible later if the practice frames get their own origin (a separate sandbox domain) or stop inheriting the page policy; this ADR does not do that.
- The policy is not report-only: e2e runs it on every page before merge. No violation report endpoint is added.

## Alternatives

- **Nonce-based `script-src`.** Rejected for now: it breaks the practice frames and makes static pages dynamic.
- **Report-only first.** Not needed: the e2e suite exercises every page type under the enforced policy before merge.
- **`'unsafe-eval'` for zod.** Rejected: zod has a supported mode without `eval`.
