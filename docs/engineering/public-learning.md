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

## Authenticated free learner entry (ADR-0055)

The public curriculum remains readable anonymously. The API's existing opaque HttpOnly session is the sole identity boundary; Web uses the same exact-origin credentialed direct transport. `/login?returnTo=...` accepts only exact local `/learn/:organizationSlug/:offeringSlug[/lessonSlug]` or `/me/learning` paths. Authentication returns to that address without joining or enrolling.

- `GET /v1/me/learning/:organizationSlug/:offeringSlug` returns strict public presentation plus own entry lifecycle hints and nullable derived progress.
- `POST /v1/public/organizations/:organizationSlug/memberships/me` remains the existing explicit Organization entry command. It grants no role or Enrollment.
- `POST /v1/me/learning/:organizationSlug/:offeringSlug/enrollment` accepts only `{}` and returns current own course state with HTTP 200, including for an active/completed duplicate. No caller user/tenant/offering/role/outcome is accepted.
- `GET /v1/me/learning?after=:cursor` returns at most 100 current own active/completed free learning courses and `nextCursor`. Keep following non-null cursors even if a page contains no supported public courses. A cursor is a locator only and cannot select another actor.

An active member can enroll even when new customer entry is closed. Invited/suspended/left membership, withdrawn/cancelled Enrollment and private/closed/paid/cohort/inactive curriculum do not become accessible through retries. Visibility still grants no membership or access right. Administrative enrollment.manage is unchanged. Commands lock the current gates and write canonical enrollment.created atomically only for the first insert; ambiguous retries reuse the canonical unique actor/Offering identity. Concurrent lifecycle deadlocks/serialization conflicts return retryable HTTP 409 rather than bypass a gate.

`required-activity-passes@1` derives counts from the exact own Enrollment and the Offering's pinned immutable Lesson graph. Distinct required ActivityVersions count once per course; normalized validation-derived passing Evidence makes a task passed. Raw/advisory/system-error/review results, manual Evidence and other enrollment/release work do not count. A later failed retry preserves a previous task pass. Informational Lessons do not invent completion, and a zero-required course exposes null percentage. Last action is the last referenced Attempt start; continue targets the first Lesson with remaining required work. All tasks passed does not transition Enrollment.completed and is separate from current Mastery/readiness.

Web exposes explicit entry/enrollment and own progress on course/Lesson pages, plus paginated `/me/learning`, continue and logout. Practice checking remains Slice D. The Chrome UX seam verifies return-to/explicit actions/reload rendering alongside real API sessions; canonical command/progress persistence is proven by PostgreSQL integration tests. The complete canonical learner browser path remains Slice F.

Focused maintainer verification after CI is green:

```bash
pnpm db:migrate
pnpm test:integration apps/api/src/free-learner-entry-http.integration.test.ts
```

The controlled enrollment outbox failure is an intentional rollback assertion.

## Deterministic quiz checks (ADR-0056)

`POST /v1/me/learning/:organizationSlug/:offeringSlug/quiz/:activitySlug/check` uses the existing exact-origin HttpOnly session. The strict body is `{attemptKey: UUID, answer: {type, optionId|optionIds|text}}`; the discriminated answer type must match the exact published ActivityVersion. Active own free Enrollment and current gates are revalidated before work and raw-result commits. The Activity must be referenced by the pinned Lesson structure. An attemptKey is never actor/tenant/outcome authority.

Progress commits a normal immutable Attempt and Submission with existing journal/outbox events. Validation computes quiz.*@1 from a server-only Content definition, commits raw result/event separately, then invokes the existing idempotent normalized Evidence/Mastery sink in a third transaction. Same-key retries preserve immutable work and repair raw/Evidence operational failures; changed answers need a fresh Attempt. Multi-select order is immaterial but duplicate/unknown options are rejected. Short text is NFC → trim → optional locale-independent lowercase. All checks are exact and binary, with no fuzzy matching, learner-code execution or partial credit.

The HTTP result exposes only attemptNumber, passed/failed, score 0/1 and fixed safe guidance. Private answer config and author explanation never enter the result, Evidence, public reads, Web props, HTML, storage or routine logs. Computed authority cannot be invoked through manual result recording. No new grants, tables, migrations or event names are added. Task progress is refreshed by authenticated reads and never completes Enrollment automatically.

Focused verification: `pnpm test:integration apps/api/src/learner-quiz-http.integration.test.ts`. Controlled submission/result outbox and Evidence failures are intentional recovery assertions. Unit contracts cover caller authority and pinned deterministic semantics; production Chrome covers labelled mobile form, focus, safe feedback, same-key ambiguous retry/new learner try and progress refresh through the existing non-canonical UX seam. Slice F will verify the complete canonical PostgreSQL learner path in the browser.

## Authorized author Offering discovery

`GET /v1/organizations/:organizationId/offerings?courseVersionId=:publishedVersionId[&after=:offeringId]`
returns at most 50 canonical Offerings pinned to the exact published CourseVersion, ordered by UUID with a nullable nextCursor. It is a tenant/session-owned, no-store read: the caller must have `offering.manage` at the corresponding course scope, just as when creating an Offering. This is **not** anonymous course discovery, an Offering activation command, or a cross-tenant search. An unavailable/foreign/unpublished release fails closed; a learner or anonymous caller cannot enumerate author Offerings. The `after` UUID is pagination only and grants no authorization. Existing explicit creation, `visibility=private` default, separate visibility PATCH, outbox and public eligibility rules remain unchanged.

The narrow read API unblocks a subsequent Studio UI slice to manage public entry and copy canonical learner links without duplicating existing Offerings. It introduces no migration, new table or alternate canonical state.
