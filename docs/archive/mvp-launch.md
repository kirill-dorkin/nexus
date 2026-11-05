# First public learning launch

The target is a real anonymous-to-returning-learner flow: YouTube → public course → lesson/video/notes → existing session auth → explicit organization entry → own free enrollment → quiz submission/result → saved progress → continue. The author creates and edits the same canonical draft manually or with JSON, previews it and publishes an immutable version.

Current code, migrations and accepted ADRs remain authoritative; this roadmap is not live GitHub telemetry.

| Slice | Deliverable | Exit proof |
|---|---|---|
| A — Course authoring foundation | Stable Lessons and typed blocks; strict manifest v1; read-only preview; atomic draft import; protected quiz configuration; canonical export; publication validation | Schema, HTTP/database, immutable-history, concurrency-token, tenant and answer-disclosure tests |
| B — Public learning | Explicit default-private Offering visibility; narrow owner-module read ports; homepage/course/lesson pages; safe YouTube and Markdown rendering | Published/public only; no answer keys or internal author state; mobile and keyboard checks |
| C — Free learner entry | Reuse registration/session and customerEntryPolicy; self-only membership/free enrollment; my learning and derived progress | Idempotent own entry/enrollment; paid/private/closed/inactive paths fail closed |
| D — Non-code checking | Versioned deterministic quiz registry; learner-owned Submission check; trusted ValidationResult → Evidence → Mastery; retries | Correct/incorrect answers, exact multi-select, explicit short-text normalization, no caller-owned outcome, new Attempt on retry |
| E — Studio | Authorized forms over the same draft; JSON preview/apply/export; course preview and publication | Manual/JSON feature parity; conflicts shown; draft isolation |
| F — Launch | Full real-browser learner flow with PostgreSQL/session auth; production infrastructure audit; actual HTTPS deployment and smoke | Persistent progress after reload; complete author/learner flow; green CI, browser and deployed smoke or one concrete external blocker |

Each slice starts from freshly verified `main` after the previous slice's CI, maintainer-local verification, Ready and squash merge gates. Commerce foundations remain intact. Production grader activation stays independently gated. Only a small example manifest is needed during development; real course content and a custom domain do not block building the mechanism.
