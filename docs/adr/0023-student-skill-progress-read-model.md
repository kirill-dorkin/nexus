# ADR-0023: Student skill progress is an Enrollment-scoped composition over current Mastery

- Status: Accepted

## Context

F4 already has the canonical ingredients needed for the first learner-facing skill progress view:

- Delivery owns `LearningOffering` and `Enrollment`; every Offering pins one immutable `CourseVersion`.
- Content owns stable `Skill` identity and the immutable `CourseVersionSkill` presentation snapshot.
- Progress owns normalized Evidence and the current organization-wide Mastery projection per `(organization, learner, skill)`.
- Recommendations own next-best-action policy and Learning History owns append-only learner lifecycle history.

The existing raw Mastery endpoint is an internal/domain-facing projection contract. It exposes algorithm key/version and projection timestamps, omits skills with zero Evidence, and is organization/user scoped. It is therefore not the right learner UI contract.

## Decision

### Scope

The first Student skill progress read model is scoped by an exact `Enrollment`.

`Enrollment -> LearningOffering -> CourseVersion` selects the immutable set and presentation of skills shown to the learner. The mastery value for each selected skill remains the learner's current organization-wide Mastery projection for that stable `Skill` identity.

This does **not** create enrollment-specific, offering-specific, or course-specific Mastery. Evidence and Mastery ownership remain unchanged.

### Composition boundary

The read model is assembled synchronously inside the Learning Progress application layer through public application interfaces:

- `LearningDeliveryQuery.requireEnrollment(...)` supplies Enrollment and Offering context;
- `LearningContentQuery.requirePublishedLearningGraph(...)` supplies immutable `CourseVersionSkill` snapshots;
- `MasteryQuery.listUserMastery(...)` supplies current projections.

Application code must not read Delivery or Content tables/repositories directly.

No new persistence, projection table, migration, or outbox event is introduced for this read model.

### Learner contract

The learner-facing contract exposes, per course-version skill:

- stable `skillId`;
- snapshot `title`, `description`, and `position` from `CourseVersionSkill`;
- learner-facing state;
- `masteryScore` when assessed;
- `evidenceCount`;
- `scoredEvidenceCount`;
- `lastEvidenceAt` when any Evidence exists.

The contract intentionally hides Mastery implementation fields such as algorithm key/version and projection `computedAt`. The underlying persisted Mastery projection remains version-tagged as required by ADR-0005; implementation metadata is not a learner UI concern.

### Honest learner states

The read model uses three deterministic states and does not invent a confidence model:

1. `unobserved`
   - no Mastery projection exists for the skill;
   - `evidenceCount = 0`;
   - `scoredEvidenceCount = 0`;
   - `masteryScore = null`;
   - `lastEvidenceAt = null`.
2. `observed_unscored`
   - Evidence exists;
   - no scored Evidence exists;
   - `masteryScore = null`.
3. `assessed`
   - at least one scored Evidence record exists;
   - `masteryScore` is the current Mastery projection value.

A missing projection must never be rendered as mastery `0`. Unknown state remains explicitly unknown.

### Zero-Evidence skills

Every skill in the pinned published `CourseVersion` is returned, including skills with zero Evidence. This lets the UI distinguish "not yet observed" from low assessed performance.

Skills are ordered by immutable course-version `position`, then stable `skillId` as a deterministic tie-breaker.

### Authorization

The v1 endpoint is own-Enrollment only:

- the authenticated user must own the Enrollment;
- the user must have `mastery.read` on the Offering scope.

The read uses the non-active Enrollment lookup so a learner can still view the course-version skill set after completion, withdrawal, or cancellation. The displayed Mastery is current organization-wide skill state, not a historical snapshot frozen at Enrollment completion.

Instructor/mentor read-others is deliberately not inferred from the existing raw `mastery.read_others` capability. A learner-facing read-others product surface requires separate policy.

### Relationship to Recommendations and Learning History

Recommendations and Learning History remain separate read models. Student skill progress does not embed next activity recommendations or event history, and neither subsystem becomes part of Mastery ownership.

A UI may call those endpoints alongside skill progress, but the backend contracts remain independently evolvable.

## Consequences

- learner UI receives a stable course-contextual skill list without exposing algorithm internals;
- zero-Evidence and unscored Evidence states remain explicit rather than being collapsed into false numeric certainty;
- Content continues to own curriculum presentation snapshots;
- Delivery continues to own learner/course context;
- Mastery stays organization-wide by stable Skill identity;
- no data duplication or migration is required;
- historical Enrollment access displays current skill state and must not be interpreted as a completion-time snapshot;
- future confidence models, readiness semantics, instructor read-others views, and richer recommendation context require explicit later decisions rather than being smuggled into this contract.

## Amendment — 2026-11-04: own skills for role-less free learners

Free self-enrolled learners (ADR-0055) hold no role assignment, so the `mastery.read` rule above never let them see their own skills. Learner Learning now exposes `GET /v1/me/learning/{organizationSlug}/{offeringSlug}/skills`, which reads skill progress on the same relationship basis as own quiz checks:

- the actor is the authenticated principal; the route resolves the public free Offering, requires an active Membership and the actor's own active or completed Enrollment, and answers 404 otherwise (401 when anonymous);
- Progress serves it through the narrow `OwnSkillProgressQuery` port inside the caller's read-only snapshot and re-checks that the Enrollment belongs to the actor; it grants no role and does not reuse `mastery.read`;
- the response is the skill list only (`learnerCourseSkillsSchema`): no organization, Enrollment, Offering or CourseVersion ids.

The UUID route with `mastery.read` stays for role-holding learners. States, ordering and organization-wide Mastery semantics are unchanged. Web shows «Навыки курса» on the course page and counts a skill as mastered in «Моё обучение» from the readiness mastery target (0.8, ADR-0041) on; that threshold is presentation only.
