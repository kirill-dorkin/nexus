# Module Boundaries

| Module | Owns | Does not own |
|---|---|---|
| Identity | users, identities, sessions | org roles/policies |
| Organizations | tenants, memberships, capabilities, policies | curriculum |
| Authorization | permissions, role bindings, relation checks | authentication |
| Commerce | products, purchases, entitlement grants | learning progress |
| Catalog/Curriculum | programs/courses/modules/lessons + versions | delivery state |
| Knowledge | skills, concepts, misconceptions, relations | lesson rendering |
| Content | authoring drafts, releases, assets | mastery |
| Delivery | offerings, runs, enrollments, groups, sessions, assignments | content authoring |
| Activities | activity definitions/versions, attempts | mastery decisions |
| Assessment | questions, assessments, rubrics, scoring definitions | delivery scheduling |
| Mastery | evidence normalization, model versions, skill state, reviews | raw curriculum content |
| Recommendations | next-best actions / reasons | source-of-truth mastery |
| Projects | projects, project runs, teams, milestones | Git hosting |
| Integrations | GitHub and future external systems | core learning rules |
| Notifications | in-app/email/push delivery | business state |
| Analytics | read models/aggregations | canonical learning history |
| Audit | privileged/security history | product analytics |

## Dependency rule

`domain` never imports infrastructure. A module never reaches into another module's tables/repositories. Cross-module synchronous calls target a public application interface. Deferred consequences use domain/integration events through outbox.

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
