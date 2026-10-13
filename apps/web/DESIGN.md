---
name: "Nexus — minimal course discovery Preview"
description: "Current source-derived system for isolated /ui/home-lab."
colors:
  rose-action: "#c21e68"
  violet-action: "#7742d3"
  blue-action: "#2455cb"
  teal-action: "#08786f"
  amber-action: "#946000"
  light-page: "#f5f6fa"
  light-solid: "#fff"
  light-ink: "#20213a"
  light-muted: "#62687d"
  dark-page: "#100b16"
  dark-solid: "#1d1625"
  dark-ink: "#f8f5fb"
  dark-muted: "#b8afc4"
typography:
  display:
    fontFamily: "Onest Variable"
    fontSize: "clamp(1.75rem, 3.2vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.03em"
  course-title:
    fontFamily: "Onest Variable"
    fontSize: "clamp(1.5rem, 2.4vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: "Onest Variable"
    fontSize: "1rem"
    lineHeight: 1.65
  description:
    fontFamily: "Onest Variable"
    fontSize: ".9375rem"
    lineHeight: 1.65
  link:
    fontFamily: "Onest Variable"
    fontSize: ".875rem"
    lineHeight: 1.6
  metadata:
    fontFamily: "Onest Variable"
    fontSize: ".8125rem"
    lineHeight: 1.6
  caption:
    fontFamily: "Onest Variable"
    fontSize: ".75rem"
    lineHeight: 1.6
rounded:
  action: "10px"
  surface: "16px"
spacing:
  base: "1rem"
  panel: "1.5rem"
  section: "2rem"
  wide: "2.5rem"
---

# Current Preview: one clear course path

The maintainer requested less text and a direct arrival → interest → study path.
This current system supersedes the instructional-workbench and compact-strip
versions of `/ui/home-lab`. It is scoped to Preview; shared learning/Studio
styles and the working `/` retain incumbent authority.

The introduction is one heading and one sentence. There is no separate hero
CTA: the real course contains the primary “Открыть курс” action. Course title,
first actual description sentence and real lesson count/duration supply the
choice. Catalog access is quiet and comes after the rows. Blog and author
routes remain reachable through navigation, without homepage teasers.

## Identity and surfaces

Reuse the original shared tilted N mark, dot and “учебная среда” lockup. Use
existing semantic theme/accent tokens; the Radix Theme mapping is local and
must preserve Onest. Course panels are solid. The existing reviewed WebP is
reused via courseArtwork; provenance remains
`docs/design-assets/computer-literacy-cover.md`. No new raster or graphic tool.

## Layout

The content width is 1080px. Desktop course cover/copy use 1:1.15 columns; at
640px they stack with a 16:9 image. The short introduction uses 40px maximum
type and restrained spacing. Mobile course action fills its panel width, at
least 48px tall. Metadata uses tabular numerals; Cyrillic names wrap naturally.
Register remains functional but loses the competing accent fill in this scope.

## Functional details

Existing session-aware navigation, labeled appearance dialog and storage are
unchanged. Named accents remain opt-in to this Preview. The floating opaque
appearance control is outside discovery content; its desktop panel opens above
the trigger and mobile uses the existing bottom sheet. Focus is a visible 3px
semantic outline. No new motion is authored; shared controls retain reduced
motion and opaque fallbacks. Loading, retry/error and empty use real catalog
state. Previous HTML demo React state and unused scene CSS are removed from this
Preview; historical alternatives remain at `/ui/hero-lab`.

## Evidence boundaries

Source build/TypeScript and brand checks are required per revision. Browser
width/theme checks do not certify physical devices, screen readers, real signed-in
state or measured mobile performance. Historical finish reviews score the
versions named by their commit; they are not approval of later simplification.
