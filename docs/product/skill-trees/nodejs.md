# Node.js — Двигатель

- **Источник полноты:** документация nodejs.org/api для Node.js 24 LTS — каждый стабильный модуль: `fs`, `path`, `url`, `events`, `stream`, `buffer`, `process`, `child_process`, `worker_threads`, `cluster`, `http`, `https`, `http2`, `net`, `dns`, `crypto`, `zlib`, `os`, `util`, `timers`, `readline`, `test`, `assert`, `module`, `async_hooks`/`AsyncLocalStorage`, `perf_hooks`, `diagnostics_channel`, `sqlite`, `permission`, `vm`, `wasi`, `inspector`. Плюс npm CLI.
- **Стоит на:** JavaScript (ранг Практик), Терминал, Сеть и HTTP.
- **Эволюции и союзники:** эволюция → NestJS; союзники — Express (будущий), Prisma, Vitest.
- **Способности:**
  - Модули;
  - Файлы;
  - Потоки;
  - Сеть и HTTP;
  - Процессы;
  - Асинхронность изнутри;
  - Безопасность;
  - Пакеты.
- **Объём:** 40 навыков.

## Ветки

### Старт (Основа)
- `node-what` — Node.js, V8, REPL, запуск файлов, `--watch`, версии и nvm
- `node-modules-esm-cjs` — ES-модули и CommonJS, `package.json` `type`, `exports`, `imports`, `import.meta`, `require`
- `node-process-basics` — `process.argv`, `process.env`, `--env-file`, коды выхода, `process.exit`

### npm и пакеты (Основа)
- `node-npm` — `npm init`, `install`, `ci`, зависимости и devDependencies, `package-lock`
- `node-semver-scripts` — semver и диапазоны, `npm scripts`, `npx`
- `node-pnpm-workspaces` — pnpm и workspaces (как в Nexus), публикация пакета
- `node-supply-chain` — `npm audit`, lockfile, доверие к пакетам, provenance

### Файлы и пути (Основа)
- `node-path-url` — `path`, `url`, `fileURLToPath`, `__dirname` в ESM
- `node-fs-promises` — `fs/promises`: чтение, запись, каталоги, `stat`, `rm`, `glob`
- `node-fs-watch-streams` — `watch`, файловые потоки, большие файлы

### Асинхронность и события (Практика)
- `node-event-loop` — цикл событий Node: фазы, `process.nextTick`, `setImmediate`, микрозадачи
- `node-events` — `EventEmitter`, `once`, `on` как асинхронный итератор, ошибки
- `node-timers-promises` — `timers/promises`, `AbortSignal` в API Node

### Потоки и буферы (Практика)
- `node-buffer` — `Buffer`, кодировки, `TypedArray`
- `node-streams` — Readable, Writable, Duplex, Transform, `pipeline`, обратное давление, веб-потоки

### HTTP (Практика)
- `node-http-server` — `http.createServer`: запрос, ответ, маршрутизация вручную, тело запроса
- `node-fetch-undici` — `fetch` в Node, undici, таймауты
- `node-https-http2` — HTTPS-сервер, сертификаты, `http2`
- `node-net-dns` — TCP-сервер `net`, `dns`

### Процессы и параллелизм (Продвинутое)
- `node-child-process` — `spawn`, `exec`, `execFile`, `fork`, потоки дочерних процессов
- `node-worker-threads` — `worker_threads`, `MessageChannel`, `SharedArrayBuffer`
- `node-cluster` — `cluster` и масштабирование по ядрам
- `node-signals-shutdown` — сигналы, корректное завершение

### Ошибки и диагностика (Практика)
- `node-errors` — ошибки в колбэках, промисах и потоках, `unhandledRejection`, коды ошибок
- `node-debugging` — `--inspect`, Chrome DevTools, `node:inspector`
- `node-diagnostics` — `perf_hooks`, `diagnostics_channel`, heap snapshot, `--cpu-prof`
- `node-logging` — `console`, `util.inspect`, `util.format`, структурные логи

### Утилиты и встроенное (Практика)
- `node-util` — `util.promisify`, `util.parseArgs`, `util.styleText`, `util.types`
- `node-os-readline` — `os`, `readline`, интерактивные CLI
- `node-crypto` — `crypto`: хеши, HMAC, `randomUUID`, `scrypt`, шифрование, Web Crypto в Node
- `node-zlib` — сжатие gzip, brotli, zstd

### Тесты (Практика)
- `node-test-runner` — `node:test`, `assert`, моки, покрытие
- `node-typescript` — запуск TypeScript: удаление типов (type stripping), `tsx`

### Контекст и данные (Продвинутое)
- `node-async-local-storage` — `AsyncLocalStorage`: контекст запроса (как request context в Nexus)
- `node-sqlite` — `node:sqlite`
- `node-database-clients` — драйвер `pg`, пул соединений, транзакции

### Безопасность (Продвинутое)
- `node-permission-model` — модель разрешений `--permission`
- `node-security-practices` — валидация ввода, секреты, лимиты тела, ReDoS, prototype pollution

### Справочник и изнутри (Полное покрытие)
- `node-vm-wasi-module` — `vm`, `wasi`, `module` (хуки загрузчика)
- `node-internals` — libuv, пул потоков, нативные аддоны (N-API, обзор)

## Бои

| Ветка | Бой |
|---|---|
| Файлы | CLI: обработать каталог файлов |
| Потоки | Обработать CSV на 1 ГБ потоком с ограниченной памятью |
| HTTP | REST-сервер без фреймворка с тестами |
| Процессы | Параллельная обработка на worker threads |
| Тесты | Покрыть модуль тестами `node:test` |

Проверка — грейдер.
