# Database package

Здесь будут находиться только общие технические primitives подключения, migrations и test helpers.

**Не переносить сюда доменную ownership-модель.** Таблицы и repositories принадлежат API-модулям; cross-module чтение чужих таблиц запрещено как способ интеграции.

Baseline: PostgreSQL 18.x, Drizzle/SQL для persistence implementation, handwritten SQL для RLS, partial indexes, reporting и PostgreSQL-specific features. Runtime roles разделяются минимум на migrator, app, worker, analytics/backup. Grader DB role не получает.
