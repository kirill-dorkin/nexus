# Approved cover and appearance — visual QA

## Result and scope

final result: passed

The approved combined IT direction has been compared with the real production-built Next.js homepage in Chromium, not a rasterized page or a replacement prototype. This result covers the homepage, appearance panel, responsive public navigation and the gallery examples changed in this slice. The learning-screen continuation is reviewed separately below. This does not substitute for maintainer visual acceptance.

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
- Studio remains a separate agreed stage. Account-synchronized appearance is deferred; this slice saves on the current device.


## Learning-screen continuation — 2026-10-08

**Scope:** existing login/registration, public catalog/course, lesson notes/video/navigation, quizzes and own learning. Auth/session, tenant isolation, membership/enrollment commands, immutable quiz retry and canonical progress remain unchanged. No API, persistence, migration or outbox code is modified.

### Composition and materials

- Auth uses a calm solid form alongside an open numbered explanation. Mobile shows the form first. Primary submit, secondary mode switch and return link have distinct emphasis. Password visibility preserves native value, validation, autocomplete and disabled behavior; the control is added to the neutral UI library and labelled gallery.
- Catalog retains the actual ordered API results. Search filters the returned bounded list by Cyrillic title, description and organization; it makes no claim to search unpublished or unloaded courses. Missing data, failed loading and no matching results are distinct.
- Course outline uses open separated rows instead of repeated cards. Mobile brings the start action before the program. Anonymous sign-in has secondary emphasis. Enrollment commands and visibility rules are retained.
- Lesson notes use a solid reading surface, a 68ch measure and 17px text with 1.8 line height. Navigation remains separate; long outlines can scroll inside the desktop sidebar. Existing safe Markdown and video URL handling are unchanged.
- Own learning uses open rows with actual canonical progress beside course details, stacking on mobile. Quiz options keep native controls, explicit pending/retry, disabled and feedback states.

### Browser evidence and its limits

The final production-built Next.js application was run in Chromium using Playwright. Captures are in `/workspace/scratch/33e28e12dfa3/learning-verification/`. **Populated course, lesson, own-learning and quiz captures use explicitly labelled local test data. These are test projections, not real courses/progress, and were not added to the application or published.** Local authentication errors are intercepted test responses; no real account was created for these captures. The existing CI browser scenario separately checks the learning journey and unchanged command/retry contracts.

| Coverage | Result and evidence |
| --- | --- |
| Login, catalog, course, lesson and anonymous own learning at 320 / 390 / 768 / 1440 CSS px | 20 layout checks; no page-level horizontal overflow; actual Onest loaded; `results.json`, corresponding width-labelled captures |
| Registration and populated own learning at all four widths | Native form and long course titles remain contained; `register-*.png`, `own-learning-*.png` |
| Password, validation, pending and auth errors | Invalid native form sends no request; reveal/hide preserves value and type; submitting disables the fieldset; visible keyboard focus; error text for login and registration; `login-focus-390.png`, `login-error-390.png`, `register-error-390.png` |
| Catalog search, reset, empty and unavailable | Cyrillic matching, no results/reset, truly empty and transport error states remain distinct; navigation stays usable; `catalog-search-empty-1440.png`, `catalog-empty-1440.png`, `catalog-error-1440.png` |
| Own learning anonymous, populated, empty and error | Separate states and existing continue destination; `own-anonymous-*.png`, `own-learning-*.png`, `own-empty-390.png`, `own-error-390.png` |
| Quiz single choice, multiple choice and text | All answer types contained at 320 / 390; pending immutable answer, same try/body on retry, success then explicit reset; `quiz-pending-390.png`, `quiz-success-390.png`, `quiz-multiple-*.png`, `quiz-text-*.png` |
| Light / blue reading and forms | Real appearance controls apply the same tokens; `login-light-390.png`, `login-light-1440.png`, `lesson-light-1440.png` |
| Runtime | No browser `pageerror` events in the local verification |

### Visual critique and fixes

