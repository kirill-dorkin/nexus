# Repository Structure

```text
apps/
  web/                 Next.js UI: public/student/instructor/studio/admin
  api/                 NestJS modular monolith
  worker/              background jobs/projections
  grader-gateway/      trusted grader control plane
packages/
  brand/               ONLY product naming source of truth
  config/              env/config parsing
  contracts/           cross-process/API contracts
  events/              event envelope schemas
  design-tokens/       semantic UI tokens
  database/            migrations/client technical primitives
  observability/       OpenTelemetry boundary
infra/                  IaC/deployment definitions
scripts/                repository automation
docs/
  product/
  domain/
  architecture/
  adr/
  security/
  learning/
  standards/
  roadmap/
```

## Packages rule

Shared package создаётся только если его действительно потребляют два deployable приложения или он представляет технический foundation. Не выносить доменную логику в `packages/common`/`packages/domain` ради «переиспользования» — это размывает ownership.

## App routes (target)

- Public: `/`, `/catalog`, `/glossary`, `/pricing`, `/legal/*`.
- Student: `/app/...`.
- Instructor: `/teach/...`.
- Studio: `/studio/...`.
- Admin: `/admin/...`.

URL не является security boundary; permissions проверяются на сервере для конкретного resource/action.
