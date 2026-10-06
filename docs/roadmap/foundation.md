# Foundation roadmap

## F0 — Constitution and architecture

Glossary, invariants, module boundaries, ADRs, threat model, repo scaffold. **This repository starts here.**

## F1 — Identity, organization, authorization, database

Users/sessions, organizations/memberships, roles/permissions/scopes, tenant context, RLS baseline, migrations.

## F2 — Immutable curriculum + knowledge graph

Program/Course/Module/Lesson stable identities + versions, typed blocks, skills/concepts/relations, Studio publish validation.

## F3 — Delivery

LearningOffering, Enrollment, CourseRun, GroupSet/Group, Session, Attendance, Assignment. Prove self-paced and instructor-led through one model.

## F4 — Activity/Attempt/Evidence vertical slice

First runner, attempts, submissions, validators, canonical events, normalized evidence, Mastery v1, Student skill UI.

## F5 — Guided Build

Hint ladder, solution exposure, professional walkthrough, compare, transfer challenge.

## F6 — GitHub projects

GitHub App, durable webhook inbox, project/team model, trusted repository binding, normalized immutable external Project activity facts distinct from Learning Evidence, and an authorized Project activity read model over immutable history.

## F7 — Grader hardening

Versioned fail-closed Grader Gateway admission, server-owned executable profiles, Validation-owned durable grader-job ledger with lease/retry/dead-letter semantics, authenticated system dispatch, system-owned ValidationResult recording, hardened sandbox provider, gVisor-class isolation, egress/resource controls, and strict system-failure semantics.

## F8 — Recommendations/instructor intelligence

Review scheduling, misconception model, explainable recommendations, interventions/readiness.

## F9 — Commerce/public launch

Products/prices/purchases/entitlements, safe public sellable catalog reads, explicit customer Organization entry, Paddle-backed one-time payment settlement, public checkout UX, marketing, production observability, and bounded accessibility/security/performance launch verification.

The F9 sequence keeps the commercial lifecycles separate: provider-independent Product + immutable Price, canonical Purchase settlement, an unauthenticated fail-closed public catalog projection, explicit customer membership entry, then the active payment adapter is migrated to Paddle without changing canonical Commerce before public checkout UX is exposed. Launch hardening remains layered rather than becoming a second business model: F9.9 defines redacted operational evidence and acceptance budgets, F9.10 proves the first-party browser/session/CORS/accessibility boundary, and F9.11 applies deterministic bounded performance guardrails to the canonical launch-path operations without claiming production capacity or permanent SLOs.

Rule: каждый Foundation должен завершаться работающим вертикальным сценарием и измеримыми exit criteria, а не списком созданных таблиц.
