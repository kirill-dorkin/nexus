# F9.3 public catalog design review

## Slice

Expose a safe unauthenticated commercial read model derived from existing canonical Organization, Product, Price, and LearningOffering state. Do not add visitor account creation, self-join, checkout UI, refunds, subscriptions, tax, discounts, or marketing CMS.

## Public identity

- Organization slug is globally unique and is the public tenant route identity.
- Product slug is unique within its Organization.
- Product detail is addressed by the pair `(organizationSlug, productSlug)`.

## Public data

The public projection contains Organization name/slug, Product name/slug, safe Offering presentation fields, and active immutable Prices. Exact Price id remains public as the opaque future checkout selector.

Internal tenant/Product/Offering ids, CourseVersion id, lifecycle fields, actors, audit timestamps, provider state, Purchase, Entitlement, and Enrollment state are excluded.

## Sellability

A product is visible only when:

1. Organization is active;
2. Product is active;
3. at least one Price is active;
4. target Offering is open;
5. target Offering is `entitlement_required`.

The rule is derived at read time; there is no second catalog source of truth.

## Dependency shape

```text
Public Catalog
  -> Organizations public query
  -> Commerce public query
  -> Learning Delivery public query
```

Public Catalog has no canonical tables. Commerce does not gain a Delivery application dependency.

## Anonymous DB access

Tenant RLS remains unchanged. Anonymous reads are enabled only by narrow schema-owned, `STABLE`, `SECURITY DEFINER` functions granted to `platform_app`. Commerce and Delivery functions are routed by Organization slug and resolve active Organization through the Organizations public function, so a known suspended tenant UUID is not sufficient to widen the anonymous capability.

## Consistency and caching

Composition runs sequentially in one read-only `REPEATABLE READ` transaction. HTTP responses use `Cache-Control: no-store` until an explicit cache freshness/invalidation design is justified.
