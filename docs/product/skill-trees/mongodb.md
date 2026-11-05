# MongoDB — Хранитель документов

- **Источник полноты:** документация MongoDB 8: CRUD, Query и Projection Operators, Update Operators, Aggregation (все стадии и операторы выражений), Indexes, Data Modeling, Transactions, Schema Validation, Replication и Sharding (для разработчика), Security; драйвер Node.js и mongosh.
- **Стоит на:** JavaScript, SQL (как контраст — ветка «Документы против таблиц»).
- **Способности:**
  - CRUD;
  - Запросы;
  - Агрегации;
  - Моделирование;
  - Индексы;
  - Транзакции.
- **Объём:** 21 навык.

## Ветки

### Основа (Основа)
- `mongo-what` — документы, коллекции, BSON, `_id`, `ObjectId`, mongosh
- `mongo-crud` — `insertOne`/`Many`, `find`, `updateOne`/`Many`, `replaceOne`, `deleteOne`/`Many`
- `mongo-query-operators` — сравнения, логика, `$in`, `$exists`, `$type`, `$regex`, запросы по вложенным полям и массивам
- `mongo-projection-sort` — проекции, сортировка, `limit`/`skip`, курсоры

### Изменения (Практика)
- `mongo-update-operators` — `$set`, `$unset`, `$inc`, `$push`, `$pull`, `$addToSet`, позиционные `$`, `$[]`, `$[<id>]`
- `mongo-upsert-bulk` — upsert, `bulkWrite`, `findOneAndUpdate`

### Агрегации (Практика)
- `mongo-aggregation-basics` — конвейер: `$match`, `$group`, `$project`, `$sort`, `$limit`
- `mongo-aggregation-joins` — `$lookup`, `$unwind`, `$facet`
- `mongo-aggregation-advanced` — `$setWindowFields`, `$bucket`, `$graphLookup`, `$merge`/`$out`
- `mongo-expressions` — операторы выражений: строки, даты, массивы, условия

### Моделирование (Практика)
- `mongo-modeling` — встраивание и ссылки, паттерны (subset, bucket, computed, extended reference)
- `mongo-vs-sql` — документы против таблиц: когда что
- `mongo-schema-validation` — `$jsonSchema`-валидация

### Индексы и скорость (Продвинутое)
- `mongo-indexes` — одиночные, составные, multikey, текстовые, геоиндексы, TTL, частичные, уникальные
- `mongo-explain` — `explain`, правило ESR, покрывающие запросы

### Надёжность (Продвинутое)
- `mongo-transactions` — многодокументные транзакции, write и read concern
- `mongo-replication-sharding` — реплика-сеты, шардинг — для разработчика
- `mongo-change-streams` — change streams

### Приложение (Практика)
- `mongo-node-driver` — драйвер Node.js, пул, типизация; Mongoose (союзник, обзор)
- `mongo-security` — пользователи и роли, сеть, инъекции в запросах

### Справочник (Полное покрытие)
- `mongo-operators-reference` — оставшиеся операторы по индексу; Atlas Search и Vector Search (обзор)

**Бои:** аналитический отчёт агрегацией; модель данных под сценарий; ускорить запрос индексом. Проверка — песочница MongoDB в грейдере.
