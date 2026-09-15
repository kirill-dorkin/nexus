# ADR-0025: Protected Guided Build content and GuidanceExposure persistence

Status: Accepted

## Context

ADR-0024 defines the Attempt-scoped Guided Build state machine but intentionally leaves protected content persistence and learner disclosure for the next F5 slice. Protected hint and professional-solution material must not leak through learner-visible ActivityVersion config, while disclosures must remain auditable, retry-safe and independent from Evidence/Mastery.

## Decision

Learning Content owns protected Guided Build definitions for an exact immutable ActivityVersion. Definitions are normalized into definition, step and hint rows. Protected hint and professional-solution payloads are JSON objects so the core contract can represent prose/code/file-reference blocks without selecting a renderer. Authoring is part of ActivityVersion creation; a configured transfer challenge must reference a different ActivityVersion in the same CourseVersion. Course-version cloning remaps source and transfer ActivityVersion ids through stable Activity identity.

Learning Guidance owns append-only `GuidanceExposure` rows scoped to an exact Attempt. An exposure records only an authorized disclosure fact plus stable content keys; it never becomes Evidence. Hint and solution reveal commands require an idempotency key. Hint disclosure is ordered and allowed only before Submission. The professional solution is allowed only after the same Attempt has an immutable Submission. Database triggers enforce Attempt/enrollment/activity/actor congruence and the Submission boundary in addition to application policy.

Cross-module runtime reads use public application ports: Guidance reads protected definitions through a Content query port and Attempt lifecycle context through a Progress query port. Guidance never reads foreign repositories or tables from application code.

Learner disclosure requires the `guidance.use` capability in offering scope and the current user must own the Attempt enrollment. The learner API returns step metadata and only material already disclosed for that Attempt. Unrevealed protected payloads are never placed in `ActivityVersion.config` and never returned by the ordinary learner runner.

Each newly created exposure and its normalized learner `LearningEvent` are committed atomically in one tenant transaction. The canonical events are `guidance.hint_revealed` and `guidance.solution_revealed`; event payloads contain exposure/content keys but never protected material. These learner-history events do not create integration-outbox messages because this slice defines no cross-service integration contract or consumer. If such a contract is introduced later, ADR-0006 applies and the outbox event must be written in the same transaction.

Guidance exposure does not create Evidence and does not directly mutate Mastery. Grader/sandbox execution remains F7.

## Persistence and isolation

Protected Content rows and GuidanceExposure rows carry `organization_id`, use tenant RLS, and are unavailable outside the transaction-local organization context. Published Content remains immutable. GuidanceExposure is append-only at the runtime role and has no update/delete path. Database constraints and triggers reject cross-tenant/cross-Attempt source mismatches and disclosure-order violations.

## Compatibility

This is additive. Existing ActivityVersions without Guided Build definitions keep their behavior. Existing learner-runner contracts and learner-visible `ActivityVersion.config` are unchanged. Existing F4 compatibility windows remain untouched. LearningEvent cursors remain structurally compatible; the accepted lifecycle-order set is extended with guidance orders between existing events. Reveal endpoints did not previously exist, so requiring an idempotency key does not break a deployed client contract.

## Consequences

Guided Build material can now be authored and versioned without leaking protected content, disclosure is auditable and retry-safe per Attempt, and learner history gains normalized guidance facts without contaminating Evidence/Mastery. Future authoring/rendering formats may evolve inside the protected JSON payload contract without changing disclosure identity or history semantics.
