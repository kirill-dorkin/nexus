# ADR-0085: Feedback module for the open beta

- Status: Accepted
- Date: 2026-11-05

## Context

The open beta (anyone registers and learns, no participant cap, no weekly norm) is steered by what learners tell us and by analytics. Until now the only channel was a messenger outside the product: messages arrived without the page, the lesson or the release they were about, and nobody could see which ones were handled.

## Decision

- **Module.** A new module `feedback` owns `feedback.reports` (migration 000054). It does not own users, organizations, curriculum or analytics. It reads nothing from other modules' tables: the Organization is resolved through `PublicOrganizationQuery.resolveActiveId` (Organizations), the signed-in user through `IdentityApplicationService.requireActiveUser`, and Studio access through `AuthorizationApplicationService.requireCapability`.
- **A report** has: id, Organization, optional user id (when signed in), kind `problem` | `unclear` | `idea`, text (10..4000 after trimming), optional «what you expected» / «what happened» (problem only, up to 2000 each), page context, release, optional coarse device `mobile` | `desktop`, status `new` | `accepted` | `duplicate` | `rejected` | `done`, owner note (up to 2000), `created_at`, `updated_at`.
- **Page context is set by the server.** Web sends the pathname only (no query, no fragment). The API matches it against a closed list of route templates (`feedbackPageContext` in `@platform/contracts`) and stores the template plus the course and lesson slugs when the template has them. Anything else is stored as `other`. The pathname itself is never stored.
- **Release** is the API's `VERCEL_GIT_COMMIT_SHA` cut to 12 characters (`local` elsewhere), the same value as `/v1/health`. Web cannot set it.
- **Organization.** Web sends the Organization slug of the page: the one in `/learn/{organization}/…`, otherwise the home Organization. The runtime role never turns a slug into a tenant id (the tenant-id resolver stays closed, as the public catalog boundary test requires). Instead `feedback.submit_report` (`SECURITY DEFINER`) resolves the active public Organization, inserts the report and its outbox event in the caller's transaction and returns only the report id, or NULL (→ 404) when the Organization is not active and public. The author is taken from `app.user_id`, which the API sets for a checked session.
- **Tenant isolation.** `feedback.reports` has tenant RLS: the application role sees and changes only rows of `app.organization_id`, and may insert a row with a user id only when it equals `app.user_id`. Only `status`, `owner_note` and `updated_at` can be updated; nothing can be deleted by the application.
- **Atomic outbox.** Creating a report writes (inside `feedback.submit_report`) `feedback_report.submitted` (v1) and a status/note change writes `feedback_report.triaged` (v1) in the same transaction. Payloads carry kind, status, page context, release and whether the author was signed in, never the text, the note or the user id beyond `actor_user_id`.
- **HTTP.**
  - `POST /v1/feedback`: exact `Origin` equal to `WEB_APP_ORIGIN` for every caller, signed in or not; session optional; strict body (`createFeedbackReportRequestSchema`, with the `zod/mini` copy `clientCreateFeedbackReportRequestSchema` for the browser); `201 { id }`.
  - Rate limit `feedback.report`: 10 per hour per address (ADR-0070).
  - `GET /v1/organizations/{organizationId}/feedback?status&kind&lessonSlug&after`: newest first, 50 per page.
  - `PATCH /v1/organizations/{organizationId}/feedback/{reportId}`: status and/or owner note; exact Origin.
  - Both Studio routes need the new capability `feedback.manage`, held by `organization_owner` and `organization_admin`.
- **Not stored:** IP address, user agent, cookies, screenshots, quiz or assignment answers, the URL or its query.
- **Web.** The footer of every learner page (the shared learner shell: courses, lessons, characters, map, my learning, blog, legal pages) and the end of every lesson have a «Сообщить» button that opens an accessible dialog (kind, text, and for problems «what you expected» / «what happened»). The dialog code loads only when the button is pressed, so page budgets do not change. The header stays unchanged: it has no room on phones for another control next to the longer product name. Studio has «Отзывы учеников» per Organization (`/studio/{organizationId}/feedback`): newest first, filter by status, status change in place.

## Consequences

- The owner sees each report with its lesson and release and can mark it handled; the status history lives in the outbox for a later consumer.
- Anonymous reports are possible. Abuse is bounded by the per-address limit and by exact Origin; a shared school address shares the 10 per hour.
- Text is free input and may contain personal data a learner chose to write. It stays in the tenant table, is shown only to owners and admins, and is not copied into events or logs.
- Adding a learner route that should report its template means adding it to `FEEDBACK_ROUTES`.

## Alternatives

- **Store the full URL.** Rejected: queries can carry tokens or personal data, and slugs in a fixed template are enough to find the lesson.
- **Only signed-in reports.** Rejected: the first problem a newcomer hits is often before registration.
- **An external form or the messenger only.** Rejected: no page context, no status, data outside our database. WhatsApp stays as the human help channel.
