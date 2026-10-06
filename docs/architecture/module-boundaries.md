# Module Boundaries

| Module | Owns | Does not own |
|---|---|---|
| Identity | users, identities, sessions | org roles/policies |
| Organizations | tenants, memberships, capabilities, policies | curriculum |
| Authorization | permissions, role bindings, relation checks | authentication |
| Commerce | products, purchases, entitlement grants | learning progress |
| Learner Learning | stateless authenticated own free-learning composition, derived task completion policy, own free quiz orchestration and safe learner contracts | canonical Membership/Enrollment/curriculum, normalized Evidence, Mastery, readiness, validator execution |
| Public Learning | stateless anonymous Organization + Delivery + Content composition and strict published free course/Lesson read contracts | canonical curriculum/visibility, Membership, Enrollment, quiz validation, progress |
| Public Catalog | stateless unauthenticated composition of safe Organization + Commerce + Delivery read contracts | canonical Product/Price/Offering state, onboarding, checkout, entitlements, enrollments |
| Catalog/Curriculum | programs/courses/modules/lessons + versions | delivery state |
| Knowledge | skills, concepts, misconceptions, relations | lesson rendering |
| Content | authoring drafts, releases, assets, stable Lessons and CourseVersion Lesson/block snapshots, manifest import/export, protected Studio discovery/read/publication, immutable Skill presentation and protected Guided Build/quiz definitions | mastery, learner assistance exposure state, quiz execution/results |
| Delivery | offerings, runs, enrollments, groups, sessions, assignments | content authoring |
| Activities | activity definitions/versions, attempts | mastery decisions |
| Assessment | questions, assessments, rubrics, scoring definitions | delivery scheduling |
| Validation | versioned validator registry and deterministic protected quiz evaluation, durable grader-job intent/provenance + processing state, immutable raw ValidationResult attribution | normalized Evidence, Mastery, untrusted sandbox execution |
| Grader Gateway | versioned grader admission protocol, server-owned executable profiles, sandbox-provider control boundary | learner/session authorization, durable grader-job/ValidationResult/Evidence/Mastery state, production DB access, direct in-process learner-code execution |
| Learning Guidance | Attempt-scoped Guided Build assistance state and protected-content disclosure policy | immutable curriculum authoring, Evidence, Mastery, grader execution |
| Learning History | canonical append-only learner LearningEvent journal and history read contract | integration outbox, telemetry, mutable Mastery projections |
| Mastery | evidence normalization, model versions, organization-wide learner skill projections, learner skill progress composition | raw curriculum content, Delivery context, recommendation policy |
| Recommendations | next-best actions / reasons, versioned suspected-misconception signal derivation | source-of-truth mastery |
| Learning Readiness | versioned individual progression-readiness decisions and readiness-specific Offering operational aggregation | Mastery/Evidence ownership, Delivery completion, recommendation action selection, general analytics, progression enforcement |
| Learning Progression | versioned progression-gate policy and orchestration of protected learner transitions | Readiness calculation, Enrollment persistence, Mastery/Evidence, authorization role storage, certification |
| Projects | projects, project runs, teams, milestones, repository-binding history, normalized immutable external Project activity facts | Git hosting, webhook ingress/routing, provider installation/repository mappings, Learning Evidence |
| Integrations | GitHub and future external systems, provider mappings, webhook ingress/routing, durable external-delivery processing | core learning rules, Projects-owned normalized activity facts |
| Notifications | in-app/email/push delivery | business state |
| Analytics | read models/aggregations | canonical learning history |
| Audit | privileged/security history | product analytics |

## Dependency rule

`domain` never imports infrastructure. A module never reaches into another module's tables/repositories. Cross-module synchronous calls target a public application interface. Deferred consequences use domain/integration events through outbox.

Database-level foreign keys and integrity triggers may enforce invariants across owned schemas where PostgreSQL must prevent impossible canonical state. That does not grant application modules permission to query foreign tables directly.

A public/anonymous composition boundary may consume narrow public application query interfaces from owning modules, but it does not gain direct table access or canonical state ownership. Any RLS bypass needed for anonymous reads must be narrowly scoped, read-only, and explicitly granted rather than implemented as a broad public table policy.

## Internal module shape

Use only where warranted by invariants:

```text
module/
  domain/
  application/
  infrastructure/
  interface/
```

Avoid ceremonial layers for simple CRUD. DDD is for behavior and invariants, not file-count.
