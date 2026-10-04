# F9.10 browser launch verification

This document defines the repository-level browser release gate for the first public paid path. It verifies first-party browser behavior established by ADR-0050, ADR-0051, and ADR-0052; it does not create new Commerce, Organization, Integrations, Entitlement, or Enrollment authority.

## Scope

The verified first-party path is:

```text
public Product page
  -> registration/authenticated session
  -> explicit customer entry presentation
  -> browser checkout attempt
  -> Nexus-owned Paddle payment-link page
  -> purchaser reconciliation pending -> paid / error presentation
```

The browser gate complements the existing API/database integration suites. It deliberately does not reproduce canonical checkout, webhook settlement, RLS, or entitlement business logic in JavaScript fixtures.

## Ownership and consistency boundary

- `apps/web` owns the rendered interaction and accessibility behavior under test.
- Authentication remains owned by the real API and database during the browser run.
- Commerce and Integrations business correctness remains owned by the existing integration suites and PostgreSQL state.
- The browser harness uses a deterministic test-only HTTP seam for catalog, customer-entry, checkout response, and purchaser-reconciliation projections so the browser can exercise Web behavior without manufacturing real Purchases or calling Paddle.
- No external provider call occurs and no database migration, canonical row, outbox event, payment mapping, Entitlement, or Enrollment is created by the browser seam.

## Browser topology

The harness runs a production Next.js build and the production API behind local self-signed HTTPS origins:

```text
https://127.0.0.1:3443  -> Web
https://127.0.0.1:4443  -> API/browser verification proxy
https://127.0.0.1:3444  -> mismatched Web origin
```

Authentication routes and `/v1/me` go to the real API. Launch UX read/write projections used only to drive browser state go to the deterministic fixture server. The exact allowed browser Origin therefore still crosses the real API CORS/session boundary.

The test starts a fresh headless Chrome/Chromium profile and drives it through the Chrome DevTools Protocol using Node's built-in WebSocket support. No browser-testing npm dependency or lifecycle script is added.

## Assertions

The gate verifies in an actual browser that:

- Product/authentication controls have accessible names and form controls remain labelled;
- keyboard traversal reaches the Price radio and reconciliation refresh control;
- those controls have a visible `:focus-visible` treatment;
- duplicate ids and unlabelled native form controls are rejected by the focused DOM audit;
- Chrome's accessibility tree contains no unnamed first-party interactive controls in the covered states;
- registration establishes a browser-retained `Secure`, `HttpOnly`, `SameSite=Strict` session cookie and browser JavaScript cannot read that cookie;
- the exact configured Web origin can perform credentialed `/v1/me`, while a mismatched Web origin cannot read the credentialed API response;
- browser storage contains no token/session/bearer key; only the attempt-scoped checkout UUID is stored for the selected Price;
- the browser submits the same attempt UUID at the checkout seam;
- the Nexus-owned Paddle page renders its loading/open state and supplies `/purchases/:purchaseId` as the success locator;
- purchaser reconciliation renders pending, paid, and safe not-found/error states from canonical-shaped Purchase projections.

The accessibility-tree/DOM assertions are a focused automated launch gate, not a claim of complete WCAG conformance. Manual/product accessibility review remains appropriate for visual, cognitive, zoom/reflow, and assistive-technology behavior that this harness does not model.

## Paddle boundary

The repository does not own the accessibility internals of Paddle's third-party overlay. During browser verification the Paddle CDN request is intercepted locally with a minimal deterministic stub that records only the first-party `successUrl` handoff.

The gate therefore asserts the Nexus-owned loading/error/status page and the provider handoff contract, but makes no claim that the third-party overlay itself passed Nexus accessibility analysis. No live Paddle token, server credential, transaction, webhook, or network access is required.

## Security consequences

This slice does not broaden application authority:

- browser Origin remains exact and credentialed, never wildcard;
- the opaque API session remains HttpOnly and is not copied into Web storage;
- Product/Price/money/purchaser/provider authority is unchanged and remains server-owned;
- the test fixture cannot mark a canonical Purchase paid or grant Entitlement;
- provider return navigation remains presentation only and is never payment evidence;
- canonical settlement remains signed webhook -> durable inbox -> asynchronous lease-fenced worker processing.

The local self-signed certificate and `NODE_TLS_REJECT_UNAUTHORIZED=0` are confined to the spawned test Web process so server-side fixture fetches can reach the local HTTPS proxy. They are not runtime/deployment configuration.

## CI contract

The existing CI job builds Web with test-public values for:

- `NEXT_PUBLIC_API_ORIGIN`;
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`;
- `NEXT_PUBLIC_PADDLE_ENVIRONMENT`.

These values are non-secret browser-test inputs. After the normal build, `pnpm test:browser-launch` starts the bounded local harness and uses the Chrome/Chromium already present on the CI runner. A missing browser fails closed with an explicit `CHROME_BIN` diagnostic rather than silently skipping verification.

No lockfile change or migration is required.

## Deliberately deferred

- live Paddle checkout or third-party overlay accessibility claims;
- synthetic production probes / external uptime monitoring;
- sustained load/performance verification against the F9.9 launch budgets;
- full WCAG certification or broad assistive-technology matrix;
- refunds/reversals, subscriptions, discounts/coupons, provider-customer synchronization;
- broader purchase history/recovery and marketing/SEO;
- F7 production grader activation.
