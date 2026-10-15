# Nexus frontend visual decision — Phase 0

Date: 2026-10-15  
Status: **selected target for implementation; screenshot/accessibility acceptance pending**  
Source: [master spec v1.2](../product/frontend-master-spec.md), [route/state matrix](frontend-route-state-matrix.md), and [self-contained responsive prototypes](frontend-phase0-concepts.html).

## Review material

The HTML proof switches among **three distinct directions** and **three actual frontend tasks** (home, course, lesson + quiz) at the same viewport and with the same course content from `docs/examples/computer-basics-first-course.manifest.json`. Check both 1440 and 390 px in a browser and also 320, 768 and 1024 px; toggle the local light/dark concept state. This is a presentation prototype, not a working backend, course release, quiz validator, or new public route.

| Direction | Compositional hypothesis | Strength | Failure risk |
|---|---|---|---|
| A — Calm editorial learning | Quiet shared header, readable course rows, prominent real content and a discrete learning sidebar | Learner task, long-form Cyrillic, consistent public/Commerce structure | May look generic without careful typography and original brand assets |
| B — Navigation workspace | Structural rail, compact utility rows, strong cyan functional segmentation | High information density for Studio/teaching contexts | Visual rail competes with primary content, especially on 390 px |
| C — Expressive academy | Plum/dark base, strong typographic hero, violet spotlight and rounded surfaces | Distinctive top-of-funnel identity | Contrast/theme robustness and unnecessary decoration in quiz/authoring flows |

## Selection

**Direction A is the implementation target for the public and learner shell**. It best supports the first-release product promise: pick one real course, read a lesson, practise and continue. Direction B informs later privileged Studio/Teaching workspace layouts but is not adopted as the global shell. Direction C may inform restrained promotional accents and artwork, not every surface.

This chooses a coherent *interaction/composition target*, **not** a fixed brand color, a permanent light-only header, or approval of pixel-level production visuals. Full visual acceptance remains contingent on real screenshots and cross-theme testing. Do not treat the concept HTML's browser-only sample CTA as functioning enrollment, practice or checkout.

## Fixed UX principles

1. Global header uses semantic `page/surface/text/border/action` tokens; no route-specific fixed plum/dark backdrop or hard-coded text pairing. If a route requires different background treatment, contrast must be verified for every supported theme and accent.
2. No dedicated oversized theme toolbar below every page. Move appearance into a small account/appearance control accessible also to a guest; preserve five accents, OS theme mode, before-paint persistence and forced-colors support.
3. One main task/primary CTA per view: homepage → course; course → lesson or enrollment action derived from canonical state; lesson → relevant practice/next canonical step.
4. Studio/Teaching/Organization are capability-gated workspaces. Never infer staff authority from a session or membership; no public Studio footer link.
5. Preserve an intentionally stable navigation shell while checking session, without hydration flashes or oversized placeholders.
6. Content gets priority: on 390 px, title/description/CTA precede imagery; course lesson list remains legible without artwork; lesson sidebar becomes compact requested disclosure.
7. Reading width is bounded independently of layout width. Long Russian titles/code must wrap or scroll in their own containers, never extend the viewport.
8. Form/quiz feedback remains adjacent to the control; wrong answer, system error and ambiguous network outcome use distinct text and states.

## UI foundation targets to verify during Phase 1

| Aspect | Target | Verification |
|---|---|---|
| Main layout | Desktop bounded 1120–1200 px; body reading column around 680–740 px; mobile 16–20 px gutters | 320 / 390 / 768 / 1024 / 1440 |
| Rhythm | Existing semantic spacing scale; section whitespace responsive to content density | Long Cyrillic titles + 200% text |
| Typography | Existing self-hosted Onest; stable heading/reading scale and line height | Cyrillic baseline, no CLS after load |
| Shape | Modest radii (~12–16 px in public cards/buttons), not deep glass panel stacks | Focus rings must remain visible |
| Header | One reusable semantic surface + subtle border; predictable auth-slot geometry | Light/dark/system + five accents, checking/auth/anonymous |
| Interaction | Touch targets ≥44px, main action ≥48px, focus contrast and Escape returns | Keyboard, touch, 200% zoom |
| Motion | Local 120–220ms only where useful; respect reduced-motion | No layout shift or mandatory animation |
| Artwork | Only verified local media if present; missing imagery does not leave blank frames | No artwork, slow load and no video |
| Components | Primitives live in `@platform/ui`; product patterns in Web | No business authorization in style primitives |
| States | data / empty / unavailable / forbidden / ambiguous are visually distinguishable | Real canonical response simulations and browser CI |

## What remains explicitly unverified

- No Playwright screenshots of the concept HTML are attached yet; this record does **not** assert the 1440/390 screenshots were captured.
- No physical device, screen-reader, Safari or Firefox verification was performed as part of this docs-only slice.
- Contrast of every semantic token/accent on the exact production header and nested components has **not** been reverified; Phase 1 must add evidence instead of relying on theme names.
- Real `/learn` and `/studio` content integration is out of Phase 0. Existing published/saved/Enrollment/purchase authority remains unchanged.

## Phase 1 handoff

1. Unify the existing public and commerce shell without changing canonical transport or checkout.
2. Correct the authenticated-but-not-authorized Studio discovery/link surfaces using a server-derived staff capability, with a safe absence behavior.
3. Remove the per-page utility-row hierarchy, replace with compact contextual appearance access, preserve guest preference.
4. Validate 320/390/768/1440 screenshots, theme/accents, forced-colors, keyboard, focus, reduced motion, and no horizontal overflow.
5. Record screenshots and exact-head CI in the separate `ui/navigation-shell` PR; do not combine Phase 1 production changes into this Phase 0 baseline PR.

## Architecture/security dependency before managed-academy launch

Current ADR-0057 permits owner-bootstrap self-create via an existing Organization endpoint. Product v1.2 instead reserves organization creation for platform owner/internal bootstrap. A dedicated backend security slice must first:

- identify every HTTP and internal caller and current grant;
- define platform-owner identity bootstrap from trusted operational authority, independent of public registration;
- fail-close ordinary `POST /v1/me/organizations` for authenticated learners (including exact direct HTTP calls);
- preserve migration and operations paths, no accidental tenant deletion/membership or Role changes;
- add explicit negative tenant/foreign-principal/regression tests and an accepted ADR updating the policy.

Only then may Studio remove ordinary self-create and claim this invariant enforced. A CSS hide is not sufficient.
