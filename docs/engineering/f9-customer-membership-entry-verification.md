# F9.4 customer membership entry verification

This slice is complete only when the following boundaries are covered by automated
and maintainer-local verification.

## Required behavior

- new Organizations default customer self-entry to `closed`;
- only an authorized Organization manager can change the entry policy;
- public catalog responses may expose the policy only as a presentation hint;
- anonymous callers cannot use customer self-entry;
- authenticated Users self-enter by Organization slug, never tenant UUID or target
  User ID;
- closed, suspended, archived, and unknown Organizations fail closed;
- an open active Organization creates one active Membership with no role assignment;
- retrying self-entry with an active Membership is idempotent;
- invited, suspended, and left Memberships cannot be reactivated through self-entry;
- closing entry takes effect at the authoritative write boundary even if a previously
  rendered public catalog said `open`;
- direct tenant-table access remains protected by RLS;
- the self-entry SECURITY DEFINER capability is not executable by PUBLIC and exposes
  no role, Commerce, Entitlement, or Enrollment mutation.

## Deferred independent hardening

Distributed rate limiting for the already-public register/login boundary remains a
separate security slice. It must use shared state appropriate for horizontal scaling;
an in-memory limiter is not an acceptable production substitute.
