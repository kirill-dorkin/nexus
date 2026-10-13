# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Russian-speaking learners choosing courses and practising digital skills.
Public visitors need to understand the platform before signing in. Authors use
the existing Studio; this design slice concerns public discovery only.

## Product Purpose

Nexus brings courses, video, structured notes, practice, quizzes and progress
into one learning environment. Success means selecting a real course and
understanding that learning includes doing and checking, not just watching.

## Capabilities and Constraints

Preserve existing Next.js routes, session-aware navigation, catalog projections,
Blog and SEO. No authorization, RLS, membership, enrollment, quiz attempt,
Evidence, canonical progress or outbox changes. Keep the working homepage until
the new preview is selected. Do not merge the Draft PR or promote Production.

## Brand Commitments

The user requires light/dark/system appearance, five selectable accents, good
Cyrillic and a possible plum/magenta/pink/violet palette. String Lab
(`kirill-dorkin/15-js-7`) is the confirmed visual reference. Preserve Onest and
the existing brand package. No Apple branding imitation.

## Evidence on Hand

Existing public learning API, reviewed computer-literacy course cover and real
Blog article. No supplied testimonials, user counts, ratings or success rates.
Local conceptual teaching examples must be labelled and never persisted.

## Accessibility & Inclusion

320/390/768/1440 CSS widths, keyboard and touch access, contrast, Cyrillic
wrapping, reduced motion and opaque transparency fallbacks are required.

## Open Decisions

No public pricing or future course inventory is invented. Real-device and
assistive-technology verification remains separate from browser inspection.
