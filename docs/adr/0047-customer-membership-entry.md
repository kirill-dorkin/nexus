# ADR-0047: Explicit customer Organization membership entry

- Status: Accepted
- Date: 2026-10-01

## Context

F9.3 made sellable Products discoverable without authentication, while the existing
Purchase checkout vertical correctly requires an authenticated User with an active
Organization Membership. Nexus already supports User registration/login and durable
session cookies, but it has no safe bridge from an unaffiliated authenticated visitor
to the Membership required by checkout.

Public catalog visibility cannot itself grant tenant authority. A sellable Product may
be publicly discoverable while an Organization still uses invitation-only customer
entry. Conversely, a stale public response must never authorize a later write.

The domain distinction remains:

`User != Membership != Purchase != Entitlement != Enrollment`.

## Decision

### Explicit Organization policy

Organizations own a `customer_entry_policy` with values `closed | open`. New and
existing Organizations default to `closed`. Sellable Products do not implicitly open
membership entry.

Organization administrators with `organization.manage` may change the policy through
a tenant-authorized command.

The public Organization projection exposes the current policy as a presentation hint.
That hint is not authorization and may be stale by the time a visitor acts.

### Authenticated slug-scoped self-entry

An authenticated active User may request self-entry by public Organization slug. The
HTTP request never accepts an Organization UUID, target User ID, role, Product,
Offering, Price, amount, currency, Purchase, Entitlement, or Enrollment identity.
The actor User ID comes only from the authenticated session context.

Organizations owns a narrow `SECURITY DEFINER` write capability that atomically:

1. resolves an active Organization by slug;
2. revalidates `customer_entry_policy = open`;
3. verifies the target User is active;
4. serializes the decision against Organization policy updates;
5. creates an `active` Membership with `joined_at` when no Membership exists;
6. treats an existing `active` Membership as an idempotent success;
7. fails closed for existing `invited`, `suspended`, or `left` Memberships.

The function is schema-owned, uses fully qualified relations with
`search_path = pg_catalog`, is revoked from `PUBLIC`, and is executable only by
`platform_app`.

### Lifecycle preservation

Self-entry does not accept an invitation, undo a suspension, or reactivate a left
Membership. Those states retain their existing explicit lifecycle operations. This
prevents the public entry path from becoming an administrative bypass.

Self-entry grants no RBAC role. Membership and authorization role assignment remain
separate concepts.

### Commerce remains separate

Self-entry does not create or mutate Purchase, Entitlement, Enrollment, Product,
Price, or LearningOffering state. Existing checkout remains a separate authenticated
command and continues to revalidate current Membership and commercial state
server-side.

## Security and abuse boundary

The existing authentication boundary already uses host-only secure HttpOnly
`SameSite=Strict` session cookies. F9.4 adds no anonymous write endpoint: customer
self-entry requires an authenticated active User and an Organization that explicitly
opted in.

Repository-wide distributed abuse protection for registration/login remains a real
security hardening need, but it is independent of this Membership bootstrap boundary.
It should be implemented as a dedicated follow-up using a shared store rather than an
in-process limiter that becomes incorrect under horizontal scaling.

## Consequences

- Organizations can deliberately support invitation-only or open customer entry.
- Public sellability and tenant membership authority remain independent.
- A stale `open` hint cannot authorize a join after an Organization closes entry.
- Duplicate/retried self-entry is safe for an already-active Membership.
- Membership lifecycle and RBAC cannot be bypassed through the public slug route.
- Public checkout UI, return pages, refunds, subscriptions, tax, discounts, email
  verification/recovery, and distributed auth rate limiting remain separate slices.
