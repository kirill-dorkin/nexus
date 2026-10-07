# UI library and public cover roadmap

## Direction

The maintainer's references establish a dark plum canvas, magenta/violet light, translucent glass surfaces, fine luminous borders, large white typography and generous rounded corners. They are art-direction references, not screens to copy. Third-party names, logos, installation commands and claims are not product content.

The application keeps canonical data and existing routes. The design system owns presentation only. Empty catalog, authentication, own progress and Studio authority retain their existing semantics.

## First coherent slice — implemented

- Semantic tokens in `@platform/design-tokens`: surfaces, text, action/status colors, borders, focus, spacing, radii, motion, elevation and blur. Dark default with a scoped light theme contract.
- `@platform/ui`: Button, ButtonLink, IconButton, Container, Stack, Inline, Grid, Surface, Card, Badge, Eyebrow, Heading, Text, Divider, Input, Textarea, Select, Field, Checkbox, Radio, RadioGroup, Alert, EmptyState, Skeleton, Progress, Disclosure and CodeBlock.
- Native semantic elements; button defaults to non-submit; loading disables repeated actions; explicit labels/error relationships; indeterminate progress is distinct from zero; native details works without JavaScript.
- Public shell, real catalog cards and homepage cover compose the library. Streaming keeps the cover visible while the catalog loads; loading, empty and unavailable states remain distinct. An original generated glass sculpture is stored locally as a small WebP, not a third-party remote dependency.
- `/ui` provides isolated, labelled demo states, theme switching, native form validation, working controls and usage examples. It is excluded from search indexing and does not appear in product navigation.
- Keyboard focus, reduced motion/transparency, glass fallback, mobile layout and high contrast support are part of the foundation.

## Learning flow — implemented

- Registration/login compose shared Field/Input/Button/Alert with native labels, password hint, disabled pending form and safe return-to. The mobile form precedes supporting content.
- Explicit membership and Enrollment remain separate actions in the shared entry panel. My learning uses real own courses, pagination, continuation, logout and distinct loading/anonymous/empty/error states.
- Course/Lesson pages share headings and a canonical ordered outline with `aria-current` for the current Lesson. Responsive navigation presents actual previous/next Lesson titles; all destination slugs still come from the public release.
- Quiz choices use controlled native Radio/Checkbox and short answers use Field/Input. Pending immutable answers remain locked; ambiguous submission reuses the same key and explicit retry starts a new try. Feedback is the same safe server response.
- Shared Progress displays canonical required-task counts and percentage. Null progress or a zero-task course never fabricates a bar or Enrollment completion. Generic failures, safe unavailable-course state and route loading use shared presentation.
- No migration, API, session/Origin/RLS, protected content, progress policy or outbox change. Studio/Commerce adoption is still deferred.

## Next slices, in order

1. **Navigation and overlays**: selected navigation, breadcrumbs, responsive menu, tabs, accessible dialog/confirmation, popover, tooltip and menu. Use a reviewed headless primitive when native HTML is insufficient; include focus return, Escape and keyboard navigation.
2. **Studio**: editor layout, toolbar, field groups, collection reorder controls, validation summaries, revision/conflict states, publication confirmation and preview. Keep protected author content out of public gallery/examples.
3. **Complex data**: table, sortable headers, filters, pagination, search input, segmented control, date/time controls, file picker and upload states. Add only with real product consumers and explicit accessibility contracts.
4. **Product patterns**: course presentation, lesson blocks, enrollment panels, quiz choices, purchase states and author workflow patterns. These belong to Web, not the neutral UI package; no business authority in primitives.
5. **System documentation**: component API pages, composition recipes, accessibility notes, theme extension, design tokens/code-to-design mapping and visual regression fixtures for stable states. Extract a separate Storybook only when its maintenance earns its cost.
6. **Production polish**: real course cover assets, social preview imagery, metadata, measured font loading and animation, cold-load performance, contrast checks across all migrated surfaces and browser/device coverage.

## Acceptance for each component

A component needs a real consumer or a deliberate foundation use, typed native props, named variants, keyboard behavior, visible focus, mobile sizing, disabled/loading/error semantics where relevant, and a gallery example. Refs for native controls use the React 19 prop contract. No hidden persistence, network requests, application permissions or analytics in UI primitives. Tests target meaningful semantics, not every class name.

## Review status

This roadmap records implementation scope, not an assertion that release verification has passed. Exact-head CI, browser evidence and maintainer-local verification remain release gates under the development workflow. See the PR for live status.
