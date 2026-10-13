# ADR-0026: Guided Build compare is derived read state and transfer uses the normal Attempt lifecycle

- Status: Accepted
- Date: 2026-09-15

## Context

ADR-0024 defines the Guided Build learner state machine and establishes that professional compare becomes available only after professional-solution exposure, while an optional transfer challenge becomes available after the source Attempt has an immutable Submission. ADR-0025 implements protected guidance persistence and disclosure without creating a parallel Evidence/Mastery model.

The remaining F5 learner surface must expose compare and transfer without creating a second Submission/Attempt lifecycle, duplicating authorization/outbox semantics, or persisting UI-only state.

## Decision

### 1. Compare is a pure read model

Guided Build compare is derived from:

- the source Attempt's immutable Submission; and
- the professional solution already disclosed for that same Attempt.

Compare is available only when the source Attempt has a Submission and the professional solution has already been revealed. The compare endpoint does not create a GuidanceExposure, LearningEvent, outbox row, Evidence, Mastery change, or other canonical state.

The compare contract returns the exact immutable Submission plus the already-authorized professional-solution material. It does not reveal new hints or protected content.

### 2. Transfer eligibility is guidance policy, not a second Attempt writer

A configured transfer challenge becomes available when the source Attempt has an immutable Submission. Professional-solution exposure is not required, preserving the unassisted transfer path established by ADR-0024.

Learning Guidance exposes a read-only transfer handoff containing the source Attempt/Enrollment context and the exact configured transfer ActivityVersion plus its stable Activity identity.

Learning Guidance does not create the transfer Attempt.

The learner starts transfer work through the existing Learning Progress Attempt command for the same Enrollment and stable Activity identity. That existing command remains the single writer for Attempt creation and therefore keeps its established ownership, authorization, LearningEvent, outbox, attempt-number, and ActivityVersion-pinning semantics.

### 3. Transfer work is an independent learning lifecycle

The transfer Attempt is not child state embedded in the source Guided Build Attempt. It is an ordinary separate Attempt against the transfer ActivityVersion, followed by the normal Submission / ValidationResult / Evidence / Mastery lifecycle.

F5 v1 does not persist a source-Attempt-to-transfer-Attempt relation. The immutable Guided Build definition already records which transfer ActivityVersion was recommended. A durable causal relation may be introduced later only if product/read-model requirements justify it.

### 4. Authorization and module boundaries remain unchanged

Compare and transfer-handoff reads require:

- an active authenticated user;
- ownership of the source Attempt's Enrollment; and
- `guidance.use` on the source LearningOffering.

Starting the transfer Attempt independently passes the existing Learning Progress checks, including active Enrollment ownership and `attempt.submit` on the Offering.

Learning Guidance reads immutable transfer Activity metadata through the public Learning Content application query and source Attempt/Submission context through the public Learning Progress guidance query. It does not read foreign repositories or tables.

### 5. No new persistence or integration event is introduced

Compare and transfer handoff are derived reads, so this slice requires no database migration and emits no new LearningEvent or integration outbox event.

Starting the transfer Attempt emits the existing canonical `attempt.started` LearningEvent and transactional `attempt.started` outbox contract through Learning Progress. No duplicate Guided Build transfer-start event is introduced.

## Compatibility

The slice is additive. Existing Guided Build GET/hint/solution contracts remain unchanged. Existing ActivityVersions without transfer configuration remain valid. F4 compatibility windows are unaffected.

## Consequences

- professional compare cannot become a second source of learner state;
- transfer preserves an unassisted path and remains measurable through the ordinary learning lifecycle;
- Attempt creation retains one owner and one set of transactional event semantics;
- no transfer-specific persistence is introduced without a demonstrated product need;
- F5 can close its API-level vertical learner scenario without pulling F6 GitHub integration or F7 grader/sandbox work forward.
