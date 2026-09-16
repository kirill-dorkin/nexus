# F7 grader dispatch slice verification notes

This temporary implementation note records the verification scope while the Draft PR is under CI. The durable architecture decision is ADR-0035; the maintained checkpoint remains `docs/engineering/current-state.md` and will be updated before the slice is ready to merge.

Required verification for this slice:

- authenticated Worker -> Grader Gateway transport of the persisted request;
- exact protocol version and `jobId` response validation;
- retryable infrastructure failures remain in durable retry state;
- terminal acknowledgement is fenced by the active lease token;
- duplicate/commit-uncertain terminal replay is idempotent;
- stale/re-leased workers cannot commit terminal state;
- terminal grader state and system-owned ValidationResult commit atomically;
- retry exhaustion records `system_error`, never learner `failed`;
- completed grader results remain on canonical learner history semantics;
- `needs_review` and `system_error` create no Evidence;
- production sandbox execution remains disabled.
