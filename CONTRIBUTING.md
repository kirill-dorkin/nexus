# Contributing

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
- security-sensitive изменения описывают threat impact.

## Зависимости модулей

Domain-модуль не читает чужие таблицы напрямую. Межмодульная связь идёт через public application interface или domain/integration event. `packages/` не является местом для свалки бизнес-логики.
