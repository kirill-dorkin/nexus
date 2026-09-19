# ADR 0045 — Purchase, Stripe Checkout, and paid Entitlement settlement

## Status

Accepted

## Context

F9.1 established provider-independent Commerce Product and immutable Price. Nexus now has canonical commercial terms but still has no Purchase or paid transaction lifecycle.

ADR-0014 requires:

`Purchase != Entitlement != Enrollment`.

A paid transaction therefore cannot be represented by an Entitlement row, an Enrollment row, or a Stripe object. Nexus needs a canonical Purchase before a real payment-provider boundary can be introduced.

External payment APIs are retried systems. Checkout creation can succeed remotely while the API process fails locally, and webhooks can be duplicated, reordered, or arrive before Nexus has persisted the provider mapping. ADR-0006 already requires durable inbox/idempotency for retried external input.

## Decision

### Purchase is the canonical commercial transaction

Commerce owns `Purchase`.

The first Purchase pins:

- Nexus Product identity;
- exact immutable Price identity;
- Offering target snapshot from Product;
- purchaser Nexus User;
- positive minor-unit amount;
- currency;
- billing type;
- client idempotency identity;
- created time;
- optional paid time.

The first lifecycle is intentionally narrow:

`pending -> paid`.

`paid` is terminal in this slice.

Cancellation, expiry, refund, dispute, reversal, subscription state, tax, and discount state are not added to the first Purchase model.

### Checkout is self-purchase by an existing active member

Opening checkout requires an authenticated active Nexus user with an active membership in the target Organization.

The purchaser is always the authenticated caller in F9.2. The request cannot choose another user.

Public visitor onboarding and Organization self-join are separate public-launch decisions.

### Checkout is server-priced

The checkout command accepts only:

- exact Nexus `priceId`;
- caller-generated UUID `idempotencyKey`.

Amount, currency, Product, Offering, or payment-provider price identifiers are not accepted as trusted caller input.

Commerce resolves the active immutable Price and Product and persists their canonical values into Purchase.

If the purchaser already holds an effective Entitlement for the Offering, a new Purchase is rejected rather than silently charging for access already held.

### Purchase creation is materially idempotent

The tuple:

`(organization, purchaserUser, clientIdempotencyKey)`

is unique.

A retry using the same key and same Price returns the existing Purchase. Reusing the key for another Price is a conflict.

Only the winning Purchase creation emits `purchase.created@1`.

### Provider integration is separate from Commerce

Stripe Checkout is the first production payment-provider adapter.

Stripe is infrastructure, not the domain model:

- Purchase does not store Stripe status;
- Product/Price do not store Stripe Product/Price identifiers;
- provider Checkout Session identity belongs to Integrations;
- provider webhook ingress belongs to Integrations.

A thin Payment Checkout orchestration module composes the public Commerce `PurchaseCommand` and Integrations `PaymentCheckoutGateway`. It owns no canonical state.

This avoids Commerce reaching into Integrations and keeps a future provider replacement behind an application port.

### No external provider call runs inside a PostgreSQL business transaction

The checkout flow is a retry-safe saga:

1. Commerce commits canonical pending Purchase and its outbox event.
2. Integrations asks Stripe to create a hosted Checkout Session outside any PostgreSQL transaction.
3. Stripe creation uses a deterministic provider idempotency key derived from immutable Nexus Purchase identity.
4. Integrations persists the Purchase -> Stripe Checkout Session mapping.
5. A retry recovers either the existing Nexus mapping or the same provider Session.

A local rollback can therefore never pretend that a successful remote API call was rolled back.

### Stripe Checkout is hosted and card-only in the first vertical

F9.2 uses hosted Stripe Checkout in `payment` mode with the first executable payment surface constrained to card.

The adapter sends exact server-owned amount/currency and a display Product name.

Nexus Purchase and Organization ids may be copied to provider metadata for operations/debugging, but provider metadata is never trusted for tenant or Purchase routing.

### Stripe webhook signature is authenticated over raw bytes

The Stripe webhook endpoint retains the raw HTTP request body.

Before parsed payload fields are trusted, the adapter validates the Stripe `Stripe-Signature` HMAC against the configured webhook secret and a bounded timestamp tolerance.

Only these event types enter the first normalized inbox:

- `checkout.session.completed`;
- `checkout.session.async_payment_succeeded`.

Only normalized routing/settlement fields and SHA-256 of the raw body are persisted. The raw provider payload is deliberately not copied into Nexus payment inbox state.

### Webhook delivery identity is durable and replay-safe

