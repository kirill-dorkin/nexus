# Universal Learning Engineering Platform

Рабочее имя продукта хранится отдельно от архитектуры и исходного кода. Текущее имя задаётся в `packages/brand/brand.json`; репозиторий, package names, доменные модули, API и база данных не зависят от бренда.

Платформа проектируется как **универсальная Learning Engineering Platform**, а не как LMS под один стек технологий: контент, delivery, практика, assessment, learning evidence, mastery и проекты разделены на независимые доменные слои.

## Архитектурный baseline

- modular monolith для бизнес-доменов;
- отдельные process/security boundaries для worker и grader;
- PostgreSQL — transactional source of truth;
- Redis + BullMQ за `JobQueue` abstraction (запланировано; сейчас фоновые задачи идут через PostgreSQL outbox/inbox с lease);
- transactional outbox/inbox для надёжной асинхронности;
- S3-compatible object storage для артефактов (запланировано, в коде пока не используется);
- Next.js/React web, NestJS/Fastify API, TypeScript strict;
- OpenAPI-first REST + SSE; WebSocket только там, где нужен bidirectional realtime;
- immutable published content versions;
- append-only learning evidence/events, mastery как пересчитываемая projection;
- multi-tenant authorization на application layer + PostgreSQL RLS как defense-in-depth;
- GitHub App для реальных проектов;
- untrusted code execution вынесен из основного API.

## Быстрый старт

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev:infra
pnpm dev
```

## Смена бренда одной командой

```bash
pnpm rebrand --name "New Product Name" --slug "new-product"
```

Команда меняет единственный brand source of truth. Пользовательские названия не должны быть захардкожены в `apps/`, `packages/` или инфраструктуре.

## Структура

```text
apps/                 deployable applications
  web/                Next.js student/instructor/studio/admin UI
  api/                NestJS modular monolith
  worker/             background jobs and projections
  grader-gateway/     trusted control plane for untrusted execution
  grader-runner/      trusted Go runner inside the sandbox
packages/             cross-application technical packages only
  brand/              product branding source of truth
  config/             environment/config primitives
  contracts/          public API/process contracts
  events/             canonical event envelopes
  database/           migrations and database client
  design-tokens/      platform design tokens
  ui/                 brand-neutral UI primitives
  observability/      telemetry bootstrap
infra/                local and deployment infrastructure
scripts/              repository automation
docs/                 product/domain/architecture/security/ADR docs
```

Подробности: `docs/architecture/overview.md`, `docs/architecture/module-boundaries.md`, `docs/domain/glossary.md`, `docs/adr/`.

## Главные invariants

1. `Content != Delivery`.
2. `Purchase != Entitlement != Enrollment`.
3. `Group != Team`.
4. Published versions immutable.
5. Retry создаёт новый `Attempt`.
6. Learning evidence не перезаписывается.
7. `StudentSkillState` — derived/recomputable projection с `MasteryModelVersion`.
8. `Capability != Policy != FeatureFlag`.
9. Student code никогда не выполняется в API-процессе.
10. UI hiding не является authorization.

## Статус

Foundation F0–F9, бесплатное публичное обучение и Studio реализованы и развёрнуты (Vercel + managed PostgreSQL). Исполнение кода учеников в production выключено до отдельной активации grader.

Актуальное состояние, правила и следующий шаг: `docs/engineering/current-state.md`.
