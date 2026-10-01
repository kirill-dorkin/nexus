# ADR-0046: Public sellable catalog read boundary

- Status: Accepted
- Date: 2026-10-01

## Context

F9.1 introduced provider-independent Commerce Product and immutable Price. F9.2 introduced canonical Purchase and asynchronous payment settlement. Nexus still has no unauthenticated way to discover what an Organization currently sells.

The internal Product, Price, Organization, and LearningOffering contracts are not safe public API contracts. They include tenant/internal identifiers, lifecycle state, ownership/audit timestamps, CourseVersion identity, and fields whose presence would couple a visitor-facing surface to internal administration models.

The public catalog also crosses three ownership boundaries:

- Organizations owns Organization identity and lifecycle;
- Commerce owns Product and Price commercial state;
- Learning Delivery owns Offering access/delivery lifecycle.

A public read must not create a Commerce -> Delivery application dependency because Learning Delivery already consumes Commerce public interfaces. It must also work without an authenticated principal, while the ordinary `platform_app` table policies intentionally require transaction-local tenant context.

## Decision

### Stable public address

The v1 public address is:

```text
/v1/public/catalog/:organizationSlug/products
/v1/public/catalog/:organizationSlug/products/:productSlug
```

Organization slug is globally unique canonical Organization identity. Product slug is unique within one Organization. Public routing never accepts tenant UUID as visitor-facing authority.

### Public projection

The public HTTP contract exposes only:

- Organization: `slug`, `name`;
- Product: `slug`, `name`;
- Offering presentation: `slug`, `name`, `deliveryMode`, `startsAt`, `endsAt`;
- Price: opaque immutable `id`, `amountMinor`, `currency`, `billingType`.

The Price id is intentionally public because the future checkout command selects an exact immutable Price identity. It is an opaque commercial identifier, not tenant authority.

The projection excludes, among other internal fields:

- Organization/Product/Offering UUIDs;
- `organizationId`, `productId`, `offeringId`, `courseVersionId`;
- lifecycle status fields;
- actor identities;
- created/updated/archive timestamps;
- Entitlement, Enrollment, Purchase, provider, or customer state.

Public response schemas are strict so accidental field expansion fails tests/parsing instead of silently widening disclosure.

### Sellability is derived, not persisted

No second public catalog table or publish flag is introduced in v1. A Product is publicly sellable only when all current canonical conditions hold in one consistent read snapshot:

1. Organization is `active`;
2. Product is `active`;
3. Product has at least one `active` immutable Price;
4. target LearningOffering is `open`;
5. target LearningOffering uses `entitlement_required` access mode.

Any missing or non-matching state fails closed. Archived Prices are omitted. A Product with no remaining active Price disappears from the public projection.

`membership` Offerings are not publicly sellable through this boundary. Their access semantics do not require the Purchase-backed Entitlement produced by the current paid vertical, so exposing them as visitor-purchasable would misrepresent the commercial effect.

This decision does not change canonical Product creation or the existing authenticated checkout command. It defines only public visitor sellability; broader Commerce configuration validation can be a later invariant if a concrete product requirement needs it.

Catalog visibility is discovery/presentation state, not an access grant and not checkout authorization. A future unaffiliated-visitor checkout path must revalidate the exact Product/Price/Offering sellability server-side at command time; it must never trust a previously returned catalog document as authority.

### Composition boundary

A stateless Public Catalog application module composes three public query ports:

```text
Public Catalog
  -> PublicOrganizationQuery
  -> PublicCommerceCatalogQuery
  -> PublicLearningOfferingQuery
```

The Public Catalog module owns no canonical state and does not read foreign tables directly.

Owning modules expose narrow read-only query implementations. Anonymous reads bypass ordinary tenant RLS only through schema-owned `SECURITY DEFINER` SQL functions that:

- are read-only and `STABLE`;
- use fully qualified relations with `search_path = pg_catalog`;
- expose only the minimum fields required for composition;
- filter lifecycle state inside the owning schema;
- revoke execution from `PUBLIC`;
- grant only the public presentation functions to `platform_app`.

Organizations keeps the active-slug-to-tenant-UUID resolver private to SECURITY DEFINER composition. `platform_app` can resolve only the public Organization presentation and cannot call the tenant-id resolver directly. Commerce does not expose Product UUID merely for row grouping; the already tenant-scoped unique Product slug is sufficient for application composition.

No broad anonymous table policy is added.

Cross-module composition runs sequentially on one read-only `REPEATABLE READ` transaction so Organization, Product/Price, and Offering decisions observe one PostgreSQL snapshot.

### HTTP semantics

- An inactive/unknown Organization returns `404`.
- A detail route for an inactive/non-sellable/unknown Product returns `404` without distinguishing the reason.
- An active Organization with no sellable Products returns an empty product list.
- Responses use `Cache-Control: no-store` in the first slice so an archive, suspension, Offering closure, or Price withdrawal is not extended by shared/public cache staleness.

ETag/CDN caching may be added later only with explicit invalidation/freshness semantics.

## Consequences

### Positive

- visitor-facing disclosure is explicit and testable;
- Product/Price remain the single commercial source of truth;
- Delivery lifecycle remains independent canonical state;
- no Commerce -> Delivery dependency cycle is introduced;
- anonymous access does not weaken ordinary tenant RLS policies;
- future visitor onboarding and checkout UI can consume a stable public address and exact Price identity.

### Costs

- one anonymous request composes multiple module-owned reads;
- `no-store` sacrifices public cache efficiency initially;
- sellability is recomputed from canonical state rather than persisted as a projection.

These costs are preferred until real scale or freshness requirements justify a separate projection/cache slice.

## Rejected alternatives

### Expose the internal Product/Price DTOs

Rejected because internal tenant ids, lifecycle metadata, Offering ids, and timestamps would become accidental public API commitments.

### Let Commerce join Organizations and Learning Delivery tables directly

Rejected because it violates module ownership and would create an application dependency cycle with Delivery -> Commerce.

### Add public RLS SELECT policies to all canonical tables

Rejected because it widens the base-table attack surface. Narrow schema-owned functions provide a smaller auditable capability.

### Persist a second public catalog table

Rejected because F9.3 has no latency/scale requirement that justifies duplicate state, invalidation logic, or a new source of truth.

### Include visitor account creation, Organization self-join, or checkout UI

Rejected because those introduce separate identity/membership/security and UX invariants. They remain subsequent slices.
