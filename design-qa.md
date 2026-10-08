# Approved cover and appearance — visual QA

## Result and scope

final result: passed

The approved combined IT direction has been compared with the real production-built Next.js homepage in Chromium, not a rasterized page or a replacement prototype. This result covers the homepage, appearance panel, responsive public navigation and the gallery examples changed in this slice. It does not declare the subsequent auth/lesson/quiz redesign complete or substitute for maintainer visual acceptance.

## Visual truth and evidence

Capture root for this review: `/workspace/scratch/33e28e12dfa3/`.

| State | Source visual truth | Rendered implementation | Normalization |
| --- | --- | --- | --- |
| Dark / rose / appearance open | `generated_images/exec-8540910a-ccef-4825-a26c-e21fc87863cf.png`, 1422 × 1106 | `verification/home-dark-1440-settings.png`, 1440 CSS px wide, viewport 1440 × 1120, DPR 1 | Source and first 1120 px of actual capture reduced to 720 px wide in `comparison-dark.png` |
| Light / blue / appearance open | `generated_images/exec-e24ad0bb-9cce-47f4-b43a-23d38d4ffa63.png`, 1422 × 1106 | `verification/home-light-1440-settings.png`, same viewport and DPR | Same normalization in `comparison-light.png` |
| Dark / rose / mobile / menu closed | `generated_images/exec-891f7024-cd8b-4891-9cd8-486fd9081027.png`, 740 × 2125 | `verification/home-dark-390-viewport.png`, 390 × 844, DPR 1 | Source reduced to 390 px wide; visible app content compared at the same horizontal scale in `comparison-mobile.png`; source shows a taller scroll region |

All three combined comparison sheets were opened and inspected. `comparison-hero-focus.png` compares readable crops of the heading, explanatory copy, calls to action, code panel and portal. Additional browser captures cover 320/600/768/900 px, mobile menus, the mobile appearance sheet, the existing login page and long Cyrillic course rows at 320 px. The Playwright results are recorded in `verification/results.json`. Captures are delivered separately from conceptual images.

Content state differs deliberately: the concept contains labelled example courses; the local app has no accessible API/database and shows the real unavailable state with retry. No example courses, reviews, counts or learner progress were added to the product. The gallery explicitly labels its long-name and empty-course examples as demonstration data.

## Comparison history and resolved findings

| Priority | Earlier evidence and impact | Fix | Post-fix evidence |
| --- | --- | --- | --- |
| P1 | Shared heading selectors overrode composition sizing; the desktop heading became oversized and wrapped into three lines. | Lower primitive variant specificity with `:where`, then use a deliberate fluid display scale capped at 64 px. | Actual 1440 px heading computes to 64 px, fits two lines, and balances the code panel in the final full-view and focused comparisons. |
| P2 | Mobile portal was mostly hidden behind the example panel. | Reposition the decorative asset independently of text flow on mobile. | Final 390 px capture shows the arch above and beside the panel without hiding actions or code. |
| P2 | Desktop appearance backdrop dimmed the entire live theme preview. | Transparent desktop backdrop, restrained mobile backdrop and native modal inertness. | Open-state dark/light comparison sheets preserve page contrast while the panel stays distinct. |
| P2 | Hue rotation made the blue artwork look teal. | Neutralize the raster before applying preset-specific color filters. | Light/blue comparison shows a cool glass portal and blue UI accents. |
| P2 | Early desktop composition had too much empty space above the text and delayed the catalog. | Reduce cover/figure vertical padding and restore a stronger two-line headline. | Final desktop comparison begins the catalog near the end of the hero, without overlap. |

No actionable P0/P1/P2 findings remain in this slice. The native-dialog gallery exposed a client/server import boundary during the production build; pure existing URL helpers were separated from server fetching without changing route semantics. The rebuilt gallery and real route navigation pass.

## Required fidelity surfaces

- **Fonts and typography:** self-hosted Onest Variable with actual loaded Cyrillic faces, strong display weight, readable 16–18 px explanatory copy and a separate monospace example. Computed display sizes: 35.2 px at 320/390, 40 px at 768, 64 px at 1440. Long course names wrap fully. Tablet wrapping is deliberate. Native form controls use at least 16 px text to avoid mobile focus zoom.
- **Spacing and layout rhythm:** balanced split desktop cover, one-column mobile order, full-width mobile primary action, editorial course rows and open lower sections. No page-level horizontal overflow at 320, 390, 600, 768, 900 or 1440. Menus and settings use 44 px touch targets and safe-area padding.
- **Colors and tokens:** complete scoped dark/light surface systems and five accents; status colors remain independent. Twenty contrast checks cover ten theme/accent combinations, including text/action and interactive focus/border contrast. Solid reading/code surfaces reduce dependence on transparency.
- **Image quality:** original transparent 137 KB WebP portal, correct asset loaded at every tested width; no placeholder art, copied logo, WebGL loop or rasterized UI. Direct static image delivery avoids the previously observed optimized-image failure. Light artwork is quieter than the conceptual illustration by design.
- **Copy and content:** editable real UI text and actual existing routes. The excerpt is explicitly a short example of a note, not an interactive editor. Concepts' demonstration course covers are omitted because the API has no cover data. Error, loading and empty states remain distinct; Enrollment/progress claims are unchanged.

## Interactions and checks

- Production Next.js build passed after the final code changes.
- Workspace TypeScript: 11 tasks passed; brand boundary check and `git diff --check` passed.
- Unit suite: 398 tests in 66 files passed with two workers. An earlier heavily concurrent run timed out two existing scrypt tests; no test timeout or authentication implementation was changed.
- Real mobile menu → existing `/courses` route; selected navigation; native appearance radio controls; persistence after reload; live system scheme changes; Escape and focus return; gallery dialog input; long Cyrillic rows at 320; touch menu with 44 px targets; reduced-motion animation removal: passed.
- Browser `pageerror` events: none. Onest and the portal loaded at every checked width.
- Reduced-transparency and no-backdrop-filter solid fallback are implemented in CSS. Physical Safari/Android, screen reader behavior and browser feature-disable fallback have not been device-tested.
- The signed-in learning/quiz journey and database-backed integration suite need the existing CI fixtures and a configured environment. No Production credentials were copied.
- Cloud local-preview transport is unavailable in this environment (`terminal.local` connection refused). Local Playwright browser verification above is real; the Vercel preview is a separate deployment check and must not be described as inspected until opened.

## Follow-up polish and implementation checklist

- Preserve the Draft PR; inspect exact-head CI and the resulting Vercel preview separately.
- Maintainer visual review is still required before Ready/merge; no Production publication is part of this slice.
- P3: compare Onest rendering on physical iOS/Android and tune the subtle light portal if desired.
- Next coherent visual stage: auth forms, catalog/course, lesson, quiz and own learning; Studio follows separately. Account-synchronized appearance is deferred; this slice saves on the current device.
