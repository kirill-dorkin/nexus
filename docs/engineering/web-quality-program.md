# Web quality program

The plan that brings `apps/web` and `packages/ui` to the engineering level of the backend: the same strictness, the same test depth, the same documented decisions. Each phase is one or more ordinary slices (branch → Draft PR → green CI → squash merge) with a measurable exit criterion. Phases are ordered so that every refactor lands under tests that already exist.

## Baseline (2026-11-03, before phase 0)

| Measure | Backend (`apps/api`) | Web (`apps/web`) |
|---|---|---|
| Source lines | 24.5k | 11.0k |
| Test lines | 23.7k (HTTP + PostgreSQL integration) | 1.2k (pure functions only) |
| Component / browser tests | n/a | none |
| Lint | none | none |
| Largest file | 1,100 lines | 832 lines (`manual-editor.tsx`) |
| Documented decisions | 66 ADRs | ADR-0059 still Proposed |

## Lint policy (phase 0)

`eslint.config.mjs` applies one policy to the whole workspace:

- **TypeScript:** `strictTypeChecked` + `stylisticTypeChecked` with type information from each package's `tsconfig.json`, plus exhaustive `switch`, `eqeqeq` and no `console.log`.
- **Web and `@platform/ui`:** React hooks including the React Compiler rules, `jsx-a11y` **strict**, Next.js core-web-vitals.
- **Scripts and course builders:** plain-JS recommended rules.

The rules that are relaxed are relaxed in one place with a written reason: `type` over `interface`, decorated NestJS modules, async React event props, `||` on strings and booleans, scrollable regions as focus targets, and a short list for test files (deliberately malformed input, vitest mocks, `process.env` restoration). An inline `eslint-disable` must name its rule and say why (dialog backdrop clicks, intentional control-character regex, declaration merging, focus on the safe choice of a confirmation).

Lint runs locally through `pnpm check` before every push (see `development-workflow.md`), not on GitHub-hosted runners, because type-aware lint needs about 3 GB of memory.

There is no lint baseline any more: phase 0 kept the React Compiler findings in `eslint-suppressions.json` until phase 3 fixed them, and the file was then deleted. Every violation fails `pnpm check`.

Phase 0 also made two blind spots type-checked: the operator scripts in `apps/api/ops/` (their own `tsconfig.json`, part of `@platform/api` typecheck) and the root-level tests and Vitest configs (root `tsconfig.json`, part of `pnpm typecheck`). Both had type errors that nothing had reported.

## Phases

### 1. Formatting — done

Prettier 3 with its default style (80 columns, double quotes, semicolons) and no trailing commas, the style most of the older code already used. It formats code, CSS, JSON and YAML. Markdown and the course content in `docs/examples/` keep their authored line breaks (ESLint still checks the course builders; their generated manifests stayed byte-identical). One formatting commit, listed in `.git-blame-ignore-revs`. `pnpm format:check` runs in GitHub CI and in `pnpm check`.

Open branches rebase by running `pnpm format` after the rebase and resolving what remains.

### 2. Component test infrastructure — done

Vitest projects: `node` for logic, `web-components` and `ui-components` (happy-dom) for `*.test.tsx`. Testing Library and `user-event` assert behaviour through roles and accessible names, not markup snapshots; `apps/web/src/test/fixtures.ts` builds contract-valid API data. Suites cover the `@platform/ui` primitives (button, field, choices, alert, progress, password input, dialog), the quiz, practice challenges, course navigator, learner entry and course progress, my learning, sign-in/registration, checkout and purchase status, and the Studio API client.

`pnpm test:web-coverage` (part of `pnpm check`) measures Web and `@platform/ui` with `v8`. Floors: 43 % statements / 47 % branches / 39 % functions / 44 % lines overall, and 80 / 55 / 75 / 80 for every learner- or buyer-facing component that has a suite. They only go up.

The suites found and fixed three defects: practice editors took focus on page load (a regression from phase 0), the course navigator stored every visited lesson twice, and a failed second step of «Начать курс» erased its own explanation.

Components still without a suite are covered by the phase that changes them, before the change: lesson visuals, story scenes, signup nudge, SQL client and sound panel in phase 3; the Studio editors and offering manager in phase 4.

### 3. React correctness — done

Shared hooks in `apps/web/src/lib/hooks/`, each with tests:

