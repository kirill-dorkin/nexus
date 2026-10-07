# ADR-0059: Semantic UI foundation and incremental Web adoption

- Status: Proposed
- Date: 2026-10-07

## Decision

`@platform/design-tokens` owns semantic visual values. `@platform/ui` owns brand-neutral, typed presentation primitives and its explicitly imported stylesheet. Web owns product composition, route navigation, application state and domain-specific patterns. Branding continues to come from `@platform/brand`; no product name enters component/runtime namespaces.

The maintainer-selected art direction is dark plum with magenta/violet accents, translucent panels, fine borders and strong typography. Dark is deterministic rather than inferred from the device setting. A scoped light theme demonstrates the semantic contract; a theme preference or persistence policy is a later product decision.

Primitives render native HTML and remain usable from React Server Components. They have no hooks, requests, local storage or business authority. Interactivity lives in small calling client components. Native control refs use React 19 props. CSS is imported once by the application root. Next transpiles the workspace UI source. Phosphor icons use its SSR entrypoint where no icon context is required; no full icon provider is introduced.

Glass is a surface variant, not a universal container. Dense inputs use solid backgrounds. Transparent surfaces have a solid fallback and respect reduced transparency; motion respects reduced motion. Core text/action colors remain readable on the named surfaces. New navigation/actions retain keyboard focus and native link/button semantics.

The first adoption covers the public shell, homepage/catalog, registration/login, explicit self-entry, own learning, course outline, Lesson navigation and quiz feedback. Shared product headings, loading and outline patterns stay in Web. Native controlled Radio/Checkbox inputs preserve pending-answer locking and explicit retry; the course progress presentation consumes the existing derived percentage and never infers Enrollment completion. Studio/Commerce controls remain for later incremental adoption. The homepage streams its cover independently of the same no-store public Learning query. Catalog loading, a genuinely empty result and a generic failed-read state are distinct; failure never fabricates courses or displays backend details. Decorative original artwork is a local compressed asset with empty alt text; no fake course, progress, testimonial or statistic is introduced.

`/ui` is an explicitly labelled, noindex component gallery. Its form is local-only, with native validation and no persistent or API side effects. Examples never include protected author data, canonical fixture identities or session secrets.

## Consequences

There is no migration, authorization/RLS change, canonical event or outbox change. Web-to-API transport remains ADR-0058. The library can evolve independently of domain policy, while gallery examples and semantic tests make its behavior reviewable. Complex overlays and controlled compound widgets wait for a product consumer and a reviewed accessible primitive rather than speculative custom state machines.
