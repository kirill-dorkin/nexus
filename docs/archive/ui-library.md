# UI library and public cover roadmap

## Current public homepage — 2026-10-13

The maintainer authorized independent composition selection and promotion from lab to /. Open course discovery replaces the earlier decorative public cover: short platform introduction, real unboxed course spreads, canonical metadata/syllabus preview and direct program actions. The original shared logo, Onest, themes/accents, session-aware navigation and public SEO remain. Appearance is a static utility row below navigation. The alternate editorial layout remains noindex in home-lab.

Catalog remains server-loaded under Suspense with unchanged no-store reads, retry/error/empty and route contracts. No backend, auth, migration, enrollment or canonical learning change. See docs/design/home-redesign-verification.md for acceptance evidence. Older cover directions below are historical implementation records, not the current homepage specification.

## Direction

The maintainer's references establish a dark plum canvas, magenta/violet light, translucent glass surfaces, fine luminous borders, large white typography and generous rounded corners. They are art-direction references, not screens to copy. Third-party names, logos, installation commands and claims are not product content.

The application keeps canonical data and existing routes. The design system owns presentation only. Empty catalog, authentication, own progress and Studio authority retain their existing semantics.

## First coherent slice — implemented

- Semantic tokens in `@platform/design-tokens`: surfaces, text, action/status colors, borders, focus, spacing, radii, motion, elevation and blur. Full scoped dark/light themes with five accent presets; Web owns a system-aware device preference and validated before-paint initialization.
- `@platform/ui`: Button, ButtonLink, IconButton, Container, Stack, Inline, Grid, Surface, Card, Badge, Eyebrow, Heading, Text, Divider, Input, Textarea, Select, Field, Checkbox, Radio, RadioGroup, Alert, EmptyState, Skeleton, Progress, Disclosure and CodeBlock.
- Native semantic elements; button defaults to non-submit; loading disables repeated actions; explicit labels/error relationships; indeterminate progress is distinct from zero; native details works without JavaScript.
- Public shell, real editorial catalogue rows and homepage cover compose the library. Streaming keeps the cover visible while the catalog loads; loading, empty and unavailable states remain distinct. An original generated glass sculpture is stored locally as a small WebP, not a third-party remote dependency.
- `/ui` provides isolated, labelled demo states, theme switching, native form validation, working controls and usage examples. It is excluded from search indexing and does not appear in product navigation.
- Keyboard focus, reduced motion/transparency, glass fallback, mobile layout and high contrast support are part of the foundation.

## Learning flow — implemented

- Registration/login compose shared Field/Input/Button/Alert with native labels, password hint, disabled pending form and safe return-to. The mobile form precedes supporting content.
- Explicit membership and Enrollment remain separate actions in the shared entry panel. My learning uses real own courses, pagination, continuation, logout and distinct loading/anonymous/empty/error states.
- Course/Lesson pages share headings and a canonical ordered outline with `aria-current` for the current Lesson. Responsive navigation presents actual previous/next Lesson titles; all destination slugs still come from the public release.
- Quiz choices use controlled native Radio/Checkbox and short answers use Field/Input. Pending immutable answers remain locked; ambiguous submission reuses the same key and explicit retry starts a new try. Feedback is the same safe server response.
- Shared Progress displays canonical required-task counts and percentage. Null progress or a zero-task course never fabricates a bar or Enrollment completion. Generic failures, safe unavailable-course state and route loading use shared presentation.
- No migration, API, session/Origin/RLS, protected content, progress policy or outbox change. Commerce adoption is still deferred; the Studio continuation is described below.

## Approved cover refinement — implemented

- IT lesson excerpt, supporting transparent portal asset, editorial catalogue rows, self-hosted Onest Cyrillic typography and responsive lower sections.
- Light/dark/system appearance and five contrast-checked accent presets; native radio groups, device-local persistence, cross-tab/system updates and graceful storage failure.
- Selected route navigation, responsive native-dialog menu, appearance panel and gallery dialogue/accent states.
- These capabilities are implemented; release verification and visual acceptance remain separate gates. See `docs/engineering/ui-design-brief.md` and `design-qa.md`.

## Learning screen refinement — implemented

- Authentication follows the selected open editorial composition: a minimal brand/course/appearance header, solid labelled fields in two desktop columns and one mobile column, an original glass ribbon in the empty lower-right margin, and existing theme/accent preferences. Its page frame uses `100dvh` minimum height with a `100vh` fallback; short viewports and errors scroll naturally. Transport, validation and allowlisted return-to remain unchanged.
- Catalog and course presentation use one editorial system: a composed catalogue introduction, bounded real-data search, image-led course rows, open lesson outline, and an unboxed sticky course-start area. Mobile reflows rows and metadata without hiding canonical titles or actions; no new catalogue policy, fabricated statistics or enrollment shortcut is introduced.
- Solid auth form with a shared PasswordInput, quieter secondary actions and mode-specific error copy; original session transport, return allowlist and password constraints remain intact.
- Streaming catalog keeps navigation during loading/unavailability. A bounded client search filters only the real returned course list; no API search/pagination policy is added.
- Calm course metadata, open lesson rows, a solid reading surface and scroll-contained lesson sidebar; self-entry remains a separate explicit action.
- Own learning uses editorial rows with canonical task progress and a clear continuation action. Quiz attempts, answer locks, ambiguous retries and Enrollment completion semantics remain untouched.
- Browser snapshots cover 320/390/768/1440, all quiz input types, native form validation, password visibility and error/empty states. Populated local screenshots use clearly labelled test-only fixtures outside product code; CI remains the canonical database/browser gate.

## Studio continuation — implemented

