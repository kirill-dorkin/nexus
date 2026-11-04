# ADR-0081: Anonymous learning funnel per lesson step

- Status: Proposed
- Date: 2026-11-04
- Decision owner: product owner (open questions at the end)

> Draft prepared by WP-7 of `docs/roadmap/product-development-spec.md`. The number is reserved for the draft and may change on acceptance. Nothing in this ADR is implemented.

## Context

The owner cannot see where learners drop off: how many open a lesson, start the video, run practice, check a quiz, pass it, sign up, enrol and finish. The data partly exists:

- **Canonical events** in `events.outbox`, committed atomically with business state: `enrollment.created`, `enrollment.completed`, `attempt.started`, `submission.submitted`, `validation.result_recorded`, `evidence.recorded`. They cover only signed-in learners and carry `actor_user_id`.
- **Anonymous behaviour** — opening a lesson, playing a video, running browser practice (ADR-0064/0065) — leaves no trace. Practice is deliberately never Evidence.
- **ADR-0067** gives a strict, Origin-checked, best-effort client channel (`POST /v1/telemetry/web`) that only writes log lines, with route templates and no slugs or identifiers.
- **ADR-0052** forbids turning telemetry into a searchable identity ledger.

There is no analytics table, no scheduled job runner in production (the worker hosting decision is still open), and no privacy policy yet (see the legal-minimum draft).

## Decision (proposed)

### 1. What is measured: steps of one lesson

For each published lesson (Offering + stable Lesson identity), per UTC day:

| Step | Source | Who |
|---|---|---|
| `lesson_viewed` | client event | everyone |
| `video_started` | client event (first play per page view) | everyone |
| `practice_run` | client event (first run per challenge per page view) | everyone |
| `signup_prompt_clicked` | client event (sign-up action shown on a lesson) | anonymous |
| `quiz_checked` | `submission.submitted` | signed-in |
| `quiz_passed` | `evidence.recorded` with passed validation outcome | signed-in |
| `enrolled` | `enrollment.created` (attributed to the course, not a lesson) | signed-in |
| `course_completed` | `enrollment.completed` (if ADR-0080 is accepted) | signed-in |

Client steps count **events**, not people: there is no visitor identifier. Canonical steps may also count **distinct learners per day**, computed at aggregation time and stored only as a number.

### 2. Client events extend ADR-0067 with one new event

`web.learning_step` — `release, step, offeringSlug, lessonSlug, activitySlug?`:

- `step` from a closed enum (the client steps above);
- slugs are **public curriculum identifiers** that already appear in public URLs. They describe content, not people. This is a narrow, explicit exception to ADR-0067's "no slug" rule, limited to this event;
- the same strict schema rejects any other field; no URL, query, user, session, cookie, user agent or IP-derived value is sent or stored;
- deduplicated per page view in memory (one `lesson_viewed`, one `video_started` per page, one `practice_run` per challenge), sent through the existing batched `keepalive` transport with `credentials: "omit"`.

The API validates that the slugs resolve to a currently public lesson (unknown pairs are dropped, so the table cannot be filled with arbitrary keys), then increments the day counter. It never stores individual events. The endpoint is covered by the WP-1.3 rate limit (60/min per IP, keyed by HMAC; raw IPs are not stored).

### 3. Storage: one daily counter table, no event rows

A new schema owned by a small **Learning Analytics** module:

```sql
analytics.lesson_step_daily (
  organization_id uuid, offering_id uuid, lesson_id uuid, activity_id uuid null,
  day date, step text, events integer, learners integer null,
  primary key (organization_id, offering_id, lesson_id, activity_id, day, step)
)
```

- tenant RLS on `organization_id`, like every tenant table;
- client steps: `INSERT … ON CONFLICT DO UPDATE SET events = events + 1` through a narrow `SECURITY DEFINER` function (the anonymous endpoint has no tenant context);
- canonical steps: a daily idempotent aggregation recomputes yesterday's rows (`DELETE` + `INSERT` for that day and step in one transaction). Today's outbox payloads are not enough on their own: `submission.submitted` and `evidence.recorded` carry Attempt/Submission/Skill ids but no Offering or Lesson, and `evidence.recorded` has a null actor. So the canonical events define **what** is counted, and the counts come from owner modules through new read-only public ports: Learning Progress returns per-day counts of submissions, passes and distinct learners per Enrollment Offering and ActivityVersion; Learning Delivery returns per-day Enrollment counts; Learning Content maps ActivityVersion to Lesson. Only numbers cross into Analytics; user ids never do;
- the aggregation runs as a protected API route triggered by Vercel Cron (`CRON_SECRET` header), because no worker host is decided. It can move to the worker later without changing the table.

Analytics depends only on public application ports of Progress, Delivery and Content; it never reads another module's tables, and no business decision reads analytics.

### 4. Retention

- Daily counters: kept for **25 months**, then deleted by the same daily job (allows year-over-year comparison). Owner question 3.
- No per-event or per-user analytics rows exist, so there is nothing personal to delete on account removal.
- Outbox retention is out of scope; it stays a separate decision.

### 5. Studio view

`/studio/…/offerings/:offering/funnel`, visible to users with `offering.manage` on the Offering (no new role):

- period selector (7 / 30 / 90 days) and course version;
- a table of lessons in course order with the steps as columns and step-to-step conversion; per-lesson drill-down by activity;
- **small-number suppression:** any cell below 5 shows «< 5», and conversions are not computed from suppressed cells, so a single learner cannot be singled out in a small course;
- plain-language caveats on the page: client counts are approximate (ad blockers, no JavaScript, bots that run JavaScript), and anonymous counts are events, not people.

### 6. Privacy limits (fixed by this ADR)

- No cookies, local storage identifiers, fingerprinting or third-party analytics scripts.
- No IP, user agent, URL, query or referrer is stored. IP is processed only transiently for rate limiting (as a keyed hash).
- Canonical aggregates contain no user identifiers; distinct-learner counts are numbers only.
- Under 152-ФЗ, aggregate counts without identifiers are not personal data. The privacy policy (legal-minimum draft) should still describe this analytics in plain words. If the owner later wants unique visitors, a visitor identifier would require consent and a new ADR.

## Consequences

- The owner sees drop-off per lesson and step within a day of real traffic.
- One migration (new schema, table, function, grants) and a cron secret are required; the migration must be applied by the owner before the code PR.
- Client-side numbers are approximate by design; canonical numbers are exact for signed-in learners.

## Alternatives considered

- **Hosted product analytics (Yandex Metrica, PostHog, GA).** Fast and feature-rich, but sends URLs, device data and visitor identifiers to a third party, needs a cookie banner and consent, and conflicts with ADR-0052/0067. Rejected for now; the owner may choose it explicitly (question 1).
- **Store every client event in a table.** Allows ad-hoc analysis, but creates a growing behavioural log that can be joined back to people and needs its own retention and deletion process.
- **Log lines only (pure ADR-0067).** No storage, but Vercel log retention is short and logs cannot drive a Studio screen.

## Scope estimate

M, about 3–4 days: migration with RLS and the counter function; contract and client hooks in the lesson page (video, practice, sign-up prompt); API ingestion with slug resolution; daily aggregation route with Vercel Cron and integration tests (idempotent re-run, tenant isolation, no identifiers in rows); Studio screen with suppression, e2e and axe.
