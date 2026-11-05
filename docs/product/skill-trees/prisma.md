# Prisma — Переводчик схем

- **Источник полноты:** документация prisma.io (Prisma ORM 6/7): Prisma Schema (модели, поля, атрибуты, связи, enum, индексы), Prisma Client API (CRUD, фильтры, связи, транзакции, raw-запросы, расширения), Prisma Migrate, CLI.
- **Стоит на:** SQL («Свои таблицы»), TypeScript, Node.js.
- **Союзники:** NestJS, Next.js.
- **Способности:**
  - Схема;
  - Запросы;
  - Связи;
  - Миграции;
  - Транзакции.
- **Объём:** 17 навыков.

## Ветки

### Схема (Основа)
- `prisma-what` — ORM, схема как источник правды, генерация клиента
- `prisma-models` — модели, поля, типы, атрибуты `@id`, `@default`, `@unique`, `@map`, `@@index`
- `prisma-relations` — связи 1-1, 1-N, N-M, самосвязи, `onDelete`
- `prisma-enums-composite` — enum, составные ключи, нативные типы `@db.*`

### Клиент (Основа)
- `prisma-crud` — `create`, `findUnique`, `findMany`, `update`, `upsert`, `delete`, `*Many`
- `prisma-filters` — фильтры, сортировка, пагинация (offset и курсор), `select`/`include`/`omit`
- `prisma-relations-queries` — вложенные записи, `connect`, фильтры по связям, `_count`
- `prisma-aggregations` — `aggregate`, `groupBy`, `count`

### Миграции (Практика)
- `prisma-migrate` — `migrate dev`, `migrate deploy`, история, разрешение дрейфа
- `prisma-safe-migrations` — изменения без простоя, ручные SQL-шаги, данные в миграциях
- `prisma-seed-introspect` — сидирование, `db pull`, `db push`

### Продвинутое (Продвинутое)
- `prisma-transactions` — `$transaction`: последовательные и интерактивные, уровни изоляции
- `prisma-raw` — `$queryRaw`, `TypedSQL`, безопасность параметров
- `prisma-extensions` — client extensions, middleware (наследие)
- `prisma-performance` — N+1, логирование запросов, пулы, адаптеры драйверов
- `prisma-testing` — тестовая база, изоляция тестов

### Справочник (Полное покрытие)
- `prisma-schema-reference` — все атрибуты и функции схемы, CLI полностью, preview features

**Бои:** схема по ТЗ с миграцией; API с транзакцией; убрать N+1. Проверка — грейдер с PostgreSQL.
