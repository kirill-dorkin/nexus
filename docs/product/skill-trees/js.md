# JavaScript — Искра (Механик)

- **Источник полноты:** ECMA-262 (ECMAScript 2025). Индекс уже есть: `docs/examples/js-course/spec-index.json` — синтаксис, встроенные объекты, движок, наследие. Курс покрывает его целиком, это проверяет тест.
- **Стоит на:** HTML («Основы HTML»), CSS («Старт CSS»).
- **Эволюции и союзники:**
  - эволюция → TypeScript (на ранге Практик);
  - открывает React, Vue, Svelte, Node.js (на ранге Практик);
  - союзник — Web API.
- **Способности:**
  - Значения и логика — ветки 1–3;
  - Функции и замыкания — «Функции»;
  - Данные — «Массивы», «Объекты», «Коллекции»;
  - Страница — «DOM», «События», «Формы»;
  - Асинхронность — «Асинхронность», «Ошибки, ресурсы и промисы»;
  - Весь язык — «Синтаксис полностью»;
  - Изнутри — «Объекты и функции изнутри», «Symbol, Proxy и Reflect», «Бинарные данные».
- **Покрытие:** 114 навыков в 24 ветках покрывают весь ECMAScript 2025.

> Части браузера (DOM, события, формы, хранение, fetch) выделены в отдельного персонажа **Web API**: там их полное покрытие. Здесь остаются только основы, нужные для первых живых страниц.

## Ветки (уровень)

### Старт JavaScript (Основа)

- `js-what` — Что такое JavaScript
- `js-console` — Консоль
- `js-variables` — Переменные
- `js-types` — Типы данных
- `js-errors` — Чтение ошибок

### Значения и операторы (Основа)

- `js-arithmetic` — Арифметика
- `js-strings` — Строки
- `js-comparison` — Сравнение
- `js-logic` — Логические операторы
- `js-conversion` — Преобразование типов

### Условия и циклы (Основа)

- `js-if` — Условия
- `js-ternary-switch` — Короткие условия
- `js-loops` — Циклы
- `js-loop-control` — Управление циклами
- `js-project-bill` — Сумма корзины

### Функции (Основа)

- `js-functions` — Функции
- `js-parameters` — Параметры
- `js-arrow` — Стрелочные функции
- `js-scope` — Область видимости
- `js-callbacks` — Колбэки

### Массивы (Основа)

- `js-arrays` — Массивы
- `js-map-filter` — map и filter
- `js-find` — Поиск в массиве
- `js-reduce` — reduce
- `js-sort` — Сортировка и куски
- `js-destructuring` — Деструктуризация

### Объекты (Основа)

- `js-objects` — Объекты
- `js-methods` — Методы объекта
- `js-object-iteration` — Перебор объекта
- `js-json` — JSON
- `js-classes` — Классы

### DOM (Практика)

- `js-dom-query` — Поиск элементов
- `js-dom-content` — Содержимое элементов
- `js-dom-classes` — Классы и атрибуты
- `js-dom-create` — Создание элементов
- `js-dom-traversal` — Навигация по DOM

### События (Практика)

- `js-events-click` — Обработка кликов
- `js-event-object` — Объект события
- `js-input-events` — События ввода
- `js-keyboard` — События клавиатуры
- `js-delegation` — Делегирование
- `js-project-cart` — Корзина

### Формы (Практика)

- `js-form-submit` — Отправка формы
- `js-form-validation` — Проверка полей
- `js-formdata` — FormData

### Асинхронность (Практика)

- `js-timers` — Таймеры
- `js-promises` — Промисы
- `js-async-await` — async/await
- `js-fetch` — fetch
- `js-loading-states` — Состояния загрузки
- `js-project-api` — Каталог с сервера

### Хранение и финал (Практика)

- `js-storage` — Хранение в браузере
- `js-dates` — Даты и форматирование
- `js-math` — Math
- `js-modules` — Модули и отладка
- `js-project-final` — Приложение целиком

### Синтаксис полностью (Полное покрытие)

