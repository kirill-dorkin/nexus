# ADR-0001: Modular monolith first

- Status: Accepted

## Decision

Business bounded contexts deploy together in `apps/api` while enforcing module ownership. Worker and grader are separate processes; hostile execution is a separate security boundary.

## Consequences

Lower operational complexity, easier transactions and refactoring. Service extraction is allowed later when independent scaling/security/team ownership is proven.
