# CSS — Кисть (Художник)

- **Источник полноты:** спецификации CSS Working Group по снимку «CSS Snapshot» текущего года, плюс модули в статусе CR/REC и широко поддержанные WD. Индекс: все свойства, значения-функции, селекторы, псевдоклассы и псевдоэлементы, at-правила и единицы. Его составляет `css-course/update-spec-index.mjs` по образцу HTML.
- **Стоит на:** HTML («Основы HTML»).
- **Эволюции и союзники:** открывает Sass и Tailwind CSS (на ранге Практик); союзник — Доступность.
- **Способности:**
  - Каскад;
  - Цвет;
  - Типографика;
  - Раскладка (Flex + Grid);
  - Адаптивность;
  - Движение;
  - Современный CSS;
  - Доступный дизайн.
- **Покрытие:** сейчас 53 навыка (практический CSS). До полного покрытия — 105 навыков (52 новых). Новые ветки ниже отмечены **(новое)**; ключи существующих навыков не меняются.

## Ветки

### Старт CSS (Основа)
- `css-what` — Синтаксис CSS
- `css-connect` — Подключение стилей
- `css-selectors-basic` — Базовые селекторы
- `css-cascade` — Каскад и специфичность
- `css-inherit` — Наследование
- `css-devtools` — DevTools для CSS
- **(новое)** `css-values-initial` — `initial`, `inherit`, `unset`, `revert`, `revert-layer`
- **(новое)** `css-at-rules-overview` — карта at-правил: `@import`, `@media`, `@supports`, `@layer`, `@container`, `@font-face`, `@keyframes`, `@property`, `@page`, `@scope`, `@counter-style`, `@starting-style`, `@namespace`

### Цвет и текст (Основа)
- `css-colors` — Цвета
- `css-units` — Единицы измерения
- `css-fonts` — Шрифты
- `css-text` — Оформление текста
- `css-links-states` — Ссылки и состояния
- `css-project-type` — Типографика страницы

### Цвет полностью (Продвинутое) — **(новое)**, опора: «Цвет и текст»
- `css-color-spaces` — `rgb`/`hsl`/`hwb`, `lab`/`lch`, `oklab`/`oklch`, `color()` и широкие гаммы (display-p3)
- `css-color-mix` — `color-mix()`, относительные цвета (`from`), `currentColor`, `transparent`
- `css-system-colors` — системные цвета, `accent-color`, `color-scheme`, `light-dark()`
- `css-forced-colors` — `forced-colors`, `forced-color-adjust`, высокий контраст

### Типографика полностью (Продвинутое) — **(новое)**, опора: «Цвет и текст»
- `css-font-face` — `@font-face`, `font-display`, `unicode-range`, `size-adjust`, вариативные шрифты и `font-variation-settings`
- `css-font-features` — `font-feature-settings`, `font-variant-*`, `font-kerning`, `font-optical-sizing`, `font-synthesis`
- `css-text-wrap` — `text-wrap` (`balance`, `pretty`), `white-space-collapse`, `hyphens`, `word-break`, `overflow-wrap`, `line-break`
- `css-text-decoration-full` — `text-decoration-*`, `text-underline-offset`, `text-emphasis`, `text-shadow`
- `css-writing-modes` — `writing-mode`, `direction`, `unicode-bidi`, `text-orientation`, `text-combine-upright`
- `css-ruby-initial-letter` — ruby-свойства, `initial-letter`, `hanging-punctuation`, `text-spacing-trim`
- `css-lists-markers` — `list-style-*`, `::marker`, `@counter-style`

### Блочная модель (Основа)
- `css-box` — Блочная модель
- `css-box-sizing` — box-sizing
- `css-borders` — Рамки и скругления
- `css-backgrounds` — Фоны
- `css-effects` — Тени и эффекты
- `css-display` — Отображение и переполнение
- `css-project-card` — Карточка товара

