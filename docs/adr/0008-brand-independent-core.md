# ADR-0008: Brand-independent core

- Status: Accepted

## Decision

The working product name is configuration (`packages/brand/brand.json`), not an architectural namespace. Internal packages use neutral `@platform/*`; API/event/database/module identifiers remain semantic and brand-neutral.

## Consequences

Rebranding changes one configuration source plus brand assets/marketing copy; it does not trigger a repository-wide rename or database migration. CI checks for accidental brand literals in runtime code/infrastructure.
