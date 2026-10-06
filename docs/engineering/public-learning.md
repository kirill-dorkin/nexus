# Public free learning

An author imports/publishes a manifest-managed course, creates a normal self-paced/membership Offering, then deliberately opts it into public curriculum presentation. Every Offering defaults private; publication alone does not expose a course.

```text
PATCH /v1/organizations/:organizationId/offerings/:offeringId/visibility
{ "visibility": "public" }
```

The command requires an active session, active tenant membership, offering.manage and the configured exact Origin. `private` withdraws public reading. It grants no Membership/Enrollment and does not change the independent Commerce Product catalog.

Anonymous safe reads:

```text
GET /v1/public/learning
GET /v1/public/learning/:organizationSlug/:offeringSlug
GET /v1/public/learning/:organizationSlug/:offeringSlug/lessons/:lessonSlug
```

The first directory is bounded to 100 sorted eligible Offering addresses. Summaries include ordered lesson metadata; the selected Lesson response contains only learner-safe typed blocks. They expose no answer keys, validator configuration or internal UUIDs. Draft, legacy-without-Lessons, closed/private/cohort/paid, inactive Organization and archived Course paths fail closed. All responses/read fetches use no-store. Offerings continue to pin their exact immutable release.

Web pages:

```text
/
/courses
/learn/:organizationSlug/:offeringSlug
/learn/:organizationSlug/:offeringSlug/:lessonSlug
```

Set NEXT_PUBLIC_API_ORIGIN for the existing Web→API boundary and WEB_APP_ORIGIN for browser writes. Rendered video uses canonical YouTube ID only; Markdown supports headings/lists/emphasis/links/code without raw HTML or remote images. A safe empty directory is distinct from a loading failure. Unavailable/withdrawn content has a safe not-found page. Course/lesson pages are read-only at this frontier; C/D adds authenticated participation, progress and real checks.

Focused verification after exact-head GitHub CI is green:

```bash
pnpm db:migrate
pnpm test:integration apps/api/src/public-learning-http.integration.test.ts
pnpm test packages/contracts/src/public-learning.test.ts apps/web/src/components/learning/safe-markdown.test.ts
```

The existing `pnpm test:browser-launch` now includes production-build public learning pages with Chrome mobile/keyboard/navigation/Markdown containment and safe empty/404 checks. It uses a deterministic public projection seam; full learner persistence through real sessions/PostgreSQL is the launch slice's separate gate. See ADR-0054 and docs/roadmap/mvp-launch.md.
