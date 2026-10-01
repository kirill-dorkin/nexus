# F9.3 public catalog verification

This file records the focused verification surface for the public sellable catalog slice while the Draft PR is under review.

## Architectural invariants

- public routing uses Organization slug + Product slug, never tenant UUID;
- public response contracts expose no Organization/Product/Offering internal UUIDs or lifecycle/audit fields;
- exact immutable Price id remains the only public internal identifier because checkout selects a Price identity;
- sellability is derived from active Organization + active Product + active Price + open `entitlement_required` Offering;
- membership-only, closed/archived Offering, archived Product, archived Price, and suspended Organization states fail closed;
- Public Catalog owns no canonical state and crosses module boundaries only through public query ports;
- anonymous DB reads use narrow slug-scoped `SECURITY DEFINER` functions rather than broad public table policies;
- public reads run in one read-only `REPEATABLE READ` transaction;
- public HTTP responses use `Cache-Control: no-store` in v1.

## CI verification

Pending Draft PR exact-head CI.

## Maintainer-local focused verification

Pending only after exact-head CI is green.
