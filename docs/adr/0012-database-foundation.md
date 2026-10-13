# ADR 0012: PostgreSQL 18 database foundation

- Status: Accepted
- Date: 2026-09-13

## Context

Foundation 1 needs stable identifiers, deterministic migrations, explicit tenant context, and a runtime security model that cannot accidentally inherit migration privileges.

## Decision

1. PostgreSQL 18.x remains the transactional source of truth.
2. New entity identifiers default to PostgreSQL 18 native `uuidv7()`. It is timestamp-ordered and avoids introducing an application-side ID library for ordinary database-owned identities.
3. Local and production deployments separate migration, API, and worker credentials. Runtime roles cannot create roles/databases and cannot bypass RLS.
4. The grader has no database role.
5. Tenant-owned tables enable RLS. Application authorization is still the primary boundary; RLS is defense-in-depth.
6. Tenant and actor context are transaction-local custom settings (`app.organization_id`, `app.user_id`) so pooled connections cannot retain context after commit/rollback.
7. SQL migrations are globally ordered, checksummed, protected by a PostgreSQL advisory lock, and append-only after application.
8. PostgreSQL-specific security/index features remain handwritten SQL even when runtime queries use Drizzle ORM.
9. Transactional outbox rows are written by the API in the same transaction as domain state and are consumed by a separately credentialed worker.

## Consequences

A PostgreSQL major-version upgrade is an explicit architecture migration because the current baseline intentionally requires major version 18. Domain modules may use Drizzle for typed queries, but ORM abstractions cannot weaken RLS, role separation, constraints, or migration review.
