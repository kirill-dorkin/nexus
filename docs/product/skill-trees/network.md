# Сеть и HTTP — Почтальон

- **Источник полноты:**
  - RFC 9110 (семантика HTTP), RFC 9111 (кэширование), RFC 9112–9114 (HTTP/1.1, 2, 3);
  - RFC 8446 (TLS 1.3), RFC 1034/1035 (DNS);
  - WHATWG Fetch (CORS);
  - RFC 6455 (WebSocket), RFC 6265bis (cookies);
  - модель TCP/IP;
  - REST и OpenAPI как практика.
- **Индекс:** все методы, все коды статуса, все заголовки из реестра IANA, которые встречаются в вебе, этапы TLS и DNS.
- **Стоит на:** Браузер («HTTP и HTTPS»), ПК («Домашняя сеть»).
- **Эволюции и союзники:** открывает Node.js (вместе с JavaScript), Redis, Nginx (будущий); союзник для Web API и любых серверных персонажей.
- **Способности:**
  - Модель сети;
  - DNS;
  - HTTP;
  - TLS;
  - Кэш;
  - API;
  - Реальное время;
  - Диагностика.
- **Объём:** 43 навыка.

## Ветки

### Модель сети (Основа)
- `net-layers` — уровни TCP/IP и OSI: что где происходит
- `net-ip` — IPv4 и IPv6, подсети, CIDR, частные адреса, NAT
- `net-tcp-udp` — TCP (рукопожатие, надёжность, окна), UDP, порты
- `net-routing` — маршрутизация, шлюз, traceroute

### DNS (Практика)
- `net-dns-resolution` — рекурсивное разрешение, корень, TLD, авторитетные серверы
- `net-dns-records` — A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, SRV
- `net-dns-ttl-caching` — TTL, кэши, распространение изменений
- `net-dns-security` — DNSSEC, DoH и DoT (обзор)

### HTTP: семантика (Основа)
- `net-http-messages` — запрос и ответ, стартовая строка, заголовки, тело
- `net-http-methods` — GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS: безопасность и идемпотентность
- `net-http-status-full` — все классы и коды, включая 101, 204, 206, 304, 409, 412, 422, 429, 503
- `net-http-headers-core` — Host, Content-Type, Content-Length, Accept-*, User-Agent, Authorization
- `net-content-negotiation` — согласование контента, `Vary`, языки и кодировки
- `net-http-range` — Range-запросы, `206`, докачка

### HTTP: версии (Продвинутое)
- `net-http1` — HTTP/1.1: keep-alive, chunked, head-of-line blocking
- `net-http2` — HTTP/2: потоки, мультиплексирование, HPACK
- `net-http3-quic` — HTTP/3 и QUIC
- `net-compression` — gzip, br, zstd, `Content-Encoding`

### TLS и HTTPS (Практика)
- `net-tls-handshake` — рукопожатие TLS 1.3, ключи, шифры
- `net-certificates` — сертификаты, цепочки доверия, CA, Let's Encrypt, срок действия
- `net-hsts-security` — HSTS, mixed content, certificate transparency

### Кэширование (Продвинутое)
- `net-cache-control` — `Cache-Control` полностью: `max-age`, `s-maxage`, `no-cache`, `no-store`, `private`/`public`, `immutable`, `stale-while-revalidate`
- `net-validation` — `ETag`, `Last-Modified`, условные запросы, `304`
- `net-cdn` — CDN, кэш на краю, инвалидация

### Состояние и безопасность (Практика)
- `net-cookies-full` — `Set-Cookie`: `Secure`, `HttpOnly`, `SameSite`, `Domain`/`Path`, префиксы `__Host-`
- `net-cors-full` — CORS полностью: простые запросы, preflight, учётные данные, `Access-Control-*`
- `net-auth-schemes` — Basic, Bearer, сессии против токенов, JWT (устройство и риски)
- `net-oauth-oidc` — OAuth 2.1 и OpenID Connect: потоки, PKCE (как вход через Google в Nexus)
- `net-web-attacks` — CSRF, XSS, SSRF, open redirect — со стороны HTTP

### API (Практика)
- `net-rest` — REST: ресурсы, URL, методы, коды, пагинация, фильтры, версии
- `net-api-errors` — формат ошибок (problem+json), идемпотентные ключи, повторы
- `net-openapi` — OpenAPI: описание API, генерация клиентов
- `net-graphql-rpc` — GraphQL и RPC (gRPC) — когда что
- `net-rate-limits` — ограничение частоты, `429`, `Retry-After` (как в Nexus, ADR-0070)

### Реальное время (Продвинутое)
- `net-websocket` — WebSocket: апгрейд, кадры, закрытие
- `net-sse` — Server-Sent Events
- `net-long-polling-webtransport` — long polling, WebTransport (обзор)

### Инфраструктура (Продвинутое)
- `net-proxies` — прямой и обратный прокси, балансировщики, заголовки `Forwarded`/`X-Forwarded-*`
- `net-load-balancing` — алгоритмы балансировки, health checks, sticky sessions

### Диагностика (Практика)
- `net-curl-deep` — `curl -v`, `--resolve`, тайминги, HTTP/2 и 3
- `net-capture` — Wireshark и tcpdump: чтение захвата
- `net-troubleshooting` — метод: DNS → TCP → TLS → HTTP

### Справочник (Полное покрытие)
- `net-headers-registry` — остальные заголовки реестра: `Link`, `Early-Hints` (103), `Alt-Svc`, `Server-Timing`, `Clear-Site-Data`, `Accept-CH`, `Priority`, `Content-Disposition`

## Бои

| Ветка | Бой |
|---|---|
| HTTP: семантика | Спроектировать ответы API на 10 ситуаций (метод, код, заголовки) |
| Кэширование | Настроить заголовки кэша для сайта по требованиям |
| Состояние и безопасность | Найти и закрыть уязвимость в учебном сервере |
| API | Описать API в OpenAPI по требованиям |
| Диагностика | По захвату трафика найти причину сбоя |

**Проверка:** структурированный ответ и файлы — статическая проверка; для серверных боёв — грейдер.
