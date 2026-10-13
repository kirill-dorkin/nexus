---
name: "Nexus — home-lab Preview"
description: "Source-derived visual guidance scoped to the isolated homepage preview."
colors:
  rose-action: "#c21e68"
  violet-action: "#7742d3"
  blue-action: "#2455cb"
  teal-action: "#08786f"
  amber-action: "#946000"
  light-page: "#f5f6fa"
  light-solid: "#fff"
  light-ink: "#20213a"
  light-muted: "#62687d"
  dark-page: "#100b16"
  dark-solid: "#1d1625"
  dark-ink: "#f8f5fb"
  dark-muted: "#b8afc4"
  scene-bg: "#21172f"
  scene-ink: "#f8f5fb"
  scene-muted: "#c9bfd7"
  scene-field: "#332641"
  scene-stroke: "#907aa1"
  syntax-tag: "#d5b8ff"
  scene-divider: "#4a3d5a"
  scene-hover: "#463450"
  scene-focus: "#e0cafa"
typography:
  display:
    fontFamily: "\"Onest Variable\", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "clamp(2.1rem, 4.3vw, 3.75rem)"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-.035em"
  headline:
    fontFamily: "\"Onest Variable\", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "clamp(1.5rem, 2.8vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.03em"
  body:
    fontFamily: "\"Onest Variable\", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    lineHeight: 1.7
  label:
    fontFamily: "\"Onest Variable\", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".875rem"
    fontWeight: 600
  caption:
    fontFamily: "Onest Variable"
    fontSize: ".75rem"
    lineHeight: 1.6
  annotation:
    fontFamily: "Onest Variable"
    fontSize: ".8125rem"
    lineHeight: 1.6
  lesson-title:
    fontFamily: "Onest Variable"
    fontSize: "1.15rem"
    lineHeight: 1.4
  mobile-article-title:
    fontFamily: "Onest Variable"
    fontSize: "1.35rem"
    lineHeight: 1.35
  footer-title:
    fontFamily: "Onest Variable"
    fontSize: "1.25rem"
    lineHeight: 1.4
  code:
    fontFamily: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace"
    fontSize: ".875rem"
    fontWeight: 400
    lineHeight: 1.9
rounded:
  step: "7px"
  action: "10px"
  field: "12px"
  surface: "16px"
spacing:
  compact: ".5rem"
  base: "1rem"
  panel: "1.5rem"
  wide: "2rem"
  section: "4rem"
components:
  button-primary:
    backgroundColor: "var(--action-primary)"
    textColor: "var(--text-on-action)"
    rounded: "{rounded.action}"
    padding: "1rem 1.5rem"
    height: "54px"
  button-secondary:
    backgroundColor: "{colors.scene-field}"
    textColor: "{colors.scene-ink}"
    rounded: "{rounded.action}"
    padding: ".8rem 1.25rem"
    height: "48px"
  lesson-field:
    backgroundColor: "{colors.scene-field}"
    textColor: "{colors.scene-ink}"
    rounded: "{rounded.field}"
    padding: ".8rem 1rem"
    height: "48px"
  reading-surface:
    backgroundColor: "var(--surface-solid)"
    textColor: "var(--text-primary)"
    rounded: "{rounded.surface}"
    padding: "1.5rem 2rem"
  step-selected:
    backgroundColor: "var(--accent-action)"
    textColor: "{colors.light-solid}"
    rounded: "{rounded.step}"
    padding: ".5rem .75rem"
    height: "44px"
---

# Design System: Nexus — home-lab Preview

## Overview

**Creative North Star: "The Instructional Workbench"**

The instructional workbench carries the String Lab reference into a quiet, readable Nexus surface. Onest gives Cyrillic prose and controls one voice; opaque reading panels sit beside a plum source panel. Colour marks actions and state rather than supplying decorative depth.

This document records only `/ui/home-lab` and its preview review route. The preview is explicitly labelled and noindex/nofollow; `/` remains the current homepage pending selection. Shared tokens, learning routes and Studio retain their incumbent authority. These values are extracted observations, not new global detector rules.

**Key Characteristics:**

- Onest for Cyrillic headings, prose and controls.
- Five user-selected accents over light, dark or system appearance.
- Opaque reading surfaces and a flat instructional workbench.

## Colors

The existing palette pairs selectable action colour with theme-aware neutral ink and opaque panels. The frontmatter captures the observed source values; runtime authority remains `packages/design-tokens/tokens.css`.

### Primary

Rose, violet, blue, teal and amber are alternatives for the same action role, not five simultaneous brand colours. `--accent-action` drives the brand mark, selected step and document rule; `--text-accent` uses the existing day/night variant for readable accent text. `--accent-subtle` mixes the active accent with the solid surface for the Blog panel.

### Neutral

Light and dark page, solid, ink and muted tokens change with `data-ui-theme`. The plum scene background, scene ink and secondary ink stay stable inside the source panel; its field and stroke pair keep editable code controls readable. Syntax lavender identifies tags.

**The Semantic Accent Rule.** Use the active semantic action, text-accent and subtle tokens; the Radix violet prop does not choose the user’s accent.

The scoped Radix Theme override maps gray text, accent and background variables to the existing semantic tokens. Its selector includes radius and scaling attributes to outrank Radix defaults. Do not move this override into the global token layer.

## Typography

**Display Font / Body Font:** Onest Variable with the existing system sans fallbacks. The font is loaded by the app root. **Code Font:** the existing SFMono-Regular / Consolas / Liberation Mono stack.

Onest’s compact shapes and modest negative heading tracking make a continuous Cyrillic voice. Prose retains generous leading rather than adopting the code panel’s density.

### Hierarchy

- **Display:** the frontmatter display ramp; narrow screens use `clamp(1.75rem, 8.5vw, 2.125rem)` with 1.12 leading and -.03em tracking.
- **Headline:** the frontmatter headline ramp for section headings. Course titles use `clamp(1.5rem, 2.6vw, 2rem)` and 1.18 leading.
- **Body:** the frontmatter body role; the lead is capped at 66ch. Course and Blog prose use .9375rem / 1.7.
- **Labels:** control links use the label role; contextual scene labels use .75rem. Disclaimer and preview labels now use the 12px caption role; metadata and footer use the 13px annotation role. These are secondary text, not a new display tier.
- **Code:** the mono role with pre-wrapping and anywhere wrapping; .8125rem on narrow screens.

**The One Font Rule.** Keep display and body typography on the existing Onest stack; reserve the mono stack for code.

## Layout

The preview container is capped at 1200px within the app’s existing fluid body gutters. The shared body uses `clamp(1.25rem, 5vw, 4.5rem)` padding, reducing to 1rem below 360px. A compact header and flat sections use a recurring .5 / 1 / 1.5 / 2 / 4rem rhythm; this does not replace the shared spacing scale.

The lesson scene is a contiguous equal two-column grid. Course features pair image and copy in 1:1.15 columns; Blog and FAQ use .7:1.3. At 900px the hero actions reflow and panel padding tightens. At 640px content grids become one column, course media takes 16:9, and primary course actions span their panel. Existing navigation retains its own 1040px and 860px transitions. Required review widths are 320, 390, 768 and 1440 CSS px.

## Elevation & Depth

The preview uses tonal layering and dividers for content depth. Workbench, course panels and Blog panels are flat; hero and course buttons remove action shadows. Existing shared navigation controls keep their established treatments. The appearance dock alone uses a soft `0 6px 24px rgb(14 6 24 / 16%)` shadow and opaque elevated surface, with no backdrop blur.

**The Solid Reading Rule.** Use the solid surface token beneath document and course reading content. The preview’s source panel remains opaque plum.

## Shapes

Large preview containers use gently curved 16px corners and clip their split surfaces. The original shared tilted N mark and “учебная среда” lockup are reused unchanged; prominent preview actions use 10px corners; the shared lesson input retains 12px. Step buttons use tighter 7px corners. FAQ rows remain square and open, separated by shared disclosure borders rather than additional cards.

## Components

### Buttons

Direct and compact. The hero uses the shared large primary variant with semantic action/hover colours, white action text, 54px minimum height and 10px preview corners. Lesson actions reuse the shared 48px secondary variant with opaque plum field/hover colours, a visible scene border and 10px preview corners. Reading panels remain opaque. Disabled shared controls dim and stop interaction. Preview focus is a 3px semantic ring with 4px offset.

### Inputs / Fields

The shared input keeps its existing structure, 48px minimum height and 12px corners. Inside the plum scene, source-owned opaque field, stroke and ink overrides maintain readability. A visible label and hint accompany the controlled title input. Radio answers remain native labelled controls; feedback uses a status region.

### Navigation

Reuse session-aware LearningNavigation and its routes. Desktop links retain muted ink, active/hover underline and 44px targets. At its existing mobile breakpoint, the menu control opens the shared dialog. The footer uses simple course, Blog and author links. The floating appearance control opens the existing dialog with light/dark/system and rose/violet/blue/teal/amber choices; the Preview opts into visible accent names, arranged in three columns. The desktop panel sits above its trigger and transforms into the existing mobile bottom sheet; the default remains system/rose.

### Cards / Containers

Course features use solid reading surfaces, source-owned 16px corners and copy padding that narrows from 2rem to 1.25–1.5rem. Artwork comes only from `components/learning/course-artwork.ts`, currently reusing `/media/courses/computer-literacy-v1.webp`; the existing provenance record is `docs/design-assets/computer-literacy-cover.md` (verified on `ui/glass-foundation`, head `642b624fa1ed54044726a33dc5150fd201b37853`). The cover was generated on 2026-10-09 and converted to WebP; this rebuild reuses it. No new raster is generated for this rebuild. Catalog loading, error/retry and empty states keep shared semantics.

### Instructional workbench

Source and result share one clipped scene. The explanation/edit/quiz area reserves a consistent 270px height (285px on mobile), reducing jumps between its local states. Three pressed-state buttons switch between explanation, title editing and a local question. Editing the text updates the rendered document; answer feedback never writes canonical learning state. The conceptual example is explicitly labelled as unsaved. A 160ms ease-out document change fades from .7 opacity and moves 3px; reduced motion removes this animation. The solid appearance dock also supplies the reduced-transparency fallback.

## Do's and Don'ts

### Do:

- **Do** preserve the existing semantic theme and accent mappings, including all five accents.
- **Do** keep Onest, Cyrillic wrapping, visible focus and reduced-motion behaviour.
- **Do** reuse reviewed course artwork through the web-owned resolver and its provenance record.

### Don't:

- **Don’t** treat this preview as approval to replace `/` or restyle learning and Studio.
- **Don’t** persist the conceptual example’s answer or progress.
- **Don’t** introduce autoplay motion or blurred reading surfaces into this preview.

Source inspection and the remote asset provenance check are complete. Root’s deployed browser inspection confirms actual Onest, dark semantic primary ink and transparent Theme ground; the documenter performed no browser actions. Complete visual review, real-device and assistive-technology checks are separate gates. The inherited mobile-menu brand eyebrow and tiny secondary annotation sizes are recorded observations, not reusable new rules. No pre-existing learning/Studio drift is repaired by this document.

## Maintainer refinement, 2026-10-13

The maintainer requested the original logo and consistent small details. Reuse the shared mark rather than redraw it. Keep segmented stage controls, at least 12px secondary text, visible radio selection even after submission, labelled accent choices and native disclosure semantics with a restrained CSS chevron. Focus on plum uses the scene-focus colour; forced colours retain Highlight. Existing appearance consumers omit the two optional presentation props and preserve their prior layout. No product claims, auth transport or learning state changed.