P2: the course had two equally dominant primary actions. The course start remains primary; anonymous sign-in is now secondary and its block uses an open divider. P2: nested surface defaults overrode the intended entry presentation; a scoped selector restores the open treatment. P2: two narrow mobile lesson-navigation columns caused excessive wrapping of long titles; below 500px these actions now stack at full width. P3: own-learning title spacing was unnecessarily loose; details now share a compact vertical rhythm. Final screenshots were inspected for Cyrillic wrapping, hierarchy, reading measure and surface contrast. No actionable P0/P1/P2 findings remain in these reviewed layouts.

The React review confirmed server-only fetching stays behind Suspense, filtering is derived from current props/query without an effect or extra request, and password visibility is local presentation state. No animation dependency was added. Existing reduced-motion, touch navigation and solid transparency fallbacks remain in place; the homepage/gallery regression is checked separately. Physical iOS/Android, screen readers and feature-disable fallback are still unverified on devices.

Workspace type checking, production Web build, brand boundaries and the 398-test unit suite passed. Persistent CI browser assertions now cover Cyrillic search/reset and password visibility without altering registration/entry or quiz semantics. Exact-head CI and Vercel deployment inspection are separate gates after the push; do not infer their result from local tests. Maintainer visual acceptance remains necessary before merge. Studio and account-synchronized appearance are outside this stage.


## Studio continuation — 2026-10-08

**Scope:** authorized organization/course workspace, manual and JSON editor, collection ordering, revision/conflict presentation, author preview and explicit publication confirmation. The existing Content/Organizations APIs, session/Origin/tenant/RLS, manifest validation/apply, exact publication fence and outbox are unchanged. A one-off TypeScript AST comparison confirmed all twelve existing CourseEditor operation handlers are identical to the preceding head. No protected content, example course or author credential is added to public routes, gallery or browser storage.

### Composition and resolved findings

The previous Studio presented nearly every action with equal emphasis and wrapped long nested forms in repeated borders. It had no connection to the shared navigation/appearance, and a failed initial editor read could still show a loading message. The continuation uses an organization rail and open course rows, compact editor title, a sticky desktop mode/save toolbar, native section anchors with actual counts, shared Field/Input/Textarea/Select/Button controls, and solid reading/form surfaces. Nested fieldsets remain semantic groups but use open separators rather than card-within-card framing. Download/reload actions are in a named disclosure; conflicts open it without erasing the working copy.

P2 resolved: an early 52px editor title pushed fields too far down on a long-name mobile course; the working title is now 24–36px with a wider desktop measure. P2 resolved: wrapping the JSON textarea inside a label made exact label targeting include document text; shared Field and explicit control IDs give a concise native relationship. P2 resolved: non-auth initial read errors now show failure/retry without an endless loading indicator. P3: Studio omits the redundant global sign-in action and retains its actual anonymous gate. Final desktop/manual and mobile preview/confirmation captures were inspected for hierarchy, Cyrillic wrapping, surface contrast and action visibility.

### Browser evidence

Capture root: `/workspace/scratch/33e28e12dfa3/studio-verification/`. **All populated Studio captures use labelled local test fixtures. They are neither real protected author data nor published courses. Test endpoints are intercepted only by the external QA script; fixtures were not committed to the product.** Screens are rendered components in the production-built Next.js application, not a separate prototype or concept image.

| Surface | Verification |
| --- | --- |
| Organization/course workspace | Actual title/status/version layout with long labels at 320 / 390 / 768 / 1440; separate anonymous, unavailable, empty organization and empty course states; explicit organization disclosure |
| Manual / JSON / preview | 12 width/mode layout checks, no page-level horizontal overflow, loaded Onest; native labelled controls; new blank course at 320 / 390; mobile menu/Escape |
| Protected author preview | All three quiz shapes render question/options only; protected test explanations/answers are absent from preview text; existing safe Markdown/YouTube policy retained |
| Ordering | First Lesson cannot move beyond the start; moving down preserves and swaps actual Lesson content |
| Invalid JSON | Mode switch retains invalid raw text and stays in JSON until repaired |
| Permissions | Read-only authorized snapshot disables editing and publication while allowing preview; 403 initial read stops loading |
| Revision and ambiguous save | Stale validation disables save and retains edits; ambiguous apply retains the copy and locks retry until explicit canonical reload; disabled fields during the pending operation |
| Publication | Cancel is initial focus; Tab does not reach background controls (native Chrome may focus browser chrome/body between cycles); Escape/cancel return focus and send no request; explicit confirmation sends one unchanged exact version/revision request; next draft preserves manifest/version semantics |
| Themes | Real appearance control applies light/blue to manual and preview; shared theme/system behavior is reused |
| Runtime | No local browser page errors; results in `results.json` |

