# Vitest — Испытатель

- **Источник полноты:** документация vitest.dev (Vitest 4): Guide (filtering, test context, environment, snapshot, mocking, coverage, browser mode, in-source testing, workspace/projects), API (`test`/`describe`/хуки, `expect` и все матчеры, `vi`), Config Reference, CLI.
- **Стоит на:** JavaScript (ранг Практик); TypeScript — союзник.
- **Союзники:** React, Vue, Svelte, Node.js. Тесты Nexus написаны на Vitest.
- **Способности:**
  - Тесты;
  - Утверждения;
  - Моки;
  - Асинхронность;
  - Покрытие;
  - Браузер.
- **Объём:** 19 навыков.

## Ветки

### Основа (Основа)
- `vitest-what` — зачем тесты, пирамида, Vitest и Vite, первый тест
- `vitest-structure` — `test`/`it`, `describe`, `.only`/`.skip`/`.todo`, `.each`, хуки `beforeEach` и другие
- `vitest-expect` — `expect`: `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`, `toThrow`, `toContain` и все матчеры
- `vitest-cli-filtering` — CLI, фильтры, watch-режим, UI

### Асинхронность и время (Практика)
- `vitest-async` — промисы, `resolves`/`rejects`, `expect.poll`, `expect.assertions`
- `vitest-fake-timers` — `vi.useFakeTimers`, `advanceTimersByTime`, системное время

### Моки (Практика)
- `vitest-fn-spy` — `vi.fn`, `vi.spyOn`, проверки вызовов
- `vitest-module-mocks` — `vi.mock`, `vi.hoisted`, `importOriginal`, частичные моки
- `vitest-env-globals` — `vi.stubEnv`, `vi.stubGlobal`, сеть (MSW — союзник)

### Снимки и фикстуры (Практика)
- `vitest-snapshots` — снимки и inline-снимки, когда вредны
- `vitest-test-context` — контекст теста, `test.extend` фикстуры

### Окружения (Практика)
- `vitest-environments` — node, jsdom, happy-dom (как в Nexus)
- `vitest-browser-mode` — Browser Mode с Playwright
- `vitest-component-testing` — компонентные тесты с Testing Library

### Конфигурация и масштаб (Продвинутое)
- `vitest-config` — `vitest.config`, `projects` (несколько проектов, как в Nexus), setup-файлы
- `vitest-coverage` — покрытие v8 и istanbul, пороги
- `vitest-type-testing` — `expectTypeOf`, тесты типов
- `vitest-performance` — пулы, изоляция, шардинг в CI

### Справочник (Полное покрытие)
- `vitest-config-reference` — все опции конфигурации и CLI, in-source testing, бенчмарки `bench`

**Бои:** покрыть модуль с таймерами и сетью; набор компонентных тестов; поднять покрытие до порога. Проверка — грейдер запускает тесты ученика против исправной и сломанной реализаций (мутационная проверка).