- `browser.ts`: `useIsClient`, `useBrowserOrigin`, `usePrefersReducedMotion` over `useSyncExternalStore` (fixed server value, live browser value, follows the reduced-motion setting);
- `stored-value.ts`: `useStoredValue` / `writeStoredValue`, localStorage as an external store with same-tab and cross-tab updates;
- `in-view.ts`: `useSeenOnce`, IntersectionObserver with the "unsupported means visible" fallback derived instead of set;
- `api-resource.ts`: `useApiResource`, API reads parsed with a contract schema whose loading state is derived from the request key.

All 21 suppressed findings were fixed on top of them: data loading (learner entry, my learning), derived practice results and solved state, visited lessons, the DOM diagram, typing and chat animations, the SQL client's busy state, the Studio origin, the clock read in the signup nudge, and JSX inside `try/catch` on the home page. Components that had no suite got one first (signup nudge, lesson visuals, story scenes, SQL client).

Two more defects surfaced: the SQL client stayed «busy» forever when its job was withdrawn before the answer, and the story scene ignored a change of the reduced-motion setting while open.

Coverage floors rose to 52 / 55 / 50 / 52 % overall, the strict list gained the signup nudge and lesson visuals, and the shared hooks have their own 85 / 60 / 80 / 85 % floor.

### 4. Studio decomposition — done

Behaviour suites came first for the manual editor (every field, list order, type changes), the course editor (load, validate, save, version conflict, JSON mode and upload, publish, next draft, permissions, sign-in, leaving with unsaved work, discard, downloads) and the offering manager (listing, confirmed publication, link copy, unconfirmed results, creation, paging, sign-in). The split then kept every test green:

