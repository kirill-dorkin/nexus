# Nexus current state

The maintained checkpoint for continuing work across sessions and agents: what exists, which rules must not drift, and what to do next.

It is **not live telemetry**. Before working, check the current `main`, open PRs, CI, migrations and code as `AGENTS.md` requires. Older, more detailed checkpoints are in git history (`git log -- docs/engineering/current-state*.md`).

## Snapshot

Last maintained: 2026-11-03.

| | |
|---|---|
| `main` head | `4d8f5e9` — #150, drop the café story characters (2026-11-03) |
| Latest migration | `000047_lesson_chapters.sql` |
| Quality gates | Local before every push: `pnpm check` (brand isolation, Prettier, ESLint strict type-checked + React + jsx-a11y strict + Next, typecheck incl. API operator scripts and root tests, unit and component tests, Web coverage floors). GitHub CI: brand isolation, Prettier, typecheck, unit, integration, launch-performance, browser-launch and Playwright end-to-end tests (axe on every page). No lint baseline: every violation fails. |
| Latest ADR | ADR-0067 Client error and Web Vitals reporting |
| Production | Vercel Services Web + API with managed PostgreSQL (ADR-0058); daily GitHub-hosted read-only smoke against the production domain |
| Learner-code execution | **Disabled in production.** Grader artifacts exist in the repository but need a separate activation (exact image digest + green real-cluster verification). |
| Published content | Route «Веб-разработка с нуля»: `html`, `css`, `js`, `sql` manifests in `docs/examples/`, published in production. The four-lesson `computer-basics-first-course` manifest is not published. Check Studio for current versions. |

## What is built

Each row is implemented on `main`. The ADRs hold the details; the backend areas are covered by HTTP + PostgreSQL integration tests in `apps/api/src/*.integration.test.ts`.

| Area | What exists | ADRs |
|---|---|---|
| F0–F1 Foundation | Modular monolith, users/sessions, Organizations/Memberships, roles and scopes, tenant context, RLS | 0001, 0004, 0008, 0009, 0012 |
| F2 Curriculum | Stable Course/Lesson/Skill/Activity identities, immutable published versions | 0002, 0003, 0053 |
| F3 Delivery | LearningOffering, Enrollment, CourseRun, Group, Session/Attendance, Assignment | 0010, 0014–0017 |
| F4 Learner vertical | Attempt → immutable Submission → ValidationResult → normalized Evidence → Mastery projection; LearningEvent history | 0005, 0018–0023 |
| F5 Guided Build | Protected hints/solutions, Attempt-scoped assistance exposure, compare, transfer | 0024–0026 |
| F6 GitHub Projects | GitHub App, webhook inbox, Team/Project/repository binding, immutable PR/review/check facts | 0027–0032 |
| F7 Grader | Gateway admission, durable job ledger, authenticated dispatch, Kubernetes/gVisor sandbox, trusted Go runner. Repository only, not active | 0007, 0033–0037 |
| F8 Recommendations | Versioned derived policies: ordered mastery, review scheduling, misconception signals, remediation, readiness, readiness-gated completion | 0013, 0038–0043 |
| F9 Commerce | Product + immutable Price, Purchase settlement via Paddle webhook, public catalog, customer entry, checkout + return reconciliation, operational/browser/performance launch gates | 0044–0052 |
| MVP free learning | Lessons + YouTube/Markdown/quiz blocks, strict manifest v1, public course/lesson pages, free self-enrollment, deterministic quiz checks with retries, derived task progress | 0053–0056 |
| Lesson chapters | Optional `chapter` per manifest lesson; course page and lesson sidebar group the program by chapter | 0063 |
| In-browser practice | Lesson challenges and concept cards: static HTML/CSS checks; JavaScript in an opaque-origin sandbox; SQL on PostgreSQL (PGlite) in a Web Worker against a neutral store teaching database (`shop`) or an empty one. Practice only, never Evidence | 0064, 0065 |
| Offering retarget | Free self-paced Offerings move forward to a newer published version of the same Course; Enrollments and progress carry over (`required-activity-passes@2` by stable Activity identity) | 0062 |
| Client telemetry | Web reports uncaught errors, unhandled rejections, render failures and Web Vitals as `web.client_error` / `web.vital` log events: route template, error name, release — never messages, URLs or identifiers | 0067 |
| Learning route | Web orders the home catalog HTML → CSS → JavaScript → SQL, shows each course's prerequisites, outcome and next course, and links the last lesson to the next course. Presentation only | 0066 |
| Stable course addresses | Home-organization courses live at `/courses/{course}` (course slug, survives new versions); Delivery resolves the newest public Offering; old Offering addresses redirect permanently | 0061 |
| Studio | Manual and JSON authoring over the same draft, preview, export, publication, Offering visibility, Organization customer-entry policy | 0057 |
| Web UI | `@platform/ui` + design tokens, light/dark themes with accents, public shell, Blog/SEO surfaces, `/ui` gallery | 0059 |
| Sign-in | Password, optional Google/GitHub OAuth (PKCE) on the same Nexus session | 0060 (Proposed) |
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
- PostgreSQL is canonical business state. Application authorization plus RLS/transaction-local actor and tenant context provide defense in depth.
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