Build, workspace TypeScript (11 tasks), brand boundaries and diff checks passed. The unit suite passed 398 tests / 66 files; focused Studio parity/safe-preview tests also passed after field adoption. The persistent canonical browser test now uses native label.control associations, opens the copy disclosure, and proves opening/cancelling publication leaves the canonical draft intact before its ordinary fenced publish/next-draft flow.

Cloud deployment and exact-head CI remain separate post-push checks. Preview may not have its database configured; do not describe isolated local fixtures as a working deployed authoring backend. Physical iOS/Android, assistive technologies and very large 200-Lesson documents remain further review surfaces. Native section navigation keeps current large forms usable, but focused per-item editing is a separate improvement. No merge, Ready or Production publication is part of this continuation.


## Selected authentication concept — 2026-10-09

**Source visual truth:** user-selected third displayed ImageGen concept, `/workspace/scratch/33e28e12dfa3/generated_images/exec-7359fcac-6b0b-4ee8-b5f7-23f13dcb133f.png`. The first concept was superseded by the user's explicit choice before implementation. This reference is conceptual, not a screenshot of Nexus.

**Implementation:** production-built existing Next.js app `/login`. Capture root `.tmp/nexus-preview-setup/`; final desktop `auth-redesign-desktop-1584-light.png`, alternate dark `auth-redesign-desktop-1584-dark.png`, mobile registration `auth-viewport-mobile.png`. Local Chromium Playwright, deviceScaleFactor 1; light login, blank unauthenticated form. Source and implementation were opened together in one comparison input. Source is 1586×992 pixels; implementation 1584×992 CSS/pixels, a negligible 2px width difference, no device chrome or density scaling. Additional viewport matrix covers 320×568, 390×844, 768×1024, 1440×900, 844×390 and 390×350 in light/dark login/register/error states. Captures represent rendered real components, not page bitmaps or new demo apps.

### Comparison and iteration

- P2 initial: form was narrower than the reference and header excessively inset at the matching desktop width. Expanded the form measure from 68rem to 75rem and removed the extra frame max-width. Post-fix 1584px capture preserves the wide open composition, paired fields and left-aligned primary action.
- P2 initial: generated ribbon was cropped to a tiny corner. Increased its visible crop by raising it and reducing the right offset. Post-fix capture shows a broad translucent ribbon below/right of the fields, without a panel or animation.
- P2: larger readable labels made 390×844 registration exceed one screen by 10px. Reduced only mobile main vertical padding; recapture fits while short screens retain natural scrolling and reachable actions.
- State correction: keyed native field groups preserve email/password when optional registration name is inserted. Submission endpoint/body, constraints, session handling and allowlisted redirect stay unchanged.

- P2 live Preview at 1363×936 exposed a detached sliver of the transparent ribbon near the top-right edge. Clipped only the decorative image wrapper’s upper 35%; controls/document scrolling are unaffected. Recaptured local desktop/mobile and rechecked live Preview after the fix.

### Required fidelity surfaces

Typography: existing self-hosted Cyrillic Onest, expressive single-line desktop heading, smaller mobile heading, solid 16px labels/input text and 54px controls. It follows the reference hierarchy; exact reference font is not specified. Spacing: open 1200px form, paired desktop fields, underlined mode controls, one mobile column, no nested cards. Colors: existing semantic light/plum-dark and five accent tokens; readable solid form backgrounds independent of backdrop blur. Image: one original transparent 134KB WebP, inspected at source and in browser, rose/lilac ribbons, no borrowed logo, CSS art or third-party media. Copy: reference login heading/support retained; registration has product-specific copy and existing real constraints. Return link keeps the actual allowlisted destination rather than falsely always promising courses. Appearance opens the existing functional theme/accent dialog instead of copying decorative two-mode chrome. Focused crops were unnecessary: labels, controls, copy and ribbon edges were readable at full-size combined comparison.

### Interaction evidence and limits

