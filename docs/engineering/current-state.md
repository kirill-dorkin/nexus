# Nexus current state

The maintained checkpoint for continuing work across sessions and agents: what exists, which rules must not drift, and what to do next.

It is **not live telemetry**. Before working, check the current `main`, open PRs, CI, migrations and code as `AGENTS.md` requires. Older, more detailed checkpoints are in git history (`git log -- docs/engineering/current-state*.md`).

## Snapshot

Last maintained: 2026-11-04.

| | |
|---|---|
| `main` head | `199f95f` — #166, revert of NestJS 12 after a production API outage (2026-11-04) |
| Latest migration | `000051_skill_maps.sql` (skill maps, versions and prerequisites, ADR-0078); `000050_skill_tests.sql` (skill test banks and draws, ADR-0075). Both additive; nothing reads them yet |
| Quality gates | Local before every push: `pnpm check` (brand isolation, Prettier, ESLint strict type-checked + React + jsx-a11y strict + Next, typecheck incl. API operator scripts and root tests, unit and component tests, Web coverage floors). GitHub CI: brand isolation, Prettier, typecheck, unit, integration, launch-performance, browser-launch and Playwright end-to-end tests (axe on every page). No lint baseline: every violation fails. |
| Latest ADR | ADR-0073 Downloadable file assignments with trusted static checks |
| Production | Vercel Services Web + API with managed PostgreSQL (ADR-0058). Each push to `main` runs `deploy-production.yml`: migrate with `platform_migrator`, then the Vercel deploy hook (ADR-0079). Daily GitHub-hosted read-only smoke against the production domain |
| Learner-code execution | **Disabled in production.** Grader artifacts exist in the repository but need a separate activation (exact image digest + green real-cluster verification). |
| Published content | Route «Веб-разработка с нуля» (HTML and CSS carry 7 + 6 optional file assignments from 2026-11-04 once republished): `html`, `css`, `js`, `sql` manifests in `docs/examples/`, published in production. The four-lesson `computer-basics-first-course` manifest is not published. Check Studio for current versions. |

## What is built

Each row is implemented on `main`. The ADRs hold the details; the backend areas are covered by HTTP + PostgreSQL integration tests in `apps/api/src/*.integration.test.ts`.

