# Homepage verification — 2026-10-13

## Result and scope

The selected open discovery composition is implemented on `/`. The maintainer explicitly delegated visual selection and root promotion, replacing archive G1–G3 pauses. Original shared Nexus logo, self-hosted Onest, canonical catalog reads and routes, SEO, Blog and session-aware navigation are retained. No new graphics runtime, artwork, fabricated courses, metrics or progress. Lab alternatives remain noindex. No merge, auto-merge or Production promotion.

The baseline and choice are recorded in `home-redesign-baseline.md`; composition authority is `apps/web/DESIGN.md`. This is implementation and bounded browser evidence, not universal accessibility or device certification. Exact delivery commit, CI and Preview deployment status are recorded in PR88 after the final commit; an older green check is not evidence for a new head.

## Evidence environments

- Local production Next build, Chromium 153.0.8010.0, Playwright; test service outside the repository supplies an unchanged copy of the actual Preview public catalog fetched on 2026-10-13. The four final screenshots use that genuine catalog (Computer Literacy, eight lessons, 220 minutes), not invented inventory. Alternative error/empty/three-course/long-title states are explicitly synthetic external test projections and are never committed as product data.
- Signed-in navigation appearance is tested with an isolated HTTP session-read fixture, not a real Preview account or proof of authorization. Existing canonical CI covers authentication, own learning and learning mutations in its isolated database/browser environment.
- Actual protected Preview was opened in the authorized cloud browser. Guest `/` → real program → first public lesson succeeded against the deployed application. No real attempts, submissions, enrollment or authoring commands were issued for screenshots.

## Acceptance evidence

| Requirement | Evidence / result |
| --- | --- |
| Platform clarity; direct learning path | Short platform introduction, canonical course title/metadata, program CTA, real first lesson titles. Two lab alternatives compared; open selected because mobile action precedes artwork. No usability-panel conversion claim. |
| 320/390/768/1440, two themes, five accents | Forty production-build browser combinations; no document overflow, one H1, no lab notice, loaded cover and Onest, CTA at least 48px. Heights 568/844/1024/900 respectively. |
| Original logo and Cyrillic | Shared brand lockup retained; actual loaded Latin/Cyrillic font faces checked. 100+ character title and long unbroken Cyrillic string reflow at 320px with 200% root text size. |
| Keyboard and touch | Skip link moves focus to main. Native mobile menu and appearance dialog open, Escape returns focus. Background controls cannot receive Tab focus during modality; browser chrome/body focus is not counted as a background control. Touch-emulated appearance, theme and accent selection works. |
| Appearance | Reload persistence, cross-tab update, system light→dark change, explicit override, blocked-storage fallback; all five accents retained. Ordinary utility row avoids content overlap. |
| States | Zero/one/three course projections, no reviewed cover, long/no-description fallback, delayed loading, error and recovery with retry. Streaming shell remains available; skeleton tracks do not expand at narrow widths. |
| Contrast | 640 computed text/background samples in all ten theme/accent pairs, including appearance dialog; minimum 5.123:1. Alpha backgrounds composited through ancestor surfaces, sRGB linearized. Additional 30 measurements cover CTA focus, action boundary and selected accent outline. No rounding of 2.993 to a pass: CTA receives a subtle semantic-token border. |
| System accessibility preferences | Reduced motion disables transitions, opaque appearance fallback does not require backdrop-filter, short 844×390 dialog remains in viewport, forced-colors action keeps a boundary. This does not imply universal reduced-transparency media support. |
| Fonts / artwork / layout stability | Self-hosted Onest loaded; existing 44KB WebP loaded with reserved ratio. Fallback-font catalog-heading wrap and skeleton grid expansion were corrected. |
| Navigation / auth / SEO | Actual Preview guest program and lesson path checked. Root metadata retained unchanged; program destinations use route helper. Blog/catalog/registration and protected learning regressions retain existing canonical CI assertions. Lab has noindex metadata and is absent from product navigation. |
| Source/build checks | Brand check, Web typecheck, production Web build; 10 local unit files / 75 tests including meaningful real-metadata and error/empty tests. Studio test fixture required by the existing suite fetched from the repository. Browser script syntax checked; full repository gates are the exact-head CI, not the partial materialized workspace. |

## Performance methodology and limits

Three cold local 390px production-build runs requested 4× CPU throttling and CDP network profile: 150ms latency, 200000B/s download, 93750B/s upload. Record TTFB separately: the loopback server still responds in roughly 7.6–8.9ms, so these are render/resource-emulation results, not representative Vercel mobile network performance. Measured LCP was 756–760ms (median 756ms), CLS 0.00390 in each run. A delayed-load trace after the skeleton/font fixes separately measured CLS 0.00340. These are lab observations, not field percentiles. No field INP or matched cold-load baseline-versus-redesign comparison is claimed. No new runtime dependency or first-screen graphic asset was introduced.

## CI test alignment

The first root-promotion CI failed because the existing public-launch browser test waited for removed copy “Открытые курсы” and an obsolete `#courses` hero action. It was updated to the actual behavior: canonical fixture title, two lessons / 15 minutes, one H1 without lab notice, focused program CTA, visible outline and canonical program navigation. Its accessibility/overflow checks and subsequent real auth/learning/SEO assertions remain. The fixture has no registered artwork, so requiring an image contradicted the necessary no-cover state. A successful new exact-head run must be checked separately in PR88.

## Independent review and remaining verification

Independent final reviewer inspected root composition, four screenshots, CSS and the changed canonical browser assertion; disposition “Ship”, no material findings. Reviewer did not independently run CI; result is recorded separately.

Not tested: physical iOS Safari and Android Chrome, VoiceOver/NVDA, a new 3–5-person usability study, true browser 400% zoom, field INP and hosted mobile performance. The signed-in local visual fixture is not a manual real-account test. Implementation is prepared for review; acceptance is limited by those explicitly unavailable checks. No claim that every device or every public/authenticated product state was manually tested.