## Active F4 compatibility windows

Do not remove these without an explicit cleanup slice/migration and proven caller migration.

1. Historical `learning_progress.attempts.submission` and `submitted_at` remain for migration compatibility; dedicated `learning_progress.submissions` is source of truth for new writes.
2. The transition create-Attempt command may still carry a submission payload and must atomically create the dedicated Submission.
3. `submission.submitted` is the canonical new lifecycle event; deprecated `attempt.submitted` remains only as an integration alias and is not materialized as a learner LearningEvent.
4. Evidence-by-Submission is canonical API direction; Evidence-by-Attempt remains temporarily for compatibility.
5. Historical outbox rows are immutable and must not be rewritten to imitate LearningEvent history.

Nexus has no external API clients yet, so a cleanup slice could close these windows cheaply before launch.

## Open work on GitHub (as of 2026-10-31)

- **UI stack, Draft since 2026-10-15:** #97 (lesson-first Studio editor, conflicting), #98 (frontend spec docs), #100 (shared header), #101 (semantic surfaces), #103 (mobile Product pricing). #104 is a temporary integration harness for these and must never be merged.
- **#46** (gVisor provider): superseded by #45, which is merged.
- **Dependabot:** patch/minor bumps with green CI, plus NestJS 12 (#80, #82, #83: red CI), TypeScript 7 (#12: red CI), pino 10, @types/node 26, upload-artifact 7.
- Issue #99 (managed-academy provisioning): Stages A and B landed in #105/#106.

## Next recommended slice

**Bring Web to the backend's engineering level: [`web-quality-program.md`](web-quality-program.md).** Phases 0 (workspace lint, type-checked operator scripts and root tests), 1 (Prettier), 2 (component tests and Web coverage floors) 3 (React correctness on shared hooks; the lint baseline is gone), 4 and 4b (Studio editors and every other file over 300 lines split under tests; a size test keeps it so) 5 (Playwright end-to-end tests with axe on every page, in CI) 6 (per-page JavaScript, LCP and CLS budgets) 7 (client error and Web Vitals reporting, ADR-0067), 8 (accessibility audit: axe and keyboard checks on every page, `docs/design/accessibility-audit.md`) and 9 (ADR-0059 accepted, the duplicate number renumbered to ADR-0068, and [`docs/architecture/web.md`](../architecture/web.md)) are done. The program is complete; the next Web size step is client-side parsing without full zod (see phase 6).

The four route courses (HTML, CSS, JavaScript, SQL) are published; collect learner usage and feedback in parallel before choosing the next domain capability.

Not selected (do not start without an explicit decision): grader production activation, refunds/subscriptions/coupons, more recommendation policies, telemetry backend, load planning.
