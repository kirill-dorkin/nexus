# Homepage redesign decision

The maintainer explicitly authorized autonomous composition selection and promotion to `/` on 2026-10-13. This supersedes archive gates G1–G3; no visual approval pause remains. PR88 stays Draft and Production is untouched.

## Direction contract

THESIS: Make choosing a real course the homepage's work; the program, then its available lesson, is the direct path.
OWN-WORLD: Original shared N mark and lockup; Onest Cyrillic; semantic light/dark/system surfaces and five accents; open unboxed course spreads and actual syllabus text.
STORY: Recognize an educational platform → inspect a real course → view its program → open an available lesson. Account entry is secondary and session-aware.
FIRST VIEWPORT: Short introduction above the course list. On mobile the title, factual description/metadata and program action precede artwork. Appearance occupies a static utility row below navigation.
FORM: Open discovery was selected over the image-first editorial variant after production-build captures at 390/1440 in both themes. The latter delays the program action and overweights one cover. Choice is designer judgment, not a HIG prescription. seed: none (unavailable).
FINISH: Review the implemented root, record exact-head CI, browser evidence, token-bearing DESIGN.md and existing raster provenance. No new raster was authored.

## Decision and boundaries

Both alternatives share the same data, copy, actions and routes. The selected course row is not a generic left hero/right dashboard: it is the actual available course, immediately accessible. First three lesson titles preview canonical content. No made-up inventory fills the single-course launch catalog.

Preserve `loadLearningCatalog`, route helpers, all existing public/private routes, SEO, the original logo, appearance preference schema and real session behavior. No API, migrations, RLS, Membership, Enrollment, quiz attempts, Submission/Evidence, canonical progress or outbox changes. No new runtime dependency.

## Applicable review guidance

Apple-design-skill was read at source revision 904b0eedc7cc778152f545506075d5bb5219ce77: README/SKILL, hig-lookup, cross-platform; accessibility, layout, typography, color, design-principles, branding, buttons, materials, liquid-glass, dark-mode, motion and writing. Applied principles: `layout.md › Visual hierarchy` and `Adaptability`, `typography.md › Conveying hierarchy` and `Using custom fonts`, `branding.md › Best practices`, `buttons.md › Style`, `writing.md › Best practices`. Native Apple appearance restrictions and pt values do not replace Nexus's explicit Web themes and CSS touch targets.

The available Impeccable reference's launcher was absent. Existing PRODUCT/DESIGN and craft-floor were read directly; the selected composition received an independent finish review. Earlier hero reviews certify only their own revisions.
