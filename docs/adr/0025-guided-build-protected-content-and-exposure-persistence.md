# ADR-0025: Guided Build protected content and disclosure persistence

- Status: Accepted
- Date: 2026-09-15

## Context

ADR-0024 defines the Guided Build state machine and requires protected hints and the professional solution to remain outside learner-visible `ActivityVersion.config`. The next F5 slice needs durable protected curriculum content, Attempt-scoped disclosure history, learner reveal commands, and normalized learner history without turning disclosure into Evidence or Mastery input.

A reveal request also has retry semantics that differ from ordinary reads. Because the hint command intentionally names only a step and the server chooses the next hint, repeating the same request after an uncertain network outcome must not accidentally advance the ladder again.

## Decision

### 1. Learning Content owns protected immutable curriculum rows

Guided Build protected content is stored in dedicated `learning_content` tables tied to the exact `course_version_activities.id`:

- one definition row with professional-solution metadata/content and optional transfer ActivityVersion;
- ordered step rows;
- ordered hint rows containing protected hint content.

The learner-visible ActivityVersion payload remains unchanged and does not contain hidden hint or solution material.

The tables follow CourseVersion draft/publish semantics. Runtime inserts are allowed only while the parent CourseVersion is draft; once published, database triggers reject mutation or deletion. Semantic changes therefore require a new immutable ActivityVersion/CourseVersion snapshot.

### 2. Learning Guidance owns append-only disclosure facts

`learning_guidance.guidance_exposures` records each authorized disclosure against one exact Attempt. Exposure rows are append-only and contain only stable context and keys, not duplicated protected content.

Hint exposure is unique per Attempt and hint key. Professional-solution exposure is unique per Attempt. The database verifies that exposure context matches the canonical Attempt and exact protected definition, rejects hint exposure after Submission, and rejects solution exposure before Submission.

### 3. Disclosure policy is server-side and Attempt-scoped

Learning Guidance obtains Attempt ownership/submission facts through the public Learning Progress query and protected definition metadata through the public Learning Content query. It never queries foreign module tables directly.

A learner may read/reveal guidance only for their own Attempt and must have the existing `attempt.submit` capability on the parent LearningOffering. No new broad `guidance.read` capability is introduced in this slice because disclosure is a subordinate capability of the learner's own Attempt lifecycle.

For hints, the request names the step only. The server derives state from the immutable definition plus persisted exposures and selects exactly the next ladder item. No hint skipping is accepted and no new hint is revealable after Submission.

The professional solution is revealable only after the same Attempt has an immutable Submission. Successful validation is not required.

### 4. Protected material is fetched only after authorization

The cross-module Content port separates manifest lookup from specific material lookup. Guidance first evaluates disclosure policy using stable keys, then fetches only the material corresponding to already persisted/authorized exposures.

Learner read responses contain only already revealed hints and, after solution exposure, the professional solution. Hidden future hints and solution content never appear in the runner payload or LearningEvent journal.

### 5. Reveal commands use explicit idempotency keys

Hint and solution reveal commands require an explicit caller-supplied `idempotencyKey`, unique per Attempt. The key is persisted with the exposure.

A retry with the same key and the same reveal intent returns the already materialized learner view without appending another exposure or LearningEvent. Reusing a key for a different step/kind is a conflict.

Attempt-scoped transactional locking serializes competing reveal commands so concurrent requests cannot skip a ladder item.

### 6. LearningEvents are canonical learner history; no new reveal outbox contract

Every newly created exposure appends exactly one normalized LearningEvent in the same PostgreSQL transaction:

- `guidance.hint_revealed` with `guidanceExposureId`, `stepKey`, and `hintKey`;
- `guidance.solution_revealed` with `guidanceExposureId` and `solutionKey`.

The journal contains no protected content. PostgreSQL validates the LearningEvent against the canonical GuidanceExposure and uses exposure `revealed_at` as canonical occurrence time.

This slice does **not** introduce `guidance.*` transactional outbox events. There is currently no asynchronous/integration consumer or deferred side effect for disclosure. ADR-0006 requires durable outbox delivery for asynchronous consequences; ADR-0022 separately defines learner history as the canonical append-only journal. If a future integration needs disclosure events, that versioned outbox contract can be added without changing canonical exposure/history facts.

### 7. Exposure is context, not assessment evidence

Hint or solution exposure does not create Evidence, does not invoke Mastery recomputation, and does not change the submitted learner payload. `workAssistance` is derived from persisted hint exposure facts only.

## Consequences

- hidden Guided Build material is protected by a dedicated storage boundary rather than convention inside JSON config;
- published guided curriculum remains historically reproducible;
- disclosure survives reloads and is scoped to the exact Attempt;
- network retries cannot unintentionally consume another hint;
- learner history can explain assistance/review state without leaking solution content;
- Evidence and Mastery semantics remain unchanged;
- future grader/sandbox, struggle inference, compare UX, and transfer-attempt orchestration remain independent slices.

## Out of scope

- grader or sandbox execution;
- timer/struggle heuristics for hint eligibility;
- UI rendering and diff/compare mechanics;
- automatic transfer Attempt creation;
- instructor/mentor disclosure of another learner's protected content;
- Guidance-derived Evidence or Mastery changes.
