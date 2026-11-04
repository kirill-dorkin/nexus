# Web architecture

How `apps/web` (Next 16 App Router, React 19) and `@platform/ui` are built, and where new code goes. The decisions behind it are ADR-0058 (Web-to-API transport), ADR-0059 (UI foundation), ADR-0066 (home learning route) and ADR-0067 (client telemetry); the visual direction is `apps/web/DESIGN.md`. Code and tests win over this page when they disagree.

## Ownership

| Layer | Owns | Never owns |
|---|---|---|
| `@platform/design-tokens` (`tokens.css`) | Semantic values: colors per theme and accent, radii, spacing, type scale, focus ring | Components, storage, product names |
| `@platform/ui` | Brand-neutral typed primitives (buttons, forms, layout, typography, feedback, `Dialog`, `PasswordInput`) and their stylesheet | Requests, local storage, routing, business rules |
| `@platform/contracts` | zod schemas and types of every API payload Web reads or sends | Rendering |
| `@platform/checks` | Challenge types, parsing and the static HTML/CSS checks, shared with the API's server adapter (ADR-0072) | DOM globals, sandboxed JS/SQL checks, storage, UI |
| `apps/web` | Routes, product composition, data loading, client state, domain-specific patterns, copy | Canonical business state or authorization: the API decides, Web presents |

Web never reaches into the database or the API's modules; every read and command goes through the HTTP API and is parsed with a contract schema at the boundary.

## Layout of `apps/web/src`

