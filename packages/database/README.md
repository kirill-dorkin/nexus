# Database package

`@platform/database` owns shared persistence infrastructure only: connection pools, transaction context, ordered migrations, and database test helpers.

Domain ownership does **not** move into this package. `identity`, `organizations`, `authorization`, and later bounded contexts own their tables/repositories semantically even though SQL migrations are deployed through one ordered migration stream.

## Baseline

- PostgreSQL 18.x is required.
- New primary identifiers use native PostgreSQL `uuidv7()` unless a domain documents another choice.
- Runtime API and worker roles are different from the migration owner.
- Runtime roles are `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, and `NOBYPASSRLS`.
- The grader receives no database credentials.
- Application authorization remains primary; RLS protects tenant-owned tables as defense-in-depth.
- Tenant context is transaction-local through `set_config(..., true)` and must never leak through pooled connections.
- Migration history is append-only and checksummed. Applied migration files must never be edited.

## Local roles

The Docker bootstrap creates local-development credentials only:

- `platform_migrator` — schema migration owner.
- `platform_app` — API runtime.
- `platform_worker` — background runtime with only explicitly granted cross-tenant technical access.

Production credentials are provisioned outside the repository.

## Migration

With local infrastructure running and `.env` loaded:

```bash
pnpm db:migrate
```

`DATABASE_MIGRATION_URL` is mandatory. The migration CLI intentionally refuses to fall back to runtime `DATABASE_URL`.
