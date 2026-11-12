# ADR-0086: Product analytics with PostHog

- Status: Accepted (owner, 2026-11-07)
- Date: 2026-11-07
- Complements: ADR-0084 (learning analytics)

## Context

The owner wants as much behaviour data as possible to drive development, including visitors who never sign up: which pages they open, where they come from, what they click and where they leave.

ADR-0084 covers only lesson pages. It keeps identifier-free daily counters, and per-learner active time only for signed-in learners. It cannot show a visitor's path, sources, the home and catalog pages, or a recording of what went wrong.

Building that in-house (visitor ids, an event store, funnels, session replay) would take weeks. The owner chose PostHog over Yandex Metrica and over an in-house build. The reasons:
- product funnels and paths;
- linking the anonymous visitor to the account;
- session replay;
- an API the agent can query to turn data into tasks.

## Decision

1. **PostHog Cloud EU** (Frankfurt), `posthog-js` pinned in `@platform/web`. It is loaded with a dynamic import about 2 s after the page, so it is never on the critical path.
2. **Proxy.** Traffic goes through this site: Vercel rewrites `/ingest/static/*` → `eu-assets.i.posthog.com` and `/ingest/*` → `eu.i.posthog.com` (vercel.json). The Content Security Policy keeps `connect-src 'self'`, and fewer events are lost to blockers.
3. **Consent.** Covered by 152-ФЗ and the Kyrgyz law on personal information, because an identifier in a cookie plus the IP address is personal data.
   - Until the visitor chooses, and after «Только необходимые», PostHog runs with `cookieless_mode: "on_reject"` and `opt_out_capturing_by_default`. Nothing is stored on the device. Visitors are told apart only by a server-side hash with a daily salt.
   - «Принять» calls `opt_in_capturing()`. It turns on:
     - cookies and a stable anonymous id;
     - session recording with `maskAllInputs`;
     - `identify(userId)` after sign-in, with the internal user id only and never the email.
   - The choice lives in `localStorage` (`dorkin.analytics-consent`). The banner is `components/consent/analytics-consent.tsx`.
4. **Captured.**
   - Pageviews on every route change, page leaves and autocapture.
   - `person_profiles: "identified_only"`: anonymous visitors do not create person profiles.
   - Named funnel events through `track()` (added 2026-11-12, see «Funnel events» below).
5. **Only production.** `NEXT_PUBLIC_POSTHOG_KEY` is set at build time only when `VERCEL_ENV === "production"`. Previews, CI, e2e and local runs show no banner and send nothing. The project key is public by design: it can only send events. The read key for reports is a Personal API key. It lives in the owner's macOS Keychain, never in the repository.
6. **Scope.** ADR-0084 stays the source for learning metrics in Studio. PostHog never feeds access, progress or Evidence.
7. **Retention:**
   - events — up to 12 months;
   - recordings — 30 days.

   This is the PostHog plan default, stated in the privacy policy.

## Consequences

- The privacy policy names PostHog as a processor (EU, cross-border transfer) and describes both modes.
- The owner must enable «Cookieless server hash mode» in the PostHog project settings. Without it, PostHog drops the cookieless events.
- The agent reads PostHog through its query API to report drop-offs and build tasks; reports never include personal data.
- Ad blockers that block the proxy path, and disabled JavaScript, still lose some visits.

## Funnel events (2026-11-12)

The owner wants a funnel from short videos to a paid subscription. PostHog already records the source (`utm_*`, referrer) with every pageview, so the funnel needs only named steps. `track()` accepts a closed list of names (`FunnelEvent`):

| Event | When | Properties |
|---|---|---|
| `lesson_viewed`, `video_started`, `practice_run`, `signup_clicked` | the first time on a lesson page; the same steps as ADR-0084, forwarded by the lesson tracker | `organization`, `offering`, `lesson` |
| `signup_completed`, `login_completed` | password registration or sign-in succeeded, just before the redirect | `method: "password"` |
| `course_started` | free self-enrollment succeeded | `organization`, `offering`, `automatic` |
| `quiz_checked` | a quiz answer was checked | `organization`, `offering`, `lesson`, `activity`, `outcome`, `attempt` |

- Properties are public slugs and outcomes only: never emails, names, answers or typed text.
- Before a redirect, `track(…, { beforeNavigation: true })` sends with `sendBeacon` and waits at most 400 ms for PostHog to load, so sign-in is never held up.
- OAuth sign-ups finish on the API redirect and are not counted as `signup_completed` yet. The account link (`identify`) still joins their later events.
- The events follow the consent rules above: cookieless until «Принять».

