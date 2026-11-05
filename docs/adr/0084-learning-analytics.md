# ADR-0084: Learning analytics for the open beta

- Status: Accepted (owner, 2026-11-05)
- Date: 2026-11-05
- Supersedes for now: the proposed counting-only design of draft ADR-0081 (#171)

## Context

The owner opened the beta to everyone and wants to steer the product by data:
- how many people reach each lesson;
- where they drop off;
- how much time a lesson and a course really take.

Draft ADR-0081 counted events only, without people or time, so it cannot answer «how long does the HTML course take». The beta is small at the start. The privacy policy (#174) describes learning analytics, and registration records consent.

## Decision

1. **Collected on lesson pages:**
   - one `lesson_viewed` per page view;
   - the first `video_started`, the first `practice_run` (first edit of an in-browser practice) and `signup_clicked` per page;
   - **active time** — seconds while the page is visible and the learner used it within the last 60 seconds, sent in chunks of 1–60 seconds every 30 seconds and when the page hides.

   The client is `apps/web/src/lib/analytics/` and the contract is `@platform/contracts` `learningAnalyticsBatchSchema`. Events carry only the public lesson address (organization, Offering and lesson slugs, as in the URL) and closed enums. No URL, query, referrer, user agent, screen size or client identifier is sent.
2. **Endpoint `POST /v1/analytics/learning`:**
   - only the site's exact Origin;
   - rate limit `analytics.learning`, 120 requests per minute per address (ADR-0070);
   - answers `204`;
   - the session cookie is sent. When it is valid, active time is attributed to that learner; otherwise the request stays anonymous.
3. **Storage** in a new `analytics` schema owned by the Learning Analytics module (migration 000053):
   - `analytics.lesson_daily` — per organization, Offering, lesson and UTC day, a counter per metric:
     - `lesson_viewed`, `video_started`, `practice_run`, `signup_clicked`;
     - `active_seconds_anonymous`, `active_seconds_signed_in`.

     It holds no identifiers.
   - `analytics.learner_lesson_time` — per signed-in learner and lesson: active seconds, first and last seen. Deleted with the user (`ON DELETE CASCADE`).
   - Both tables have tenant RLS for reads. The runtime role cannot write directly: writes go only through `analytics.record_lesson_step` and `analytics.record_active_time` (`SECURITY DEFINER`). Those functions resolve the address to a lesson of a currently public, open, self-paced Offering and drop anything else, so the tables cannot be filled with arbitrary keys.
4. **Completion.** Whether and when a learner completed a lesson is not stored here. It comes from Learning Progress (`required-activity-passes@2`) through its public ports when the Studio dashboard is built (next slice). Analytics never feeds a business decision: access, progress and Evidence ignore it.
5. **Studio dashboard** (next slice), for `offering.manage`. Per lesson:
   - views;
   - learners who started and who completed;
   - completion rate;
   - median active minutes;
   - median days from start to completion;
   - the biggest drop-off.

   Per course:
   - sign-ups and active learners per day;
   - D1 and D7 return;
   - median time to finish.

   Cells under 5 people show «< 5».
6. **Retention:**
   - daily counters — 25 months;
   - learner rows — while the account exists.

   Cleanup is a later operational task. With a small beta the data is tiny.

## Consequences

- Active time is an estimate: a learner reading without touching the page for over a minute is counted as idle. Ad blockers, disabled JavaScript and closed tabs before a flush lose a few seconds.
- The first batch after load always contains `lesson_viewed`, so a page view costs one request. Active time adds about two requests a minute per open lesson.
- Unique anonymous visitors are not known by design. Counting them would need a client identifier and a new decision about consent.
