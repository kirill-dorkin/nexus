# Accessibility audit (WCAG 2.2 AA)

Audit of the learner site and Studio, 2026-11-04 (web quality program, phase 8). The automated part is executable and runs on every PR; this document records the method, what it covers, what it found and what is left to a human.

## Method

`tests/e2e/specs/accessibility.spec.ts` runs against the e2e environment (real API, PostgreSQL, the production Web build behind one origin, the e2e course published by global setup).

1. **axe on every page.** axe-core with the WCAG 2.0/2.1/2.2 A and AA rule tags; the test fails on any serious or critical violation.
   - Public and learner pages: home, catalog, course, an HTML lesson, the SQL lesson, the last lesson, blog index and an article, sign-in, registration, «Моё обучение», the UI gallery, the 404 page.
   - Studio, signed in as the owner: the course page, the JSON and preview modes, the entry policy.
   - The mobile course program, scanned while open as a modal.
2. **Keyboard.**
   - The skip link is the first Tab stop and moves focus to the main content.
   - Every element reached by Tab over the first 40 stops of a lesson page shows a visible focus indicator (an outline or a ring on the element or a near ancestor).
   - The practice editor keeps Tab for indentation and releases focus after Escape (WCAG 2.1.2, no keyboard trap).
   - The mobile course program opens as a modal and closes with Escape.
   - A quiz can be answered and checked with the keyboard alone.
3. **Earlier phases.** Every e2e scenario (phase 5) already runs axe on each page it visits, and the `jsx-a11y` strict lint rules (phase 0) apply to all Web and `@platform/ui` code.

## Findings

| # | Where | Criterion | Finding | Status |
|---|---|---|---|---|
| 1 | Studio organization buttons | 2.5.3 Label in Name | `aria-label` did not contain the visible name | Fixed in phase 5 |
| 2 | Studio logo link | 2.5.3 Label in Name | Same | Fixed in phase 5 |
| 3 | Practice editor | 2.4.7 Focus Visible | The textarea removed its outline and nothing replaced it | Fixed: the editor block shows a focus ring (`:focus-within`) |
| 4 | Course program search | 2.4.7 Focus Visible | The input removed its outline; focus only tinted the border | Fixed: the search field shows a focus ring |
| 5 | UI gallery loading example | 4.1.2 Name, Role, Value | `aria-label` on a `div` without a role | Fixed: `role="status"` with `aria-busy` |
| 6 | Lesson result frames | 2.4.7 Focus Visible | CI's Chromium makes a preview `iframe` a Tab stop; it had no focus indicator (desktop Chrome skipped it) | Fixed: every `iframe` draws a focus ring inside its edge |

The remaining `outline: none` rules in Web are on `<main>` landmarks that receive programmatic focus from the skip link (`tabindex="-1"`), which is the intended pattern.

**Open automated or keyboard AA failures: none.**

## Not covered by this audit

These need a person and are tracked here rather than claimed:

- **Screen-reader pass.** VoiceOver (macOS, iOS) and NVDA (Windows) through the learner path and Studio: announcement order, live-region updates of practice results and quiz feedback, the modal program.
- **Zoom and reflow.** 200 % text zoom and 320 px reflow (1.4.4, 1.4.10) were checked by eye on the redesign only (`home-redesign-verification.md`), not on every page.
- **Contrast of non-text and states.** axe checks text contrast; hover, disabled and focus-ring contrast against every background (1.4.11) was not measured.
- **Content.** Lesson texts and images written by authors (alternatives for images, heading order inside lessons) depend on the course; the published courses were not reviewed one by one.

A finding from any of these goes into the table above with its criterion and either a fix or an issue.
