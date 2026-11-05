# Angular — Инженер платформы

- **Источник полноты:** документация angular.dev для Angular 20+:
  - In-depth Guides — Components, Templates, Directives, DI, Signals, Routing, Forms, HTTP Client, SSR, i18n, Animations, Testing, Performance, Security;
  - API Reference — пакеты `@angular/core`, `common`, `router`, `forms`, `common/http`, `platform-browser`;
  - CLI.
- **Индекс:** разделы Guides и публичные API этих пакетов.
- **Стоит на:** TypeScript (ранг Практик), Web API.
- **Эволюции и союзники:** союзник — RxJS (ветка внутри), NestJS (общий стиль DI).
- **Способности:**
  - Компоненты;
  - Сигналы;
  - Внедрение зависимостей;
  - Маршруты;
  - Формы;
  - HTTP;
  - Сервер;
  - Тесты.
- **Объём:** 43 навыка.

## Ветки

### Основы (Основа)
- `ng-what` — Angular CLI, `ng new`, структура, standalone-приложение, `bootstrapApplication`
- `ng-components` — `@Component`: селектор, шаблон, стили, `imports`
- `ng-templates` — интерполяция, привязки свойств, атрибутов, классов и стилей, события
- `ng-control-flow` — `@if`, `@for` с `track`, `@switch`, `@let`
- `ng-inputs-outputs` — `input()`, `input.required()`, `output()`, `model()`, трансформация входов
- `ng-content-projection` — `<ng-content>`, `select`, `ng-template`, `ngTemplateOutlet`

### Сигналы (Основа)
- `ng-signals` — `signal`, `computed`, `effect`, `untracked`
- `ng-linked-resource` — `linkedSignal`, `resource`, `httpResource`
- `ng-signal-queries` — `viewChild`, `viewChildren`, `contentChild`, `contentChildren`

### Директивы и пайпы (Практика)
- `ng-attribute-directives` — свои директивы атрибутов, `host`-привязки
- `ng-structural-directives` — структурные директивы, `ngTemplateOutlet`
- `ng-directive-composition` — `hostDirectives`
- `ng-pipes` — встроенные пайпы (`date`, `currency`, `async`, `json`) и свои, чистые и нечистые

### Внедрение зависимостей (Практика)
- `ng-di-basics` — `@Injectable`, `inject()`, `providedIn`
- `ng-providers` — провайдеры: `useClass`, `useValue`, `useFactory`, `useExisting`, `InjectionToken`
- `ng-injector-hierarchy` — иерархия инжекторов, `viewProviders`, модификаторы `optional`, `self`, `skipSelf`, `host`

### Жизненный цикл и рендер (Практика)
- `ng-lifecycle` — хуки жизненного цикла, `afterNextRender`, `afterRenderEffect`, `DestroyRef`
- `ng-change-detection` — обнаружение изменений, `OnPush`, zoneless-режим
- `ng-defer` — `@defer` с триггерами, `@placeholder`, `@loading`

### Маршрутизация (Практика)
- `ng-router-basics` — `provideRouter`, маршруты, `routerLink`, `<router-outlet>`, параметры
- `ng-router-lazy` — ленивая загрузка `loadComponent` и `loadChildren`
- `ng-router-guards-resolvers` — guard-функции `CanActivate`/`CanMatch`/`CanDeactivate`, резолверы
- `ng-router-advanced` — вложенные маршруты, именованные outlet, переходы между представлениями, `withComponentInputBinding`

### Формы (Практика)
- `ng-reactive-forms` — `FormControl`, `FormGroup`, `FormArray`, `FormBuilder`, строго типизированные формы
- `ng-validation` — встроенные и свои валидаторы, асинхронные, кросс-полевые
- `ng-template-forms` — шаблонные формы, `ngModel`
- `ng-custom-form-controls` — `ControlValueAccessor`
- `ng-signal-forms` — формы на сигналах (новое, экспериментально)

### HTTP (Практика)
- `ng-http-client` — `HttpClient`: запросы, типы ответов, параметры, заголовки
- `ng-interceptors` — функциональные интерсепторы: авторизация, ошибки, повторы
- `ng-http-testing` — `HttpTestingController`

### RxJS в Angular (Продвинутое)
- `ng-rxjs-core` — `Observable`, подписка, операторы `map`, `filter`, `switchMap`, `mergeMap`, `concatMap`, `debounceTime`
- `ng-rxjs-interop` — `toSignal`, `toObservable`, `takeUntilDestroyed`, `async`-пайп

### Сервер (Продвинутое)
- `ng-ssr` — SSR и пререндеринг, режимы рендера маршрутов, гидратация (включая инкрементальную), event replay

### Качество (Практика)
- `ng-testing` — тесты компонентов: `TestBed`, Vitest или Karma, harness-ы, тесты сервисов
- `ng-a11y-cdk` — доступность, Angular CDK (a11y, overlay, drag and drop)
- `ng-security` — защита от XSS, `DomSanitizer`, CSP, доверенные типы

### Производительность и сборка (Продвинутое)
- `ng-performance` — профилирование, `@defer`, оптимизация изображений `NgOptimizedImage`, бюджеты сборки
- `ng-cli-build` — `angular.json`, окружения, сборщик esbuild, `ng generate`, `ng update`, schematics

### Справочник (Полное покрытие)
- `ng-i18n` — интернационализация `@angular/localize`
- `ng-animations` — анимации: нативные CSS-анимации и `@angular/animations` (наследие)
- `ng-elements` — Angular Elements
- `ng-legacy-modules` — NgModules, `*ngIf`/`*ngFor`, `@Input`/`@Output` — наследие, читать старый код

## Бои

| Ветка | Бой |
|---|---|
| Сигналы | Панель с вычисляемыми данными и `resource` |
| Внедрение зависимостей | Модуль с подменяемыми провайдерами и тестами |
| Маршрутизация | Приложение с ленивыми разделами и защитой |
| Формы | Сложная типизированная форма с асинхронной проверкой |
| HTTP | Клиент API с интерсепторами и обработкой ошибок |

**Проверка:** грейдер — `ng test` и e2e.
