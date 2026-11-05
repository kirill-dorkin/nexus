# SQL (PostgreSQL) — Слон (Хранитель)

- **Источник полноты:** документация PostgreSQL 18:
  - часть II «The SQL Language»;
  - часть V «Server Programming» — только язык (PL/pgSQL, функции, триггеры);
  - из части III «Server Administration» — то, что нужно разработчику: роли, права, RLS, резервные копии.
- **Индекс:** все команды из «SQL Commands» (Reference I), все встроенные типы, функции и операторы (глава 9).
- **Стоит на:** ПК («Файлы»). Опыт программирования помогает, но не обязателен.
- **Эволюции и союзники:** открывает Prisma (вместе с TypeScript) и MongoDB как контраст; союзник — Node.js.
- **Способности:**
  - Вопросы к данным;
  - Соединения;
  - Агрегаты и окна;
  - Изменение данных;
  - Проектирование;
  - Скорость;
  - Транзакции;
  - Безопасность.
- **Покрытие:** сейчас 52 навыка (практический SQL). До полного покрытия — 97 навыков (45 новых).

## Ветки

### Старт SQL (Основа)
- `sql-db-what` — База данных и таблицы
- `sql-select` — SELECT … FROM
- `sql-expressions` — Выражения и псевдонимы
- `sql-distinct` — DISTINCT
- `sql-style` — Стиль SQL
- **(новое)** `sql-psql` — клиент psql: подключение, `\d`-команды, переменные, `\copy`

### Фильтры (Основа)
- `sql-where` — WHERE
- `sql-logic` — Логические операторы
- `sql-in-between` — IN и BETWEEN
- `sql-like` — Поиск по шаблону
- `sql-null` — NULL
- **(новое)** `sql-regex-similar` — `~`, `~*`, `SIMILAR TO`, `regexp_*`-функции

### Сортировка и порции (Основа)
- `sql-order` — ORDER BY
- `sql-limit` — LIMIT и OFFSET
- **(новое)** `sql-distinct-on-fetch` — `DISTINCT ON`, `FETCH FIRST … WITH TIES`, keyset-пагинация

### Типы данных (Практика) — **(новое)**, опора: «Старт SQL»
- `sql-types-numeric` — `integer`/`bigint`, `numeric`, `real`/`double`, `serial` и identity, точность
- `sql-types-text` — `text`, `varchar`, `char`, `citext`, сортировка (collation)
- `sql-types-time` — `date`, `time`, `timestamp` и `timestamptz`, `interval`, часовые пояса
- `sql-types-bool-uuid-enum` — `boolean`, `uuid` (`gen_random_uuid`, uuidv7), `enum`
- `sql-types-arrays` — массивы: литералы, `ANY`/`ALL`, `unnest`, `array_agg`, операторы
- `sql-types-ranges` — диапазоны и мультидиапазоны: `int4range`, `tstzrange`, `&&`, `@>`
- `sql-types-other` — `bytea`, сетевые (`inet`, `cidr`), геометрические, `bit`, `money`, `xml`, составные типы, домены

### Функции и выражения (Практика)
- `sql-math` — Математические функции
- `sql-strings` — Строковые функции
- `sql-case` — CASE
- `sql-coalesce` — COALESCE и NULLIF
- `sql-dates` — Даты и время
- `sql-cast` — Типы и приведение
- **(новое)** `sql-functions-full` — справочник главы 9: условные, сравнения, `GREATEST`/`LEAST`, форматирование `to_char`/`format`, генераторы `generate_series`, системные функции

### Агрегаты и группы (Практика)
- `sql-aggregates` — Агрегатные функции
- `sql-group-by` — GROUP BY
- `sql-having` — HAVING
- `sql-agg-extras` — Продвинутые агрегаты
- **(новое)** `sql-grouping-sets` — `GROUPING SETS`, `ROLLUP`, `CUBE`, `GROUPING()`
- **(новое)** `sql-agg-filter-ordered` — `FILTER (WHERE)`, упорядоченные агрегаты, `percentile_cont`/`mode`, `string_agg`

### Соединения таблиц (Практика)
- `sql-keys` — Ключи и связи
- `sql-join` — INNER JOIN
- `sql-left-join` — LEFT JOIN
- `sql-other-joins` — Виды соединений
- `sql-self-join` — Self join
- `sql-multi-join` — Цепочка JOIN
- **(новое)** `sql-lateral` — `LATERAL`, табличные функции в `FROM`, `WITH ORDINALITY`

### Подзапросы и множества (Практика)
- `sql-subquery` — Подзапросы
- `sql-exists` — EXISTS
- `sql-derived` — Производные и коррелированные подзапросы
- `sql-cte` — WITH
- `sql-sets` — Операции над множествами
- `sql-recursive` — Рекурсивные запросы
- **(новое)** `sql-cte-modifying` — `WITH` с изменением данных, `MATERIALIZED`, `SEARCH`/`CYCLE`

### Изменение данных (Практика)
- `sql-insert` — INSERT
- `sql-update` — UPDATE
- `sql-delete` — DELETE
- `sql-returning` — RETURNING
- `sql-upsert` — ON CONFLICT
- `sql-transactions` — Транзакции
- **(новое)** `sql-merge` — `MERGE` полностью, с `RETURNING`
- **(новое)** `sql-copy` — `COPY` и `\copy`: импорт и экспорт CSV, форматы

