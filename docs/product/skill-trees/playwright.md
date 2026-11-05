# Playwright — Робот-тестировщик

- **Источник полноты:** документация playwright.dev (Node.js):
  - Guides — locators, actions, assertions, auto-waiting, authentication, network, emulation, frames, pages, dialogs, downloads, screenshots, visual comparisons, trace viewer, codegen, test configuration, fixtures, parallelism, retries, sharding, reporters, CI, accessibility testing, API testing, component testing;
  - API reference классов `Page`, `Locator`, `BrowserContext`, `APIRequestContext`, `expect`.
- **Стоит на:** Браузер («Инструменты разработчика»), JavaScript.
- **Союзники:** Vitest, Доступность. E2E Nexus написаны на Playwright с axe.
- **Способности:**
  - Локаторы;
  - Действия;
  - Утверждения;
  - Сеть;
  - Фикстуры;
  - Отладка;
  - CI.
- **Объём:** 18 навыков.

## Ветки

### Основа (Основа)
- `pw-what` — e2e-тесты, установка, первый тест, `codegen`
- `pw-locators` — `getByRole`, `getByLabel`, `getByText`, `getByTestId`, цепочки, `filter`, строгость
- `pw-actions` — `click`, `fill`, `press`, `check`, `selectOption`, `setInputFiles`, `hover`, перетаскивание
- `pw-assertions` — веб-утверждения `toBeVisible`, `toHaveText`, `toHaveURL`, автоожидание, мягкие утверждения

### Сценарии (Практика)
- `pw-navigation-pages` — страницы, вкладки, всплывающие окна, фреймы, диалоги
- `pw-auth` — аутентификация, `storageState`, проекты setup
- `pw-forms-files` — формы, загрузка и скачивание файлов

### Сеть и API (Практика)
- `pw-network` — `route`, подмена ответов, HAR, ожидание запросов
- `pw-api-testing` — `request`-контекст, API-тесты

### Фикстуры и структура (Практика)
- `pw-fixtures` — встроенные и свои фикстуры, Page Object Model
- `pw-config-projects` — `playwright.config`, проекты, браузеры, устройства, эмуляция

### Качество (Продвинутое)
- `pw-a11y` — проверка доступности с axe (как в Nexus)
- `pw-visual` — скриншоты и визуальное сравнение
- `pw-flaky` — нестабильные тесты: причины, ретраи, изоляция
- `pw-clock-emulation` — Clock API, геолокация, локаль, тёмная тема

### Отладка и CI (Практика)
- `pw-debugging` — UI-режим, `--debug`, trace viewer, inspector
- `pw-ci` — параллелизм, шардинг, репортёры, артефакты в GitHub Actions

### Справочник (Полное покрытие)
- `pw-api-reference` — оставшиеся методы `Page`, `Locator`, `BrowserContext` по индексу; компонентные тесты (экспериментально)

**Бои:** e2e-сценарий регистрации и покупки; тесты с подменой API; починить нестабильный набор. Проверка — грейдер запускает тесты ученика против эталонного приложения и его мутантов.
