# Contributing

## Процесс разработки

Канонический процесс архитектурного slice — от проверки актуального `main` и проектирования до Draft PR, CI, локальной проверки, Ready и squash merge — описан в [`docs/engineering/development-workflow.md`](docs/engineering/development-workflow.md).

Coding agents обязаны начинать работу с [`AGENTS.md`](AGENTS.md) и использовать [`docs/engineering/current-state.md`](docs/engineering/current-state.md) только как архитектурный checkpoint, а не как замену проверке актуального состояния GitHub.

## До кода

Любое изменение фундаментального доменного смысла начинается с обновления glossary/invariants и, если решение долгоживущее, с ADR.

## Ветки и коммиты

- короткоживущие feature branches;
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`);
- PR должен содержать причину, область изменения, миграции/риски и способ проверки.

## Definition of Done

- нет brand literals вне `packages/brand/brand.json`;
- authorization проверяется сервером;
- tenant context не теряется в async jobs;
- externally retried operations idempotent;
- published content не мутируется;
- schema/API/event changes versioned или backward-compatible;
- тесты покрывают изменённые invariants;
- security-sensitive изменения описывают threat impact;
- `pnpm check` проходит локально: формат, линтер без исключений, типы, тесты, пороги покрытия Web;
- изменения Web дополнительно следуют Definition of Done из [`docs/architecture/web.md`](docs/architecture/web.md#web-definition-of-done).

## Зависимости модулей

Domain-модуль не читает чужие таблицы напрямую. Межмодульная связь идёт через public application interface или domain/integration event. `packages/` не является местом для свалки бизнес-логики.