- `app/` — routes only: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, metadata, `sitemap.ts`, `robots.ts`. A route file loads data and composes components. A component used by one route only may sit next to it (the Commerce pages do this); anything shared lives in `components/`.
  - Learner: `/`, `/courses`, `/courses/[courseSlug]`, `/courses/[courseSlug]/[lessonSlug]` (the home learning route, ADR-0066), `/learn/[organizationSlug]/…` (any organization's public course), `/me/learning`, `/login`.
  - Editorial: `/blog`, `/blog/[slug]` (static, `generateStaticParams`).
  - Studio: `/studio`, `/studio/[organizationId]/…`.
  - Commerce: `/catalog/…/products/…`, `/checkout/…`, `/purchases/…`.
  - `/ui` — the noindex component gallery.
- `components/<area>/` — product components by area: `learning`, `studio`, `appearance`, `telemetry`. Larger features get a subfolder (`learning/challenge`, `learning/sql`, `learning/navigator`, `studio/manual`, `studio/course`, `studio/offering`).
- `lib/` — framework-free logic and shared hooks: API transport (`server-api.ts`, `public-api.ts`), server loaders (`public-learning.ts`), route helpers, `hooks/` (`useApiResource`, browser facts), `telemetry/`, `sound/`.
- `test/` — DOM test setup and fixtures.

No source file in Web or `@platform/ui` is longer than 300 lines (`tests/architecture/web-file-size.test.ts`); split by responsibility before that.

## Server and client components

Components are Server Components unless they need the browser. A file gets `"use client"` only for state, effects, event handlers or browser APIs, and the boundary is pushed as far down as possible: a server page renders the course text, and only the quiz form, the practice editor or the navigator search is a client island.

- `@platform/ui` primitives are static and usable from Server Components; `Dialog` and `PasswordInput` are the only client primitives and hold only presentation state.
- A client component receives plain serializable props (parsed contract data, strings, numbers), never functions from a server file.
- `import "server-only"` marks modules that read server environment (`server-api.ts`); the build fails if a client file imports them.
- Heavy client code loads on demand: the in-browser PostgreSQL engine (ADR-0065) loads in a worker once a SQL example scrolls near; the performance budgets fail if it appears on any other page.

## Data loading

**Public pages (server).** Route files call loaders from `lib/public-learning.ts`. A loader fetches `API_INTERNAL_URL` with `cache: "no-store"` and a 10 s timeout, parses the answer with the contract schema, turns 404 into `notFound()` and any other failure into a thrown error for the route's `error.tsx`. Loaders are wrapped in React `cache()` so `generateMetadata` and the page share one request. These pages are `force-dynamic`: published courses change without a Web deploy. Loading and failed states are distinct (`loading.tsx`, `error.tsx`, an explicit empty result); a failure never shows invented content or backend details.

**Signed-in pages (browser).** Session cookies belong to the API origin, so learner and Studio data is read in the browser with `browserApiRequest` (`credentials: "include"`, `no-store`) through `useApiResource(path, schema, version)`. It returns `loading | anonymous | error | ready`; 401 is "anonymous", never an error. Bumping `version` reloads after a command. `useViewer()` shares one `/v1/me` request per page for components that only need to know whether someone is signed in.

**Commands.** Writes go through small typed functions next to their feature (`studio/studio-api.ts`, the quiz submit in `quiz-form.tsx`) that call `browserApiRequest`, parse the result with a contract schema and turn a non-2xx answer into an error the caller shows (`apiError()` in Commerce, the typed results of `studio-api.ts` in Studio). The API's answer replaces local state; Web does not guess the outcome (pending answers lock the form, a failure offers an explicit retry).

**Transport.** `NEXT_PUBLIC_API_ORIGIN` is the API origin the browser calls; `/` means the same origin, behind the edge proxy (ADR-0058). It is validated at startup and never contains a path or credentials.

## State

- **Server data** lives in the component that loaded it. There is no global client store; two components that need the same data get it from their common parent or from a shared loader (`cache()` on the server, the shared promise in `useViewer` in the browser).
- **UI state** is local `useState`/`useReducer`; editor state that outgrew a component is a pure model with its own tests (`studio/editor-model.ts`, `editor-commands.ts`).
- **Browser facts** (client-only rendering, origin, reduced motion) come from `lib/hooks/browser.ts` through `useSyncExternalStore`, so server and hydration render the same thing.
- **Per-viewer conveniences** (solved practice tasks, music volume, sign-up nudge snooze) use `localStorage` behind try/catch; they are never progress. Official progress comes only from the API.
- React Compiler lint rules are on: no `setState` in effects for derived values, no reading refs during render.

## Styling

- Values come from tokens (`var(--…)`), never hard-coded colors; learner and Studio pages render inside the dark scope with the lime accent (`DESIGN.md`).
- Each component has a CSS module next to it (`course-navigator.module.css`); `@platform/ui` primitives cover buttons, fields, cards and typography, and a module only adds layout and product-specific look.
- Focus is always visible: an element that removes its outline shows a ring on itself or its field (`:focus-within`). Motion and transparency respect `prefers-reduced-motion` and `prefers-reduced-transparency`.

## Quality gates

| Gate | Where |
|---|---|
| Strict TypeScript, type-aware ESLint with `jsx-a11y` strict and React Compiler rules | `pnpm check` (local) |
| Prettier | `pnpm check`, CI |
| Unit and component tests (Vitest, Testing Library, happy-dom) with coverage floors for Web, hooks and Studio | `pnpm check`, CI |
| File size ≤ 300 lines | architecture test |
| End-to-end scenarios, axe on every page, keyboard checks | `pnpm test:e2e`, CI |
| JavaScript, LCP and CLS budgets per page | `tests/e2e/budgets.ts`, CI |
| Client errors and Web Vitals in production logs | ADR-0067 |

## Adding a page

1. Add the route under `app/`. Public data: a `cache()`d loader in `lib/` that parses with a contract schema; signed-in data: a client component with `useApiResource`.
2. Give it `generateMetadata`, `loading.tsx` if it streams, and rely on the nearest `error.tsx`.
3. Compose existing components; put new ones in `components/<area>/` with a CSS module and a test next to them.
4. If the page is public, add it to `sitemap.ts` and to the axe list in `tests/e2e/specs/accessibility.spec.ts`; if it is a key page, give it a budget in `tests/e2e/budgets.ts`.
5. Register the route template in `lib/telemetry/route.ts` so its errors are reported under a stable name.

## Adding a component

- Product-specific (knows about courses, lessons, Studio): `apps/web/src/components/<area>/`.
- Generic and brand-neutral, needed by two or more areas: `@platform/ui`, with an example in the `/ui` gallery and a test in `packages/ui/src`.
- Start as a Server Component; add `"use client"` only to the smallest part that needs it.