Integrations persists a normalized payment webhook inbox keyed by:

`(provider, providerEventId)`.

An exact retry with the same payload hash is idempotent.

Reuse of the same provider event id with different signed bytes is an integrity conflict.

The application role receives no direct read privilege on the payment webhook inbox.

The HTTP ingress ends after verified normalization, deduplication, inbox persistence, and processing-row initialization. It returns without synchronously changing Purchase or Entitlement. Durable settlement is performed by the existing platform worker through lease/retry/dead-letter processing.

### Tenant routing trusts the persisted Checkout mapping only

Webhook tenant/Purchase routing uses the exact signed Stripe Checkout Session id and the Nexus-owned Integrations mapping.

Stripe metadata, customer email, Product text, return URLs, and caller values are not routing authority.

The immutable inbox records receive-time routing as either:

- `mapped`;
- `unmapped_checkout`.

### Checkout mapping race is blocked durably and reactivated by trusted mapping

A valid webhook can arrive after Stripe Session creation but before Nexus commits its provider mapping.

The HTTP endpoint still durably accepts the verified delivery and returns promptly. The immutable receive fact records `unmapped_checkout`.

The worker claims the corresponding processing row and moves it to `blocked` when no trusted Checkout mapping exists. Inserting the exact trusted provider Checkout mapping reactivates blocked processing to `pending`.

The next worker claim resolves the current mapping by exact provider Checkout Session identity. The same immutable receive fact can then settle the Purchase without rewriting its receive-time routing status.

### Only provider-paid state settles Purchase

F9.2 fulfills only when normalized provider `payment_status = paid`.

A completed Checkout that is not yet paid does not mutate Purchase or Entitlement.

Provider settlement must exactly match Purchase amount and currency. A mismatch is a conflict and cannot rewrite canonical commercial terms.

### Paid Purchase and Entitlement grant are one Commerce transaction

For the winning settlement:

1. Purchase changes `pending -> paid`;
2. Commerce grants/reactivates the Offering Entitlement for the purchaser;
3. `purchase.paid@1` is appended;
4. `entitlement.granted@1` is appended.

All four consequences commit atomically inside a lease-fenced worker acknowledgement carrying the exact Organization context. `platform_worker` receives only narrow claim/finish/acknowledge function execution; it does not receive general Purchase/Entitlement table mutation privileges.

A later paid delivery for an already-paid Purchase is materially idempotent and emits no duplicate settlement/grant events. Deterministic outbox idempotency keys defend that contract at PostgreSQL level as well.

Enrollment is never created implicitly.

### Entitlement provenance distinguishes manual and paid access

Entitlement keeps its stable current-right identity but gains explicit current grant provenance:

- `manual` -> human `grantedByUserId`, no source Purchase;
- `purchase` -> `sourcePurchaseId`, no fake human grant actor.

Existing manual Entitlements remain manual.

A purchase-backed grant has no expiration in this first one-time paid-access policy.

Outbox still is integration transport, not a product audit read model.

### Payment fact survives later membership state change

An active membership is required when checkout opens.

After payment has occurred externally, settlement does not fail merely because the purchaser's membership later became suspended or left. Nexus must not deny a real payment fact.

The membership row remains the identity relation required by Purchase/Entitlement referential integrity. Delivery still applies its own active-membership and Entitlement policy before creating a new Enrollment.

## Consequences

The first paid vertical becomes:

```text
authenticated active Organization member
  -> exact active Price + client idempotency key
  -> canonical pending Purchase with server-owned terms
  -> Stripe hosted Checkout Session outside DB transaction
  -> trusted Purchase <-> Checkout mapping
  -> signed durable Stripe webhook inbox
  -> HTTP 202 after durable acceptance
  -> lease/retry worker processing
  -> exact current Checkout mapping route
  -> amount/currency match + payment_status=paid
  -> lease-fenced Purchase paid + purchase-backed Entitlement atomically
  -> no Enrollment
```

The architecture can replace Stripe later without changing Purchase, Entitlement, or Delivery semantics.

## Deferred

Separate F9 decisions remain required for:

- public product/pricing reads;
- unauthenticated visitor -> authenticated customer onboarding;
- public Organization membership/self-join policy;
- web checkout UI and return pages;
- abandoned Purchase/Checkout expiry policy;
- refunds, disputes, reversals, and Entitlement consequences;
- subscriptions/recurring billing;
- taxes and discounts;
- provider customer identity;
- purchase history/read models;
- reconciliation jobs;
- payment operational alerting;
- production observability/SLOs;
- load, accessibility, and security launch verification.
