# ADR-0050: Public checkout web flow

- Status: Accepted
- Date: 2026-10-03

## Context

F9.3 exposes a public sellable catalog, F9.4 defines explicit customer Organization entry, F9.5 activates Paddle as the one-time payment provider, and F9.6 adds a browser-safe public checkout command that returns a hosted provider checkout URL.

The remaining gap is a working browser vertical. `apps/web` is still only a Foundation shell, while the API already owns registration/login sessions, public catalog reads, explicit customer entry, canonical Purchase creation, and provider checkout orchestration.

The web flow must not weaken the existing invariants:

`User != Membership != Purchase != Entitlement != Enrollment`

`Product != Price != Purchase != Entitlement`

`public catalog presentation != checkout authority`

The API session is an opaque host-only `Secure`, `HttpOnly`, `SameSite=Strict` cookie. Browser JavaScript must not receive or persist that token.

## Decision

### Browser transport remains direct REST, not a new BFF

The web application calls the existing API directly over HTTP(S). The API allows credentialed cross-origin browser requests only from the exact configured `WEB_APP_ORIGIN`.

The CORS boundary:

- allows exactly the configured canonical web origin;
- allows credentials so the existing HttpOnly session cookie can be sent;
- does not use wildcard origins;
- does not replace endpoint authorization or the exact-Origin write guard;
- fails closed when the configured web origin is missing or malformed rather than broadening browser access.

The web application receives the API origin through explicit public runtime/build configuration. It does not infer tenant authority from the browser host and does not proxy sessions through a new Next.js BFF layer.

### Session authority stays in the API cookie

Registration and login continue to use the existing API endpoints and session cookie. Web code uses `credentials: include` for authenticated API calls and never stores a bearer token, session token, Organization UUID, or purchaser User ID.

The browser may call `/me` only to render authenticated presentation state. The API remains the source of authentication authority.

### Public Product page consumes only public projections

The first commerce web route is addressed only by public route identity:

```text
organizationSlug + productSlug
```

It renders the existing public catalog Product projection and exact active Price options. No tenant UUID, Product UUID, Offering UUID, purchaser ID, role, provider identity, or canonical internal Purchase fields are introduced into the page contract.

F9.4 already decided that the public Organization projection exposes `customerEntryPolicy` as a presentation hint. The implementation is completed here so the page can distinguish `open` from `closed` customer entry without treating that hint as authorization.

The hint may be stale. Every write still revalidates canonical state server-side.

### Customer entry remains an explicit user action

The checkout UI never creates Membership as a hidden side effect of checkout.

For an unauthenticated visitor, the page presents registration/login before any customer-entry or checkout write.

When `customerEntryPolicy = open`, the page may present an explicit “join/continue” action that invokes the existing slug-scoped self-entry command. Existing active Membership remains an idempotent success; invited, suspended, or left lifecycle states remain blocked.

When `customerEntryPolicy = closed`, the page does not offer self-entry. An already-active member may still use checkout because checkout authority is based on current Membership, not on the current self-entry policy.

### Checkout reuses F9.6 authority unchanged

After authentication and, when applicable, explicit customer entry, the browser submits only:

```text
organizationSlug + productSlug + exact priceId + idempotencyKey
```

The API continues to derive the purchaser from the session and revalidate Organization, Membership, Product, Price, Offering, Entitlement, and Purchase idempotency inside the existing checkout authority boundary.

The web page never submits amount or currency as checkout authority. Amount/currency shown to the user come only from the public catalog projection.

### One browser checkout attempt owns one idempotency key

The browser creates one UUID idempotency key when a checkout attempt starts and reuses that key for retries of the same selected Price after ambiguous network or transport failures.

A new key is created only when the user intentionally starts a new checkout attempt or changes the selected Price. This preserves the canonical `(organization, purchaser, idempotencyKey)` semantics from Commerce.

### Hosted provider redirect completes this slice

A successful public checkout returns the trusted hosted `checkoutUrl`. The browser navigates to that URL.

This slice does not add provider-specific data to Commerce or Web contracts and does not invent success/cancel return semantics that the current payment gateway does not support.

Success/cancel return UX, purchase-history/reconciliation UI, and post-payment polling are separate follow-up slices.

## Security consequences

- Browser JavaScript never handles the opaque session token.
- CORS is exact-origin and credentialed; wildcard credentialed access is not allowed.
- Exact-Origin write guards remain in force for customer-entry and public checkout commands.
- Public `customerEntryPolicy` is presentation only and cannot authorize Membership creation.
- The checkout request cannot override canonical money, tenant, product, offering, purchaser, or provider identity.
- External Paddle effects remain outside canonical database transactions.

## Compatibility

The public catalog Organization projection gains `customerEntryPolicy`, fulfilling ADR-0047. Existing callers that parse the repository contract receive the new required field together with the corresponding API deployment and migration.

The database change is additive: a new narrow public read capability exposes only the current customer-entry policy for an active Organization slug. Existing public catalog SQL capabilities remain intact for compatibility.

## Deferred

- success/cancel return pages and provider return-target configuration;
- purchase-history and payment reconciliation UI;
- post-payment entitlement status presentation;
- refunds, adjustments, disputes, and entitlement reversal;
- subscriptions;
- discounts/coupons;
- provider customer synchronization;
- distributed registration/login abuse protection;
- broader marketing/catalog navigation and SEO;
- full accessibility/load/security launch verification.
