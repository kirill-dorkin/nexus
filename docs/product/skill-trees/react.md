# React — Сборщик интерфейсов

- **Источник полноты:** справочник react.dev для React 19:
  - разделы `react` (хуки, компоненты, API, директивы);
  - `react-dom` (компоненты, API, клиентские и серверные API, ресурсы);
  - правила React (Rules of React) и React Compiler.
- **Индекс:** каждый пункт справочника.
- **Стоит на:** JavaScript (ранг Практик), Web API («DOM полностью», «События полностью»); TypeScript — союзник.
- **Эволюции и союзники:** эволюция → Next.js (на ранге Практик); открывает React Native, Redux, TanStack Query (будущие).
- **Способности:**
  - Компоненты;
  - Состояние;
  - Эффекты;
  - Контекст;
  - Формы и действия;
  - Производительность;
  - Серверные компоненты;
  - Тестирование.
- **Объём:** 64 навыка.

## Ветки

### Мышление на React (Основа)
- `react-what` — компоненты, декларативность, виртуальное дерево, установка через Vite
- `react-jsx` — JSX: выражения, атрибуты, `className`, фрагменты `<>`, правила
- `react-components-props` — компоненты-функции, пропсы, `children`, значения по умолчанию
- `react-conditional-lists` — условный рендер, списки и `key`
- `react-purity` — чистота компонентов, Rules of React
- `react-thinking` — «Thinking in React»: разбиение интерфейса, где жить состоянию

### Взаимодействие (Основа)
- `react-events` — обработчики событий, синтетические события, всплытие
- `react-use-state` — `useState`, обновление по функции, состояние как снимок, пакетная обработка
- `react-state-objects-arrays` — неизменяемые обновления объектов и массивов
- `react-render-commit` — рендер и коммит, когда и почему компонент перерисовывается

### Управление состоянием (Практика)
- `react-lifting-state` — подъём состояния, единый источник правды
- `react-preserving-state` — сохранение и сброс состояния, `key` для сброса
- `react-use-reducer` — `useReducer`, редьюсеры, переход от `useState`
- `react-context` — `createContext`, `useContext`, провайдер, контекст и редьюсер
- `react-state-structure` — принципы структуры состояния: без дублей и противоречий

### Выходы наружу (Практика)
- `react-use-ref` — `useRef`, рефы на DOM, `ref` как проп (React 19), колбэк-рефы с очисткой
- `react-use-effect` — `useEffect`: синхронизация, зависимости, очистка
- `react-effects-pitfalls` — «вам может не понадобиться эффект», гонки при загрузке, жизненный цикл эффекта
- `react-effect-events` — отделение событий от эффектов (`useEffectEvent`)
- `react-custom-hooks` — свои хуки, правила хуков
- `react-layout-insertion` — `useLayoutEffect`, `useInsertionEffect`
- `react-imperative-handle` — `useImperativeHandle`

### Асинхронность и Suspense (Продвинутое)
- `react-suspense` — `<Suspense>`, fallback, вложенность, раскрытие
- `react-use` — `use(promise)` и `use(context)`
- `react-lazy` — `lazy`, разделение кода
- `react-transitions` — `useTransition`, `startTransition`, неблокирующие обновления
- `react-deferred` — `useDeferredValue`
- `react-error-boundaries` — границы ошибок, `onCaughtError`/`onUncaughtError`

### Формы и действия (Практика)
- `react-forms-controlled` — управляемые и неуправляемые поля
- `react-actions` — Actions: `<form action>`, асинхронные переходы
- `react-action-state` — `useActionState`
- `react-form-status` — `useFormStatus` (`react-dom`)
- `react-optimistic` — `useOptimistic`

### Производительность (Продвинутое)
- `react-memo` — `memo`, `useMemo`, `useCallback` — когда нужны
- `react-compiler` — React Compiler: автоматическая мемоизация, требования к коду
- `react-profiler` — `<Profiler>`, React DevTools, поиск лишних рендеров
- `react-lists-virtualization` — длинные списки, виртуализация
- `react-activity` — `<Activity>`: скрытые части интерфейса с сохранением состояния

### Внешние данные и сторы (Продвинутое)
- `react-sync-external-store` — `useSyncExternalStore`
- `react-data-fetching` — загрузка данных: эффекты, Suspense, библиотеки (TanStack Query — союзник)
- `react-id-debug` — `useId`, `useDebugValue`

### React DOM (Практика)
- `react-dom-root` — `createRoot`, `hydrateRoot`, `root.render`/`unmount`
- `react-portal` — `createPortal`
- `react-flush-sync` — `flushSync`
- `react-dom-components` — особенности встроенных компонентов: `<input>`, `<select>`, `<textarea>`, `<form>`, `<option>`, `<progress>`
- `react-metadata-resources` — `<title>`, `<meta>`, `<link>`, `<style>`, `<script>` в компонентах; `preload`, `preinit`, `prefetchDNS`, `preconnect`

### Серверный React (Продвинутое)
- `react-ssr` — серверный рендеринг: `renderToPipeableStream`, `renderToReadableStream`, `prerender`, гидратация, ошибки гидратации
- `react-server-components` — серверные компоненты: где выполняются, что нельзя, сериализация
- `react-directives` — `'use client'`, `'use server'`, границы
- `react-server-functions` — серверные функции, вызов из форм и переходов, безопасность
- `react-cache` — `cache` для серверных компонентов

### Строгий режим и отладка (Практика)
- `react-strict-mode` — `<StrictMode>`: двойной рендер и эффекты, зачем
- `react-devtools` — React DevTools: дерево, пропсы, профайлер
- `react-owner-stack` — `captureOwnerStack`, читаемые ошибки

### Тестирование (Практика)
- `react-testing-library` — Testing Library: запросы по ролям, события пользователя
- `react-act` — `act`, тестирование эффектов и асинхронности

### Архитектура (Продвинутое)
- `react-composition` — композиция, compound-компоненты, render props, HOC (наследие)
- `react-state-libraries` — когда нужен внешний стор: Redux, Zustand (союзники)
- `react-styling` — CSS Modules, CSS-in-JS, Tailwind в React
- `react-a11y` — доступность в React: фокус, ARIA, объявления изменений

### Наследие (Полное покрытие)
- `react-legacy-class` — классовые компоненты, жизненный цикл, `Component`, `PureComponent`
- `react-legacy-apis` — `forwardRef`, `createElement`, `cloneElement`, `Children`, `isValidElement`, `createRef`; удалённые в 19 API

### Изнутри (Изнутри)
- `react-reconciliation` — согласование, Fiber, приоритеты (lanes)
- `react-scheduling` — планирование и прерываемый рендер

## Бои

| Ветка | Бой |
|---|---|
| Взаимодействие | Список дел с фильтрами |
| Выходы наружу | Окно чата с подпиской и очисткой |
| Асинхронность | Каталог с Suspense и границами ошибок |
| Формы и действия | Форма заказа с `useActionState` и оптимистичным обновлением |
| Производительность | Ускорить медленный экран по профайлеру |
| Серверный React | Страница на серверных компонентах с серверной функцией |

**Проверка:** грейдер — тесты Testing Library и Playwright. Бой «Серверный React» проходит в Next.js-песочнице.
