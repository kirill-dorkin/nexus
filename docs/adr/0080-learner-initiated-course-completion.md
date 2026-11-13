# ADR-0080: Learner-initiated completion of a free course

- Status: Proposed
- Date: 2026-11-04
- Decision owner: product owner (open questions at the end)

> Draft prepared by WP-7 of `docs/roadmap/product-development-spec.md`. The number is reserved for the draft and may change on acceptance. Nothing in this ADR is implemented.

## Context

A learner on a free course can pass every required task, but the Enrollment stays `active` forever. "Мои курсы" therefore never shows a finished course, and the product has no moment of completion.

Today there is exactly one way to move an Enrollment to `completed` (ADR-0043):

- `POST /v1/organizations/:organizationId/enrollments/:enrollmentId/complete`, owned by Learning Progression;
- it requires the RBAC capability `progression.complete` on the Offering (granted to the `learner` role) **and** that the caller owns the Enrollment;
- the gate `course-readiness-enrollment-completion@1` allows it only when `course-progression-readiness@1` is `ready`: every course Skill has Mastery ≥ 0.8, at least 2 scored attempts and Evidence no older than 7 days.

A free learner cannot use it:

1. Free learners are role-less customer members (ADR-0047, ADR-0055). They hold no `learner` role and therefore no `progression.complete`.
2. The readiness gate measures Mastery, not task completion. A learner who passed every quiz once, or finished the course more than 7 days ago, gets `insufficient_evidence` and is blocked.

ADR-0055 also fixes that derived task progress (`required-activity-passes@2`, ADR-0062) is a UI statement only: "no percentage grants canonical completion" and there is no automatic `Enrollment.completed` transition. Product Constitution principle 3 says Completion ≠ Mastery.

Relevant code: `apps/api/src/modules/learning-progression/` (command and gate), `apps/api/src/modules/learner-learning/domain/course-progress.policy.ts` (the task-progress policy), `apps/api/src/modules/learning-delivery/application/learning-delivery-command.service.ts` (the canonical mutation and `enrollment.completed@1`).

## Decision (proposed)

### 1. An explicit learner command, never an automatic transition

The learner completes the course with an explicit action («Завершить курс»). Passing the last task does **not** complete the Enrollment by itself. This keeps the ADR-0055 rule — derived progress never changes canonical state — and makes completion a deliberate learner fact with a server-owned timestamp.