- `js-values-deep` — Примитивы и ссылки
- `js-declarations-deep` — Правила объявлений
- `js-operators-all` — Все операторы
- `js-literals` — Литералы
- `js-classes-full` — Классы целиком
- `js-generators` — Итераторы и генераторы
- `js-async-iteration` — Асинхронный перебор
- `js-modules-full` — Модули целиком
- `js-event-loop` — Цикл событий

### Объекты и функции изнутри (Полное покрытие)

- `js-prototypes` — Прототипы
- `js-own-props` — Собственные свойства
- `js-descriptors` — Дескрипторы
- `js-freezing` — Заморозка
- `js-to-primitive` — Преобразование объектов
- `js-functions-deep` — Методы функций
- `js-globals` — Глобальные функции

### Строки полностью (Полное покрытие)

- `js-string-chars` — Символы строки
- `js-string-search` — Поиск в строке
- `js-string-transform` — Преобразование строк
- `js-string-unicode` — Юникод

### Числа и Math полностью (Полное покрытие)

- `js-number-limits` — Границы чисел
- `js-number-format` — Форматирование чисел
- `js-bigint` — BigInt
- `js-math-basic` — Математика
- `js-math-trig` — Тригонометрия

### Массивы и итераторы полностью (Полное покрытие)

- `js-array-create` — Создание массивов
- `js-array-search-deep` — Поиск в массиве
- `js-array-transform-deep` — Преобразования без изменений
- `js-iterator-helpers` — Помощники итераторов

### Коллекции (Полное покрытие)

- `js-map` — Map
- `js-set` — Set
- `js-set-algebra` — Алгебра множеств
- `js-weak` — Слабые коллекции

### Регулярные выражения (Полное покрытие)

- `js-regexp-basics` — Основы регулярок
- `js-regexp-flags` — Флаги
- `js-regexp-groups` — Группы и замены

### Symbol, Proxy и Reflect (Изнутри)

- `js-symbols` — Символы
- `js-well-known-symbols` — Встроенные символы
- `js-proxy` — Proxy
- `js-reflect` — Reflect

### Ошибки, ресурсы и промисы (Полное покрытие)

- `js-errors-full` — Ошибки
- `js-resources` — Управление ресурсами
- `js-promises-full` — Комбинаторы промисов
- `js-json-full` — JSON целиком

### Даты полностью (Полное покрытие)

- `js-date-create` — Создание дат
- `js-date-parts` — Части даты
- `js-date-output` — Вывод дат

### Intl полностью (Полное покрытие)

- `js-intl-numbers` — Числа и склонения
- `js-intl-time` — Время для людей
- `js-intl-text` — Текст на любом языке
- `js-intl-locale` — Локаль

### Бинарные данные и общая память (Изнутри)

- `js-array-buffer` — ArrayBuffer
- `js-typed-arrays` — Типизированные массивы
- `js-typed-array-methods` — Методы typed arrays
- `js-dataview` — DataView
- `js-atomics` — Общая память

### Устаревшее: как читать старый код (Полное покрытие)

- `js-legacy-strings` — Устаревшие методы строк и дат
- `js-legacy-objects` — Устаревшие возможности объектов

## Бои

| Ветка | Бой |
|---|---|
| Условия и циклы | Сумма корзины |
| События | Корзина на странице |
| Асинхронность | Каталог с сервера |
| Хранение и финал | Приложение целиком |
| Функции, Массивы, Объекты, Коллекции, Регулярные выражения | Задачи с тестами: реализовать функцию по спецификации |

Бои с исполнением кода включаются вместе с грейдером (ТЗ, P4.1). До этого — тест ветки.

## Что добавить

1. **Банк вопросов** — 12+ на каждый из 114 навыков (ТЗ, P4.4).
2. **Ветка «Новое в ECMAScript»** — ежегодно по финальным предложениям TC39 (stage 4): навыки на каждое новое предложение. Пример для ES2026: `Temporal`, `Iterator.concat`, `Error.isError`, `Math.sumPrecise`, `Uint8Array` base64 — в зависимости от того, что вошло.
3. **Ветка «Модули и сборка» (Практика)**:
   - `js-esm-loading` — загрузка модулей в браузере;
   - `js-import-maps` — import maps;
   - `js-bundling-basics` — что делает сборщик.
   Это граница с Web API и Node.js.