| Area | What exists | ADRs |
|---|---|---|
| F0–F1 Foundation | Modular monolith, users/sessions, Organizations/Memberships, roles and scopes, tenant context, RLS | 0001, 0004, 0008, 0009, 0012 |
| F2 Curriculum | Stable Course/Lesson/Skill/Activity identities, immutable published versions | 0002, 0003, 0053 |
| F3 Delivery | LearningOffering, Enrollment, CourseRun, Group, Session/Attendance, Assignment | 0010, 0014–0017 |
| F4 Learner vertical | Attempt → immutable Submission → ValidationResult → normalized Evidence → Mastery projection; LearningEvent history | 0005, 0018–0023 |
| F5 Guided Build | Protected hints/solutions, Attempt-scoped assistance exposure, compare, transfer | 0024–0026 |
| F6 GitHub Projects | GitHub App, webhook inbox, Team/Project/repository binding, immutable PR/review/check facts. **Inactive in production**: processors have no host (ADR-0071) | 0027–0032, 0071 |
| F7 Grader | Gateway admission, durable job ledger, authenticated dispatch, Kubernetes/gVisor sandbox, trusted Go runner. Repository only, not active | 0007, 0033–0037 |
| F8 Recommendations | Versioned derived policies: ordered mastery, review scheduling, misconception signals, remediation, readiness, readiness-gated completion | 0013, 0038–0043 |
| F9 Commerce | Product + immutable Price, Purchase settlement via Paddle webhook, public catalog, customer entry, checkout + return reconciliation, operational/browser/performance launch gates | 0044–0052 |
| MVP free learning | Lessons + YouTube/Markdown/quiz blocks, strict manifest v1, public course/lesson pages, free self-enrollment, deterministic quiz checks with retries, derived task progress | 0053–0056 |
| Lesson chapters | Optional `chapter` per manifest lesson; course page and lesson sidebar group the program by chapter | 0063 |
| In-browser practice | Lesson challenges and concept cards: static HTML/CSS checks from `@platform/checks`, which also runs on the server with parse5 + css-select and is tested for equal results on every course challenge (for WP-5 assignments, not yet used by the API); JavaScript in an opaque-origin sandbox; SQL on PostgreSQL (PGlite) in a Web Worker against a neutral store teaching database (`shop`) or an empty one. Practice only, never Evidence | 0064, 0065, 0072 |
| Offering retarget | Free self-paced Offerings move forward to a newer published version of the same Course; Enrollments and progress carry over (`required-activity-passes@2` by stable Activity identity) | 0062 |
| Web security headers | Content Security Policy (no external scripts, no framing, `connect-src 'self'`), Referrer-Policy, nosniff, Permissions-Policy on every page; Paddle origins only on checkout; zod runs without `eval` in the browser | 0069 |
| Rate limiting | Login (per address and per email), registration, quiz check and Web telemetry are counted in PostgreSQL by HMAC key; 429 with `Retry-After`; off without `RATE_LIMIT_KEY`, fails open if the counter is unavailable | 0070 |
| File assignments | ADR-0073: `assignment.files` activities in manifests (protected checks and solution in `learning_content.assignment_check_configs`, migration 000049); import refuses a solution that fails its own checks; public lessons show starter files and check labels only; `POST /v1/me/learning/:org/:offering/assignments/:activity/submissions` evaluates the files on the server (`@platform/checks`, nothing executed), records a ValidationResult and Evidence and answers per check. Studio edits assignments in JSON only. On the lesson page learners download the starter zip (with a README of the task and checks), upload a zip or loose files (fflate, loaded on demand; junk, binary and oversized entries dropped before inflating) and see each check with ✓/✗ and hints | 0073 |
| Lighter browser parsing | Web parses API responses in the browser with `zod/mini` copies (`@platform/contracts/client`, kept equal to the full schemas by `client.test.ts`) and schema-free helpers (`@platform/contracts/browser`); zod is not loaded on pages that parse nothing; e2e budgets: course/sign-in/my learning 220 KB, lessons 275 KB | — |
| Client telemetry | Web reports uncaught errors, unhandled rejections, render failures and Web Vitals as `web.client_error` / `web.vital` log events: route template, error name, release — never messages, URLs or identifiers | 0067 |
| Learner skills | `GET /v1/me/learning/{org}/{offering}/skills` returns the caller's own skill states for an active/completed Enrollment (own Enrollment is the authority, like own quiz checks; no role needed); the course page shows «Навыки курса», «Моё обучение» shows mastered skills per course (score ≥ readiness target 0.8). Presentation of existing Mastery only | 0023, 0055 |
| Learning route | Web orders the home catalog HTML → CSS → JavaScript → SQL, shows each course's prerequisites, outcome and next course, and links the last lesson to the next course. Presentation only | 0066 |
| Stable course addresses | Home-organization courses live at `/courses/{course}` (course slug, survives new versions); Delivery resolves the newest public Offering; old Offering addresses redirect permanently | 0061 |
| Characters (stage 1) | Every technology is a character (ПК, Браузер, HTML, CSS, JavaScript, SQL) built from course manifests by `docs/examples/skill-map/build.mjs`. Skill state comes from `skill-freshness@1` over passing Evidence days: confirmed → fading → forgotten, with terms 3/7/21/60/180/365 days. Level 0–100 counts active skills. `/characters` shows the roster with «Сегодня» (player level, streak, daily quests); `/characters/{slug}` shows the skill tree. Confirmations are read from `GET /v1/me/skills/{org}`. The confirmation lock is shown, not yet enforced. Design: `docs/product/game-design.md`, story: `docs/story/season-1.md` | 0074 |
| Studio | Manual and JSON authoring over the same draft, preview, export, publication, Offering visibility, Organization customer-entry policy | 0057 |
| Web UI | `@platform/ui` + design tokens, light/dark themes with accents, public shell, Blog/SEO surfaces, `/ui` gallery | 0059 |
| Sign-in | Password, optional Google/GitHub OAuth (PKCE) on the same Nexus session | 0060 |
| Organization provisioning | Organizations are created only by the offline operator command `org:bootstrap-owner` (`platform_migrator` role, `--apply`). Both HTTP create routes return 403/401. | 0068 |