### Изображения и эффекты (Продвинутое) — **(новое)**, опора: «Блочная модель»
- `css-gradients` — `linear`/`radial`/`conic`-gradient, повторяющиеся, интерполяция в цветовом пространстве
- `css-image-fit` — `object-fit`, `object-position`, `image-rendering`, `image-set()`, `aspect-ratio`
- `css-filters` — `filter`, `backdrop-filter`, все функции фильтров
- `css-blend` — `mix-blend-mode`, `background-blend-mode`, `isolation`
- `css-clip-mask` — `clip-path` (базовые фигуры, `path()`, `shape()`), `mask-*`
- `css-shapes` — `shape-outside`, `shape-margin`, `shape-image-threshold`
- `css-border-image-outline` — `border-image-*`, `outline-*`, `box-decoration-break`

### Селекторы (Практика)
- `css-attr-selectors` — Селекторы атрибутов
- `css-combinators` — Комбинаторы
- `css-pseudo-classes` — Псевдоклассы
- `css-pseudo-elements` — Псевдоэлементы
- **(новое)** `css-functional-selectors` — `:is()`, `:where()`, `:not()`, `:has()` и специфичность каждого
- **(новое)** `css-state-selectors` — `:focus-visible`, `:focus-within`, `:user-valid`/`:user-invalid`, `:placeholder-shown`, `:popover-open`, `:open`, `:modal`, `:target`, `:defined`
- **(новое)** `css-structural-full` — `:nth-child(an+b of S)`, `:nth-last-*`, `:only-*`, `:empty`, `:root`, `:scope`
- **(новое)** `css-pseudo-elements-full` — `::selection`, `::placeholder`, `::backdrop`, `::file-selector-button`, `::first-line`/`::first-letter`, `::highlight()`, `::details-content`

### Flexbox (Практика)
- `css-flex-basics` — Основы Flexbox
- `css-flex-align` — Выравнивание во флексе
- `css-flex-items` — Гибкие элементы
- `css-project-header` — Шапка на флексе
- **(новое)** `css-box-alignment` — общий модуль выравнивания: `place-*`, `gap` во всех раскладках, `align-content` в блоках

### Grid (Практика)
- `css-grid-basics` — Основы Grid
- `css-grid-placement` — Расстановка в гриде
- `css-grid-auto` — Автоматическая сетка
- `css-grid-align` — Выравнивание в гриде
- `css-project-grid` — Сетка меню
- **(новое)** `css-grid-areas-lines` — именованные линии и области, `grid-template`, `grid` shorthand
- **(новое)** `css-subgrid` — `subgrid` в строках и столбцах
- **(новое)** `css-grid-sizing` — `minmax()`, `fit-content()`, `min-content`/`max-content`, `repeat(auto-fit/auto-fill)`, `dense`

### Позиционирование (Практика)
- `css-position` — Позиционирование
- `css-stacking` — Слои
- `css-float-columns` — Обтекание и колонки
- **(новое)** `css-anchor-positioning` — `anchor-name`, `position-anchor`, `anchor()`, `position-area`, `position-try`
- **(новое)** `css-multicol` — многоколоночная раскладка полностью: `columns`, `column-span`, `column-rule`, разрывы `break-*`
- **(новое)** `css-tables-layout` — `table-layout`, `border-collapse`, `caption-side`, `empty-cells`, `display: table-*`

### Адаптивность (Практика)
- `css-media` — Медиазапросы
- `css-media-features` — Медиа-характеристики
- `css-container` — Контейнерные запросы
- `css-project-responsive` — Адаптивная страница
- **(новое)** `css-container-full` — единицы `cq*`, запросы стилей `@container style()`, запросы состояния прокрутки
- **(новое)** `css-viewport-units` — `svh`/`lvh`/`dvh`, `vi`/`vb`, `env()` и safe-area, `interactive-widget`
- **(новое)** `css-preference-media` — `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`, `prefers-color-scheme`, `scripting`, `update`