- `editor-model.ts` (blank course, JSON parsing, the working-copy and version-conflict checks, file reading) and `editor-commands.ts` (every document change that touches more than one field) are pure and unit-tested;
- `manual/` holds the form: shared controls, course, skills, activity, answers, lessons and blocks;
- `course/` holds `useCourseDraft` (the editor's state machine), `useOperation`, `useLeaveGuard`, and the toolbar, rail, JSON editor, file actions, publication panel, notices and dialogs;
- `offering/` holds the access loader, `useOfferings`, the offering card and the new-offering form.

No Studio file is over 300 lines (the three entry components are 55, 113 and 231). Removing a skill now unlinks it from activities, and removing an option moves or drops the correct answer, so these edits no longer leave a document that fails validation.

Coverage floors rose to 66 / 68 / 70 / 67 % overall, with a 70 / 50 / 60 / 70 % floor for the Studio folders.

Files still over 300 lines elsewhere — lesson visuals, story scenes, practice challenge, checkout panel, the `@platform/ui` index and the `/ui` gallery — are split the same way in phase 4b, each under its existing suite.

### 4b. Remaining large components — done

Every file over 300 lines was split by responsibility, each entry file keeping its public exports so imports and suites stayed unchanged:

- `lesson-visuals.tsx` → `visuals/` (model and parser, diagrams, animation frames, typing demo);
- `story.tsx` → `story/` (model and parsers, rich text and avatars, chat scene, previews, concept card, recap banner);
- `challenge.tsx` → `challenge/` (model and checks, inline text, checklist, web result frames);
- `course-navigator.tsx` → `navigator/` (program list, visited lessons);
- the checkout panel → `checkout/` (attempt key, checkout flow, price list, sign-in form);
- `@platform/ui` → class names, buttons, layout, typography, forms, feedback;
- the `/ui` gallery → `gallery/` sections; Studio home → a course rows component;
- sound → `voices.ts` and `dsp.ts` out of `band.ts`, `settings.ts` and `clock.ts` out of `engine.ts`.

New suites came before the components that had none: the gallery, Studio home, sound settings and clock, and the band. The band has no Web Audio in tests, so a recording context traces every node, connection, parameter change and scheduled note for eight bars; the trace stayed identical through the split.

`tests/architecture/web-file-size.test.ts` keeps every Web and UI source file at 300 lines or fewer. Coverage floors rose to 74 / 71 / 76 / 76 %.

### 5. End-to-end tests — done

Playwright (`tests/e2e/`) drives Chromium against the production builds: PostgreSQL with all migrations, the built API, `next start`, and a one-origin edge (`edge.mjs`) that sends `/v1/*` to the API and the rest to Web, so session cookies are first-party as in production. Global setup publishes the e2e course with `scripts/launch-course.mjs` — migrations, owner account, owner organization, manifest, publication, public offering — the same path operators use.

Scenarios:

- an anonymous visitor goes from the home page to the course and the lesson, solves the practice challenge and is asked to sign in before the quiz is saved;
- a new learner registers from that prompt, returns to the lesson, the answer enrolls them and is saved, and «Моё обучение» shows the progress; then signs out and back in to the same progress;
- an author signs in to Studio, creates a course from JSON, validates, saves, previews, publishes, creates a private offering, opens it publicly, and an anonymous visitor reaches the course.

Every visited page runs axe with the WCAG 2.2 A/AA rules and fails on serious or critical violations. The first run found two in Studio — the organization buttons and the Studio logo announced a name that did not contain their visible text (WCAG 2.5.3) — fixed here.

GitHub CI runs `pnpm test:e2e` after the Web build in one-origin mode and keeps the Playwright report and traces of a failed run. The paid checkout path stays covered by the browser launch verification with provider stubs.

### 6. Performance budgets — done

`tests/e2e/specs/performance.spec.ts` loads every key page in the e2e environment and fails when one breaks its budget (`tests/e2e/budgets.ts`):

- compressed JavaScript per page, about 15 % above the size measured when the budgets were set — home and catalog 185 KB, course 285 KB, lesson 340 KB, SQL lesson 350 KB, sign-in and my learning 295 KB;
- Largest Contentful Paint ≤ 2.5 s and Cumulative Layout Shift ≤ 0.1 (the Core Web Vitals "good" thresholds);
- the in-browser PostgreSQL engine (PGlite, ~108 KB compressed plus WebAssembly) loads on the SQL lesson once its example scrolls near, and on no other page — checked in both directions, including requests made by the worker.

Measuring what the browser actually downloads is independent of the bundler's manifest format. Next's prefetches of linked routes are cut off during the measurement: they are the cost of the next navigation, and they depend on which courses the database holds (CI first counted the code of another organization's course page on the catalog). `@platform/contracts` is now marked `sideEffects: false`, so unused contract modules leave the client bundles, and the course table list moved out of the teaching-database SQL, which only the worker needs.

The largest remaining client cost is zod: about 90 KB compressed on every page that parses API data. Moving client-side parsing to `zod/mini` (or narrower client schemas) is the next size step; budgets go down with it.

### 7. Client observability — done

ADR-0067. `ClientTelemetry` in the root layout reports uncaught errors, unhandled rejections and Web Vitals, and `app/error.tsx` reports render failures, to `POST /v1/telemetry/web`; the API logs `web.client_error` and `web.vital` lines under the ADR-0052 rules. Events carry the route template, the error name from a closed list, the source (app or external script) and the release — never messages, URLs or identifiers; the strict contract rejects anything else. Batching, per-page deduplication and a per-page cap keep a crash loop from flooding the API.

Covered by contract, API, reporter and component tests, and by an e2e test in which a real error on a lesson page reaches the API with 204 and without its message or the lesson address. The performance budgets caught the first version pulling zod onto every page through a contract value; the error-name list now lives in a zod-free module.

### 8. Accessibility audit

A manual keyboard and screen-reader pass over every learner and Studio page against WCAG 2.2 AA, recorded in `docs/design/` with each finding fixed or tracked.

**Done when:** the audit report lists no open AA failures.

### 9. Decisions and documentation

Accept ADR-0059 (and give the duplicate ADR number its own number), and write the Web architecture document: server and client component boundaries, data loading, state, styling with tokens and CSS modules, ownership between Web and `@platform/ui`.

**Done when:** a new contributor can place a new page or component from the documents alone.

## Backend items found on the way

- Three identical `canonicalJson` helpers (`learning-progress`, two in `learning-validation`) and a fourth in `packages/contracts/src/grader.ts`: one shared, tested implementation.
- `learning-delivery.service.ts` (1,100 lines) split along its aggregates.
- Pending major dependency updates (NestJS 12, TypeScript 7) taken as reviewed slices instead of open Dependabot PRs.

## Web Definition of Done

A Web change is done when, in addition to `CONTRIBUTING.md`:

- `pnpm lint` and `pnpm typecheck` pass with no new suppressions;
- new interactive behaviour has a component test (from phase 2) and new routes are covered by an end-to-end path (from phase 5);
- data from the API or from authored content is parsed with a `@platform/contracts` schema before use, never cast;
- controls are reachable and operable by keyboard, with visible focus and accessible names.