- Common responsive shell, current-route navigation and appearance controls. Studio uses its own explicit login gate instead of a redundant global sign-in action.
- Organization rail and open course rows with actual status/version; guarded creation and keyset pagination remain the existing commands. Loading, anonymous, failed reads and genuinely empty results are distinct.
- Compact working title, desktop sticky mode/save toolbar, native section anchors and actual collection counts. Fields, inputs, selects, ordering buttons and JSON import compose the shared library; long forms retain native labels and readable solid surfaces.
- Manual/JSON parity, plan invalidation, exact revision fences, ambiguous-save locks, explicit reload, saved/working exports and immutable next-draft semantics are unchanged. Protected working copies remain in authorized component memory only.
- Safe author preview uses calm lesson surfaces and the existing Markdown/YouTube policy; answers are absent from preview. Publication now opens a native modal with Cancel initially focused; only explicit confirmation invokes the unchanged fenced command. Publication still does not open an Offering.
- Responsive and state screenshots use isolated labelled test fixtures. Canonical authoring, conflict, export, publication/next-draft and learner regression remain covered by the existing CI browser/DB profile.

## Public discovery and editorial entry — implemented

- Anonymous navigation exposes the public catalogue and Blog plus explicit sign-in/registration actions. My learning and Studio enter the primary navigation only after the existing session read succeeds; a failed or anonymous read does not advertise private destinations. The author footer link remains a labelled entry point and retains the existing Studio login gate.
- `/blog` and its first genuine team-authored computer-literacy article use an editorial list and readable long-form layout rather than a repeated card grid. Article content is static Web-owned editorial copy; it makes no fabricated learner, outcome or traffic claims and links back to the real public catalogue.
- Root, catalogue, course, Lesson, Blog and article routes now provide route-appropriate titles, descriptions, canonical URLs and Open Graph data. Web also owns `robots.txt`, the public sitemap, web manifest and a local generated social preview. Private/application routes and the component gallery are excluded from crawling; dynamic sitemap entries use only the existing public-learning projection and degrade to the static route list when that read is unavailable.
- Course, Lesson, Blog and article structured data is assembled only from public canonical content or explicit editorial fields. This is technical discoverability infrastructure, not a ranking or traffic guarantee. Search-console ownership, keyword research, publishing cadence and external distribution remain operational follow-up work.
- YouTube's consent-first placeholder now has a useful lesson title, IT-oriented graphic field, explicit load action and permanent external fallback. It still performs no YouTube thumbnail, iframe, SDK or preconnect request before activation and unmounts the iframe on close.
- Production-build browser checks cover the anonymous public path, direct registration mode, canonical/structured metadata, SEO endpoints and course media at 320/390/768/1440 in light and dark themes. Test-only media fixtures remain outside product code and do not claim that a published course contains a video when its canonical blocks do not.

## Next slices, in order

1. **Remaining overlays**: add tabs, confirmation, popover and tooltip where actual consumers need them. Auth, catalog, course, lesson, quizzes, own learning and Studio now share the approved visual system. Selected navigation, responsive menu and native dialog are already present. Use a reviewed headless primitive when native HTML is insufficient; include focus return, Escape and keyboard navigation.
2. **Studio efficiency**: consider per-item collapse or focused editing for very large documents, field-level error navigation and confirmation for discarding unsaved work. Keep protected author content out of public gallery/examples; extend only over the same canonical manifest and commands.
3. **Complex data**: table, sortable headers, filters, pagination, search input, segmented control, date/time controls, file picker and upload states. Add only with real product consumers and explicit accessibility contracts.
4. **Product patterns**: course presentation, lesson blocks, enrollment panels, quiz choices, purchase states and author workflow patterns. These belong to Web, not the neutral UI package; no business authority in primitives.
5. **System documentation**: component API pages, composition recipes, accessibility notes, theme extension, design tokens/code-to-design mapping and visual regression fixtures for stable states. Extract a separate Storybook only when its maintenance earns its cost.
6. **Production polish**: measured font loading and animation, cold-load performance, contrast checks across all migrated surfaces, richer route-specific social imagery where warranted and broader browser/device coverage. The first real course cover, global social preview and public metadata foundation are implemented.

## Lesson media and reviewed course artwork

- YouTube is click-to-load in both learner lessons and author preview: no iframe, thumbnail request, SDK or preconnect before activation. The fixed youtube-nocookie host receives only the canonical video ID. The iframe can be unmounted to release player resources; a permanent external link remains available when embedding is unavailable. A frame load event is not a claim that playback succeeded.
- Existing safe Markdown keeps headings, lists, quotations, links and literal code. Inline commands have a readable highlight; fenced code has a keyboard-scrollable area and an explicit copy action with success/failure feedback. No authored HTML, tracking image, arbitrary iframe, code execution or new parser plugin is enabled.
- The maintainer-requested Computer Literacy Preview course has an original generated photo compressed to a 44 KB local WebP. A Web-owned address registry supplies its course cover and catalog thumbnail. This is a reviewed presentation asset for that explicit Preview address, not an author-upload API or a title-based fallback for unrelated courses. General course-asset authoring requires its own Content-owned schema/storage/Studio slice.
- No database migration, session/Origin/RLS change, protected-answer disclosure, progress write or outbox change belongs to this media presentation refinement.

## Acceptance for each component

A component needs a real consumer or a deliberate foundation use, typed native props, named variants, keyboard behavior, visible focus, mobile sizing, disabled/loading/error semantics where relevant, and a gallery example. Refs for native controls use the React 19 prop contract. No hidden persistence, network requests, application permissions or analytics in UI primitives. Tests target meaningful semantics, not every class name.

## Review status

This roadmap records implementation scope, not an assertion that release verification has passed. Exact-head CI, browser evidence and maintainer-local verification remain release gates under the development workflow. See the PR for live status.
