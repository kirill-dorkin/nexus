# F9.4 design review

## Rejected alternatives

### Infer membership entry from a sellable Product

Rejected because Product visibility is commercial discovery, not tenant authority.
Organizations may intentionally publish a catalog while keeping membership
invitation-only.

### Accept Organization UUID from the visitor

Rejected because public routing is slug-scoped and tenant authority must be resolved
server-side. The self-entry request contains no tenant UUID or target User ID.

### Automatically reactivate any existing Membership

Rejected because `invited`, `suspended`, and `left` are meaningful lifecycle states.
Self-entry may not accept invitations, undo suspension, or bypass explicit re-entry
workflows.

### Grant the learner role on self-entry

Rejected because Membership and authorization are separate. Existing checkout only
requires active Membership, while future learning participation can grant roles or
Enrollment through its own boundary.

### Couple self-entry to Purchase checkout

Rejected because an external payment session is non-rollbackable and because
Membership, Purchase, and Entitlement are independent canonical facts. The existing
checkout command remains separate and revalidates all current state.

### Add an in-process rate limiter to claim abuse hardening

Rejected because the API is designed for horizontally scaled deployment. A per-process
counter would provide misleading protection. Distributed auth abuse protection remains
a dedicated follow-up using shared state.

## Chosen boundary

`catalog -> register/login -> explicit Organization self-entry -> existing checkout`

Each arrow is independently retriable, and each write revalidates its own authority.
