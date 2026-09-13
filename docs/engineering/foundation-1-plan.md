# Foundation 1 — Database, Identity and Tenant Security

Status: in progress

## Goal

Create the smallest production-grade foundation on which the learning domain can safely depend.

Definition of done for Foundation 1:

- PostgreSQL 18.x is the transactional source of truth.
- Runtime database roles are separate from the migration owner and cannot bypass RLS.
- IDs use PostgreSQL 18 `uuidv7()` unless a domain explicitly requires another identifier.
- `User`, `Organization`, `Membership`, `Role`, and scoped `RoleAssignment` are persisted.
- Tenant-owned tables are protected by explicit organization context plus PostgreSQL RLS defense-in-depth.
- Application transactions set tenant/user context with `SET LOCAL` semantics.
- Domain writes can append an outbox event in the same transaction.
- Migrations are ordered, checksummed, serialized with an advisory lock, and fail if history was modified.
- Integration tests prove tenant isolation and transaction/outbox atomicity.

## Delivery slices

1. Deterministic CI and dependency-cache baseline.
2. Database bootstrap roles and local credentials.
3. `@platform/database` connection and migration primitives.
4. Foundation schema migration.
5. Tenant transaction helper and RLS integration tests.
6. Identity/organization/authorization application modules.
7. Authentication/session integration.

## Non-goals

This phase does not implement curriculum, learning offerings, attempts, mastery, GitHub App integration, payments, AI features, or untrusted-code execution.
