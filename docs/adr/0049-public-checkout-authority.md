# ADR-0049: Public checkout initiation authority

- Status: Accepted
- Date: 2026-10-02

## Context

F9.3 exposes a safe unauthenticated sellable catalog, F9.4 establishes explicit authenticated customer Organization entry, and F9.5 moves the active one-time payment runtime to Paddle without changing canonical Commerce.

The remaining backend gap before checkout UI is a browser-safe command addressed by public route identity. The existing authenticated checkout endpoint is tenant-UUID addressed and intentionally predates the public customer journey. A previously returned public catalog document cannot authorize a later write because Organization, Product, Price, Offering, Membership, and Entitlement state may have changed.

The invariants remain:

`Product != Price != Purchase != Entitlement != Enrollment`

`User != Membership != Purchase`

`External provider state != canonical Nexus state`

The security baseline also requires CSRF protection for cookie-authenticated writes. The current host-only `Secure`, `HttpOnly`, `SameSite=Strict` session cookie is an important defense but does not by itself establish exact browser-origin authority for same-site sibling origins.

## Decision

### Public checkout is a separate browser-safe command surface

The public checkout command is addressed by:

```text
organizationSlug + productSlug + exact priceId + idempotencyKey
```

The browser never supplies or selects:

- Organization UUID;
- Product UUID;
- Offering UUID;
- amount or currency;
- Membership role;
- purchaser User id;
- payment-provider identity or provider transaction fields.

The purchaser User comes only from the authenticated session.

The existing tenant-UUID checkout endpoint remains an internal authenticated command surface; the public route does not weaken or reinterpret it.

### Slug-to-tenant resolution is a narrow user-scoped capability

Organizations owns a narrow database capability that resolves an active Organization UUID from `organizationSlug` only when the transaction-local authenticated `app.user_id` currently has an active Membership in that Organization.

The capability:

- is `SECURITY DEFINER` and schema-owned;
- uses fully-qualified relations with `search_path = pg_catalog`;
- is revoked from `PUBLIC`;
- is executable only by `platform_app`;
- does not expose a general public slug-to-tenant UUID resolver;
- returns no role, Product, Price, Offering, Purchase, Entitlement, or Enrollment state.

Public catalog discovery therefore still cannot manufacture tenant authority. Customer entry remains an explicit prerequisite when a visitor is not yet a member.

### Checkout authority is revalidated inside one tenant transaction

After the narrow membership-backed slug resolution, the checkout orchestration opens one writable tenant transaction for the exact Organization and authenticated User. Inside that transaction it revalidates all command authority before creating a Purchase:

1. authenticated User is active;
2. Membership is still active;
3. `productSlug` resolves the exact active Commerce Product in the Organization;
4. `priceId` belongs to that Product and the immutable Price is still active;
5. the Product's exact LearningOffering is still `open`;
6. that Offering still uses `entitlement_required` access mode;
7. the purchaser does not already hold effective Entitlement for the Offering;
8. Purchase idempotency semantics remain `(organization, purchaser, idempotencyKey)`.

Commerce owns Product/Price/Purchase checks and Purchase creation. Learning Delivery owns Offering sellability checks. The Payment Checkout orchestration module composes only public application/query interfaces; it does not read foreign repositories or tables.

The relevant Product/Price/Offering rows are locked for the duration of the authority transaction so archive/closure changes cannot race underneath a successful Purchase decision.

### Purchase creation becomes transaction-aware, not provider-aware

Commerce exposes a transaction-level Purchase command used by the public checkout orchestration while preserving the existing convenience command for tenant-UUID checkout.

The transaction-level command remains provider-independent and returns only the trusted Purchase checkout specification needed by Integrations.

No Paddle type, transaction id, tax state, or webhook state enters Commerce.

### External checkout creation remains outside the business transaction

The authoritative transaction commits the canonical pending Purchase and `purchase.created@1` first. Only after that commit may Integrations create or recover the Paddle transaction and persist the trusted Purchase-to-provider mapping.

This preserves the existing rule that an external effect which PostgreSQL cannot roll back must not run inside the database business transaction.

Paddle's lack of arbitrary create-idempotency keys remains unchanged: canonical Purchase idempotency plus the unique persisted provider mapping arbitrate Nexus retries; Nexus does not claim provider-side exactly-once creation.

### Route replay and conflicts preserve canonical idempotency

A retry with the same authenticated purchaser, Organization, `idempotencyKey`, route-selected Product, and exact Price returns the same Purchase/provider checkout mapping.

Reusing the same idempotency key for another Price remains a conflict.

For the public route, an existing Purchase must also still correspond to the route-selected Product. A replay cannot use a different `productSlug` merely because it supplies the historical Price id.

### Browser writes require exact-origin evidence

The public customer-entry and public-checkout endpoints are browser session writes. They require a configured canonical web origin and reject requests whose `Origin` header is absent, malformed, or does not exactly match that origin in production browser mode.

Test-only principal injection may use an explicit test origin. Provider webhooks, GitHub callbacks, internal tenant-UUID API commands, and other non-browser integration surfaces are not placed behind this browser-origin gate.

This guard complements, rather than replaces, the host-only `Secure`, `HttpOnly`, `SameSite=Strict` session cookie.

Distributed registration/login abuse protection remains a separate shared-store hardening slice; an in-process limiter is not introduced here.

### Public catalog remains presentation only

F9.6 does not call a stale catalog response authoritative. It may reuse module-owned query semantics, but every checkout command revalidates current canonical state in its own authority transaction.

The Public Catalog module remains read-only and owns no checkout command.

## Consequences

The first browser-safe paid path becomes:

```text
authenticated User
  -> exact-origin browser write
  -> organizationSlug resolves only through active Membership
  -> one tenant authority transaction
       -> exact active Product by productSlug
       -> exact active Price belongs to Product
       -> open entitlement_required Offering
       -> no existing effective Entitlement
       -> idempotent pending Purchase
  -> commit Purchase + purchase.created@1
  -> Paddle transaction outside DB transaction
  -> trusted provider mapping
  -> existing signed durable webhook settlement
  -> paid Purchase + purchase-backed Entitlement
  -> no Enrollment
```

No new canonical checkout, cart, customer, tax, discount, or public-catalog entity is introduced.

## Deferred

- checkout page/UI and redirect presentation;
- success/cancel return UX;
- refunds/adjustments/disputes and Entitlement reversal semantics;
- subscriptions;
- supported discount/coupon policy;
- provider customer synchronization;
- distributed registration/login abuse protection;
- purchase-history/reconciliation UI;
- F7 production grader activation.
