# ADR-0007: Untrusted code is a separate security boundary

- Status: Accepted

## Decision

Student code never executes in Web/API/Worker. Grader Gateway controls ephemeral constrained sandboxes with network OFF by default and no production credentials. Stronger isolation can evolve from container + gVisor-class sandboxing to microVMs.

## Consequences

Grader protocols are explicit/versioned. Infrastructure failures are system failures and never count as negative student evidence.