42 viewport/theme/state checks passed without horizontal overflow or browser page errors. Normal 390×844, 768×1024, 1440×900 and 1584×992 login/registration fit the viewport; errors and short screens scroll naturally. Extra local UI checks verify invalid forms send no request, password reveal and mode changes preserve values, pending disables inputs/mode changes, 409 feedback clears after changing mode, keyboard-visible password focus, reduced-motion usability, theme/accent selection and persistence. Auth error/pending checks use intercepted test-only responses; they do not prove deployed database behavior. The persistent canonical CI journey separately verifies registration/login/session/return-to. No authentication or progress business logic was changed.

**Findings:** no actionable P0/P1/P2 visual differences remain. **Follow-up P3:** exact physical Safari/Android keyboard and assistive-technology review remain unverified; the source's raster typography is not reproduced pixel-for-pixel. User visual acceptance remains separate from technical checks. Exact-head CI and Preview are post-push gates.

**Implementation checklist:** selected composition, generated raster, responsive form, real appearance dialog, state checks and recapture completed. No merge or Production publication.

**final result: passed**


## Catalog and course continuation — 2026-10-09

**Audit scope and user goal:** anonymous learner moves from `/courses` to the real Computer Literacy Preview course, understands what is available before registration, searches the returned catalogue, reviews the curriculum, and opens the first lesson. The existing Git-linked Preview was captured and inspected before the change; the final production-built app was captured under `/workspace/scratch/33e28e12dfa3/course-media-qa/` at 320, 390, 768 and 1440 CSS px in light and dark themes. Representative accepted captures are `catalog-1440-light.png`, `catalog-390-dark.png`, `course-1440-light.png`, and `course-390-light.png`.

### Numbered flow and findings

1. **Catalogue entry — healthy after refinement.** The prior heading and search were visually separate and the single real course read like a thin utility row. The final screen pairs the heading with an honest access explanation, then presents search and the count as one control area. No fabricated popularity, rating or learner counts are shown.
2. **Catalogue search — healthy.** The native labelled search filters only the loaded real courses. Cyrillic matching, zero results, explicit reset, live result count and keyboard-visible focus passed at all tested widths/themes. The initial long placeholder clipped on mobile; it was shortened to “Название или тема” while the persistent label remains descriptive.
3. **Course selection — healthy.** The cover now has enough visual weight for a one-course catalogue, while the row retains title, real organization, full desktop description, price, lesson count, duration and one unambiguous destination. At 320/390 px the description yields to the title and metadata; the whole row remains the link.
4. **Course overview — healthy after refinement.** The previous sticky start action was a bordered card inside the broader course composition. It is now an open section with an accent rule and full-width primary action; the separate authenticated-learning state remains below its own divider. The cover, title, description and actual course metadata preserve their source values.
5. **Curriculum and first lesson — healthy.** The outline gains a compact real lesson-count/duration summary and keeps every canonical lesson title, summary, duration and URL. YouTube remains click-to-load: no third-party request occurs before Play, Close removes the iframe and restores focus, and code copying remains verified.

### UX, accessibility and React review

Strengths: public materials remain discoverable without registration; saving progress is explained before any account prompt; the primary course action is singular; light/dark and learner accent tokens remain shared. Semantic headings, breadcrumb navigation, ordered lesson list, labelled native search, result status, empty recovery, keyboard focus and 48px+ controls were preserved. Responsive reflow had no page-level horizontal overflow in 24 page/width/theme captures. Exact contrast on physical devices, screen-reader announcements and browser zoom above the automated sizes remain verification gaps; this is not a claim of full WCAG conformance.

React review found no new effect, request waterfall, client persistence or heavy dependency. Filtering stays derived from current props and query; server catalogue/course reads remain behind the existing Suspense and server-only boundary. No auth, membership, Enrollment, quiz, Evidence, progress, tenant/RLS or outbox behavior changed.

**Verification:** production Web build passed; focused unit tests passed (4 tests / 2 files); 24 browser captures passed across catalog/course/lesson × 320/390/768/1440 × light/dark, including loaded local artwork and no page errors. Search/focus/no-results/reset ran in every catalogue case. Exact-head CI and deployed Preview remain post-push gates.

**final result: passed**
