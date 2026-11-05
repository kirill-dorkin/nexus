# Redis — Быстрая память

- **Источник полноты:** документация redis.io (Redis 8):
  - справочник команд по группам: string, hash, list, set, sorted set, stream, bitmap, HyperLogLog, geo, JSON, pub/sub, transactions, scripting/functions, keys, server;
  - паттерны (кэш, очереди, rate limiting, блокировки);
  - персистентность, репликация, Sentinel и Cluster — для разработчика.
- **Стоит на:** Сеть и HTTP, Терминал.
- **Способности:**
  - Структуры данных;
  - Кэш;
  - Очереди;
  - Реальное время;
  - Надёжность.
- **Объём:** 20 навыков.

## Ветки

### Основа (Основа)
- `redis-what` — in-memory хранилище, ключи, `redis-cli`, протокол
- `redis-strings` — `SET`/`GET` с опциями, `INCR`, `EX`/`PX`, `MGET`
- `redis-keys-ttl` — `EXPIRE`, `TTL`, `DEL`/`UNLINK`, `SCAN`, именование ключей

### Структуры данных (Практика)
- `redis-hashes` — хеши
- `redis-lists` — списки, блокирующие операции `BLPOP`
- `redis-sets-sorted` — множества и сортированные множества, рейтинги
- `redis-streams` — потоки: `XADD`, группы потребителей, подтверждения
- `redis-special` — bitmap, HyperLogLog, geo, JSON, векторные множества (обзор)

### Паттерны (Практика)
- `redis-cache` — кэширование: cache-aside, инвалидация, лавина и защита
- `redis-rate-limiting` — ограничение частоты (сравнить с ADR-0070 Nexus)
- `redis-locks-queues` — распределённые блокировки и их пределы, очереди задач (BullMQ — союзник)
- `redis-sessions` — сессии

### Атомарность (Продвинутое)
- `redis-transactions` — `MULTI`/`EXEC`, `WATCH`
- `redis-scripting` — Lua-скрипты, `FUNCTION`
- `redis-pubsub` — pub/sub и его ограничения

### Эксплуатация для разработчика (Продвинутое)
- `redis-persistence` — RDB и AOF, потеря данных
- `redis-replication-cluster` — реплики, Sentinel, Cluster, слоты
- `redis-memory-eviction` — память, политики вытеснения, `maxmemory`
- `redis-security` — ACL, TLS, сеть

### Справочник (Полное покрытие)
- `redis-commands-reference` — оставшиеся команды по индексу групп

**Бои:** кэш перед медленным API; rate limiter со скользящим окном; очередь на потоках с группами потребителей. Проверка — грейдер с Redis.
