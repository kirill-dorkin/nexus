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

`eslint-suppressions.json` is the only baseline. It holds the React Compiler findings that need component tests before they are refactored (phase 3) and the sound files that draft PR #144 replaces. `pnpm check` fails on any new violation, and a fixed one must be pruned with `npx eslint . --prune-suppressions`, so the file can only shrink.

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

### 3. React correctness

Remove every `react-hooks/*` entry from `eslint-suppressions.json`:

- shared hooks over `useSyncExternalStore` for `matchMedia`, `localStorage` and `IntersectionObserver` (no `setState` in effects, correct server snapshot);
- data loading without synchronous `setState` in effects (one small typed fetch hook with a reducer and abort, or server-side data where the route allows it);
- error boundaries instead of JSX in `try/catch`; no reassigned render variables; no impure calls during render.

**Done when:** the suppressions file has no `react-hooks` entries.

### 4. Studio decomposition

`manual-editor.tsx` and `course-editor.tsx` split into pure, unit-tested document operations (`editor-model.ts` grows) and small section components. No component file over 300 lines; no business rule inside JSX callbacks.

**Done when:** both editors are composed of sections under 300 lines and every document operation has a unit test.

### 5. End-to-end tests

Playwright against a production build with PostgreSQL in CI: the learner path (home → course → lesson → quiz → practice → progress), registration and sign-in, Studio (create → validate → apply → publish), purchase return states with provider stubs. Every visited page runs an `axe` accessibility check with zero serious or critical violations.

**Done when:** the suites run in CI on every PR and gate merge.

### 6. Performance budgets

Per-route JavaScript budgets checked from the Next build output; Lighthouse CI on home, course, lesson and catalog pages with LCP, CLS and TBT thresholds; heavy runtimes (PGlite, the code sandbox) verified to load only on the pages that use them.

**Done when:** a budget regression fails CI.

### 7. Client observability

Error reporting (`error` and `unhandledrejection`, React error boundaries) and Web Vitals sent to a first-party endpoint, behind an ADR that fixes what is collected and what is never collected. Replaces the empty `@platform/observability` placeholder for Web.

**Done when:** production client errors and vitals are visible without reading user devices.

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
