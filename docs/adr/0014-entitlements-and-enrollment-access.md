# ADR 0014: Entitlements are access rights, not enrollments

## Status

Accepted.

## Context

Nexus already treats `LearningOffering` as the mandatory delivery context and `Enrollment` as the fact that a user participates in that offering. The platform also needs paid, sponsored, manually granted, bundled, and otherwise controlled access without coupling delivery state to payment-provider state.

The core invariant is:

`Purchase != Entitlement != Enrollment`.

A purchase is a commercial transaction. An entitlement is a current right to access a resource. An enrollment is delivery participation. They have different lifecycles and must remain independently addressable.

## Decision

### 1. Entitlement is owned by Commerce

Commerce owns entitlement state. Delivery never reads Commerce tables or repositories directly.

For the first slice an entitlement grants one user access to one `LearningOffering`. This narrow target is intentional: broader product/program/course grants can be introduced later through explicit grant-resolution rules rather than a generic untyped resource string.

An entitlement has a stable identity and current lifecycle state. Re-granting the same user/offering right reactivates that entitlement instead of creating duplicate current rights. Lifecycle history is preserved through domain/integration events in the transactional outbox.

### 2. Offering chooses its enrollment access mode

Every `LearningOffering` has an explicit `accessMode`:

- `membership` — an active organization membership and normal enrollment authorization are sufficient;
- `entitlement_required` — the target user must additionally have an effective offering entitlement.

`membership` is the default so free/internal/institutional delivery does not depend on Commerce.

### 3. Effective entitlement is time-aware

An entitlement is effective when:

- its status is `active`;
- `grantedAt <= now`;
- `expiresAt` is null or later than `now`.

Expiration does not require a background mutation job to make an entitlement ineffective. A later grant can reactivate/extend the same stable entitlement.

### 4. Grant/revoke never mutates Enrollment implicitly

Granting an entitlement does not create an enrollment.

Revoking or expiring an entitlement does not silently cancel, withdraw, or complete an existing enrollment. Those are separate delivery decisions with their own explicit commands and audit trail.

In this slice, entitlement is checked when a new enrollment is created for an `entitlement_required` offering. Runtime access revocation for an already-active enrollment, if desired later, must be introduced as an explicit policy rather than inferred from Commerce state.

### 5. Purchase remains a future separate aggregate

This slice does not invent payment or purchase state. When purchases are introduced, a successful purchase may cause Commerce to grant an entitlement, but Delivery will still consume only the entitlement query boundary and will not depend on payment-provider or purchase tables.

Manual grants are therefore a first-class source of access rather than a fake purchase.

### 6. Module boundary

Commerce exposes a narrow transaction-aware `EntitlementQuery` for checking effective offering access. Delivery depends on that public application interface.

Commerce repositories and SQL stay private to Commerce. Delivery repositories and SQL stay private to Delivery.

Database foreign keys may enforce referential integrity across schemas, but application modules do not query another module's tables directly.

### 7. Authorization

`entitlement.manage` is a privileged commercial/access-management capability. Organization owners and organization admins receive it. Instructor, mentor, and learner roles do not.

Enrollment authorization remains separate (`enrollment.manage`). Being allowed to enroll a learner is not the same as being allowed to manufacture an access right.

### 8. Persistence and audit

Entitlements are tenant-scoped PostgreSQL source-of-truth business records protected by RLS. The application role has no DELETE privilege on entitlement records.

Grant/reactivation and revoke operations emit transactional outbox events:

- `entitlement.granted`
- `entitlement.revoked`

This preserves lifecycle history without treating the mutable current entitlement row as an append-only event log.

## Consequences

- Free/internal offerings remain simple.
- Paid or restricted offerings can enforce access without coupling Delivery to billing.
- Purchase implementations can evolve independently.
- Revoking commercial access cannot accidentally rewrite learning history.
- Future product bundles and broader entitlement targets require explicit resolution design instead of overloading the v1 schema.
