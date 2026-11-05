# Astro — Строитель островов

- **Источник полноты:** документация docs.astro.build для Astro 5:
  - Core concepts, Basics, Guides (маршрутизация, контент-коллекции, интеграции, развёртывание, View Transitions, серверные острова, действия, сессии, i18n);
  - Reference — конфигурация, API Astro runtime, директивы шаблона, Content Layer API, адаптеры, интеграции.
- **Стоит на:** HTML, JavaScript (ранг Практик).
- **Союзники:** React, Vue, Svelte (острова в Astro).
- **Способности:**
  - Компоненты;
  - Маршруты;
  - Контент;
  - Острова;
  - Сервер.
- **Объём:** 17 навыков.

## Ветки

### Основы (Основа)
- `astro-what` — архитектура островов, нулевой JS по умолчанию, проект и структура
- `astro-components` — `.astro`: фронтматтер, шаблон, пропсы, слоты
- `astro-template-directives` — `class:list`, `set:html`, `define:vars`, `is:inline`, `is:raw`

### Маршруты и страницы (Основа)
- `astro-routing` — `src/pages`, динамические маршруты, `getStaticPaths`, пагинация
- `astro-layouts` — макеты, Markdown- и MDX-страницы

### Контент (Практика)
- `astro-content-collections` — Content Layer: `defineCollection`, загрузчики, схемы zod, `getCollection`, `render`
- `astro-markdown-mdx` — Markdown, MDX, плагины remark и rehype

### Острова (Практика)
- `astro-islands` — компоненты фреймворков, `client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`
- `astro-server-islands` — серверные острова `server:defer`
- `astro-shared-state` — общее состояние между островами (nanostores)

### Сервер (Продвинутое)
- `astro-ssr` — режимы `output`, адаптеры, `prerender` на маршрут
- `astro-endpoints-middleware` — эндпоинты, middleware, `Astro.locals`
- `astro-actions-sessions` — Actions, сессии, cookies

### Оптимизация и UX (Практика)
- `astro-images` — `<Image>`, `<Picture>`, `astro:assets`
- `astro-view-transitions` — `<ClientRouter>`, анимации переходов, сохранение состояния
- `astro-styles-scripts` — стили и скрипты в Astro, бандлинг

### Справочник (Полное покрытие)
- `astro-config-integrations` — `astro.config.mjs` полностью, интеграции, i18n-маршрутизация, Astro DB (обзор)

## Бои

| Ветка | Бой |
|---|---|
| Контент | Документационный сайт на коллекциях |
| Острова | Страница с тремя островами разных фреймворков |
| Сервер | Форма на Actions с сессией |

Проверка — грейдер.
