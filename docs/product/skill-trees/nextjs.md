# Next.js — Архитектор React

- **Источник полноты:** документация nextjs.org для Next.js 16, App Router:
  - Getting Started;
  - Guides;
  - API Reference — Directives, Components, File-system conventions, Functions, Configuration (`next.config.js`), CLI, Edge Runtime.

  Pages Router — в ветке «Наследие».
- **Индекс:** каждый файл-соглашение, каждая функция, каждая опция `next.config`.
- **Стоит на:** React (ранг Практик — эволюция), Сеть и HTTP («Кэширование»), Node.js (союзник).
- **Способности:**
  - Маршруты;
  - Рендеринг;
  - Данные и кэш;
  - Мутации;
  - Оптимизация;
  - Развёртывание;
  - Безопасность.
- **Объём:** 42 навыка. Сам Nexus Web построен на Next.js 16 — примеры берутся из жизни.

## Ветки

### Маршрутизация (Основа)
- `next-app-router` — App Router, `app/`, сегменты, `page`, `layout`
- `next-dynamic-routes` — `[slug]`, `[...slug]`, `[[...slug]]`, `params` как промис
- `next-link-navigation` — `<Link>`, `useRouter`, `usePathname`, `useSearchParams`, `redirect`, `permanentRedirect`, `notFound`
- `next-special-files` — `loading`, `error`, `global-error`, `not-found`, `template`, `default`
- `next-route-groups-private` — группы `(group)`, приватные папки `_folder`, организация проекта
- `next-parallel-intercepting` — параллельные маршруты `@slot`, перехватывающие маршруты `(.)`

### Рендеринг (Основа)
- `next-server-client` — серверные и клиентские компоненты в Next.js, границы
- `next-static-dynamic` — статический и динамический рендеринг, что делает маршрут динамическим
- `next-streaming` — стриминг, `loading` и Suspense
- `next-ppr-cache-components` — частичный пререндеринг и Cache Components

### Данные и кэш (Практика)
- `next-fetching` — загрузка данных в серверных компонентах, `fetch`, ORM, параллельная и последовательная загрузка
- `next-caching` — кэширование: `'use cache'`, `cacheLife`, `cacheTag`, поведение `fetch`
- `next-revalidation` — `revalidatePath`, `revalidateTag`, `updateTag`, время жизни
- `next-request-apis` — `cookies()`, `headers()`, `draftMode()`, `connection()`

### Мутации (Практика)
- `next-server-actions` — серверные функции в формах, `useActionState`, валидация, редирект после действия
- `next-route-handlers` — `route.ts`: методы, `NextRequest`/`NextResponse`, стриминг ответов
- `next-after` — `after()` для работы после ответа

### Прокси и окружение (Продвинутое)
- `next-proxy-middleware` — `proxy.ts` (бывший middleware): перенаправления, переписывание, заголовки, `matcher`
- `next-env-vars` — переменные окружения, `NEXT_PUBLIC_`, загрузка `.env`
- `next-runtimes` — Node.js и Edge runtime, ограничения
- `next-instrumentation` — `instrumentation.ts`, OpenTelemetry

### Метаданные и SEO (Практика)
- `next-metadata` — `metadata` и `generateMetadata`, `viewport`
- `next-metadata-files` — `favicon`, `opengraph-image`, `sitemap`, `robots`, `manifest`, генерация изображений `ImageResponse`
- `next-static-params` — `generateStaticParams`, `dynamicParams`

### Оптимизация (Практика)
- `next-image` — `<Image>`: размеры, `sizes`, приоритет, удалённые изображения, загрузчики
- `next-font` — `next/font`: Google и локальные шрифты, переменные
- `next-script` — `<Script>`: стратегии загрузки
- `next-bundle` — анализ сборки, `optimizePackageImports`, ленивые компоненты `next/dynamic`
- `next-web-vitals` — `useReportWebVitals`, Speed Insights

### Конфигурация (Полное покрытие)
- `next-config-core` — `next.config.ts`: `images`, `headers`, `redirects`, `rewrites`, `basePath`, `trailingSlash`, `output`
- `next-config-reference` — остальные опции справочника: `turbopack`, `typedRoutes`, `reactCompiler`, `serverExternalPackages`, `experimental` и другие
- `next-cli` — `next dev`, `next build`, `next start`, `next lint`, `next info`, флаги

### Стили (Практика)
- `next-styling` — CSS Modules, глобальные стили, Tailwind, Sass, CSS-in-JS в серверных компонентах

### Безопасность (Продвинутое)
- `next-security-headers` — CSP с nonce, заголовки безопасности (как в Nexus, ADR-0069)
- `next-auth-patterns` — аутентификация и авторизация: сессии, проверка в действиях и в слое данных (Data Access Layer)
- `next-taint` — защита от утечки серверных данных: `taint`-API, `server-only`

### Развёртывание (Практика)
- `next-deploy` — Vercel, Node-сервер, Docker (`output: standalone`), статический экспорт
- `next-self-hosting` — самостоятельный хостинг: кэш, ISR, CDN, несколько инстансов
- `next-multi-zones-upgrades` — несколько зон, миграция версий, codemods

### Тестирование (Практика)
- `next-testing` — Vitest и Playwright для Next.js-приложения

### Наследие (Полное покрытие)
- `next-pages-router` — Pages Router: `getStaticProps`, `getServerSideProps`, `getStaticPaths`, `_app`, `_document`, API Routes
- `next-pages-migration` — переход с Pages на App Router

## Бои

| Ветка | Бой |
|---|---|
| Маршрутизация | Каталог с вложенными макетами и модальным окном на перехватывающем маршруте |
| Данные и кэш | Страница со смешанным кэшем и ревалидацией по тегу |
| Мутации | CRUD на серверных функциях с проверкой |
| Оптимизация | Довести страницу до хороших Web Vitals |
| Безопасность | CSP с nonce и защищённые действия |

**Проверка:** грейдер собирает приложение и прогоняет Playwright и проверки сборки.
