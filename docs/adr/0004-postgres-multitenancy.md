# ADR-0004: PostgreSQL source of truth and shared-schema multitenancy

- Status: Accepted

## Decision

PostgreSQL 18.x is transactional source of truth. Application authorization is primary; RLS is defense-in-depth for tenant-owned tables. Runtime roles cannot bypass RLS.

## Consequences

Tenant context must be explicit in transactions, jobs, caches and events. Advanced Postgres features may use handwritten SQL rather than being constrained by an ORM.
