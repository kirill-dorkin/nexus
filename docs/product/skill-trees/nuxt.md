# Nuxt — Архитектор Vue

- **Источник полноты:** документация nuxt.com для Nuxt 4: Guide, API (components, composables, utils, commands, `nuxt.config`), Nitro (серверный движок).
- **Индекс:** каждый компонент, композабл, утилита и команда справочника.
- **Стоит на:** Vue (ранг Практик — эволюция), Сеть и HTTP, Node.js (союзник).
- **Способности:**
  - Структура;
  - Маршруты;
  - Данные;
  - Сервер (Nitro);
  - SEO;
  - Модули;
  - Развёртывание.
- **Объём:** 27 навыков.

## Ветки

### Структура (Основа)
- `nuxt-what` — Nuxt: SSR по умолчанию, `nuxi init`, структура каталога `app/`
- `nuxt-auto-imports` — автоимпорт компонентов, композаблов, утилит
- `nuxt-config` — `nuxt.config.ts`, `app.config.ts`, `runtimeConfig`, переменные окружения

### Маршруты и макеты (Основа)
- `nuxt-pages` — файловая маршрутизация `pages/`, динамические параметры, `<NuxtPage>`, `<NuxtLink>`
- `nuxt-layouts` — `layouts/`, `<NuxtLayout>`, смена макета
- `nuxt-route-middleware` — middleware маршрутов: именованные, глобальные, встроенные
- `nuxt-navigation` — `navigateTo`, `useRoute`, `useRouter`, `abortNavigation`, `definePageMeta`

### Данные (Практика)
- `nuxt-use-fetch` — `useFetch`, `useAsyncData`, `$fetch`: ключи, ленивая загрузка, обновление, передача с сервера
- `nuxt-state` — `useState`, Pinia в Nuxt, сериализация полезной нагрузки
- `nuxt-error-handling` — `<NuxtErrorBoundary>`, `error.vue`, `createError`, `showError`

### Сервер: Nitro (Практика)
- `nuxt-server-routes` — `server/api`, `server/routes`, `defineEventHandler`, методы, параметры
- `nuxt-server-utils` — `readBody`, `getQuery`, `setCookie`, `useStorage`, серверные middleware и плагины
- `nuxt-server-validation-auth` — валидация, сессии, `nuxt-auth-utils` (союзник)

### Рендеринг (Продвинутое)
- `nuxt-rendering-modes` — SSR, SPA, SSG, гибридный рендеринг `routeRules`, ISR и SWR
- `nuxt-islands-client-only` — `<ClientOnly>`, серверные компоненты и острова `<NuxtIsland>`
- `nuxt-prerender` — пререндеринг, `nuxi generate`

### SEO и ресурсы (Практика)
- `nuxt-seo-head` — `useHead`, `useSeoMeta`, `<Title>`, `<Meta>`
- `nuxt-assets-images` — `assets/` и `public/`, Nuxt Image (союзник), шрифты

### Модули и плагины (Продвинутое)
- `nuxt-plugins` — `plugins/`, `defineNuxtPlugin`, provide
- `nuxt-modules` — модули: использование и написание своего, хуки
- `nuxt-layers` — слои (layers): переиспользование приложения

### Качество (Практика)
- `nuxt-testing` — `@nuxt/test-utils`, Vitest, e2e
- `nuxt-typescript` — типизация, `nuxi typecheck`

### Развёртывание (Практика)
- `nuxt-deploy` — пресеты Nitro: Node, Vercel, Cloudflare, статический хостинг
- `nuxt-performance` — разделение кода, ленивые компоненты (`Lazy`-префикс), ленивая гидратация

### Справочник (Полное покрытие)
- `nuxt-api-reference` — оставшиеся композаблы и утилиты: `useRequestHeaders`, `useRequestEvent`, `useCookie`, `useNuxtApp`, `callOnce`, `refreshNuxtData`, `prefetchComponents`, `preloadRouteComponents`, `useRuntimeHook`, `useLoadingIndicator`
- `nuxt-cli` — команды `nuxi`: `dev`, `build`, `preview`, `add`, `analyze`, `upgrade`

## Бои

| Ветка | Бой |
|---|---|
| Маршруты | Сайт с макетами и защищёнными страницами |
| Данные | Каталог с серверной загрузкой без двойных запросов |
| Сервер | API на Nitro с валидацией и сессией |
| Рендеринг | Гибридный сайт: статика, ISR и динамика по `routeRules` |

**Проверка:** грейдер собирает приложение и прогоняет тесты.
