# Frontend route / role / state / action matrix — Phase 0

Status: baseline (2026-10-15); source: [frontend master spec v1.2](../product/frontend-master-spec.md) and inspected Web routes at main `29b81d7`. This is not a new authorization contract.

## Existing routes (verified in apps/web/src/app)

| Route | Visitor and authority | Primary user action | Main states and recovery | Canonical owner / risk |
|---|---|---|---|---|
| `/` | Guest and all signed-in actors | Open a real course | Streaming/loading, real course list, no course, API unavailable | Public Learning projection; do not invent catalogue results |
| `/courses` | Guest and all | Inspect a real course programme | Loading, populated, empty, unavailable, local-search no-match | Public Learning; search never grants access |
| `/learn/:organizationSlug/:offeringSlug` | Guest and eligible signed-in learner | Guest: first lesson; signed-in: one state-specific next action | Public not-found/closed; member not enrolled; enrolled; completed required tasks; learner-state unavailable | Content + Delivery public projection, Learner Learning own-state; separate Membership and Enrollment |
| `/learn/:organizationSlug/:offeringSlug/:lessonSlug` | Guest may read public safe lesson; own learner may check quiz | Read lesson; submit one attempt; open canonical next lesson | No video, text only, quiz pending/pass/fail, network fail, ambiguous retry, protected/private not-found | Published Content safe read; Validation/Evidence for canonical quiz results; answers never exposed |
| `/login` | Guest; signed-in returns to authorized context | Authenticate or register, then return | Credential validation, provider unavailable, request failure, existing session, allowlisted returnTo | Identity; safe local return only |
| `/me/learning` | Own signed-in learner | Continue at canonical nextLessonSlug | Session checking, anonymous, no enrollments, populated, network failed, stale authorization | Own Enrollment/derived required-task progress, not Mastery or completion |
| `/blog` and `/blog/:slug` | Guest and all | Open article; related course if present | Available/empty/not-found; editorial rather than fake course | Editorial content, distinct from Learning Evidence |
| `/catalog/:organizationSlug/products/:productSlug` | Guest and purchaser | Verify price and begin one-time Purchase | Not found, unavailable, authentication required, pending mutation | Public Catalog + Commerce; product/price from server |
| `/checkout/paddle/:purchaseId` | Authenticated exact purchaser | Proceed with existing exact Purchase checkout | SDK loading, missing/expired link, ambiguous status, safe fallback | Commerce and provider adapter; browser return never proves paid |
| `/purchases/:purchaseId` | Authenticated exact purchaser | Reconcile canonical purchase status / follow access link | Pending, paid, failed/expired, unknown, transport failure | Purchase status independent of Entitlement and Enrollment |
| `/studio` | Author/staff with real capability ONLY (target); implementation currently discovers Membership and also offers self-create | Open own Organization and editable course | Checking, no authorized org, forbidden, empty, network error | Organization discovery is a locator, not permission; ordinary self-create must be closed through ADR/API |
| `/studio/:organizationId/:courseId` | Staff scoped to exact Content capabilities | Edit, validate, save explicit revision, publish immutable version | Dirty, invalid, saving, ambiguous, conflict, published, forbidden; guard unsaved work | Content; exact revision and protected author-only definitions |
| `/studio/:organizationId/:courseId/offerings` | Authorized content/delivery staff | Create Offering / change visibility explicitly | No published version, missing Offering, pending, ambiguous, forbidden | Delivery-owned Offering; publication != visibility != self-entry |
| `/studio/:organizationId/entry-policy` | Organization admin with `organization.manage` | Open or close explicit customer entry policy | Closed/open, pending, ambiguous, forbidden | Organizations; policy cannot grant privilege |

## Navigation and capability gaps confirmed by code

- `LearningNavigation` currently puts `/studio` inside `privateDestinations` whenever `/v1/me` succeeds: **authenticated != authorized staff**. Replace that rule in Phase 1 only after a canonical permission query exists; no client-inferred role or optimistic Studio link.
- `LearningShell` currently publishes a Studio footer link to everyone. Remove that global staff advertisement in Phase 1 (authorized workspace launcher belongs in the staff context).
- Commerce product and purchase screens have separate page shells. Phase 1 will unify presentation without touching checkout settlement.
- The current `/studio` owner-bootstrap self-create path is inconsistent with the new managed-academy model. Hiding a button alone is not a fix: closing both `POST /v1/me/organizations` and `POST /v1/organizations` for ordinary actors needs explicit authorization/owner-bootstrap ADR, migration-safe bootstrap and regression tests. Do not silently change existing accepted ADR-0057 by UI-only patch.
- PR #97 already changes the Studio editor; Phase 1/2 must not overwrite its lesson-first work.

## Planned namespaces (not routes to render yet)

| Future workspace | Intended entry | User outcome | Prerequisite before UI |
|---|---|---|---|
| `/me/*` extensions | Learning home | Attempts, history, skills, review, subscription/access | Individual own-safe API contracts |
| `/teach/:organization/*` | Staff launcher | Run → group → session → attendance → assignment | Scoped Delivery read/write contracts |
| `/projects/:organization/*` | Scoped team launcher | Project → GitHub binding → external activity | Projects/Integrations capabilities |
| `/org/:organization/*` | Owner launcher | Members, staff permissions, Commerce and analytics | Organizations/Authorization read/commands; aggregates server-owned |
| `/account/*` | Account menu | Security, purchases, preferences | Identity and user-safe canonical endpoints |
| `/ops/*` | Privileged operator-only entry | Health, audit and runtime operations | Protected contracts and separate grader activation |

Never create placeholder workspaces or infer backend authority from URL parameters.

## Required cross-cutting screen state contract

| State | UI promise | Recovery / authority |
|---|---|---|
| checking / loading | Keep geometry stable, no fictional data or CTA | Wait for exact canonical read |
| data | Exactly one task-specific primary CTA | Run actual allowed operation |
| empty | Explain verified absence, not network error | Navigate to real next step |
| anonymous | Explain sign-in context | Safe returnTo to the original location |
| forbidden | Rights are absent or revoked | Exit to permitted location; no retry as a privilege shortcut |
| not-found / inaccessible | Safe disclosure without tenant leaks | Catalogue or parent context |
| unavailable | Data state unknown | Explicit retry, retain last confirmed context |
| mutation pending | Duplicate-click guard | Disable only in-flight action |
| mutation failed | No claim of success | Retry only when contract is safe |
| mutation ambiguous | Outcome unknown | Re-read exact canonical state / same idempotency key where required |
| stale revision | Other editor won | Preserve unsaved text; reconcile and revalidate before apply |

## Phase gates

1. **Design gate:** three materially distinct home/course/lesson compositions at 1440 and 390px, all using `docs/examples/computer-basics-first-course.manifest.json`; no fake metrics/testimonials.
2. **Navigation gate:** guest, signed-in learner, staff, checking and revoked capability; 320/390/768/1440; keyboard/Escape/focus return; each accent in both themes.
3. **Security gate:** dedicated backend ADR plus tests to fail-close ordinary organization create API *before* asserting single-tenant managed academy in production.
4. **Learning gate:** Enrollment/progress/quiz/checkout preserve accepted domain split and ambiguous-write semantics.
5. **Merge gate:** exact-head CI first, then targeted maintainer-local acceptance, Ready, squash. No direct main push.

Related accepted decisions: ADR-0047, ADR-0053/0054/0055/0056/0057 and current module boundaries. This matrix is updated per route when a complete vertical path lands.
