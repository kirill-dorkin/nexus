# Svelte — Компилятор

- **Источник полноты:** документация svelte.dev для Svelte 5:
  - разделы Introduction, Runes, Template syntax, Styling, Special elements, Runtime, Misc;
  - справочник модулей `svelte`, `svelte/store`, `svelte/motion`, `svelte/transition`, `svelte/animate`, `svelte/easing`, `svelte/reactivity`, `svelte/action`, `svelte/events`.
- **Стоит на:** JavaScript (ранг Практик).
- **Эволюции и союзники:** эволюция → SvelteKit.
- **Способности:**
  - Руны;
  - Шаблоны;
  - Компоненты;
  - Движение;
  - Сторы.
- **Объём:** 22 навыка.

## Ветки

### Основы и руны (Основа)
- `svelte-what` — компилятор вместо рантайма, `.svelte`-файлы, Vite
- `svelte-state` — `$state`, `$state.raw`, `$state.snapshot`, глубокая реактивность
- `svelte-derived` — `$derived`, `$derived.by`
- `svelte-effect` — `$effect`, `$effect.pre`, `$effect.root`, `$effect.tracking`
- `svelte-props` — `$props`, `$bindable`, `$inspect`, `$host`

### Шаблоны (Основа)
- `svelte-markup` — выражения, атрибуты, события `onclick`, текст и `{@html}`
- `svelte-blocks` — `{#if}`, `{#each}` с ключом, `{#key}`, `{#await}`
- `svelte-snippets` — `{#snippet}`, `{@render}`
- `svelte-bindings` — `bind:value` и все `bind:`, `bind:this`
- `svelte-directives` — `use:`-действия, `class:`, `style:`, `{@attach}`, `{@const}`, `{@debug}`

### Компоненты (Практика)
- `svelte-components` — композиция, `children`, контекст `setContext`/`getContext`
- `svelte-lifecycle` — `onMount`, `onDestroy`, `tick`, `flushSync`
- `svelte-special-elements` — `<svelte:window>`, `<svelte:document>`, `<svelte:body>`, `<svelte:head>`, `<svelte:element>`, `<svelte:boundary>`, `<svelte:options>`

### Стили (Практика)
- `svelte-styling` — изоляция стилей, `:global`, CSS-переменные компонента

### Движение (Практика)
- `svelte-transitions` — `transition:`, `in:`/`out:`, встроенные переходы, свои переходы
- `svelte-animate-motion` — `animate:flip`, `Tween`, `Spring`, `svelte/easing`

### Сторы и реактивные классы (Продвинутое)
- `svelte-stores` — `writable`, `readable`, `derived`, `$`-префикс, контракт стора
- `svelte-reactivity-classes` — `SvelteMap`, `SvelteSet`, `SvelteURL`, `MediaQuery`, `createSubscriber`
- `svelte-shared-state` — общее состояние в `.svelte.js`-модулях

### Качество (Практика)
- `svelte-ts-testing` — TypeScript в Svelte, Vitest и Testing Library

### Справочник (Полное покрытие)
- `svelte-runtime-api` — `mount`, `hydrate`, `unmount`, `render` (SSR), custom elements
- `svelte-legacy` — Svelte 4: `$:`, `export let`, `createEventDispatcher`, слоты — наследие

## Бои

| Ветка | Бой |
|---|---|
| Шаблоны | Интерактивная таблица со сниппетами |
| Движение | Анимированный список с `flip` |
| Сторы | Общее состояние приложения |

Проверка — грейдер.
