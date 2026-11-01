# ADR-0061: Stable public course addresses

- Status: Accepted
- Date: 2026-11-01

## Context

A public free Offering is pinned to one immutable published CourseVersion, and its identity (including `course_version_id`) is protected by `learning_delivery.protect_learning_offering_identity`. Publishing a new course version therefore requires a new Offering with a new slug that is unique within the Organization. Public learner links were built from the Offering (`/learn/{organization}/{offering}`). As a result, every content update changed the address learners had saved, and the Organization slug appeared in every link.

## Decision

The public learner address of a course is keyed by the **Course slug**. This is curriculum identity and survives new versions. It is not keyed by the Offering slug, which is a Delivery detail.

- Delivery owns the resolution. `learning_delivery.resolve_public_course_offering(org_slug, course_slug)` returns the newest public, open, self-paced, membership Offering among the course's published manifest-v1 versions. It is a narrow `SECURITY DEFINER` gate granted to the runtime role. Content supplies the candidate versions through `learning_content.find_public_course_version_ids`, which is private (not granted to the runtime role), following the existing pattern where Content asks Delivery's resolver for the version.
- The public course projection now includes `course.slug`.
- The API adds `GET /v1/public/learning/{organization}/courses/{course}` and `.../courses/{course}/lessons/{lesson}`. These return the same DTOs as the Offering addresses, including the resolved Offering slug. Learner writes (enrollment, quiz checks) still name the exact Offering.
- On the Web, courses of the site's own Organization (`NEXT_PUBLIC_HOME_ORGANIZATION_SLUG`, default the brand slug) are served at `/courses/{course}` and `/courses/{course}/{lesson}`. Their former Offering addresses redirect permanently there. Courses of other Organizations keep `/learn/{organization}/{offering}`.
- Offering identity stays immutable. The operator launch script names new Offerings `{course}-v{N}` and hides the course's older public Offerings, so exactly one Offering serves the stable address.

## Consequences

Learner links, sitemap entries, structured data and canonical URLs no longer change when a course is republished.

Enrollment and attempts remain Offering-scoped. A learner enrolled in the Offering for an older version is not moved automatically; the next quiz check enrolls them in the current Offering. Their attempts against the old ActivityVersions remain in history. Carrying course progress across versions (an Offering retarget, or progress keyed by stable Activity identity) is a separate, reviewed change.

If two public Offerings of the same course exist at once, the stable address shows the newest. The catalog may still list both until the older one is hidden.

## Amendment — 2026-11-02: learner continuity

ADR-0062 closes the gap named in the consequences above. Free self-paced Offerings now move forward to the newer version instead of being replaced, so Enrollments and completed tasks carry over. The operator script no longer creates `{course}-v{N}` Offerings for new versions.