### Свои таблицы (Практика)
- `sql-create-table` — CREATE TABLE
- `sql-constraints` — Ограничения
- `sql-foreign-keys` — FOREIGN KEY
- `sql-alter` — ALTER TABLE
- `sql-normalization` — Нормализация
- **(новое)** `sql-schemas-search-path` — схемы, `search_path`, именование объектов
- **(новое)** `sql-sequences-identity-generated` — последовательности, `GENERATED … AS IDENTITY`, вычисляемые столбцы
- **(новое)** `sql-constraints-advanced` — исключающие ограничения (`EXCLUDE`), `DEFERRABLE`, `NOT VALID` и проверка позже
- **(новое)** `sql-partitioning` — секционирование: range, list, hash; присоединение и отсоединение секций
- **(новое)** `sql-safe-migrations` — изменения схемы без простоя: блокировки `ALTER`, `CREATE INDEX CONCURRENTLY`, порядок шагов

### Аналитика (Продвинутое)
- `sql-window` — Оконные функции
- `sql-window-frames` — Накопительные итоги
- `sql-views` — Представления
- `sql-json` — JSON
- **(новое)** `sql-window-full` — все оконные функции (`ntile`, `lag`/`lead`, `first`/`last`/`nth_value`), `GROUPS`, `EXCLUDE`, `WINDOW`
- **(новое)** `sql-materialized-views` — материализованные представления, `REFRESH … CONCURRENTLY`
- **(новое)** `sql-jsonb-full` — операторы `jsonb`, `jsonb_path_query` и SQL/JSON path, `JSON_TABLE`, конструкторы SQL/JSON, индексы GIN по `jsonb`
- **(новое)** `sql-full-text` — полнотекстовый поиск: `tsvector`, `tsquery`, словари для русского, ранжирование, `ts_headline`

### Скорость (Продвинутое)
- `sql-indexes` — Индексы
- **(новое)** `sql-explain` — `EXPLAIN (ANALYZE, BUFFERS)`: чтение плана, виды сканирований и соединений
- **(новое)** `sql-index-types` — B-tree, Hash, GIN, GiST, SP-GiST, BRIN; частичные, по выражению, покрывающие (`INCLUDE`)
- **(новое)** `sql-statistics-vacuum` — статистика планировщика, `ANALYZE`, `VACUUM`, autovacuum, раздувание
- **(новое)** `sql-query-tuning` — типовые ускорения: N+1, `OR` → `UNION`, `EXISTS` против `IN`, пагинация, CTE против подзапросов

### Транзакции и конкуренция (Продвинутое) — **(новое)**, опора: «Изменение данных»
- `sql-mvcc` — MVCC: версии строк, видимость, снимки
- `sql-isolation-levels` — уровни изоляции, аномалии, ошибки сериализации и повтор
- `sql-locks` — блокировки строк и таблиц, `FOR UPDATE`/`SKIP LOCKED`, взаимные блокировки, advisory locks
- `sql-savepoints` — `SAVEPOINT`, частичный откат

### Программирование на сервере (Продвинутое) — **(новое)**, опора: «Свои таблицы»
- `sql-functions-sql` — функции на SQL: `IMMUTABLE`/`STABLE`/`VOLATILE`, `SECURITY DEFINER`, `search_path`
- `sql-plpgsql` — PL/pgSQL: переменные, условия, циклы, исключения, `RETURN QUERY`
- `sql-procedures` — процедуры, `CALL`, транзакции в процедурах
- `sql-triggers` — триггеры строк и операторов, `BEFORE`/`AFTER`/`INSTEAD OF`, переходные таблицы
- `sql-listen-notify` — `LISTEN`/`NOTIFY`, события из базы

### Безопасность (Практика)
- `sql-security` — Безопасность запросов
- **(новое)** `sql-roles-privileges` — роли, `GRANT`/`REVOKE`, права по умолчанию, владельцы
- **(новое)** `sql-rls` — Row Level Security: политики `USING`/`WITH CHECK`, контекст приложения (как в самом Nexus)

### Эксплуатация для разработчика (Полное покрытие) — **(новое)**, опора: «Скорость»
- `sql-backup-restore` — `pg_dump`/`pg_restore`, логические копии, восстановление на момент времени — что это
- `sql-extensions` — расширения: `pgcrypto`, `pg_trgm`, `citext`, `postgis` — обзор, `CREATE EXTENSION`
- `sql-replication-basics` — репликация: физическая и логическая, реплики для чтения — на уровне разработчика
- `sql-connection-pooling` — пулы соединений, PgBouncer, `max_connections`, `statement_timeout`

### Итог
- `sql-final` — Итоговый отчёт (бой)

## Бои

| Ветка | Бой |
|---|---|
| Агрегаты и группы | Отчёт продаж по месяцам |
| Соединения | Сводка из пяти таблиц |
| Изменение данных | Миграция данных в транзакции |
| Свои таблицы | Спроектировать схему по описанию |
| Аналитика | Когортный анализ |
| Скорость | Ускорить запрос по плану |
| Итог | Итоговый отчёт |

Проверка — SQL-песочница (ТЗ, P4.2): запрос выполняется в учебной базе и сравнивается с эталоном по результату, для «Скорости» — по плану.

## Объём работ

- 45 новых навыков, 5 новых веток.
- Учебная база для песочницы (`shop`) расширяется: диапазоны, `jsonb`, текст для полнотекстового поиска.
