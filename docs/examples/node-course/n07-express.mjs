// Chapter 7: Express and REST — routes, middleware, validation, REST design.
import { idea, node, cmd, diagram, tip, makeLesson } from "./nkit.mjs";

export default function express(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "express-routes", title: "Express: маршруты", summary: "Приложение Express, маршруты по методам, параметры пути и query, express.json.",
    skill: ["node-express", "Express", "Описывать маршруты API на Express."],
    now: "Понимаем, как устроен HTTP в Node, и берём фреймворк, чтобы писать меньше кода.",
    body: [
      cmd("npm install express", "Поставить Express", "Самый распространённый минималистичный веб-фреймворк Node.js. Другие популярные — Fastify, Hono, Koa.", "Маршруты, разбор тела, ответы JSON — в несколько строк."),
      node("Маршрут", "app.get и app.post", "`app.get(\"/api/courses\", (req, res) => res.json(courses))` — обработчик для метода и пути. `res.json` сам ставит заголовок и сериализует.", "Каждый адрес API — отдельный понятный обработчик.", "import express from \"express\";\nconst app = express();\napp.use(express.json());\napp.get(\"/api/courses\", (req, res) => res.json(courses));\napp.listen(3000);"),
      node("Параметры пути и query", "req.params и req.query", "`/api/courses/:slug` — `req.params.slug`; `/api/courses?level=easy` — `req.query.level`.", "Один маршрут обслуживает все курсы, а фильтры приходят в query.", "app.get(\"/api/courses/:slug\", (req, res) => {\n  const course = find(req.params.slug);\n  if (!course) return res.status(404).json({ error: \"Не найдено\" });\n  res.json(course);\n});"),
      node("express.json", "Разбор тела", "`app.use(express.json({ limit: \"1mb\" }))` разбирает JSON-тело в `req.body` и ограничивает размер.", "Тело и защита от огромных запросов — одной строкой."),
      tip("Один ресурс — один путь, разные действия — разные методы. Не забывай `return` после ответа с ошибкой.")
    ],
    quizzes: [
      single("er-param", "Параметр пути", "Как получить «html» из запроса `/api/courses/html` в маршруте `/api/courses/:slug`?",
        [["params", "`req.params.slug`"], ["query", "`req.query.slug`"], ["body", "`req.body.slug`"], ["url", "`req.slug`"]], "params",
        "query — то, что после знака вопроса."),
      single("er-return", "return", "Почему после `res.status(404).json(...)` пишут return?",
        [["once", "Чтобы код ниже не отправил второй ответ"], ["speed", "Для скорости"], ["style", "Только для стиля"], ["express", "Так требует синтаксис JavaScript"]], "once",
        "Второй ответ вызовет ошибку «headers already sent»."),
      single("er-json", "Тело", "Что делает `app.use(express.json())`?",
        [["parse", "Разбирает JSON-тело запроса в req.body"], ["send", "Отправляет JSON"], ["validate", "Проверяет данные"], ["cors", "Включает CORS"]], "parse",
        "Без него req.body будет undefined.")
    ]
  });

  L({
    slug: "middleware", title: "Middleware", summary: "Цепочка обработчиков, next(), журнал запросов, авторизация и централизованная обработка ошибок.",
    skill: ["node-middleware", "Middleware", "Строить цепочку промежуточных обработчиков и обрабатывать ошибки в одном месте."],
    now: "Описываем маршруты и выносим общее в промежуточные обработчики.",
    body: [
      diagram({ kind: "flow", title: "Цепочка middleware", steps: [
        { title: "Журнал", text: "Записать метод, путь и время" },
        { title: "Разбор тела", text: "express.json" },
        { title: "Авторизация", text: "Проверить сессию, иначе 401" },
        { title: "Маршрут", text: "Сама логика" },
        { title: "Ошибки", text: "Один обработчик для всех сбоев" }
      ] }),
      node("Middleware", "(req, res, next)", "Функция, которая что-то делает с запросом и вызывает `next()`, чтобы передать его дальше, или сама отвечает.", "Журнал, авторизация, CORS и лимиты пишутся один раз для всех маршрутов.", "app.use((req, res, next) => {\n  const start = Date.now();\n  res.on(\"finish\", () => console.log(req.method, req.url, res.statusCode, Date.now() - start, \"мс\"));\n  next();\n});"),
      node("Авторизация", "Защитить маршруты", "Middleware `requireUser` проверяет сессию или токен и отвечает 401, если пользователя нет. Подключается к нужным маршрутам: `app.get(\"/api/me\", requireUser, handler)`.", "Забыть проверку в одном из двадцати маршрутов невозможно, если она подключена к группе."),
      node("Обработчик ошибок", "Четыре аргумента", "`app.use((err, req, res, next) => …)` — последний в цепочке, ловит все ошибки. Отвечает 500 без подробностей наружу и пишет полную ошибку в журнал.", "Пользователь не видит стек вызовов, а разработчик видит всё в журнале."),
      tip("Общее — в middleware. Ошибки — в одном обработчике с четырьмя аргументами.")
    ],
    quizzes: [
      single("mw-next", "next", "Что делает вызов next() в middleware?",
        [["pass", "Передаёт запрос следующему обработчику в цепочке"], ["end", "Завершает ответ"], ["error", "Бросает ошибку"], ["restart", "Перезапускает сервер"]], "pass",
        "Без next и без ответа запрос повиснет."),
      single("mw-error", "Обработчик ошибок", "Чем обработчик ошибок отличается от обычного middleware в Express?",
        [["four", "У него четыре аргумента: (err, req, res, next)"], ["name", "Он называется error"], ["first", "Он стоит первым"], ["async", "Он всегда async"]], "four",
        "Express узнаёт его по числу аргументов."),
      single("mw-leak", "Что показать", "Что вернуть пользователю при неожиданной ошибке сервера?",
        [["generic", "500 и общее сообщение, а подробности — в журнал"], ["stack", "Полный стек вызовов"], ["sql", "Текст SQL-запроса"], ["nothing", "Оборвать соединение"]], "generic",
        "Подробности ошибок помогают взломщикам.")
    ]
  });

  L({
    slug: "rest-validation", title: "REST и проверка данных", summary: "Ресурсы и методы REST, коды ответа, проверка входящих данных схемой и пагинация.",
    skill: ["node-rest", "REST API", "Проектировать REST API и проверять входящие данные."],
    now: "Строим цепочки middleware и проектируем API так, чтобы им было удобно пользоваться.",
    body: [
      idea("REST", "Ресурсы и методы", "Адреса — существительные (`/api/courses`, `/api/courses/html`), действия — методы: GET читает, POST создаёт, PATCH меняет часть, PUT заменяет, DELETE удаляет.", "API, построенный по одним правилам, понятен без документации."),
      idea("Коды успеха", "200, 201, 204", "200 — данные в ответе, 201 Created — ресурс создан (с заголовком Location), 204 — успешно, но тела нет (удаление).", "Клиент понимает результат по коду, не разбирая тело."),
      node("Проверка входа", "Схема на границе", "Тело запроса проверяют схемой (Zod, Valibot) до логики: `const data = CourseInput.parse(req.body)`. Ошибку превращают в 422 с полями, которые не прошли.", "В бизнес-логику попадают только корректные данные, а клиент знает, что исправить.", "const result = CourseInput.safeParse(req.body);\nif (!result.success) return res.status(422).json({ errors: result.error.flatten() });"),
      idea("Пагинация", "Не всё сразу", "Список отдают страницами: `?limit=20&cursor=…`. В ответе — элементы и курсор следующей страницы.", "Список на миллион записей не повесит ни сервер, ни браузер."),
      tip("Существительные в путях, действия — методами, проверка — схемой на входе, списки — страницами.")
    ],
    quizzes: [
      single("rv-create", "Создание", "Каким методом и с каким кодом обычно создают ресурс?",
        [["post", "POST и ответ 201 Created"], ["get", "GET и 200"], ["delete", "DELETE и 204"], ["put", "PUT и 404"]], "post",
        "201 говорит, что ресурс создан."),
      single("rv-noun", "Адрес", "Какой адрес лучше по правилам REST?",
        [["noun", "`DELETE /api/courses/html`"], ["verb", "`POST /api/deleteCourse?slug=html`"], ["get", "`GET /api/courses/html/delete`"], ["any", "Неважно"]], "noun",
        "Действие выражается методом, а не словом в адресе."),
      single("rv-validate", "Проверка", "Где проверять данные запроса?",
        [["edge", "На входе в обработчик, схемой, до бизнес-логики"], ["db", "Только ошибками базы данных"], ["client", "Только в браузере"], ["never", "Не нужно"]], "edge",
        "Проверку в браузере легко обойти.")
    ]
  });
}
