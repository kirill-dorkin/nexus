# ADR-0024: Guided Build uses immutable protected guidance content and Attempt-scoped assistance state

- Status: Accepted
- Date: 2026-09-15

## Context

F5 introduces Guided Build: a learner can work through a real Activity step by step, request progressively stronger hints, submit their own work, inspect a professional solution/walkthrough, compare it with the submitted artifact, and optionally continue into a transfer challenge.

The existing F4 lifecycle already provides immutable `ActivityVersion`, `Attempt`, `Submission`, ValidationResult, Evidence, Mastery, Recommendations, and canonical learner LearningEvents. Guided Build must compose those concepts rather than inventing a second attempt/submission/evidence model.

`CourseVersionActivity.config` is part of the existing learner runner response. It is therefore a public learner-visible surface and cannot safely contain unrevealed hints, professional solutions, answer keys, or other protected guidance material.

The F5 state model must also distinguish pedagogical assistance from Evidence. Merely opening a hint or professional solution is significant learning context, but it is not proof that a Skill was demonstrated.

## Decision

### 1. Guided Build is optional for an exact immutable ActivityVersion

A Guided Build definition is attached to one exact `ActivityVersion` and is versioned implicitly with that immutable curriculum snapshot.

Changing steps, hint ordering, professional solution identity, or transfer-challenge linkage requires a new draft/published ActivityVersion rather than mutating historical published content.

Guided Build remains an optional capability. Activities that do not define Guided Build keep the existing F4 behavior unchanged.

### 2. Protected guidance content is not stored in learner-visible Activity config

Unrevealed hints, professional solutions, answer keys, and protected walkthrough material must not be embedded in `CourseVersionActivity.config` or any learner runner payload that is returned before policy allows disclosure.

Learning Content owns the immutable Guided Build definition and protected authoring material. A later persistence slice will store that content behind a dedicated public application interface so other modules never read Learning Content tables directly.

This ADR defines the state-machine contract but does not yet add storage or learner endpoints.

### 3. Learner guidance state is Attempt-scoped

Guided Build assistance state belongs to one exact `Attempt`.

A retry creates a new Attempt and therefore a new guidance context. Historical assistance remains attached to the Attempt on which it occurred and is never rewritten onto another Attempt.

Ephemeral UI state such as which panel is open, which step is currently scrolled into view, editor cursor position, compare-panel layout, or whether a learner copied text is not canonical domain state.

### 4. Hint disclosure is an ordered ladder

Each Guided Build step has an ordered hint ladder identified by stable keys inside the immutable Guided Build definition.

Hints may only be revealed in order within that step. Revealing a later hint while an earlier hint remains unrevealed is invalid canonical state.

In v1, hint progression does not require a failed validator run, timer, grader execution, or inferred struggle signal. Those policies would couple F5 to still-future grader/runtime semantics. The learner explicitly requests the next hint.

Hints are available only while the Attempt has no Submission. Once the learner commits the immutable Submission, no new hint disclosure is allowed for that Attempt.

### 5. Professional solution exposure requires the learner's immutable Submission

The professional solution remains locked until the Attempt has a Submission.

Submitting work makes the professional solution eligible for explicit learner reveal. Validation success is not required: a learner may need the professional walkthrough precisely to understand an incorrect or incomplete submission.

Solution exposure is idempotent and irreversible historical state for that Attempt. Revealing it does not mutate the Submission, ValidationResult, Evidence, or Mastery derived from work already submitted.

`compare with professional solution` becomes available only after professional solution exposure. Compare is a read/presentation operation over the learner's immutable Submission plus the already-authorized professional solution. Opening or closing the compare UI is not itself canonical domain state.

### 6. Assistance context is not Evidence

Hint exposure is durable assistance context for the Attempt. It allows later product logic to distinguish a submission produced with hints from one produced without hints.

Professional solution exposure occurs only after Submission in v1, so it cannot retroactively make that already-committed Submission "solution-assisted". It does establish historical prior exposure that later recommendation/transfer logic may consider.

Neither hint exposure nor solution exposure creates LearningEvidence, changes a score, or directly modifies Mastery.

### 7. Transfer challenges are separate immutable Activities

A Guided Build definition may reference an optional exact transfer `ActivityVersion`.

The transfer challenge is not another hidden stage inside the original Attempt. Starting it uses the normal F4 lifecycle and creates its own Attempt, Submission, ValidationResult/Evidence, and Mastery consequences.

The transfer ActivityVersion must be a different immutable ActivityVersion. A later persistence slice will enforce curriculum-context integrity for the reference.

Transfer becomes eligible after the source Attempt has a Submission. Viewing the professional solution is not required, so a learner may choose an unassisted transfer path.

### 8. Durable assistance exposure and canonical learner history are distinct but aligned

The Learning Guidance boundary will own append-only durable exposure facts for:

- a concrete hint revealed for an Attempt;
- the professional solution revealed for an Attempt.

When runtime persistence is introduced, those mutations should also append normalized learner-visible LearningEvents in the same transaction:

- `guidance.hint_revealed`;
- `guidance.solution_revealed`.

The LearningEvent payload must identify stable guidance keys and source Attempt/ActivityVersion context without copying protected hint/solution contents.

Step browsing, compare-panel opening, scrolling, editor focus, copy actions, and similar UI telemetry are not canonical LearningEvents.

Starting a transfer challenge already produces the normal `attempt.started` lifecycle event and does not need a duplicate Guided Build event.

### 9. Authorization and anti-cheating boundaries

Future learner Guided Build endpoints must resolve the exact Attempt, its owning Enrollment/Offering, and the exact ActivityVersion through public application interfaces.

Learner use is own-Attempt only. Hidden content must never be returned merely because a caller can read the public ActivityVersion.

Hint endpoints may return only already-revealed hints plus the one newly authorized next hint; they must not serialize the entire hidden ladder.

Professional solution content may be returned only after the same Attempt has an immutable Submission and the solution reveal transition is accepted.

These controls are application/content-disclosure policy. They do not execute untrusted learner code and therefore do not pull F7 sandbox/grader isolation into F5.

### 10. State-machine contract

The canonical derived learner state has three phases:

- `working`: no Submission exists; ordered next hints may be revealed;
- `submitted`: Submission exists; hints are locked, professional solution and optional transfer become available;
- `reviewing`: professional solution has been revealed; compare is available and optional transfer remains available.

Work assistance is independently classified as:

- `unassisted`: no hint was revealed before Submission;
- `hint_assisted`: at least one hint was revealed before Submission.

Solution exposure is represented separately because v1 only permits it after Submission.

## Consequences

- F5 builds on the existing Attempt/Submission lifecycle instead of creating a parallel project-attempt model;
- historical published guidance stays reproducible with the ActivityVersion that defined it;
- generic learner Activity payloads cannot accidentally leak professional solutions by design;
- hint usage is durable enough for later recommendation/readiness logic without polluting Evidence or Mastery;
- learners must commit their own work before seeing the professional solution;
- transfer challenges produce independent measurable learning attempts;
- F5 can proceed without grader execution or sandbox policy.

## Out of scope for this slice

- database tables/migration for Guided Build definitions or exposures;
- authoring/runtime HTTP endpoints;
- exact protected content payload/storage format;
- UI/editor implementation;
- automatic hint unlock based on validation failures, timers, or struggle inference;
- grader/sandbox execution;
- changing Evidence or Mastery algorithms based on assistance;
- instructor/mentor intervention surfaces.
