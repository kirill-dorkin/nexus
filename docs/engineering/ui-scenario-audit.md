# UI scenario audit — 2026-10-09

## Method

Playwright ran 100 sequential isolated browser contexts against the production-built Web application. The read/write API projections are explicit test fixtures, outside product code. They verify presentation and interaction, not real PostgreSQL persistence or the behavior of 100 simultaneous humans. Authentication/session/RLS/Enrollment/Evidence/outbox authority remains in the canonical repository browser and database CI suites.

The audit starts at PR #88 head 535859d and includes the corrective UI patch in that PR. Main and Production are not modified. Live Preview screenshots cover the real anonymous homepage, appearance and login; populated local screenshots are labelled fixtures.

## Scenario matrix

| IDs | User situation | Count |
|---|---|---:|
| 1–24 | Login, registration, catalog, course, lesson and own learning at 320/390/768/1440px | 24 |
| 25–34 | Each light/dark theme with each of five accents, including reload persistence | 10 |
| 35–44 | Empty/invalid login, short registration password, password visibility, 401/409, pending lock, optional name and safe returns | 10 |
| 45–52 | Cyrillic/case/space/organization/description search, search reset, empty catalog and unavailable API | 8 |
| 53–58 | Anonymous/empty/unavailable own learning, correct continuation, logout and retry recovery | 6 |
| 59–67 | All quiz controls at narrow widths, immutable ambiguous retry, locked answer and explicit new attempt | 9 |
| 68–70 | Dialog focus return, reduced motion and 200% text scaling | 3 |
| 71–82 | Studio manual/JSON/preview at all four target widths | 12 |
| 83–97 | Studio anonymous/unavailable/forbidden/empty/read-only, invalid JSON, conflicts, uncertain save, ordering, protected preview, publication cancellation/fences and next draft | 15 |
| 98–99 | Destructive reload and internal navigation with unsaved author work | 2 |
| 100 | Opening a published release to learners through Studio | 1 |

## Corrected failures

1. Discarding a dirty or uncertain working copy previously loaded the saved copy immediately. It now requires an explicit modal confirmation; stay/Escape keep the working document. The dialog can download the actual working text, including invalid JSON, without trying to normalize it.
2. Next.js client-side links previously bypassed the beforeunload warning. While author work is unsaved, same-origin links away from the editor now open an explicit leave confirmation. Same-page anchors, downloads, modified clicks and new tabs keep their normal behavior. The existing beforeunload warning covers full document unload; history traversal and physical-browser limitations require separate review.
3. The new-course dirty check now also covers changes made only to slug, description, skills or activities, instead of relying on title/lesson count.

Canonical commands, revision fences, permissions, protected storage policy and publication/Enrollment distinction are unchanged. No autosave or author data in localStorage is introduced. The repository canonical browser gate also asserts cancellation preserves the exact working course title.

## Product gaps found by capability-to-route review

| Priority | Capability | Current interface consequence | Follow-up |
|---|---|---|---|
| P1 | Delivery Offering creation/visibility and pinning a published release | An author can publish a version but cannot complete the public course launch in Studio (scenario 100 remains blocked) | Separate authorized Delivery UI slice over existing public application commands; never equate publication with visibility |
| P1 | Organization memberships and scoped role assignments | Owner cannot administer authors/learners entirely through the current UI | Organization member/permission screen over existing commands |
| P2 | Course Runs, groups, sessions and attendance | Teaching operations exist in backend without Web screens | Dedicated delivery operations stage |
| P2 | Assignments, readiness and authorized Enrollment completion | Learner/mentor operational workflow is not fully surfaced | Separate mentor/learner surfaces preserving readiness authority |
| P2 | Products/prices and purchase history | Existing paid URL/checkout pages are not a complete admin or customer history navigation | Commerce UI stage; live provider verification remains separate |
| P2 | Projects/teams/GitHub setup | No complete first-party administration UI | Projects/integration stage |
| P2 | Account recovery and cross-device appearance | No recovery screen; appearance is explicitly device-local | Product/backend design required, not a cosmetic fake button |

## Evidence limits

99 of the 100 UI scenarios pass after the two confirmed data-loss fixes; scenario 100 is an acknowledged missing UI capability, not a passing test. Supporting unit tests: 398 / 66 files. Production build and Web typecheck pass. Consult the PR for exact-head CI and deployment status; this document is not live telemetry.

This is Chromium UI verification with isolated fixtures. It is not WCAG certification, axe-core analysis (not installed), real-device Safari/Firefox verification, 100-user concurrent load testing, a live payment, a claim of full accessibility or a new deployed authenticated database journey. Preview uses an independent empty database. Storage denial, offline service recovery, browser history traversal, very large manifests, assistive technology and physical-device video/provider behavior remain explicit follow-up test areas.