### Анимации (Практика)
- `css-transition` — Переходы
- `css-transform` — Трансформации
- `css-keyframes` — Анимации по кадрам
- `css-scroll` — Прокрутка
- **(новое)** `css-transform-3d` — `perspective`, `transform-style`, `backface-visibility`, индивидуальные `translate`/`rotate`/`scale`
- **(новое)** `css-starting-style` — `@starting-style`, `transition-behavior: allow-discrete`, анимация `display` и `overlay`
- **(новое)** `css-scroll-driven` — `animation-timeline`, `scroll()`, `view()`, `animation-range`
- **(новое)** `css-view-transitions` — `view-transition-name`, `::view-transition-*`, переходы между документами `@view-transition`
- **(новое)** `css-motion-path` — `offset-path`, `offset-distance`, `offset-rotate`

### Прокрутка и взаимодействие (Продвинутое) — **(новое)**, опора: «Анимации»
- `css-scroll-snap` — `scroll-snap-*`, `scroll-padding`/`margin`, `scroll-behavior`
- `css-overscroll-scrollbar` — `overscroll-behavior`, `scrollbar-gutter`, `scrollbar-width`/`color`
- `css-interaction` — `pointer-events`, `touch-action`, `cursor`, `user-select`, `caret-color`, `resize`, `appearance`, `field-sizing`

### Современный CSS (Продвинутое)
- `css-variables` — CSS-переменные
- `css-nesting-layers` — Структура стилей
- `css-logical` — Логические свойства
- `css-modern-functions` — Современные функции
- `css-forms-ui` — Стили форм
- `css-counters` — Счётчики
- **(новое)** `css-property-houdini` — `@property`: типизированные переменные, анимация переменных
- **(новое)** `css-scope` — `@scope`, близость в каскаде
- **(новое)** `css-supports` — `@supports` и `selector()`, постепенное улучшение
- **(новое)** `css-math-functions` — `calc()`, `min`/`max`/`clamp`, `round`/`mod`/`rem`, тригонометрия, `abs`/`sign`, `pow`/`sqrt`/`hypot`/`log`/`exp`
- **(новое)** `css-if-and-new` — новое в CSS текущего года, например `if()`, `attr()` с типами, `sibling-index()` — по снимку; ветка обновляется ежегодно

### Производительность и сдерживание (Изнутри) — **(новое)**, опора: «Современный CSS»
- `css-containment` — `contain`, `content-visibility`, `contain-intrinsic-size`
- `css-will-change-rendering` — `will-change`, слои композитинга, что вызывает перерасчёт и перерисовку
- `css-cascade-internals` — полный алгоритм каскада: происхождение, важность, слои, контекст, специфичность, порядок; вычисленное, используемое и фактическое значение

### Доступность и качество (Практика)
- `css-a11y` — Доступность в CSS
- `css-performance` — Производительность и эффекты
- `css-print-tables` — Печать и таблицы
- `css-project-final` — Сайт целиком
- **(новое)** `css-paged-media` — `@page`, поля, `page-break`, размеры страниц, печатные стили полностью
- **(новое)** `css-legacy` — наследие: вендорные префиксы, `float`-вёрстка, `clearfix`, `zoom` — читать, но не писать

## Бои

| Ветка | Бой |
|---|---|
| Блочная модель | Карточка товара |
| Flexbox | Шапка |
| Grid | Сетка меню |
| Адаптивность | Адаптивная страница |
| Доступность и качество | Сайт целиком |
| Изображения и эффекты **(новое)** | Галерея с фильтрами и масками |
| Анимации **(новое)** | Анимированный интерфейс без JS с `prefers-reduced-motion` |
| Позиционирование **(новое)** | Подсказки и меню на anchor positioning |

Все бои — статическая проверка HTML + CSS (ADR-0073).

## Объём работ

- 52 новых навыка: уроки, банки, переписанный индекс.
- 7 новых веток.
- Банки 12+ на все навыки, всего около 120.
