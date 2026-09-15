# ADR-0022: Canonical learner LearningEvent history is an append-only journal

- Status: Accepted
- Date: 2026-09-15

## Context

ADR-0005 defines canonical LearningEvents as append-only learning history and explicitly separates them from telemetry. F4 now has a durable learner lifecycle across immutable Attempt, Submission, ValidationResult, normalized Evidence, and Mastery projection, but the repository only emits generic transactional outbox envelopes for integration work. `events.outbox` contains transport metadata and arbitrary event payloads, is readable by the worker role rather than the application role, and is not a stable learner-facing contract.

The learner history must survive compatibility aliases and future outbox processing changes, must not expose raw submission/validator/evidence payloads, and must remain readable after an Enrollment stops being active. Historical rows also predate this read model, so existing immutable state needs a deterministic one-time backfill.

## Decision

### 1. Learning History is a separate bounded application boundary

Introduce a `learning-history` module and `learning_history.learning_events` table.

The journal is canonical append-only learning history, not an analytics projection and not a copy of the integration outbox. Learning Progress and Learning Validation append events through a public `LearningEventSink` using the caller's existing tenant transaction. The history module does not reach into foreign repositories/tables from application code.

Database foreign keys and integrity triggers may verify source consistency across owned schemas because PostgreSQL remains the canonical integrity layer.

### 2. Canonical state, LearningEvent, and outbox stay atomically aligned

For new lifecycle mutations, the corresponding LearningEvent is appended in the same transaction as the source business row. Existing transactional outbox events continue to be written independently in that same transaction where they already form part of the integration contract.

The journal therefore cannot be reconstructed from outbox delivery state, and outbox publication/retry metadata cannot affect learner history.

### 3. F4 learner-visible event types are intentionally narrow

Version 1 of the learner journal contains:

- `attempt.started`;
- `submission.submitted`;
- `validation.result_recorded` only for `completed` ValidationResults;
- `evidence.recorded`.

`system_error` ValidationResults are operational failures and do not become learner LearningEvents. The deprecated `attempt.submitted` integration alias is never journaled. Mastery projection refreshes are derived mutable state and are not LearningEvents.

`needs_review` is a completed learner outcome and remains visible. Evidence is represented per canonical Evidence row, so one ValidationResult may legitimately produce multiple skill-scoped `evidence.recorded` events.

Additional genuinely learner-facing event types may be added in later versioned slices. Enrollment, attendance, assignment scheduling, recommendation, and unrelated delivery/integration events are not pulled into this F4 slice.

### 4. Public history is normalized and redacted

The journal stores only stable learner-facing semantics and source identifiers needed for attribution:

- tenant, learner, Enrollment, Attempt, ActivityVersion, attempt number;
- Submission / ValidationResult / Evidence / Skill identifiers where applicable;
- completed validation outcome and optional score;
- Evidence kind, score, and provenance type, including source ValidationResult id for validation-derived Evidence;
- event version and occurrence time.

It does not copy Submission payload, validator key/version/config, validator raw payload, Evidence payload, Evidence trust metadata, authorization details, outbox metadata, or infrastructure errors.

Assignment is not retroactively attached to an Attempt. Until Nexus has a durable Assignment-to-Attempt relationship, history exposes the Enrollment/Activity lifecycle without inventing assignment causality.

### 5. Existing immutable state is backfilled once

Migration `000017` backfills journal rows from the canonical immutable tables:

- Attempt `created_at` -> `attempt.started`;
- Submission `submitted_at` -> `submission.submitted`;
- completed ValidationResult `recorded_at` -> `validation.result_recorded`;
- Evidence `created_at` -> `evidence.recorded`.

Historical outbox rows are not rewritten or replayed. This avoids duplicate compatibility aliases and preserves legacy Attempts whose dedicated Submission rows were already losslessly created by ADR-0018 migration.

### 6. Ordering and cursors are deterministic

History is returned newest-first.

The stable ordering tuple is:

`(occurredAt, lifecycleOrder, eventId)` descending.

`lifecycleOrder` is derived from event type (`attempt < submission < validation < evidence`) so the compatibility path that starts an Attempt and creates a Submission in one PostgreSQL transaction still displays Submission after Attempt even when both source rows share the same `now()` timestamp.

Pagination uses an opaque cursor containing the last ordering tuple. The cursor is validated but does not carry authorization; every page is still tenant- and Enrollment-scoped.

### 7. Learner history is Enrollment-owned, not active-status-owned

The public endpoint is scoped to one Enrollment and authenticated organization user. The requester must own that Enrollment and have `learning_event.read` on the parent LearningOffering.

Delivery exposes a public Enrollment context query that does not require `status = active`; this allows completed, withdrawn, or cancelled historical Enrollments to retain their learning history. Active-only Attempt creation semantics remain unchanged.

This slice implements own-history reads only. A later instructor/mentor read-others policy may reuse the journal without changing event storage.

### 8. PostgreSQL enforces append-only and source integrity

The runtime application role receives only `SELECT` and `INSERT` on the journal, never `UPDATE` or `DELETE`.

Rows are tenant-scoped by RLS, unique per canonical source event, and database validation ensures the denormalized learner/event semantics match the referenced Attempt, Submission, ValidationResult, or Evidence row.

## Consequences

- learner history no longer depends on outbox implementation or compatibility aliases;
- historical F4 lifecycle is available immediately after migration through deterministic backfill;
- pagination remains stable when timestamps collide;
- infrastructure failures and raw validator/submission/evidence payloads remain outside the learner contract;
- completed Enrollments keep their history;
- future outbox consumers, grader execution, Mastery model changes, and instructor history reads can evolve without rewriting the v1 journal.

## Out of scope

- general outbox dispatcher/BullMQ infrastructure;
- grader/sandbox execution or service authentication;
- Assignment-to-Attempt association;
- attendance/enrollment/recommendation history expansion;
- read-others instructor/mentor policy;
- Student skill UI;
- retry/lateness enforcement or Mastery algorithm changes.
