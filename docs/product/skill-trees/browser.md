# Браузер — Бро (Проводник)

- **Источник полноты:** собственный индекс `docs/examples/browser-course/coverage-index.json` (#200). Опирается на стандарты URL, Fetch и HTTP (RFC 9110–9114), спецификации рендеринга (HTML «Rendering», CSSOM View) и документацию DevTools.
- **Стоит на:** ПК («Файлы»).
- **Открывает:** HTML (ветка «Адрес страницы»), Сеть и HTTP (эволюция на ранге Практик), Web API (вместе с JavaScript).
- **Способности:**
  - Адреса;
  - HTTP;
  - Кэш и хранилища;
  - Безопасность;
  - Отрисовка;
  - DevTools;
  - Доступность.
- **Покрытие:** 43 навыка в 15 ветках (#200).

## Ветки (уровень)

### Что такое браузер (Основа)
- `browser-what-is` — Что такое браузер
- `browser-interface` — Интерфейс браузера

### Адрес страницы (Основа)
- `browser-url` — Строение URL
- `browser-domains` — Домены и кодирование URL
- `browser-origin` — Источник (origin)

### DNS (Практика)
- `browser-dns` — Разрешение имён
- `browser-dns-records` — Записи DNS

### HTTP и HTTPS (Основа)
- `browser-http` — Протокол HTTP
- `browser-https` — HTTPS
- **(новое)** `browser-http-versions` — HTTP/1.1, HTTP/2, HTTP/3: что видит разработчик

### Запросы и ответы (Практика)
- `browser-request` — HTTP-запрос
- `browser-response` — HTTP-ответ
- `browser-sending` — Отправка данных
- `browser-cors` — CORS

### Коды ответа (Практика)
- `browser-status-2xx` — Коды 1xx–2xx
- `browser-status-3xx` — Перенаправления
- `browser-status-errors` — Коды ошибок

### Кэширование (Продвинутое)
- `browser-cache` — HTTP-кэш
- `browser-cache-validation` — Проверка и сброс кэша
- **(новое)** `browser-bfcache-prefetch` — bfcache, prefetch/prerender, Speculation Rules

### Cookies и хранилища (Практика)
- `browser-cookies` — Cookies
- `browser-cookie-attrs` — Атрибуты cookies
- `browser-storage` — Веб-хранилища

### Вкладки и история (Основа)
- `browser-tabs` — Вкладки и приватный режим
- `browser-history` — История и навигация

### Расширения (Полное покрытие)
- `browser-extensions` — Расширения

### Приватность и безопасность (Продвинутое)
- `browser-privacy` — Приватность
- `browser-security` — Защита в браузере
- **(новое)** `browser-security-headers` — CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/COEP — как в самом Nexus
- **(новое)** `browser-permissions` — разрешения: камера, геолокация, уведомления, буфер обмена

### Как браузер рисует страницу (Продвинутое)
- `browser-parsing` — Разбор страницы
- `browser-pipeline` — Конвейер отрисовки
- `browser-loading` — Загрузка и скорость
- `browser-js-engine` — Выполнение JavaScript
- **(новое)** `browser-web-vitals` — LCP, INP, CLS: что измеряют и как улучшить

### Инструменты разработчика (Практика)
- `browser-devtools` — Основы DevTools
- `browser-elements` — Панель Elements
- `browser-console` — Панель Console
- `browser-network` — Панель Network
- `browser-sources` — Отладчик
- `browser-application` — Панель Application
- `browser-performance` — Анализ производительности
- `browser-devtools-more` — Дополнительные инструменты
- **(новое)** `browser-lighthouse-memory` — Lighthouse и панель Memory: утечки памяти

### Дерево доступности (Практика)
- `browser-a11y-tree` — Дерево доступности
- `browser-a11y-check` — Проверка доступности

### Адаптивный режим (Практика)
- `browser-device-mode` — Адаптивный режим
- `browser-responsive-testing` — Проверка адаптивности
- `browser-compat` — Совместимость браузеров

## Бои

| Ветка | Бой |
|---|---|
| Запросы и ответы | По записи Network ответить, что произошло: перенаправления, CORS, коды |
| Кэширование | Объяснить, почему файл не обновился, и назвать заголовки |
| Отрисовка | Найти причину сдвига вёрстки по записи Performance |
| DevTools | Найти и исправить ошибку на учебной странице, ввести результат |

Проверка — по введённому ответу и файлам.

## Объём

7 новых навыков, банки на все 50.
