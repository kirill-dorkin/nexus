# ADR-0035: Authenticated Worker dispatch and lease-aware terminal grader results

- Status: Accepted
- Date: 2026-09-16

## Context

ADR-0007 keeps hostile learner code outside Web/API/Worker and places execution behind Grader Gateway. ADR-0033 defines the fail-closed Gateway admission/authentication/protocol boundary. ADR-0034 adds a Validation-owned durable grader-job ledger plus worker-only lease/retry/dead-letter state, but deliberately stops before dispatch and terminal result recording.

The next F7 slice must connect those boundaries without weakening them. A worker may crash after a remote response, a lease may expire and be re-issued, Gateway may return a duplicate or wrong-job response, and transport/provider failures must never become learner failure Evidence.

ValidationResult semantics from ADR-0020 require exact validator attribution, registry-derived trust, immutable idempotency, and transactional outbox publication. ADR-0021 keeps raw ValidationResult separate from normalized Evidence and permits Evidence only for completed, trusted, decisive results.

## Decision

### 1. Worker is an orchestration/transport boundary only

`apps/worker` claims grader jobs only through the existing `platform_worker` SECURITY DEFINER lease function. It receives the persisted protocol request and transports that request to Grader Gateway without executing, compiling, interpreting, or rewriting learner source.

Worker receives no Docker socket, sandbox-host privilege, production runtime credential, or direct UPDATE/INSERT privilege on Validation-owned grader tables.

### 2. Worker authenticates to Grader Gateway with a dedicated service credential

Worker calls the configured Grader Gateway `/v1/jobs` endpoint with the same fail-closed bearer service credential contract established by ADR-0033. The credential is supplied through secrets/configuration, must satisfy the Gateway minimum entropy/length contract, and is never logged.

Production configuration requires an encrypted Gateway endpoint. Local development may use loopback HTTP. Request timeout must remain below the worker lease duration so a timed-out call cannot intentionally outlive its lease budget.

### 3. Persisted request is canonical and every response is runtime-validated

Worker sends the immutable `grader_jobs.request_payload`. It does not reconstruct execution policy from learner input.

A successful HTTP response cannot affect canonical state until the shared grader protocol validator has verified protocol version, exact response shape, and exact expected `jobId`. Malformed, wrong-version, or wrong-job responses are infrastructure/protocol failures, never learner outcomes.

### 4. Retryable infrastructure failures stay in the durable retry lifecycle

Network failures, timeouts, transient Gateway HTTP failures, service-authentication failures, retryable provider `system_error`, and invalid/wrong-job responses are classified as retryable orchestration failures. Worker records them only through `fail_grader_job`.

When retry attempts remain, the job returns to durable retry state with database-owned attempt accounting. On exhaustion, the database atomically transitions the processing row to `dead_letter` and records one system-owned `ValidationResult(status=system_error)` for the grader job. Retry exhaustion is therefore observable canonical validation state without becoming learner `failed`.

A non-retryable Gateway/provider/configuration failure is recorded as `system_error` through the same terminal acknowledgement boundary.

### 5. Terminal acknowledgement is lease-fenced, atomic, and idempotent

A new worker-only SECURITY DEFINER terminal acknowledgement function accepts `(jobId, leaseToken, validated terminal grader result)`.

For the first terminal transition it requires:

- processing state is `processing`;
- lease token exactly matches the current lease;
- lease has not expired;
- response `jobId` and protocol version match the immutable job.

The function atomically:

1. records exactly one system-owned ValidationResult linked to the grader job;
2. preserves immutable Submission, ActivityVersion, validator config/trust, profile key/version/fingerprint, and raw terminal grader semantics;
3. appends the `validation.result_recorded` outbox fact in the same transaction;
4. transitions processing to `completed` or `system_error` and stores the ValidationResult id;
5. clears the active lease and stamps terminal time.

`validation_results.grader_job_id` is unique, so one grader job cannot produce two ValidationResults. A replay of the materially identical already-committed terminal result returns the existing ValidationResult without writing a duplicate. A materially different replay is rejected.

An old lease token cannot terminally acknowledge a job that has been re-leased. Expired-but-not-yet-reclaimed leases also cannot acknowledge terminal state.

### 6. Grader provenance is persisted at scheduling time

The immutable grader ledger additionally snapshots registry-derived `evidence_trust`. This prevents a later registry/configuration change from changing the trust semantics of an already admitted grader job.

System-owned grader ValidationResults use `recorded_by_user_id = NULL` and a deterministic grader-job idempotency key. Application identities cannot set grader-job provenance directly; that column is writable only through the worker terminal function.

### 7. Evidence remains a separate Learning Progress concern

This slice does not move Evidence/Mastery logic into Worker or into Grader Gateway. The raw terminal ValidationResult is the atomic boundary.

The existing ADR-0021 normalization rule remains unchanged:

- `completed + trusted + passed|failed` is eligible for the existing Evidence pipeline;
- `completed + needs_review` creates no Evidence;
- `system_error` creates no Evidence;
- retry/dead-letter infrastructure state itself is never Evidence.

Automated Evidence dispatch/consumption remains separate from the worker-to-Gateway transport transaction; no cross-module Evidence write is added to the lease acknowledgement function.

### 8. Production sandbox execution remains disabled

The Gateway provider seam and default unavailable provider remain unchanged. This slice proves authenticated durable dispatch/result semantics only. Selecting and hardening a production sandbox provider requires a separate security slice.

## Consequences

- Only a trusted Worker service identity can advance grader execution state and only Grader Gateway can own execution policy/provider control.
- Duplicate replies and crash/retry ambiguity cannot create duplicate ValidationResults.
- Lease loss is a hard fence against stale terminal writes.
- Retryable infrastructure failure remains durable orchestration state until exhaustion; terminal infrastructure failure becomes `system_error`, never learner `failed`.
- Exact grader job, validator, profile, and trust provenance is retained in canonical Validation state.
- Gateway remains DB-less and Worker remains sandbox-less.
- Evidence/Mastery ownership stays with Learning Progress, preserving ADR-0021 rather than smuggling projection logic into the worker lease transaction.
