# ADR-0062: Forward retarget of free Offerings and progress across course versions

- Status: Accepted
- Date: 2026-11-02

## Context

An Offering was pinned to one immutable CourseVersion for its whole life (000011). Republishing a course therefore meant a new Offering, a new Enrollment for every learner, and progress that started from zero, because `required-activity-passes@1` counted passes for the exact ActivityVersions of the pinned release. ADR-0061 kept the public address stable, but it explicitly left learner continuity open.

## Decision

1. **Forward retarget.** A free, self-paced Offering may move to a **newer published version of the same Course**: `PATCH /v1/organizations/{org}/offerings/{offering}/course-version` with `{ courseVersionId }`. The action requires `offering.manage` on the Offering, an active user and the exact browser Origin.
   - Moving to the current version is an idempotent no-op.
   - Moving backwards, to another course, or to an unpublished version is a conflict.
   - The Offering keeps its id, slug, visibility and Enrollments.
2. **Database guard.** `protect_learning_offering_identity` now allows a change of `course_version_id` only when all of the following hold:
   - the target version is published, belongs to the same Course and has a higher `version_number`;
   - the Offering is `self_paced` with `access_mode = membership`;
   - the Offering has no course runs and no assignments.

   Every other identity column stays immutable. The runtime role gets `UPDATE (course_version_id)` under this guard.
3. **Event.** The change is committed atomically with `learning_offering.retargeted@1`: `{ organizationId, offeringId, courseId, fromCourseVersionId, toCourseVersionId }`.
4. **History stays exact.** Published curriculum is never modified. An Attempt still pins its exact ActivityVersion, and attempt/assignment version checks still run only at insert time, so recorded history stays valid. New attempts after a move pin the new version's ActivityVersions.
5. **Progress policy `required-activity-passes@2`.** A required task counts as passed when the learner's own Enrollment has a validation-derived passing Evidence for **any published version of the same stable Activity**.
   - Learning Content provides the version→Activity lineage through its learner content port (`activityLineage`). Learning Progress still reads only its own Attempts and Evidence.
   - Everything else from ADR-0055 is unchanged: own Enrollment only, normalized validation Evidence only, a pass stays passed after a later failed retry, and there is no progress table.
6. **Operator launch.** `scripts/launch-course.mjs --new-version` moves the existing public Offering forward instead of creating `{course}-v{N}`. It creates a new Offering only for the first publication or when the old one cannot move.
   - A course keeps **one public Offering**. The script lists Offerings on every published version of the course (`GET …/offerings?courseVersionId=…&scope=course`, authorized like the per-version list), not only on the previous version. An Offering left on an older version was once missed and stayed public next to a new `{course}-v{N}` duplicate.
   - It keeps the `--offering-slug` Offering if given, otherwise one still on an older version (it carries the learners' history). It moves that one forward and makes every other public Offering of the course private. Rerunning the script without `--new-version` repairs a duplicate the same way.

## Consequences

- Republishing no longer resets learners. Their Enrollment, address and completed tasks carry over, and the content they see is the new version.
- A task whose meaning changed substantially should get a new activity identity in the manifest, a new slug. Keeping the identity means earlier passes still count.
- Cohort Offerings, Offerings with assignments and paid (`entitlement_required`) Offerings keep their pinned version. Moving them needs its own reviewed decision covering runs, sessions, assignment targets and purchase terms.
- The progress DTO reports `policyVersion: 2`.
