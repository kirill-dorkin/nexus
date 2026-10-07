# UI foundation design QA

- Source visual truth: the maintainer's ten supplied magenta/violet glass reference cards, inspected from the authorized attachment downloads. The first cover's sculpture, palette, borders and typography establish art direction; the cards are not application layouts to reproduce pixel-for-pixel.
- Implementation: Web homepage, shared public shell/catalog and `/ui` component gallery.
- Intended viewports: desktop 1440 × 900 and mobile 390 × 844, dark homepage; dark/light gallery; anonymous catalog state.
- Implementation screenshot path: unavailable.
- Density normalization and combined visual comparison: not performed; no browser-rendered implementation capture is available.

## Findings

Browser navigation to the local implementation was blocked while browser credential protection was active. The tool explicitly requested manual handoff. No repeated navigation, alternate browser or browser-session bypass was attempted. Visual fidelity, final artwork crop, typography wrapping and perceptual glass contrast cannot be accepted from source code or build success alone.

## Required visual surfaces

- Typography: semantic hierarchy and responsive sizes implemented; rendered wrapping/fallback font review pending.
- Spacing/layout: desktop/mobile CSS implemented; visual comparison pending.
- Colors/tokens: the seven UI semantic tests include dark/light WCAG AA foreground/action contrast and visible input/focus boundaries. These cover named solid surfaces, not arbitrary artwork pixels under glass.
- Image quality: original generated 1536 × 1024 artwork exported to a local 67,824-byte WebP. Browser crop/render quality review pending.
- Copy: new Russian learning copy retains real catalog/auth/quiz/progress semantics; no third-party reference text or fake statistics copied.

## Verification scope

UI semantic unit tests and Web/UI typecheck passed. Production Next build passed before the final preload/config/test adjustment; exact-head CI will validate the final code. The repository browser gate has been extended to cover homepage artwork/keyboard anchor/mobile overflow, gallery accessible controls, light/dark theme selection, native form success/reset, keyboard disclosure, reduced motion and desktop overflow. Automated functional coverage is separate from a human visual comparison.

## Implementation checklist

1. Complete exact-head CI, including the existing fresh-profile Chrome gate.
2. Obtain rendered desktop/mobile captures and compare them with the selected art direction.
3. Verify typography, sculpture crop, translucency and primary actions visually, then address any P0/P1/P2 finding.
4. Complete maintainer-local verification before Ready/merge, as required by the repository workflow.

Comparison history: initial capture attempt blocked; no visual iteration or final fidelity claim is made.

final result: blocked
