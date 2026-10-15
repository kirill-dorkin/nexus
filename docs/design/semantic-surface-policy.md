# Semantic surface color contract — Nexus Web

Status: implementation rule (Phase 1B, pending PR review). Scope: shared design tokens and `@platform/ui` primitives, not an independent theme system.

## Problem

The original dark palette used a neutral `--page-background` but permanently plum `--surface-subtle`, `--surface-solid`, input, elevated and hover surfaces, plus purple borders. A user who selected teal, amber, rose or blue still saw unselected purple surfaces and dialogs. This also made independent headers feel disconnected from the page.

## Rule

- Base `--surface-default`, `--surface-subtle`, `--surface-solid`, `--surface-input` and the neutral base used by derived surfaces use hue-neutral graphite/slate (dark) or neutral gray (light).
- `--surface-elevated`, `--surface-hover`, `--border-default` and related translucent surfaces may derive a **restrained** tint only from the selected `--accent-action`, never a second fixed hue.
- Functional semantics remain separate: `--text-primary`, `--text-secondary`, `--status-*`, `--focus-ring`, and `--text-on-action` are not overridden to imitate the accent. Contrast is tested for dark/light and all five accents.
- Product components must reference semantic tokens, not fixed purple or white backgrounds. Native modal scrims derive from `--text-primary` so they adapt to dark and light.
- Header changes are isolated in PR #100 and must consume these same semantic tokens when both slices land.
- Artwork can use intentional visual hues; its tint must not set form/control backgrounds. Forced-colors and reduced transparency require contrast-oriented fallbacks, not brand color assumptions.

## Verification

`packages/ui/src/contrast.test.ts` checks AA text/action and key focus/input boundaries for dark/light × rose/violet/blue/teal/amber. `surface-palette.test.ts` separately enforces neutral core surfaces and limited accent-based blending. Existing `apps/web/src/components/appearance/background.test.ts` checks restrained page-background chroma. Run full CI plus real-browser screenshots at 320, 390, 768 and 1440 px, all supported themes, and at least amber/rose/violet/teal accent extremes. CI contrast assertions cannot replace real rendered screenshots or screen reader checks.

No API, roles, Organization, entitlements, Lesson/Quiz, persistence or migrations change in this slice.