The paid path (F9) for reference:

```text
public Product → login/registration → explicit customer entry → public checkout
  → pending Purchase (server-owned terms) → Paddle transaction (outside DB tx)
  → Paddle.js checkout → /purchases/:id return (pending is normal)
  → signed webhook → lease-fenced worker settlement
  → Purchase paid + Entitlement atomically → no automatic Enrollment
```

Deliberately not built: refunds/disputes and Entitlement reversal, subscriptions, coupons, provider-customer sync, purchase history, account unlinking/SSO, production telemetry backend, load/capacity planning.

## Durable architecture facts

These are continuation guardrails, not substitutes for accepted ADRs.

- Nexus is a modular monolith. A module owns its business state and application code does not reach into another module's repositories/tables.
- PostgreSQL is canonical business state.
- `events.outbox` is written atomically but has no relay or consumer yet (ADR-0071); the first consumer adds the relay. New deferred work uses the same transaction or a lease-fenced processor over the owning module's table. Application authorization plus RLS/transaction-local actor and tenant context provide defense in depth.
- Cross-module synchronous collaboration targets public application/query interfaces. Deferred consequences use events/outbox.
- Migrations are ordered and append-only; applied history is never rewritten.
- Published curriculum is immutable **what**; Delivery is **how / when / to whom**.
- `Attempt != Submission`; Submission is immutable committed learner work against an exact ActivityVersion.
- `ValidationResult != Evidence`; normalized Evidence, not raw validator/provider output, drives learning projection semantics.
- System/infrastructure failure must remain `system_error`, never learner failure.
- Mastery is organization-wide by stable Skill identity; learner/course context does not create a second mastery source of truth.
- Guided Build assistance is not Evidence and does not directly rewrite Mastery.
- Recommendation/readiness/intervention are versioned derived decisions, not canonical progress state.
- Derived task progress (percentage) never completes Enrollment or changes Mastery/readiness.
- Quiz answer keys and private explanations are protected Content, never learner-visible Activity config or feedback.
- Public Offerings are default-private; public learning pages expose only allowlisted published fields.
- `Group != Team`; GitHub Project facts are not Learning Evidence.
- GitHub external ids remain Integration identities; Project ids remain platform identities.
- Untrusted learner code never executes in Web/API/Worker; only the separately gated Grader boundary may execute it.
- `Product != Price != Purchase != Entitlement != Enrollment`.
- Price commercial meaning is immutable; changed terms require a new Price identity.
- Purchase pins immutable server-priced terms; Paddle/provider state is Integrations-owned rather than canonical Purchase meaning.
- External Paddle transaction creation occurs outside the PostgreSQL business transaction; canonical Purchase idempotency plus the unique trusted mapping arbitrate application retries.
- Merchant-of-Record tax remains provider state. Settlement compares normalized commercial amount/currency with immutable Purchase terms and fails closed on mismatch.
- Webhook HTTP ingress is verify/dedupe/persist/return; paid settlement is asynchronous and lease-fenced.
- Paid Purchase + purchase-backed Entitlement + their outbox events commit atomically; settlement never auto-enrolls.
- Public catalog state is presentation/discovery, never membership/access/checkout authority.
- Customer entry is explicit Organization policy, creates only role-less active Membership, and never creates Purchase/Entitlement/Enrollment.
- Organization creation is a trusted offline operation, not a user/session capability.
- Browser credentials are allowed only for exact configured `WEB_APP_ORIGIN`; Web never owns the opaque session token.
- External OAuth login issues the same Nexus session; provider tokens are never persisted or returned to Web, and auto-linking requires a provider-verified email.
- Public checkout revalidates current server-owned Organization/Product/Price/Offering/Membership/Entitlement conditions.
- Browser checkout idempotency is attempt-scoped and reuses one UUID for ambiguous retries of the same route/Price.
- Payment return navigation is not payment evidence.
- Purchaser Purchase ids are locators only; tenant context is resolved through the narrow purchaser-bound capability and then ordinary tenant/RLS checks.
- Provider transaction/customer ids, webhook state, tax state, and checkout mapping are not exposed through purchaser reconciliation.
- Operational telemetry is not canonical state and must remain fail-open, low-cardinality, and redacted.
- Routine telemetry must not become a searchable identity ledger; case-specific diagnosis uses authorized canonical/provider support tooling.
- Browser verification fixtures are non-canonical test seams and must never become an alternate Commerce/Integrations implementation.
- Performance-verification evidence is a repository acceptance artifact, not canonical state, a permanent SLO, or a production capacity claim.
- UI primitives own presentation only; no primitive owns requests, storage or business authority.
- Refund/reversal support requires an explicit canonical Purchase/Entitlement lifecycle decision before provider reversal events may change access.

