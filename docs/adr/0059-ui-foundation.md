# ADR-0059: Semantic UI foundation and incremental Web adoption

- Status: Accepted (2026-11-04)
- Date: 2026-10-07

## Decision

`@platform/design-tokens` owns semantic visual values. `@platform/ui` owns brand-neutral, typed presentation primitives and its explicitly imported stylesheet. Web owns product composition, route navigation, application state and domain-specific patterns. Branding continues to come from `@platform/brand`; no product name enters component/runtime namespaces.

The maintainer-selected art direction is dark plum with selective glass, fine borders and expressive Cyrillic typography. The combined cover direction uses an IT lesson example, supporting portal artwork and a calm editorial catalogue. Web loads the self-hosted Onest Variable font. The maintainer approved separate light/dark/system and rose/violet/blue/teal/amber preferences on 2026-10-08. Web owns the versioned device-local storage, validated before-paint initialization, system-scheme subscription and cross-tab updates. Invalid or unavailable storage is nonfatal. UI/tokens own no storage or account policy; cross-device synchronization is deferred. Semantic status colors stay independent of the selected accent.

Static primitives render native HTML and remain usable from React Server Components. Explicit client primitives Dialog and PasswordInput own only modal/visibility presentation state. No primitive owns requests, local storage or business authority; product interactivity lives in small calling client components. Native control refs use React 19 props. CSS is imported once by the application root. Next transpiles the workspace UI source. Phosphor icons use its SSR entrypoint where no icon context is required; no full icon provider is introduced.

Glass is a surface variant, not a universal container. Dense inputs use solid backgrounds. Transparent surfaces have a solid fallback and respect reduced transparency; motion respects reduced motion. Core text/action colors remain readable on the named surfaces. New navigation/actions retain keyboard focus and native link/button semantics.

The first adoption covers the public shell, homepage/catalog, registration/login, explicit self-entry, own learning, course outline, Lesson navigation and quiz feedback. Shared product headings, loading and outline patterns stay in Web. Native controlled Radio/Checkbox inputs preserve pending-answer locking and explicit retry; the course progress presentation consumes the existing derived percentage and never infers Enrollment completion. The subsequent Studio adoption composes the same controls in its organization/course workspace, manual/JSON editor, safe preview, revision/conflict presentation and native publication confirmation. This is Web presentation over ADR-0057; only an explicit confirm calls the existing revision-fenced publication command. Commerce remains for later adoption. The homepage streams its cover independently of the same no-store public Learning query. Catalog loading, a genuinely empty result and a generic failed-read state are distinct; failure never fabricates courses or displays backend details. Decorative original artwork is a local compressed asset with empty alt text; no fake course, progress, testimonial or statistic is introduced.

Public discovery remains Web presentation. Anonymous navigation shows only public destinations and explicit account entry until the existing session read succeeds. Web owns a static editorial Blog/article path, route metadata, canonical/Open Graph presentation, a public-only sitemap, crawler exclusions, manifest and generated social preview. Course/Lesson structured data contains only the same public projection already allowed by ADR-0054; editorial structured data contains explicit team-authored fields. A failed public catalogue read may omit dynamic sitemap entries but cannot fabricate them. This foundation is not a marketing CMS, analytics policy, indexing promise or authorization signal.

`/ui` is an explicitly labelled, noindex component gallery. Its form is local-only, with native validation and no persistent or API side effects. Examples never include protected author data, canonical fixture identities or session secrets.

## Consequences

There is no migration, authorization/RLS change, canonical event or outbox change. Web-to-API transport remains ADR-0058. The library can evolve independently of domain policy, while gallery examples and semantic tests make its behavior reviewable. A controlled native Dialog primitive now serves the actual appearance and mobile-navigation consumers, relying on the browser for inertness, focus containment, Escape and return. PasswordInput is added for the real auth and gallery consumers, preserving native validation/autocomplete/value and a named visibility toggle. Static editorial copy ships with Web until a real multi-author publishing workflow justifies a separately reviewed content model. More complex overlays and controlled compound widgets still wait for actual consumers and reviewed accessibility contracts.

## Amendment — 2026-11-01: dark learner interface

The maintainer replaced the learner-facing art direction. Learner pages (home, catalog, course, lesson, auth, my learning, 404) now render inside a dark scope with one electric-lime accent (`data-ui-accent="lime"`, dark text on accent actions) and no appearance picker. The dark theme tokens are neutral near-black instead of plum. Studio uses the same dark scope and shell (marked with a Studio badge). The light theme and the five selectable accents remain only for the `/ui` gallery and the not-yet-redesigned Commerce pages; the appearance control is removed. Ownership boundaries above are unchanged: tokens own values, `@platform/ui` owns primitives, Web owns composition. No API, auth, progress, migration or outbox change. See `apps/web/DESIGN.md`.

## Acceptance — 2026-11-04

Accepted as implemented: the token, primitive and composition ownership above is what Web and `@platform/ui` ship, and the web quality program (phases 0–8) put it under lint, component tests, end-to-end tests, an accessibility audit and performance budgets. How Web is organized on top of this decision — server and client components, data loading, state, styling — is described in `docs/architecture/web.md`.
