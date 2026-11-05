# ADR 0018: Attempt and Submission have separate immutable lifecycles

## Status

Accepted.

## Context

F4 requires a real learner activity lifecycle: a learner starts a try, works on the activity, submits an answer, validators evaluate that submitted payload, normalized Evidence is recorded, and Mastery is recomputed from Evidence.

The initial learning-loop foundation represented a submitted try as one `learning_progress.attempts` row containing both `submission` JSON and `submitted_at`. That was sufficient to prove immutable activity snapshots and evidence, but it collapses two different domain concepts:

- `Attempt` — one learner try against an exact immutable ActivityVersion;
- `Submission` — the immutable payload the learner commits for that Attempt.

That conflation prevents a runner from having a durable started-but-not-yet-submitted Attempt and makes later validator/grader execution ambiguous.

## Decision

### 1. Attempt starts before Submission

An Attempt is created for one active Enrollment and one exact ActivityVersion. It receives its attempt number at start time and uses the Attempt creation timestamp as `startedAt`.

Attempt remains append-only. Retry continues to mean a new Attempt with the next attempt number; an existing Attempt is never reset or reused.

### 2. Submission is a separate immutable record

A Submission belongs to exactly one Attempt and contains the committed learner payload.

F4 v1 permits at most one Submission per Attempt. Editing a submitted answer is not modeled as an UPDATE; a learner retries by starting a new Attempt and submitting a new immutable Submission.

Submission records the submitting learner and submission time. PostgreSQL independently requires the submitter to be the learner who owns the Attempt's Enrollment.

### 3. Historical Attempts are migrated losslessly

Rows created before this ADR already contain legacy `submission` and `submitted_at` columns. Migration creates one Submission for every historical Attempt using those values, then makes the legacy columns nullable for compatibility during the transition.

New application writes use the dedicated Submission table. The legacy Attempt columns are no longer the source of truth and may be removed only in a later compatibility cleanup migration.

For one transition window, the existing create-Attempt command may still carry `submission`. The application then atomically creates the Attempt and its dedicated Submission. New runner flows should start the Attempt without that field and submit through the explicit Submission endpoint.

### 4. Evidence requires a Submission

Evidence describes an evaluated learner submission, not an uncommitted attempt. Both application logic and PostgreSQL require the parent Attempt to have a Submission before Evidence can be recorded.

This slice does not yet automate validation or grading. Instructor/manual Evidence remains supported, but it can only follow a committed Submission.

### 5. Recommendation attempt counts mean submitted attempts

A started and abandoned Attempt must not count as completed practice. The LearningProgress query used by recommendations therefore counts Attempts only when a Submission exists.

### 6. Events describe the actual lifecycle

The transactional outbox emits:

- `attempt.started` when an Attempt is created;
- `submission.submitted` when its immutable Submission is created;
- `evidence.recorded` when normalized Evidence is appended.

The previous `attempt.submitted` event represented the conflated model. It remains a deprecated compatibility alias during this transition slice and carries the new `submissionId`; new consumers must use `submission.submitted`. Historical outbox rows remain immutable.

### 7. Assignment gating and validators remain subsequent F4 policy

This slice deliberately does not decide whether an Assignment is required to start an Attempt, retry limits, lateness, validator configuration, automated scoring, grader execution, or learner-effective Assignment resolution.

Those policies now have a stable lifecycle to target:

`Assignment / recommendation -> Attempt started -> Submission submitted -> validation -> Evidence -> Mastery projection`.

## Consequences

- the runner can create durable started Attempts before learner submission;
- Submission becomes an explicit immutable domain concept rather than JSON embedded in Attempt;
- validators and grader integrations can address a stable Submission ID;
- abandoned Attempts do not distort recommendation retry counts;
- normalized Evidence cannot precede the learner work it evaluates;
- historical learning data is preserved through an additive migration.

## Amendment — 2026-11-04: compatibility window closed

Nexus has no external API clients, so the transition paths were removed before launch: the create-Attempt command no longer accepts `submission`, the Evidence-by-Attempt route is gone, and `attempt.submitted` is no longer appended to the outbox. Already written outbox rows stay as they are. The historical `attempts.submission` and `submitted_at` columns stay until a separate, owner-approved migration drops them.
