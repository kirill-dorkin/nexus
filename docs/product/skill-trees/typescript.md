# TypeScript — Страж типов

- **Источник полноты:**
  - TypeScript Handbook и Reference (typescriptlang.org) — Handbook, Reference, все опции `tsconfig` (TSConfig Reference);
  - утилитарные типы;
  - объявления `.d.ts`;
  - заметки о выпусках начиная с 4.0 — новые возможности.
- **Индекс:** каждая глава Handbook и Reference, каждая опция компилятора, каждый утилитарный тип.
- **Стоит на:** JavaScript (ранг Практик — эволюция).
- **Эволюции и союзники:** открывает Angular, NestJS, Prisma; союзник React, Vue, Next.js.
- **Способности:**
  - Аннотации;
  - Сужение;
  - Обобщения;
  - Типы-функции;
  - Объявления;
  - Конфигурация;
  - Типовая магия.
- **Объём:** 52 навыка.

## Ветки

### Первые типы (Основа)
- `ts-what` — зачем типы, компиляция в JS, проверка против выполнения, `tsc`, игровая площадка
- `ts-primitives` — `string`, `number`, `boolean`, `bigint`, `symbol`, `null`/`undefined`, литеральные типы
- `ts-annotations-inference` — аннотации и вывод типов, когда писать явно
- `ts-arrays-tuples` — массивы, кортежи, `readonly`, именованные элементы кортежа
- `ts-objects` — объектные типы, необязательные свойства, `readonly`, индексные подписи
- `ts-any-unknown-never` — `any`, `unknown`, `never`, `void`, `object`

### Функции (Основа)
- `ts-function-types` — параметры, возвращаемый тип, необязательные и rest-параметры
- `ts-overloads` — перегрузки функций
- `ts-this` — тип `this`, `this`-параметры
- `ts-callbacks` — типы колбэков, `void` в колбэках

### Объединения и сужение (Основа)
- `ts-unions-intersections` — `|` и `&`
- `ts-narrowing` — `typeof`, `instanceof`, `in`, равенство, истинность
- `ts-discriminated-unions` — размеченные объединения, исчерпывающие проверки через `never`
- `ts-type-guards` — пользовательские защитники `x is T`, `asserts`, предикаты вывода
- `ts-assertions` — `as`, `as const`, `!`, `satisfies` — когда что

### Интерфейсы и типы (Практика)
- `ts-type-vs-interface` — `type` и `interface`, расширение, слияние объявлений
- `ts-structural` — структурная типизация, совместимость, лишние свойства
- `ts-enums` — `enum`, `const enum` и альтернативы на литералах

### Классы (Практика)
- `ts-classes` — поля, модификаторы `public`/`private`/`protected`/`#private`, `readonly`, параметры-свойства
- `ts-abstract-implements` — абстрактные классы, `implements`, `override`
- `ts-decorators` — декораторы стандарта TC39 и `experimentalDecorators` (для Angular и NestJS)

### Обобщения (Практика)
- `ts-generics` — обобщённые функции и типы
- `ts-constraints-defaults` — `extends`-ограничения, значения по умолчанию, `const`-параметры типа
- `ts-generic-classes` — обобщённые классы и интерфейсы
- `ts-variance` — вариантность, аннотации `in`/`out`

### Типовые операторы (Продвинутое)
- `ts-keyof-typeof` — `keyof`, `typeof` в типах, индексный доступ `T[K]`
- `ts-conditional` — условные типы, `infer`, дистрибутивность
- `ts-mapped` — отображённые типы, модификаторы `+`/`-`, переименование ключей `as`
- `ts-template-literal` — шаблонные литеральные типы, встроенные `Uppercase` и другие
- `ts-recursive` — рекурсивные типы и их пределы

### Утилитарные типы (Практика)
- `ts-utility-object` — `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`
- `ts-utility-union` — `Exclude`, `Extract`, `NonNullable`
- `ts-utility-function` — `Parameters`, `ReturnType`, `ConstructorParameters`, `InstanceType`, `ThisParameterType`, `OmitThisParameter`, `ThisType`
- `ts-utility-other` — `Awaited`, `NoInfer`, строковые утилиты

### Модули и объявления (Продвинутое)
- `ts-modules` — ES-модули в TS, `import type`, `export type`, `verbatimModuleSyntax`
- `ts-module-resolution` — `moduleResolution` (`node16`, `bundler`), `paths`, `baseUrl`, расширения файлов
- `ts-declarations` — `.d.ts`, `declare`, глобальные объявления, `@types`
- `ts-module-augmentation` — расширение модулей и глобальной области
- `ts-js-interop` — JSDoc-типы, `checkJs`, постепенный переход с JS

### Конфигурация (Практика)
- `ts-tsconfig-core` — `strict` и всё, что в него входит; `target`, `lib`, `module`
- `ts-tsconfig-strictness` — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` и другие (как в Nexus)
- `ts-tsconfig-project` — `include`/`exclude`, project references, `composite`, `incremental`
- `ts-tsconfig-emit` — `outDir`, `declaration`, `sourceMap`, `noEmit`, `isolatedModules`
- `ts-tsconfig-reference` — справочник: каждая оставшаяся опция TSConfig Reference

### Практика типизации (Продвинутое)
- `ts-api-types` — типы ответа API, проверка во время выполнения (zod) и вывод типов из схем
- `ts-branded` — брендированные и номинальные типы
- `ts-error-handling` — типизированные ошибки, `Result`-подход, `unknown` в `catch`
- `ts-react-typing` — типы пропсов, событий, рефов (мост к React)
- `ts-performance` — скорость проверки типов, `--extendedDiagnostics`, сложные типы

### Новое в TypeScript (Полное покрытие)
- `ts-release-notes` — возможности последних выпусков: `using`, `satisfies`, `NoInfer`, вывод предикатов, `--erasableSyntaxOnly`. Ветка обновляется с каждым выпуском, включая переход на нативный компилятор (TypeScript 7)

### Изнутри (Изнутри)
- `ts-checker-model` — как работает проверка: типы как множества, присваиваемость, вывод
- `ts-compiler-api` — Compiler API и языковой сервис (обзор)

## Бои

| Ветка | Бой |
|---|---|
| Объединения и сужение | Типизировать обработчик событий заказа: размеченное объединение, исчерпывающий `switch` |
| Обобщения | Обобщённый типобезопасный кэш |
| Типовые операторы | Набор типов по ТЗ, проверяется `tsd`/`expect-type` |
| Модули и объявления | `.d.ts` для учебной JS-библиотеки |
| Практика типизации | Перевести JS-модуль на strict TS без `any` |

**Проверка:** грейдер запускает `tsc` и тесты типов.
