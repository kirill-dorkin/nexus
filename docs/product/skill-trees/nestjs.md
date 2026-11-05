# NestJS — Командир модулей

- **Источник полноты:** документация docs.nestjs.com для NestJS 11:
  - Overview — controllers, providers, modules, middleware, exception filters, pipes, guards, interceptors, custom decorators;
  - Fundamentals — DI, lifecycle, testing;
  - Techniques — configuration, validation, caching, serialization, versioning, task scheduling, queues, logging, cookies, events, compression, file upload, streaming, HTTP module, sessions, SSE;
  - Security, OpenAPI, Microservices, WebSockets, CLI.

  GraphQL и Recipes — обзорно.
- **Стоит на:** Node.js (ранг Практик — эволюция), TypeScript (ветка «Классы», декораторы).
- **Союзники:** Prisma, SQL, Redis. Сам API Nexus написан на NestJS — примеры из жизни.
- **Способности:**
  - Модули и DI;
  - HTTP-слой;
  - Валидация;
  - Безопасность;
  - Данные;
  - Фоновая работа;
  - Тесты.
- **Объём:** 35 навыков.

## Ветки

### Основа (Основа)
- `nest-what` — архитектура, CLI `nest new`, адаптеры Express и Fastify
- `nest-controllers` — контроллеры, маршруты, параметры, `@Body`, `@Query`, `@Param`, коды ответа
- `nest-providers-di` — провайдеры, `@Injectable`, внедрение через конструктор, области видимости
- `nest-modules` — модули, `imports`/`exports`, глобальные и динамические модули (`forRoot`)

### Конвейер запроса (Практика)
- `nest-middleware` — middleware
- `nest-pipes` — пайпы: `ValidationPipe`, `ParseIntPipe`, свои пайпы, валидация на zod (как в Nexus)
- `nest-guards` — guards: авторизация, роли, `CanActivate`
- `nest-interceptors` — interceptors: логирование, кэш, преобразование ответа
- `nest-exception-filters` — исключения и фильтры, `HttpException`
- `nest-custom-decorators` — свои декораторы, `Reflector`, метаданные

### Внедрение зависимостей полностью (Продвинутое)
- `nest-custom-providers` — `useValue`, `useClass`, `useFactory`, `useExisting`, токены
- `nest-async-providers` — асинхронные провайдеры, циклические зависимости, `forwardRef`
- `nest-lifecycle` — хуки жизненного цикла, корректное завершение
- `nest-module-ref` — `ModuleRef`, ленивые модули

### Техники (Практика)
- `nest-config` — `@nestjs/config`, схема переменных окружения
- `nest-serialization-versioning` — сериализация, версионирование API
- `nest-caching` — кэширование
- `nest-file-upload-streaming` — загрузка файлов, стриминг, SSE, сжатие
- `nest-http-module-cookies-sessions` — HTTP-клиент, cookies, сессии

### Безопасность (Практика)
- `nest-authentication` — аутентификация: сессии и JWT, Passport (обзор)
- `nest-authorization` — авторизация: роли и права, CASL (обзор)
- `nest-security-hardening` — helmet, CORS, CSRF, rate limiting (`@nestjs/throttler`)

### Данные (Практика)
- `nest-database` — работа с БД: Prisma, TypeORM (обзор), прямой `pg`, транзакции
- `nest-repository-pattern` — слои: контроллер, сервис, репозиторий; границы модулей (как в Nexus)

### Фоновая работа и события (Продвинутое)
- `nest-scheduling` — `@nestjs/schedule`: cron, интервалы
- `nest-queues` — очереди BullMQ
- `nest-events` — `EventEmitter`, outbox-подход (как в Nexus)
- `nest-microservices` — микросервисы: транспорты, паттерны сообщений (обзор)
- `nest-websockets` — шлюзы WebSocket

### Документация API (Практика)
- `nest-openapi` — `@nestjs/swagger`, описание DTO

### Тестирование (Практика)
- `nest-testing-unit` — `Test.createTestingModule`, подмена провайдеров
- `nest-testing-e2e` — e2e с `supertest` или `app.inject`, тестовая БД

### Справочник (Полное покрытие)
- `nest-cli-workspaces` — CLI, монорепозиторий Nest
- `nest-graphql-overview` — GraphQL в Nest (обзор)
- `nest-standalone-recipes` — standalone-приложения, CQRS (обзор), health checks

## Бои

| Ветка | Бой |
|---|---|
| Конвейер запроса | API с валидацией, guards и фильтрами |
| Безопасность | Вход, роли и ограничение частоты |
| Данные | Модуль с репозиторием и транзакциями |
| Фоновая работа | Очередь писем с повторами |
| Тестирование | e2e-набор для API |

Проверка — грейдер.
