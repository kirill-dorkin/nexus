---
name: "Nexus — open course discovery"
description: "Public homepage and isolated comparison lab."
colors:
  light-page: "#f5f6fa"
  light-ink: "#20213a"
  light-muted: "#62687d"
  dark-page: "#100b16"
  dark-ink: "#f8f5fb"
  dark-muted: "#b8afc4"
  rose-action: "#c21e68"
  violet-action: "#7742d3"
  blue-action: "#2455cb"
  teal-action: "#08786f"
  amber-action: "#946000"
typography:
  display:
    fontFamily: "Onest Variable"
    fontSize: "clamp(2rem, 3.5vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.17
    letterSpacing: "-.035em"
  course-title:
    fontFamily: "Onest Variable"
    fontSize: "clamp(1.625rem, 2.5vw, 2rem)"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: "Onest Variable"
    fontSize: "1rem"
    lineHeight: 1.65
  metadata:
    fontFamily: "Onest Variable"
    fontSize: ".875rem"
    lineHeight: 1.5
rounded:
  action: "12px"
  artwork: "16px"
spacing:
  group: "16px"
  course: "40px"
  section: "48px"
  desktop-columns: "64px"
---

# Open discovery

The public `/` now uses the selected open composition. A short platform introduction leads directly to real course rows: canonical title, first complete description sentence, actual lesson count/minutes, and “Посмотреть программу”. The course's reviewed cover and first three canonical lesson titles give a concrete preview of what is taught. The page has no fictional results, new course taxonomy, promotional demo, FAQ or benefit grid.

## Composition and identity

The 1140px frame preserves the original shared tilted N mark, dot and brand lockup. Onest is self-hosted by the existing pinned Fontsource dependency, with Cyrillic and Latin. Dark plum and the neutral light surface use existing semantic tokens. The selected accent belongs to the primary course action and focus; registration is quiet.

At regular widths the open course copy and artwork share an unboxed spread. Below 700px title, description, metadata and the 48px program action come before artwork. Course rows remain usable without artwork or description. A small catalog heading/link precedes the rows. The first three lesson titles come from the existing public projection, not editorial promises or a simulated learner dashboard.

## Appearance and interaction

“Тема и цвет” occupies an ordinary utility row below navigation, outside the header. It is never fixed over content. The existing native dialog retains named theme/accent radio groups, Escape, inert background, focus return, device persistence, OS-system and cross-tab behavior. The trigger and panel are opaque; no blur or graphics runtime is needed. Original navigation still checks the real session and reveals private destinations only after success.

Focus is 3px with 4px offset. Responsive controls retain the existing native primitives and Phosphor SSR icons. No new authored motion. Reduced motion removes transitions; high contrast strengthens separators, and forced colors keeps an action boundary.

## Streaming and evidence

The catalog remains server-loaded under Suspense using unchanged no-store validated reads. Loading, genuine empty, failed reads and retry remain distinct. Skeleton grid tracks use minmax(0, 1fr) and explicit artwork ratio to prevent narrow-width expansion. Mobile heading/link spacing remains stable while fallback fonts switch to Onest.

The alternate image-first editorial layout remains at `/ui/home-lab?layout=editorial` for comparison. Lab metadata is noindex. Shared learning/Studio compositions and contracts are unchanged. See `docs/design/home-redesign-verification.md` for evidence and limitations; a viewport test is not a physical-device or screen-reader certification.
