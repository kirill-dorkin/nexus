// Chapter 3: network from the browser — fetch in depth, streams and uploads, CORS.
import { idea, wa, tip, makeLesson } from "./wkit.mjs";

export default function fetching(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "fetch-deep", title: "fetch подробно", summary: "Метод, заголовки и тело, res.ok и статус, JSON и FormData, тайм-аут через AbortSignal.timeout.",
    skill: ["wa-fetch", "fetch", "Отправлять запросы и правильно обрабатывать ответы."],
    now: "Создаём свои элементы и разговариваем с сервером.",
    body: [
      wa("POST с JSON", "Метод, заголовки, тело", "fetch принимает второй аргумент с method, headers и body.", "Отправить форму или создать запись через API.", "const res = await fetch(\"/api/comments\", {\n  method: \"POST\",\n  headers: { \"Content-Type\": \"application/json\" },\n  body: JSON.stringify({ text })\n});\nif (!res.ok) throw new Error(`Ошибка ${res.status}`);"),
      idea("res.ok", "fetch не падает на 404", "Promise fetch отклоняется только при сетевой ошибке. Ответы 404 и 500 приходят «успешно» — проверяй res.ok или res.status.", "Самая частая ошибка новичков с fetch."),
      wa("FormData", "Файлы и формы", "`new FormData(form)` собирает поля формы вместе с файлами; Content-Type ставится сам.", "Загрузка аватара одной строкой.", "await fetch(\"/api/avatar\", { method: \"POST\", body: new FormData(form) });"),
      wa("Тайм-аут", "AbortSignal.timeout", "`signal: AbortSignal.timeout(8000)` отменит запрос через 8 секунд.", "Запрос не висит бесконечно на плохой связи.", "await fetch(url, { signal: AbortSignal.timeout(8000) });"),
      tip("Проверяй res.ok, файлы — FormData, тайм-аут — AbortSignal.timeout.")
    ],
    quizzes: [
      single("fd-404", "404", "Что делает Promise fetch при ответе 404?",
        [["resolve", "Выполняется успешно — нужно проверить res.ok"], ["reject", "Отклоняется с ошибкой"], ["hang", "Зависает"], ["retry", "Повторяет запрос"]], "resolve",
        "Отклоняется только при сетевой ошибке."),
      single("fd-form", "Файлы", "Как отправить форму вместе с файлом?",
        [["formdata", "body: new FormData(form)"], ["json", "JSON.stringify(form)"], ["text", "form.innerHTML"], ["none", "Никак"]], "formdata",
        "Заголовок поставится сам."),
      single("fd-timeout", "Тайм-аут", "Как ограничить ожидание ответа восемью секундами?",
        [["signal", "signal: AbortSignal.timeout(8000)"], ["timeout", "timeout: 8000 в fetch"], ["sleep", "setTimeout после fetch"], ["none", "Нельзя"]], "signal",
        "У fetch нет опции timeout.")
    ]
  });

  L({
    slug: "streams", title: "Потоки и прогресс", summary: "Чтение ответа по частям, ReadableStream, прогресс загрузки, потоковые ответы чата.",
    skill: ["wa-streams", "Потоки", "Читать ответ сервера по частям."],
    now: "Владеем fetch и читаем большие ответы по частям.",
    body: [
      wa("res.body", "Поток байтов", "Тело ответа — поток. Его читают кусками через getReader() и TextDecoder.", "Показывать текст по мере прихода, как в чатах с ИИ.", "const reader = res.body.getReader();\nconst decoder = new TextDecoder();\nfor (;;) {\n  const { value, done } = await reader.read();\n  if (done) break;\n  output.textContent += decoder.decode(value, { stream: true });\n}"),
      idea("Прогресс скачивания", "Content-Length", "Зная размер из заголовка, считают загруженные байты и показывают процент.", "Полоса прогресса для больших файлов."),
      idea("Server-Sent Events", "EventSource", "Сервер шлёт события по одному соединению, браузер сам переподключается.", "Уведомления и живые ленты без WebSocket."),
      tip("Длинные ответы — читай потоком. Односторонние события сервера — EventSource.")
    ],
    quizzes: [
      single("st-body", "Поток", "Как читать ответ fetch по частям?",
        [["reader", "res.body.getReader() и чтение в цикле"], ["json", "Только res.json()"], ["text", "Только res.text()"], ["none", "Нельзя"]], "reader",
        "Плюс TextDecoder для текста."),
      single("st-sse", "SSE", "Что такое EventSource?",
        [["sse", "Получение событий от сервера по одному долгому соединению"], ["db", "База данных"], ["file", "Чтение файлов"], ["ws", "Двусторонний WebSocket"]], "sse",
        "Переподключается сам."),
      single("st-progress", "Прогресс", "Что нужно, чтобы показать процент скачивания?",
        [["length", "Размер из заголовка Content-Length и подсчёт прочитанных байтов"], ["guess", "Угадать"], ["timer", "Таймер"], ["none", "Это невозможно"]], "length",
        "Читаем поток и считаем.")
    ]
  });

  L({
    slug: "cors", title: "CORS и cookies", summary: "Политика одного источника, заголовки CORS, предварительный запрос, credentials и cookie.",
    skill: ["wa-cors", "CORS", "Понимать ограничения запросов к другим доменам."],
    now: "Читаем ответы потоком и разбираемся, почему запрос к чужому домену блокируется.",
    body: [
      idea("Один источник", "Same-origin", "Страница может свободно читать ответы только своего источника: схема, домен и порт совпадают.", "Чужой сайт не прочитает твою почту, даже если ты в ней вошёл."),
      idea("CORS", "Разрешение сервера", "Сервер разрешает другим источникам читать ответы заголовком Access-Control-Allow-Origin.", "Ошибка CORS исправляется на сервере, а не в браузере."),
      idea("Предварительный запрос", "OPTIONS", "Для «непростых» запросов (JSON, свои заголовки, PUT) браузер сначала спрашивает разрешение запросом OPTIONS.", "Если сервер не отвечает на OPTIONS — запрос не уйдёт."),
      wa("credentials", "Cookie на другой домен", "`credentials: \"include\"` отправляет cookie; сервер должен разрешить это и указать точный источник.", "Вход через общий домен API.", "await fetch(\"https://api.example.com/me\", { credentials: \"include\" });"),
      tip("Ошибку CORS чинят заголовками на сервере. Cookie на другой домен — credentials и точный источник.")
    ],
    quizzes: [
      single("cr-where", "Где чинить", "Где исправляют ошибку CORS?",
        [["server", "На сервере — заголовками Access-Control-Allow-*"], ["browser", "В настройках браузера пользователя"], ["css", "В CSS"], ["none", "Нигде"]], "server",
        "Сервер даёт разрешение."),
      single("cr-origin", "Источник", "Что составляет источник (origin)?",
        [["triple", "Схема, домен и порт"], ["domain", "Только домен"], ["path", "Путь страницы"], ["ip", "Только IP"]], "triple",
        "http и https — разные источники."),
      single("cr-preflight", "OPTIONS", "Зачем браузер отправляет OPTIONS перед запросом с JSON?",
        [["ask", "Спросить у сервера разрешение на такой запрос"], ["cache", "Для кэша"], ["speed", "Для скорости"], ["none", "Незачем"]], "ask",
        "Предварительный запрос.")
    ]
  });
}
