# Vue — Мастер реактивности

- **Источник полноты:** документация vuejs.org для Vue 3:
  - Guide — Essentials, Components In-Depth, Reusability, Built-in Components, Scaling Up, Best Practices, TypeScript, Extra Topics;
  - API Reference — Global API, Composition API, Options API, Built-ins, SFC, Advanced APIs.
- **Индекс:** каждый пункт API Reference.
- **Стоит на:** JavaScript (ранг Практик), Web API («DOM полностью»).
- **Эволюции и союзники:** эволюция → Nuxt (на ранге Практик); союзники — Pinia, Vue Router (ветки внутри персонажа), TypeScript.
- **Способности:**
  - Шаблоны;
  - Реактивность;
  - Компоненты;
  - Композаблы;
  - Маршруты;
  - Состояние;
  - Сервер.
- **Объём:** 46 навыков.

## Ветки

### Основы (Основа)
- `vue-what` — приложение, `createApp`, монтирование, SFC, Vite
- `vue-template-syntax` — интерполяция, директивы, `v-bind` (`:`), `v-on` (`@`), динамические аргументы
- `vue-reactivity-basics` — `ref`, `reactive`, глубокая реактивность, развёртывание ref в шаблоне
- `vue-computed` — `computed`, геттеры и сеттеры
- `vue-class-style` — привязка `class` и `style`
- `vue-conditional-list` — `v-if`/`v-else`/`v-show`, `v-for` с `key`
- `vue-events` — обработчики, модификаторы событий и клавиш
- `vue-forms` — `v-model` и модификаторы `lazy`, `number`, `trim`
- `vue-lifecycle` — хуки жизненного цикла
- `vue-watchers` — `watch`, `watchEffect`, `flush`, остановка, `onWatcherCleanup`
- `vue-template-refs` — ref на элементы и компоненты, `useTemplateRef`

### Компоненты (Основа)
- `vue-components-basics` — регистрация, `<script setup>`
- `vue-props` — `defineProps`, валидация, однонаправленный поток, деструктуризация с реактивностью
- `vue-emits` — `defineEmits`, события компонента
- `vue-component-v-model` — `defineModel`, несколько `v-model`, модификаторы
- `vue-attrs` — проброс атрибутов, `inheritAttrs`, `useAttrs`
- `vue-slots` — слоты: именованные, ограниченные (scoped), `useSlots`
- `vue-provide-inject` — `provide`/`inject`
- `vue-async-components` — `defineAsyncComponent`

### Переиспользование (Практика)
- `vue-composables` — композаблы: соглашения, примеры, VueUse (союзник)
- `vue-custom-directives` — свои директивы
- `vue-plugins` — плагины, `app.use`

### Встроенные компоненты (Практика)
- `vue-transition` — `<Transition>`, `<TransitionGroup>`, классы и хуки
- `vue-keep-alive` — `<KeepAlive>`
- `vue-teleport` — `<Teleport>`
- `vue-suspense` — `<Suspense>` (экспериментальный)

### Маршрутизация: Vue Router (Практика)
- `vue-router-basics` — маршруты, `<RouterLink>`, `<RouterView>`, динамические сегменты
- `vue-router-nested-named` — вложенные и именованные маршруты, именованные представления
- `vue-router-navigation` — программная навигация, `useRouter`/`useRoute`
- `vue-router-guards` — защитники навигации, мета-поля
- `vue-router-lazy-scroll` — ленивые маршруты, поведение прокрутки, переходы

### Состояние: Pinia (Практика)
- `vue-pinia-stores` — `defineStore`: setup- и options-сторы
- `vue-pinia-usage` — `storeToRefs`, действия, геттеры, подписки
- `vue-pinia-plugins-ssr` — плагины Pinia, SSR, тестирование сторов

### TypeScript во Vue (Практика)
- `vue-ts` — типизация пропсов, emits, `ref`, `provide`/`inject`, обобщённые компоненты `generic`, `vue-tsc`

### Реактивность изнутри (Продвинутое)
- `vue-reactivity-in-depth` — как устроена реактивность: Proxy, отслеживание, триггеры, планировщик
- `vue-reactivity-advanced` — `shallowRef`, `shallowReactive`, `readonly`, `toRef`/`toRefs`/`toValue`, `markRaw`, `effectScope`, `customRef`, `triggerRef`
- `vue-render-functions` — функции рендера, `h()`, JSX во Vue
- `vue-rendering-mechanism` — виртуальный DOM, компиляторные оптимизации, Vapor Mode (обзор)

### Производительность (Продвинутое)
- `vue-performance` — `v-once`, `v-memo`, стабильность пропсов, виртуализация, разделение кода

### Сервер (Продвинутое)
- `vue-ssr` — SSR: `createSSRApp`, `renderToString`, гидратация, ленивая гидратация, ошибки рассогласования

### Качество (Практика)
- `vue-testing` — Vitest и Vue Test Utils, тест композаблов
- `vue-a11y-security` — доступность и безопасность (`v-html`), лучшие практики

### Справочник (Полное покрытие)
- `vue-global-api` — `app.config`, `app.provide`, `nextTick`, `defineComponent`, `defineCustomElement`
- `vue-sfc-full` — SFC полностью: `<style scoped>`, `:deep`, `:slotted`, `v-bind` в CSS, CSS Modules, `defineOptions`, `defineSlots`, `defineExpose`
- `vue-options-api` — Options API: `data`, `methods`, `computed`, `watch`, миксины (наследие)

## Бои

| Ветка | Бой |
|---|---|
| Компоненты | Библиотека компонентов формы с `v-model` и слотами |
| Переиспользование | Набор композаблов с тестами |
| Маршрутизация | Многостраничный SPA с защищёнными маршрутами |
| Состояние | Корзина на Pinia |
| Производительность | Ускорить таблицу на 10 000 строк |

**Проверка:** грейдер — Vitest и Playwright.
