# ADR-0051: Checkout return and purchaser Purchase reconciliation

- Status: Accepted
- Date: 2026-10-03

## Context

F9.7 redirects an authenticated purchaser from the public Product page to the trusted Paddle transaction checkout URL, but intentionally does not define return semantics. Paddle transaction payment links are composed from an approved payment-link page plus the provider transaction id in `_ptxn`; the approved page must initialize Paddle.js. Paddle Checkout can then redirect to a configured success URL.

Neither the payment-link URL, `_ptxn`, `checkout.completed` browser event, nor the fact that the browser reached a success page is canonical evidence that Nexus has settled a Purchase. ADR-0048 remains authoritative: only signed durable `transaction.completed` webhook processing may atomically transition the canonical Purchase from `pending` to `paid` and grant the purchase-backed Entitlement.

The browser also needs a safe way to observe its own canonical Purchase after returning without receiving tenant UUIDs, purchaser ids, provider ids, or Integrations-owned state.

## Decision

### Paddle payment links terminate on a Nexus-owned approved page

The Integrations Paddle adapter passes an explicit `transaction.checkout.url` base under the configured exact `WEB_APP_ORIGIN`:

```text
/checkout/paddle/:purchaseId
```

Paddle appends `_ptxn=<transaction-id>` to the returned payment link. The adapter validates that the returned URL retains the expected Nexus origin/path and that `_ptxn` equals the returned Paddle transaction id before persisting or returning the mapping.

The Web payment-link page loads Paddle.js with a public client-side token, selects sandbox or production explicitly, and opens the exact `_ptxn` transaction. Provider identity is used only to operate Paddle Checkout; it is never submitted to Commerce as purchase authority.

### Checkout success returns to a Purchase-locator route, not a paid route

Paddle.js receives a success URL of:

```text
/purchases/:purchaseId
```

That navigation means only "checkout UX completed." The page must render `pending` as a normal reconciliation state and may poll the Nexus API for a bounded period. It must never grant access or display canonical payment success based solely on the redirect or Paddle.js browser events.

### Commerce exposes a purchaser-owned read

The authenticated API read is:

```text
GET /v1/me/purchases/:purchaseId
```

`purchaseId` is a locator, not authority. Commerce first resolves tenant context through a narrow schema-owned `SECURITY DEFINER` function that returns an Organization id only when transaction-local `app.user_id` is the exact canonical purchaser of that Purchase and the User remains active.

The capability is revoked from `PUBLIC`, executable only by `platform_app`, and returns no Product, Price, Offering, Membership, role, Entitlement, or provider identity.

After resolution, Commerce opens an ordinary read-only tenant transaction, rechecks the active User and canonical purchaser relation, and returns only the existing `PublicPurchase` projection. The read does not require current Organization Membership because a canonical Purchase is historical purchaser-owned commerce state; Membership remains required for creating a new Purchase.

### Provider state remains outside the reconciliation contract

The purchaser read does not expose Paddle transaction ids, checkout URLs, webhook inbox/processing state, provider customer identity, tax state, or provider totals. Web reconciliation observes only canonical Commerce state.

No new canonical table, status, outbox event, Entitlement transition, or Enrollment behavior is introduced.

## Security consequences

- Cross-tenant lookup is capability-minimal and purchaser-bound rather than a general Purchase-to-tenant resolver.
- Foreign users receive the same not-found outcome as unknown Purchase ids.
- Browser return parameters cannot mark a Purchase paid.
- Paddle-returned checkout URLs are constrained to the configured Nexus web origin and expected Purchase path before use.
- Session tokens remain HttpOnly and browser requests continue using credentialed direct REST.

## Compatibility

The change is additive. Existing public checkout and tenant-UUID checkout contracts remain intact. Existing pending/paid Purchase lifecycle and webhook settlement remain unchanged. Migration `000039` adds only a narrow read capability and does not rewrite existing Commerce state.

## Deferred

- Purchase history/list pagination beyond the exact Purchase return flow;
- refunds, adjustments, disputes, and Entitlement reversal;
- subscriptions and provider customer synchronization;
- discounts/coupons;
- distributed auth abuse protection;
- broader marketing/SEO;
- production observability, load, accessibility, and security launch verification.
