# Public interface direction

The maintainer approved a combined direction on 2026-10-08: a readable IT learning example on the cover, a glass portal as supporting artwork, and an editorial catalogue with divided rows. The homepage is expressive; forms, long lesson text and tasks stay calmer. Generated concepts are art-direction targets, not real courses, progress or claims.

## Composition and typography

- Onest Variable is self-hosted through the pinned OFL Fontsource package. Its Cyrillic and Latin subsets load only when used; there is no Google Fonts request at runtime/build.
- A 1296px content limit, fluid gutters and intrinsic grid tracks support intermediate widths. The cover uses two regions on desktop and stacks content before the lesson example below 760px. The CTA fills the narrowest screens.
- Headings have modest negative tracking and purposeful wrapping. Code uses the system monospace stack. Inputs stay at 16px to avoid mobile form zoom.
- The catalogue uses actual organization/title/description/lesson-duration data and canonical route helpers. The homepage shows at most three entries in server order, with the full catalogue one action away. No fabricated cover, course, review or statistic fills a failed read.

## Materials and theme

- The page is deep plum in dark mode and warm nearwhite in light mode. Glass belongs to the cover example; code, fields and overlay controls have readable dense surfaces. Blur is optional, with an opaque fallback and reduced-transparency support.
- Theme and accent are separate preferences. Supported themes: light, dark and system. Supported accents: rose, violet, blue, teal and amber. Text, primary/hover buttons, focus and artwork consume semantic tokens; success/warning/error semantics do not change with the accent.
- Web owns the versioned device-local preference. A small repository-owned script applies validated preferences before paint, and the client reacts to system changes and changes from another tab. Denied/corrupt storage is nonfatal. There is no account preference, API change or cross-device synchronization.
- The same token contract applies to the gallery and existing learning screens. Further layout refinement of auth, course, lesson, quizzes and own learning remains a subsequent product stage; Studio remains separate.

## Interaction and verification

- Native dialog provides the top layer, inert background, keyboard focus containment, Escape and focus return. Mobile navigation and appearance controls use it; controls have names and 44px minimum touch targets. Native radio groups retain arrow-key behavior.
- Animations are short and purpose-specific. There is no continuously running WebGL effect, pointer tracking or animated glass background. Reduced motion removes overlay/skeleton animation.
- Check 320, 390, 768 and 1440px, intermediate widths, keyboard, touch, text scaling, long names, states and unavailable API. Browser screenshots and visual comparison are required separately from CI.
- Maintain authorization, tenant isolation, retries, canonical progress and Enrollment semantics. No backend, migration, event or outbox change belongs to this slice.
