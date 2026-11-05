# Web API — Связной

- **Источник полноты:** спецификации WHATWG и W3C, доступные из JavaScript в браузере:
  - DOM, HTML (скриптовые API);
  - Fetch, Streams, URL, Encoding, File API, Storage, IndexedDB;
  - Service Workers, Web Workers, Notifications, Clipboard;
  - Intersection, Resize и Mutation Observers;
  - Web Animations, Canvas 2D, WebGL (обзор), Web Audio, Media Capture, Geolocation, Web Crypto, WebSocket, WebRTC (обзор), Payment и Credential (обзор).

  Отбор: интерфейсы с широкой поддержкой (Baseline) — «обязательные»; ограниченно доступные — в ветке «Справочник».
- **Индекс:** каждый интерфейс и его основные методы и события.
- **Стоит на:** JavaScript (ветка «Асинхронность»), HTML, Браузер.
- **Эволюции и союзники:** союзник React, Vue, Svelte, Angular; открывает PWA (будущий персонаж).
- **Способности:**
  - DOM;
  - События;
  - Сеть;
  - Хранилища;
  - Фоновая работа;
  - Графика и медиа;
  - Устройство;
  - Безопасность.
- **Объём:** 52 навыка.

## Ветки

### DOM полностью (Основа)
- `webapi-dom-tree` — `Node`, `Element`, `Document`, типы узлов, обход
- `webapi-dom-query` — `querySelector(All)`, `closest`, `matches`, живые и статичные коллекции
- `webapi-dom-mutate` — создание, вставка (`append`, `before`, `replaceWith`), `template`, `DocumentFragment`
- `webapi-dom-attributes` — атрибуты, `dataset`, `classList`, свойства и атрибуты
- `webapi-dom-geometry` — `getBoundingClientRect`, размеры и прокрутка (CSSOM View), `scrollIntoView`
- `webapi-dom-styles` — `style`, `getComputedStyle`, CSS Typed OM (обзор)
- `webapi-dom-ranges-selection` — `Range`, `Selection`, Custom Highlight API

### События полностью (Основа)
- `webapi-events-model` — фазы, `addEventListener` с опциями (`once`, `passive`, `signal`), `preventDefault`, `stopPropagation`
- `webapi-pointer-touch` — Pointer Events, касания, жесты, `setPointerCapture`
- `webapi-keyboard-focus` — клавиатура, `key`/`code`, фокус, `focusin`/`focusout`, управление фокусом
- `webapi-custom-events` — `CustomEvent`, `EventTarget` в своих классах
- `webapi-abort` — `AbortController` и `AbortSignal` (`timeout`, `any`)

### Формы и ввод (Практика)
- `webapi-forms-api` — `HTMLFormElement`, `FormData`, `requestSubmit`, события формы
- `webapi-constraint-validation` — Constraint Validation API, `setCustomValidity`
- `webapi-clipboard-dnd` — Clipboard API, Drag and Drop

### Сеть (Практика)
- `webapi-fetch-full` — `fetch`, `Request`, `Response`, `Headers`, режимы, учётные данные, `keepalive`
- `webapi-url` — `URL`, `URLSearchParams`, `URLPattern`
- `webapi-streams` — Streams API: ReadableStream, потоковые ответы
- `webapi-websocket-sse` — `WebSocket`, `EventSource`
- `webapi-beacon` — `sendBeacon` (как телеметрия Nexus)

### Хранилища (Практика)
- `webapi-web-storage` — `localStorage`, `sessionStorage`, событие `storage`
- `webapi-indexeddb` — IndexedDB: базы, хранилища, транзакции, индексы, курсоры
- `webapi-cache-storage` — Cache API
- `webapi-storage-manager` — квоты, `persist`, Origin Private File System

### Файлы и бинарные данные (Практика)
- `webapi-file` — `File`, `Blob`, `FileReader`, `URL.createObjectURL`
- `webapi-file-system-access` — File System Access API
- `webapi-encoding-compression` — `TextEncoder`/`TextDecoder`, Compression Streams

### Наблюдатели и планирование (Продвинутое)
- `webapi-observers` — Intersection, Resize, Mutation, Performance Observer
- `webapi-raf-idle` — `requestAnimationFrame`, `requestIdleCallback`, `scheduler.postTask`, `scheduler.yield`
- `webapi-page-lifecycle` — `visibilitychange`, `pagehide`, bfcache

### Работа в фоне (Продвинутое)
- `webapi-web-workers` — Web Workers, `postMessage`, передаваемые объекты
- `webapi-shared-workers-channels` — `SharedWorker`, `MessageChannel`, `BroadcastChannel`
- `webapi-service-worker` — Service Worker: жизненный цикл, перехват `fetch`, кэш, офлайн
- `webapi-push-notifications` — Push API, Notifications
- `webapi-pwa-manifest` — манифест, установка приложения, PWA

### Компоненты (Продвинутое)
- `webapi-custom-elements` — Custom Elements: жизненный цикл, атрибуты, form-associated
- `webapi-shadow-dom` — Shadow DOM, слоты, `::part`, декларативный Shadow DOM
- `webapi-popover-dialog-api` — Popover API, `dialog` из JS, invokers

### Графика и анимация (Практика)
- `webapi-canvas-2d` — Canvas 2D полностью: пути, текст, изображения, трансформации, пиксели
- `webapi-web-animations` — Web Animations API
- `webapi-view-transitions-js` — `document.startViewTransition`
- `webapi-webgl-webgpu` — WebGL и WebGPU (обзор)

### Медиа и устройство (Продвинутое)
- `webapi-media-elements` — `HTMLMediaElement` из JS, Media Session
- `webapi-media-capture` — `getUserMedia`, `getDisplayMedia`, MediaRecorder
- `webapi-web-audio` — Web Audio API
- `webapi-device` — геолокация, ориентация, вибрация, Screen Wake Lock, Battery (наследие)
- `webapi-permissions` — Permissions API

### Безопасность (Продвинутое)
- `webapi-crypto` — Web Crypto: `getRandomValues`, `randomUUID`, `subtle` (хеши, подпись, шифрование)
- `webapi-credentials` — Credential Management, WebAuthn и passkeys
- `webapi-trusted-types` — Trusted Types, защита от XSS в DOM

### Производительность (Продвинутое)
- `webapi-performance` — Performance API, User Timing, Navigation и Resource Timing, Web Vitals из кода

### Справочник (Полное покрытие)
- `webapi-limited` — ограниченно доступные интерфейсы: WebUSB, Web Bluetooth, WebHID, Web Serial, Web NFC, Payment Request, Web Share, Contact Picker, Idle Detection, EyeDropper, Web Locks — когда и как проверять поддержку

## Бои

| Ветка | Бой |
|---|---|
| DOM и События | Доступный выпадающий список с нуля |
| Сеть | Загрузчик с прогрессом, отменой и повтором |
| Хранилища | Офлайн-заметки на IndexedDB |
| Работа в фоне | PWA, работающее без сети |
| Компоненты | Веб-компонент «рейтинг» с формой |
| Графика | Рисовалка на Canvas |

**Проверка:** грейдер запускает Playwright-сценарии против файлов ученика.
