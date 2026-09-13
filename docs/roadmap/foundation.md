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

GitHub App, durable webhook inbox, project/team model, PR/check/review evidence.

## F7 — Grader hardening

Server-side code profiles, sandbox provider, gVisor-class isolation, egress/resource controls, system-failure semantics.

## F8 — Recommendations/instructor intelligence

Review scheduling, misconception model, explainable recommendations, interventions/readiness.

## F9 — Commerce/public launch

Products/prices/purchases/entitlements, marketing, production observability, load/accessibility/security verification.

Rule: каждый Foundation должен завершаться работающим вертикальным сценарием и измеримыми exit criteria, а не списком созданных таблиц.
