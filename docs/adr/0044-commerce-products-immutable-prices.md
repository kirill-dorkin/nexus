# ADR 0044 — Commerce Product and immutable Price foundation

## Status

Accepted

## Context

F9 begins from an existing Commerce access-right foundation rather than an empty domain.

ADR-0014 already establishes:

`Purchase != Entitlement != Enrollment`.

Commerce owns Offering-scoped Entitlements, while Delivery consumes only the public Entitlement query boundary. No Purchase, checkout, payment-provider, Product, or Price aggregate exists yet.

Before a Purchase can safely exist, Nexus needs canonical commercial terms that cannot be supplied ad hoc by a checkout request or silently changed after a transaction. The first F9 slice therefore defines what is sold and the exact monetary terms independently from any payment provider.

## Decision

### Product is a stable Commerce package

F9.1 introduces `CommerceProduct`.

The first Product target is intentionally narrow: exactly one existing `LearningOffering`.

A Product has:

- stable Product identity;
- tenant identity;
- one Offering target;
- organization-unique slug;
- display name;
- lifecycle `active -> archived`.

The Product does not grant access and does not create an Enrollment.

Multiple Products may target the same Offering. Nexus does not assume that Offering identity is itself a commercial SKU.

### Commerce references Delivery only through database integrity

Delivery already depends synchronously on Commerce through `EntitlementQuery`.

F9.1 therefore does not add a reverse application dependency from Commerce to Learning Delivery merely to validate Product targets.

PostgreSQL enforces the tenant-safe Product -> LearningOffering foreign key. Application creation translates a missing Offering reference into a not-found response.

This follows the existing rule that cross-schema foreign keys may enforce canonical integrity without granting application modules permission to query foreign repositories or tables.

### Price is immutable commercial meaning

A `CommercePrice` belongs to one Product and contains:

- positive integer amount in minor currency units;
- three-letter uppercase currency code;
- billing type;
- lifecycle `active -> archived`.

F9.1 supports only `one_time` billing.

Amount, currency, Product identity, and billing type are immutable after creation. Changing commercial terms requires:

1. archive the existing Price;
2. create a new Price with a new stable identity.

The application database role receives no UPDATE privilege for monetary or identity columns.

### One active Price exists per Product/currency/billing type

At most one active Price may exist for the same:

`(organization, product, currency, billingType)`.

The invariant is enforced by a partial unique PostgreSQL index.

This provides an unambiguous current commercial offer without pretending that historical prices can be rewritten.

### Archived Product/Price state is terminal

Archived Products and Prices cannot be reactivated.

A Product with an active Price cannot be archived. Active Prices must first be archived explicitly.

PostgreSQL lifecycle triggers protect these rules in addition to application checks.

Price creation requires an active Product. The database serializes that check against Product archival so an active Price cannot race into existence underneath an archived Product.

### Catalog management has separate authorization

F9.1 introduces organization-scoped capability:

`commerce.manage`.

Organization owner and organization admin may manage Product/Price state.

Instructor, mentor, and learner roles do not receive this capability.

`commerce.manage` is separate from `entitlement.manage`: defining a commercial offer and manually granting an access right are distinct authorities.

### Product/Price lifecycle emits integration events

Successful lifecycle changes append transactional outbox events:

- `commerce.product.created@1`;
- `commerce.product.archived@1`;
- `commerce.price.created@1`;
- `commerce.price.archived@1`.

These events are integration/deferred-work transport, not an audit read model or payment ledger.

Actor provenance needed for the mutable archive lifecycle is also retained in canonical Product/Price persistence.

### No payment-provider state is introduced

F9.1 deliberately does not introduce:

- Purchase;
- checkout/session;
- payment intent;
- provider customer/product/price identifiers;
- provider webhook ingress;
- refunds;
- subscriptions;
- tax;
- coupons/discounts;
- automatic Entitlement grants;
- public catalog reads.

Provider mappings and payment processing require a separate Purchase/payment-provider boundary.

## Consequences

Nexus now has canonical provider-independent commercial meaning before it accepts money.

The first F9 commercial authoring path is:

```text
active LearningOffering
  -> authorized commerce manager creates Product
  -> Product active
  -> create one-time Price in minor units
  -> Price active and immutable
  -> changing terms requires archive Price
  -> create replacement Price with new identity
  -> archive all active Prices
  -> Product may be archived
```

A future Purchase can pin the exact immutable Price identity and monetary terms rather than trusting caller-supplied amount/currency or mutable provider configuration.

## Deferred

Separate decisions remain required for:

- Purchase aggregate and lifecycle;
- payment-provider adapter and provider identity mappings;
- checkout initiation;
- authenticated/idempotent provider webhook ingestion;
- successful Purchase -> Entitlement grant policy;
- refunds/reversals and their Entitlement consequences;
- subscriptions/recurring billing;
- taxes and discounts;
- public catalog/pricing read models;
- public web launch surface;
- production observability and SLOs;
- accessibility, load, and security launch verification;
- F7 production grader activation.
