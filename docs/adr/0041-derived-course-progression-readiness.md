# ADR 0041 — Derived CourseVersion progression readiness

## Status

Accepted

## Context

F8 now has deliberately separate concepts: organization-wide learner+Skill Mastery from normalized Evidence, fixed-interval review scheduling, a conservative repeated-trusted-failure signal, and authored remediation intervention inside next-action recommendation.

None of those is a readiness verdict.

The current Mastery model is `mean-scored-evidence@1`: it averages all scored normalized Evidence for a stable Skill across the learner inside one Organization. One perfect observation can therefore yield Mastery 1.0. Mastery also exposes `lastEvidenceAt`, and review scheduling intentionally uses the latest Evidence timestamp even when that Evidence is unscored.

Those semantics are valid for their owning capabilities but are insufficient as a progression-readiness definition. A readiness decision must not silently equate “Mastery target met”, “no current repeated-failure signal”, “intervention cleared”, “Assignment done”, or “Enrollment completed” with readiness.

## Decision

### F8.4 defines one narrow readiness context

The first readiness policy answers only:

> Is the learner currently ready to progress beyond the Skill set pinned by this active Enrollment's published CourseVersion?

It is not course completion, certification, Assignment completion, entitlement, or automatic progression enforcement.

The decision is Enrollment-addressed because Delivery pins the exact published CourseVersion and provides the authorization scope. Skill identity and learning evidence remain organization-wide where Mastery already defines them.

### Readiness is a separate derived capability

A new `Learning Readiness` module owns versioned readiness-policy semantics and the individual learner read endpoint.

It consumes other modules only through public application/query boundaries:

- Delivery for Enrollment + Offering context;
- Content for the immutable published CourseVersion Skill set;
- Mastery for the current versioned learner+Skill projection;
- Learning Progress for normalized scored-Evidence summaries;
- Recommendations' public misconception-signal query for the exact existing `repeated-trusted-failure@1` derivation.

It does not read foreign tables directly and does not call the recommendation endpoint or treat recommendation intervention state as an input.

### Policy v1 is explicit and independently versioned

The first policy is:

`course-progression-readiness@1`

It pins:

- Mastery algorithm: `mean-scored-evidence@1`;
- Mastery target: `0.8`;
- minimum distinct scored Attempts per CourseVersion Skill: `2`;
- scored-Evidence freshness window: `7 days`.

These are readiness-policy semantics. They do not silently follow future edits to recommendation or review policies. A semantic change requires a new readiness policy version.

Readiness v1 fails closed if it receives a Mastery projection computed by another algorithm/version.

### Evidence sufficiency counts distinct Attempts, not Evidence rows

A Skill is `insufficient_evidence` until the learner has scored normalized Evidence from at least two distinct Attempts for that Skill.

Counting distinct Attempts prevents multiple Evidence rows attached to one Attempt from masquerading as independent observations.

Both canonical manual and validation-derived scored Evidence may contribute. Raw validator/grader payload, Submission source, Guidance exposure, UI telemetry, GitHub Project activity, Assignment timing, and LLM output do not.

### Readiness freshness uses scored Evidence, not review lastEvidenceAt

F8.1 review scheduling intentionally uses Mastery `lastEvidenceAt`, which can move forward after unscored Evidence.

Readiness is stricter: its freshness boundary is computed from the latest **scored** normalized Evidence for the Skill.

A Skill becomes stale when:

`lastScoredEvidenceAt + 7 days <= evaluatedAt`

The seven-day value currently matches review scheduling numerically, but the policies are independently versioned and use different evidence semantics.

### Active repeated trusted failure is a definitive blocker

Once evidence sufficiency is met, a Skill is `not_ready` when any of these holds:

- Mastery is below 0.8;
- scored Evidence is stale;
- the existing `repeated-trusted-failure@1` signal is active.

This matters because historical passing Evidence can keep mean Mastery at or above 0.8 while two newest trusted decisive Attempts are failures.

The absence of the signal is not sufficient for readiness; all readiness conditions must hold.

### Overall status preserves uncertainty

Each CourseVersion Skill is classified as:

- `insufficient_evidence`;
- `not_ready`;
- `ready`.

Overall CourseVersion readiness is:

1. `not_ready` if any Skill has a definitive not-ready blocker;
2. otherwise `insufficient_evidence` if any Skill lacks sufficient evidence;
3. otherwise `ready`.

This avoids coercing missing observations into failure while still reporting known blockers when they exist elsewhere.

A ready decision exposes `readyUntil`, the earliest scored-Evidence freshness boundary across its ready Skills. At that instant the same unchanged evidence would no longer satisfy v1.

### Enrollment and Assignments are context, not proof

F8.4 evaluates only active Enrollments.

Enrollment `completed` remains a separate Delivery lifecycle state and is never mutated by a readiness read.

Assignments remain durable delivery instructions. Upcoming/available/past-due Assignment state is not learning evidence and does not count toward readiness.

### Intervention is not an input

A remediation intervention can produce new Attempts and Evidence that later affect readiness.

The occurrence, clearing, position, or selected remediation Activity is not proof of readiness and is not passed into the readiness policy.

### Authorization is explicit and individual

F8.4 adds:

- `readiness.read` for self;
- `readiness.read_others` for authorized individual other-learner reads.

The capability is Offering-scoped, mirroring the existing learner/read-others boundary.

No cohort aggregation, instructor dashboard, bulk endpoint, escalation workflow, notification, or automatic progression action is introduced.

### Readiness remains recomputable derived state

No readiness table, projection, event, outbox record, worker, queue, or notification is added.

The endpoint evaluates inside a tenant-scoped read-only `REPEATABLE READ` transaction with server-owned `evaluatedAt`.

A future persistence decision requires a real lifecycle or audit invariant, not a desire to cache this read.

## Consequences

F8 gains an explicit readiness concept without collapsing Mastery, recommendations, review scheduling, misconception signals, Delivery completion, or Assignments into one state.

Readiness can be recomputed from stable canonical inputs plus exact versioned derived policies.

The vertical exit criterion is:

```text
active Enrollment -> published CourseVersion Skill
  -> 0 or 1 scored distinct Attempt => insufficient_evidence
  -> 2 fresh scored distinct Attempts + Mastery >= 0.8 + no active failure signal => ready
  -> historical passes keep Mastery at 0.8
  -> two latest trusted failed Attempts => active repeated-trusted-failure@1
  -> readiness => not_ready despite Mastery target
  -> later trusted passed Attempt clears signal
  -> Mastery remains >= 0.8 and evidence fresh
  -> readiness => ready again
  -> Enrollment remains active throughout
```

## Deferred

Separate future decisions are required for:

- cohort/instructor/mentor readiness aggregation and prioritization;
- persistence/history of readiness snapshots;
- automatic ProgressionGate enforcement;
- Enrollment completion based on readiness;
- Assignment/escalation/notification consequences;
- assessment-specific or project-specific readiness requirements;
- weighted/required Skill subsets;
- alternative evidence sufficiency policies;
- readiness policies using future named misconceptions;
- credential/certification semantics;
- F7 production grader activation.
