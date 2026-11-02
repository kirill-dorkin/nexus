# ADR-0066: Home learning route

- Status: Accepted
- Date: 2026-11-02

## Context

The home catalog has four courses that form one path: HTML → CSS → JavaScript → SQL. Only a shared storyline (the «Зерно» coffee shop) connected them. Nothing in the product said which course comes first, what a course expects or where to go after it:

- the public catalog is ordered by Offering address (`ORDER BY organization_slug, offering_slug`), so production showed CSS first and the home page's "start the first course" opened CSS;
- the last lesson of a course led back to the same course page;
- each course opened by continuing the previous course's plot, without stating prerequisites.

The courses are also being rewritten without the storyline, so the connection has to come from the learning path itself.

## Decision

- Web owns one learning route for the home Organization (`apps/web/src/lib/learning-route.ts`): an ordered list of stable course slugs (ADR-0061) with what each course expects (`needs`), what it gives (`outcome`) and whether it builds on the previous step.
- Web orders the public catalog by the route: route courses first in route order, every other course afterwards in API order.
- The course page shows the route position, the steps as links, "what you need to know" (pointing to the previous course when it is the expected preparation), "what you will be able to do" and the next course.
- The last lesson of a route course links to the next route course instead of back to its own program.
- Course cards show the route step.
- A route step whose course is not in the public catalog is skipped, so the route never links to a missing page. If the catalog read fails, only the route is hidden.
- Story recaps no longer default to a storyline. They show a premise only when the lesson sets one, and only the cast the lesson names (default: the tool characters Bro and Nika).

## Consequences

- The route is presentation and discovery only. It grants no access, creates no Enrollment, gates no lesson and does not affect progress, Mastery or completion.
- Changing the route is a web change and needs no migration. When other Organizations need their own routes, or authors need to edit routes in Studio, the route becomes curriculum data with its own ADR. This file is the starting point for that.
- The API catalog order stays as it is. Other consumers of `/v1/public/learning` still get address order.
