---
name: "Nexus — learner interface"
description: "Dark, bold learner-facing pages: home, catalog, course, lesson, auth, my learning, 404."
colors:
  canvas: "#08090b"
  surface: "#121317"
  surface-elevated: "#16181c"
  ink: "#f5f5f4"
  muted: "#a3a3ad"
  accent: "#c5f23a"
  accent-text: "#d4f86a"
  on-accent: "#0a0c04"
typography:
  display:
    fontFamily: "Onest Variable"
    fontSize: "clamp(2.6rem, 7.2vw, 5.4rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-.06em"
  section:
    fontFamily: "Onest Variable"
    fontSize: "clamp(1.9rem, 4.2vw, 3.1rem)"
    fontWeight: 750
    letterSpacing: "-.05em"
  body:
    fontFamily: "Onest Variable"
    fontSize: "1rem"
    lineHeight: 1.6
---

# Learner interface

## Principle

A visitor understands the page at a glance and reaches the next step in one action. Every learner page has exactly one primary action, drawn in the accent colour. Decoration explains the product (a lesson preview, progress, checking) rather than filling space.

## Direction

- Always dark on learner pages (`data-learner-scope`, `data-ui-theme="dark"`, `data-ui-accent="lime"` on the page frame), independent of the device colour scheme. There is no appearance picker on learner pages.
- Neutral near-black canvas; colour comes only from the single electric-lime accent. Accent actions use dark text.
- Large, heavy, tightly tracked Onest headings; quiet secondary text.
- Rounded cards (1.5rem), pill buttons, thin borders, soft accent glow behind key surfaces.
- Bento grid for "how it works"; course cards with a generated cover (lesson list + large index), never stock imagery.
- Motion is limited to hover lift and two floating preview chips, disabled under `prefers-reduced-motion`.

## Structure

- `components/learning/learning-shell.tsx` + `site.module.css`: sticky translucent header, main column, footer.
- `components/learning/home-discovery.tsx`: hero (offer + direct "start first course" action + lesson preview), courses, bento, final CTA.
- `components/learning/course-list.tsx`: the one course card used on home and catalog.
- `components/learning/flow.module.css`: catalog, course, lesson, quiz, saved learning.
- `components/learning/challenge.tsx`: hands-on lesson tasks (```` ```challenge ```` fences). The learner edits HTML; declarative checks run against an inert `DOMParser` document in the browser and light up live; a solved task is remembered in `localStorage` only. This is practice, not progress: official progress still comes from server-checked quizzes.
- `components/learning/story.tsx`: story course blocks — ```` ```story ```` messenger scenes with the course characters (lines appear as in a chat when scrolled into view; "Показать всё" skips) and ```` ```concept ```` cards (what it is / why / how + live sandboxed preview).
- `components/learning/signup-nudge.tsx`: gentle account invitation for anonymous learners — appears after 5 minutes of active study (visible tab, recent interaction), never while typing, never steals focus; "Позже" snoozes 15 minutes, at most 3 times a day; plus a quiet line under a solved challenge. Per-viewer state lives in localStorage only.
- `components/learning/sound-panel.tsx` + `lib/sound/engine.ts`: generative coffee-shop music on lesson pages — on by default, starts on the first gesture (browser autoplay rules), keeps playing across client navigation, volume remembered per viewer. Character voice-over was tried and removed (git history, 9722674).
- `components/learning/lesson-visuals.tsx`: coloured diagrams and one-animation-per-block typing demos.
- `app/login`: centered auth card. `app/not-found.tsx`: 404.

Studio shares the same dark frame (`StudioShell` reuses `site.module.css`, with a Studio badge). Commerce pages (product, checkout, purchase) still follow the device colour scheme until their own slice.

## Contracts kept

Copy, labels, landmarks and form structure asserted by `tests/public-launch-browser/verify.mjs` are part of the interface contract. Change them together with the browser test.
