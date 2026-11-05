# SvelteKit — Архитектор Svelte

- **Источник полноты:** документация svelte.dev/docs/kit (SvelteKit 2):
  - Getting started, Core concepts, Build and deploy, Advanced, Best practices, Appendix;
  - справочник модулей `@sveltejs/kit`, `$app/*`, `$env/*`, `$lib`, `$service-worker`, конфигурация.
- **Стоит на:** Svelte (ранг Практик — эволюция), Сеть и HTTP.
- **Способности:**
  - Маршруты;
  - Загрузка;
  - Формы;
  - Хуки;
  - Адаптеры.
- **Объём:** 16 навыков.

## Ветки

### Маршруты (Основа)
- `kit-routing` — `src/routes`, `+page.svelte`, `+layout.svelte`, параметры, `+error.svelte`
- `kit-advanced-routing` — rest-параметры, необязательные параметры, матчеры, группы `(group)`, сброс макетов
- `kit-navigation` — `$app/navigation`: `goto`, `invalidate`, `preloadData`, `afterNavigate`; `$app/state`

### Загрузка данных (Основа)
- `kit-load` — `+page.js` и `+page.server.js` `load`, `parent`, `depends`, потоковые промисы
- `kit-server-only` — серверные модули, `$env/static/private` и `$env/dynamic/*`, `$lib/server`

### Формы и API (Практика)
- `kit-form-actions` — form actions, `use:enhance`, `fail`, `redirect`
- `kit-endpoints` — `+server.js`: `GET`/`POST`/…, `json`, `error`
- `kit-remote-functions` — удалённые функции (`query`, `command`, `form`) — новое

### Хуки и состояние (Продвинутое)
- `kit-hooks` — `handle`, `handleFetch`, `handleError`, `init`, `reroute`, `transport`
- `kit-state-management` — состояние на сервере и клиенте, контекст, URL как состояние

### Рендеринг и сборка (Практика)
- `kit-page-options` — `prerender`, `ssr`, `csr`, `trailingSlash`, `config`
- `kit-adapters` — адаптеры: node, static, vercel, cloudflare
- `kit-service-workers-assets` — service worker, `$app/paths`, ресурсы, изображения

### Качество и безопасность (Практика)
- `kit-auth-security` — сессии, cookies, CSRF-защита, CSP-настройка
- `kit-testing-perf` — тесты, производительность, предзагрузка ссылок

### Справочник (Полное покрытие)
- `kit-config-reference` — `svelte.config.js` полностью, `$app/environment`, `$app/server`, `$app/forms`, типы `./$types`

## Бои

| Ветка | Бой |
|---|---|
| Загрузка данных | Блог с загрузкой и стримингом |
| Формы | Регистрация с прогрессивным улучшением |
| Хуки | Защищённый раздел с сессией |

Проверка — грейдер.
