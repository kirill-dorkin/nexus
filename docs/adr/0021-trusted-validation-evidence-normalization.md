# ADR-0021: Trusted ValidationResult normalizes into attributable Evidence

- Status: Accepted
- Date: 2026-09-15

## Context

ADR-0020 introduced immutable raw `ValidationResult` state between Submission and normalized Evidence. It deliberately did not generate Evidence. F4 now needs to connect that result boundary to the existing Evidence/Mastery loop without leaking validator-specific raw payloads or infrastructure failure into learner state.

Evidence is canonical learner-state input and Mastery is recomputed from append-only Evidence. Therefore automated normalization must be deterministic, skill-scoped, attributable, tenant-safe, and idempotent. A retry of result publication must never double-count learner evidence.

ADR-0006 prefers outbox-driven consumers for deferred consequences. The repository currently persists transactional outbox rows but does not yet have a general outbox dispatcher/consumer runtime. Introducing BullMQ/worker infrastructure solely for this slice would mix a platform execution concern into the F4 learning-model boundary.

## Decision

### 1. Learning Progress owns normalization into Evidence

`learning-validation` continues to own raw validator registry/result semantics only. `learning-progress` owns the conversion of eligible ValidationResult state into normalized Evidence and the resulting Mastery refresh.

Validation calls this behavior only through a public application sink exported by Learning Progress. It does not write Progress repositories/tables directly.

### 2. Raw result commits before normalization

Recording a ValidationResult and its canonical `validation.result_recorded` outbox event commits first. Eligible normalization then runs in a separate tenant transaction.

If normalization fails, the immutable ValidationResult remains recorded. The API call may fail operationally, and an idempotent replay of the same validation command re-attempts normalization without creating a second ValidationResult.

This preserves raw result history and keeps normalization failure an operational failure rather than a learner outcome.

When Nexus gains a general outbox dispatcher, the same public normalization contract may be invoked from an idempotent consumer of `validation.result_recorded` without changing Evidence semantics.

### 3. Only completed trusted decisive outcomes generate automated Evidence

Automated Evidence is eligible only when all are true:

- `status = completed`;
- `evidenceTrust = trusted`;
- `outcome` is `passed` or `failed`.

`needs_review`, `system_error`, and `advisory` results generate zero automated Evidence.

Infrastructure failure therefore cannot become negative learner evidence, and advisory validators remain informational until an explicit future policy promotes them.

### 4. One eligible result maps to every assessed skill of the exact ActivityVersion

The exact immutable ActivityVersion pinned by the Attempt is authoritative for skill targets. One eligible result creates one Evidence record for each `ActivityVersion.skillIds` entry.

The Evidence `kind` is the ActivityVersion `activityType`, not the validator key. Mastery therefore consumes stable normalized learning semantics rather than validator protocol identifiers.

### 5. Score normalization is deterministic

For `passed` or `failed`:

- if the ValidationResult carries an explicit score, preserve it;
- otherwise `passed` normalizes to `1`;
- otherwise `failed` normalizes to `0`.

The raw validator payload is never copied into Evidence. Evidence may retain only stable normalized metadata such as the normalized outcome plus explicit provenance fields.

Changing this mapping incompatibly for an existing validator meaning requires a new validator version; historical Evidence is not rewritten or re-normalized.

### 6. Evidence records explicit provenance

Evidence gains:

- `sourceType`: `manual` or `validation_result`;
- `sourceValidationResultId`: nullable, required for `validation_result` provenance.

Historical/manual Evidence is `manual`. Automated Evidence is recorded with no user actor and pins the exact source ValidationResult.

PostgreSQL verifies that validation-derived Evidence references the same Submission and only a completed trusted decisive ValidationResult.

### 7. Materialization is idempotent in PostgreSQL

For automated Evidence, `(organizationId, sourceValidationResultId, skillId)` is unique.

A retry returns the already-created Evidence for that skill and does not append another `evidence.recorded` event or double-refresh Mastery for a duplicate row. New Evidence rows and their canonical `evidence.recorded` events remain transactional.

### 8. Manual Evidence remains supported and distinguishable

The existing `evidence.record` path remains available for authorized manual use and compatibility. Manual Evidence has `sourceType = manual` and no ValidationResult provenance.

Automated and manual Evidence are therefore not ambiguous duplicates: they are separate append-only signals with explicit provenance. This slice does not introduce deduplication or supersession policy across independently authored manual Evidence and validation-derived Evidence.

## Consequences

- trusted ValidationResult now closes the F4 loop into normalized Evidence and Mastery;
- retries cannot double-count one validation result for one assessed skill;
- raw validator payloads and system errors remain outside Mastery input;
- normalization failure does not erase the already-recorded raw ValidationResult;
- manual Evidence remains backward-compatible and explicitly distinguishable;
- the future outbox consumer runtime can move execution asynchronous without changing the domain contract.

## Out of scope

- grader/sandbox execution or service authentication;
- BullMQ/general outbox dispatcher infrastructure;
- advisory-result promotion policy;
- Evidence supersession/retraction;
- changing Mastery algorithm semantics;
- retry/lateness or strict Assignment-to-Attempt policy;
- learner-facing LearningEvent history and Student skill UI.