## F4 compatibility windows

Closed on 2026-11-04 (spec WP-2.1): starting an Attempt no longer accepts a submission payload (`startAttemptRequestSchema` is an empty strict object), Evidence-by-Attempt (`POST …/attempts/:id/evidence`) is removed, and the `attempt.submitted` outbox alias is no longer emitted. Canonical paths: `POST …/attempts` → `POST …/attempts/:id/submissions` → `POST …/submissions/:id/evidence`, event `submission.submitted`.

Still open, needs an owner-approved migration (irreversible):

1. Historical `learning_progress.attempts.submission` and `submitted_at` columns remain; new writes never use them.

Historical outbox rows (including old `attempt.submitted`) are immutable and are not rewritten.

## Open work on GitHub (as of 2026-11-05)

- **#200** — full ПК and Браузер character courses (in CI). The owner publishes them after merge.
- **Owner decisions:** #170 (course completion), #171 (funnel), #172 (email and password reset), #174 (legal skeleton) — drafts, not to merge without the owner.
- **#46** (gVisor provider, Draft since 2026-09-16): superseded by #45, which is merged; the owner closes it.
- **Dependabot:** NestJS packages arrive as one group; TypeScript ≥7 is held until typescript-eslint and `@nestjs/swagger` support it; major `@types/node` bumps are ignored while the runtime is Node 24.

## Next recommended slice

**Priority (owner, 2026-11-05): the closed learning beta.** 20 learners study and test; the product grows from their feedback. Wave-1 kit: [`docs/beta/`](../beta/README.md) (owner checklist, 4-week HTML/CSS plans, texts, coordinator guide). Next code: B1.3 feedback in the product, then B1.1/B1.2 participation and week counters (`docs/roadmap/beta-launch.md`). Game packages of `spec.md` are paused until two beta weeks are reviewed.

**Follow the working spec [`docs/roadmap/spec.md`](../roadmap/spec.md)** (2026-11-05). The game design behind it is [`docs/product/game-design.md`](../product/game-design.md); the season-1 script is [`docs/story/season-1.md`](../story/season-1.md). Finished plans are in [`docs/archive/`](../archive/README.md).

Started only after an owner decision (spec section 5): grader in production, subscriptions and prices, a second payment provider, the email provider, background-process hosting.