(Automatic completion on the last pass is listed as alternative B; it needs the owner's choice, see questions.)

### 2. A second gate policy for free self-paced Offerings

Learning Progression gets a second versioned policy next to ADR-0043's:

`course-task-enrollment-completion@1`

- **allow** when `required-activity-passes@2`, evaluated for the target Enrollment in the same transaction, reports `allRequiredPassed = true` for the Offering's **current** pinned CourseVersion (passes from earlier versions count through stable Activity lineage, ADR-0062);
- **block** otherwise, with the counts (`passedRequired`, `totalRequired`) in a machine-readable `progression_gate_denied` response;
- a course with zero required tasks is **blocked** (it never becomes complete without work); see question 4.

Optional readiness (only if the owner chooses option «задачи + готовность» in question 2): the gate additionally requires `course-progression-readiness@1 = ready`. There is no per-Offering readiness setting today; making it configurable per Offering would need a migration and a separate ADR.

ADR-0043's policy and endpoint stay unchanged for role-holding learners in cohort/paid Offerings.

### 3. One implementation of task progress

The pure function behind `required-activity-passes@2` moves from `learner-learning/domain` to `learning-progression/domain` (or a shared progression domain file). Learner Learning keeps using it for reads; the completion gate uses the same function over the same canonical inputs (Content learner structure + lineage port, Learning Progress course-activity observation port). Read and gate cannot drift, the same way ADR-0043 routes the readiness read and the gate through one query.

### 4. Authority: relationship-based, like ADR-0055/0056

The command is exposed by Learner Learning, addressed by public slugs:

`POST /v1/me/learning/organizations/:organizationSlug/offerings/:offeringSlug/complete` with an empty strict body.

It requires exact browser Origin and the API session. In one tenant `REPEATABLE READ` transaction it revalidates and locks, in this order:

```text
active identity
  -> active Organization + active role-less or role-holding Membership
  -> current Offering gates: public, open, self_paced, access_mode = membership, free
  -> published manifest Course
  -> own Enrollment (actor = authenticated principal)
  -> lifecycle: completed -> return it (idempotent); withdrawn/cancelled -> 409
  -> course-task-enrollment-completion@1
  -> Delivery completeEnrollment (server-owned completedAt)
  -> enrollment.completed@1 outbox event, same transaction
  -> commit
```

No RBAC role, `progression.complete` grant, Entitlement or Membership is created. Paid, cohort, closed or private Offerings fail closed and keep the ADR-0043 path. Serialization failure returns a retryable 409 (`progression_concurrency_conflict`), as in ADR-0043.

### 5. Events

No new canonical event. The Delivery command emits the existing `enrollment.completed@1` exactly once, atomically with the row. A retry on a completed Enrollment returns it without a second event. Optionally the payload may gain `completionPolicy: { key, version }` as an additive v1 field; consumers that ignore it are unaffected. No operational log event is needed (ADR-0052 covers only launch-critical commerce boundaries).

### 6. What a completed Enrollment allows

ADR-0043 states that "existing active-Enrollment guards naturally prevent new Attempts", and ADR-0056 quiz checks require an own **active** Enrollment. After completion the learner could no longer check answers. Options (question 3):

- **A (recommended):** lessons stay readable (they are public anyway), browser practice keeps working (it is never Evidence), and quiz checks on a completed Enrollment return a clear "курс завершён, проверка не сохраняется" state without creating Attempts.
- **B:** allow Attempts on a completed Enrollment for free Offerings. This changes the ADR-0043/0056 invariant and the meaning of "completed".

The terminal lifecycle trigger (`000031`) is unchanged: a completed Enrollment stays completed, even if the Offering later moves forward to a version with new tasks (ADR-0062).

### 7. Web

- Learner Learning state adds a derived hint `completion: { eligible: boolean, status }`.
- When all required tasks are passed and the Enrollment is active, the course page, the last lesson and "Мои курсы" show «Завершить курс» with a short explanation of what it means.
- After completion: badge «Пройден» with the date (the badge already exists in `my-learning.tsx`), the next-course link from ADR-0066, and the quiz state from §6.
- Accessible result announcement (`aria-live`), an e2e path and axe coverage.

### 8. What completion is not

Completion does not issue a certificate, change Mastery or readiness, grant/revoke Entitlement, or close the Offering. A certificate is a separate decision.

## Consequences

- Free learners get a real completion state with a timestamp and an outbox event that a future certificate, email or analytics consumer can use.
- Completion stays separate from Mastery: it means "all required tasks passed", not "skills demonstrated and fresh".
- No migration: the Enrollment lifecycle columns, trigger and Delivery command already exist.

## Alternatives considered

- **B. Automatic completion on the last passing check.** Fewer clicks, but it turns derived progress into a canonical side effect inside the quiz-check pipeline (ADR-0056 stages), and a learner cannot choose to keep practising before "finishing". Rejected unless the owner prefers it.
- **C. Grant free learners the `learner` role and reuse ADR-0043.** Breaks the role-less entry model of ADR-0047/0055 and still blocks on Mastery freshness.
- **D. Readiness-only gate for everyone.** Most learners would be blocked by the 7-day freshness and 2-attempt rules; completion would feel arbitrary.

## Scope estimate

S–M, about 2 days: move the policy function, add the gate and use case with unit tests, the Learner Learning route with PostgreSQL integration tests (ownership, lifecycle, idempotency, concurrency, paid/cohort fail closed, no role escalation), Web button/state, e2e and axe. No migration.

## Verification (when implemented)

Integration tests: role-less member completes own free Enrollment only when all required tasks passed; another user's Enrollment, paid/cohort Offerings, withdrawn Enrollments and missing Membership fail; retry emits no second event; gate denial emits nothing; concurrent requests produce one event. Unit tests for the policy, including zero required tasks and passes from an earlier version.
