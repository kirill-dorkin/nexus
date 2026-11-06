// Chapter 7: API and proxy — route handlers, the proxy (formerly middleware), cookies and headers.
import { idea, nx, tip, makeLesson } from "./nxkit.mjs";

export default function api(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "route-handlers", title: "Обработчики маршрутов", summary: "route.ts с GET и POST, Request и Response, JSON, вебхуки и когда нужен свой API.",
    skill: ["nx-route", "Обработчики маршрутов", "Писать API-эндпоинты в файлах route.ts."],
    now: "Понимаем кэширование и пишем собственные API-адреса.",
    body: [
      nx("route.ts", "Свой эндпоинт", "Файл route.ts экспортирует функции по HTTP-методам: GET, POST, DELETE. Они получают стандартный Request и возвращают Response.", "API для мобильного приложения, вебхуков и чужих сервисов.", "// app/api/courses/route.ts\nexport async function GET() {\n  const courses = await getCourses();\n  return Response.json(courses);\n}\n\nexport async function POST(request: Request) {\n  const body = await request.json();\n  return Response.json({ ok: true }, { status: 201 });\n}"),
      idea("route или page", "Не вместе", "В одной папке не может быть одновременно page.tsx и route.ts: адрес — либо страница, либо API.", "Обычно API кладут в app/api/."),
      idea("Вебхуки", "Входящие события", "Платёжная система или GitHub отправляют POST на твой route.ts. Подпись запроса обязательно проверяют.", "Иначе кто угодно «оплатит» заказ поддельным запросом."),
      idea("Когда свой API не нужен", "Server Actions и компоненты", "Для собственных форм и страниц хватает Server Actions и серверных компонентов. route.ts — для внешних клиентов.", "Меньше кода и меньше точек для ошибок."),
      tip("route.ts — для внешних клиентов и вебхуков. Своим страницам — серверные компоненты и действия.")
    ],
    quizzes: [
      single("rh-file", "Файл", "Как назвать файл обработчика API в папке app/api/courses?",
        [["route", "route.ts"], ["api", "api.ts"], ["page", "page.ts"], ["handler", "handler.ts"]], "route",
        "Функции называются по методам HTTP."),
      single("rh-both", "Вместе", "Можно ли в одной папке иметь page.tsx и route.ts?",
        [["no", "Нет, адрес — либо страница, либо API"], ["yes", "Да"], ["dev", "Только в разработке"], ["get", "Только для GET"]], "no",
        "Будет конфликт маршрутов."),
      single("rh-webhook", "Вебхук", "Что обязательно проверять во входящем вебхуке оплаты?",
        [["sig", "Подпись запроса"], ["color", "Цвет кнопки"], ["ua", "Только User-Agent"], ["nothing", "Ничего"]], "sig",
        "Иначе запрос можно подделать.")
    ]
  });

  L({
    slug: "proxy", title: "Прокси перед маршрутами", summary: "Файл proxy.ts (раньше middleware), matcher, перенаправления, переписывание адресов и проверка входа.",
    skill: ["nx-proxy", "Прокси", "Перехватывать запросы до маршрутов в proxy.ts."],
    now: "Пишем API и перехватываем запросы до того, как они дойдут до страниц.",
    body: [
      nx("proxy.ts", "Код перед каждым запросом", "Файл в корне проекта выполняется до маршрутов: может перенаправить, переписать адрес, добавить заголовки. В старых версиях назывался middleware.ts.", "Перенаправить неавторизованного пользователя ещё до отрисовки страницы.", "// proxy.ts\nimport { NextResponse } from \"next/server\";\n\nexport function proxy(request) {\n  if (!request.cookies.has(\"session\")) {\n    return NextResponse.redirect(new URL(\"/login\", request.url));\n  }\n}\n\nexport const config = { matcher: [\"/dashboard/:path*\"] };"),
      idea("matcher", "Для каких адресов", "config.matcher ограничивает, на каких путях работает прокси.", "Статика и картинки не проходят лишнюю проверку."),
      idea("redirect и rewrite", "Куда отправить", "redirect меняет адрес в браузере, rewrite показывает другую страницу под тем же адресом.", "A/B-тест или язык по заголовку — через rewrite."),
      idea("Лёгкая проверка", "Не вся авторизация", "Прокси быстро проверяет наличие сессии, но настоящая проверка прав — в слое данных и действиях.", "Прокси можно обойти ошибкой в matcher, а проверку у данных — нет."),
      tip("proxy.ts — быстрые перенаправления и заголовки. Права всё равно проверяй у данных.")
    ],
    quizzes: [
      single("px-when", "Когда", "Когда выполняется proxy.ts?",
        [["before", "До маршрутов, на каждый подходящий запрос"], ["after", "После отрисовки страницы"], ["build", "Только при сборке"], ["client", "В браузере"]], "before",
        "Раньше — middleware.ts."),
      single("px-rewrite", "rewrite", "Чем rewrite отличается от redirect?",
        [["url", "rewrite показывает другую страницу, не меняя адрес в браузере"], ["same", "Ничем"], ["slow", "rewrite медленнее"], ["post", "rewrite только для POST"]], "url",
        "redirect меняет адрес."),
      single("px-auth", "Только прокси", "Достаточно ли проверки входа в proxy.ts для защиты данных?",
        [["no", "Нет, права проверяют и в слое данных"], ["yes", "Да, полностью"], ["https", "Да, на HTTPS"], ["dev", "Только в разработке нет"]], "no",
        "Защита в глубину.")
    ]
  });

  L({
    slug: "cookies-headers", title: "Cookies, заголовки и окружение", summary: "cookies() и headers(), установка cookie в действии, переменные окружения и NEXT_PUBLIC_.",
    skill: ["nx-env", "Cookies и окружение", "Работать с cookies, заголовками и переменными окружения."],
    now: "Перехватываем запросы и работаем с cookies и настройками.",
    body: [
      nx("cookies()", "Читать и писать", "`(await cookies()).get(\"theme\")` в серверном компоненте; установить — `.set()` в Server Action или route.ts.", "Тема, язык, сессия.", "\"use server\";\nimport { cookies } from \"next/headers\";\n\nexport async function setTheme(theme: string) {\n  (await cookies()).set(\"theme\", theme, { httpOnly: true, sameSite: \"lax\", secure: true });\n}"),
      nx("headers()", "Заголовки запроса", "`(await headers()).get(\"accept-language\")` — язык браузера, user-agent и прочие заголовки.", "Подобрать язык по умолчанию."),
      idea("Переменные окружения", ".env.local", "Файл .env.local с ключами не попадает в git. На сервере переменные задают в панели хостинга.", "Секреты отдельно от кода."),
      idea("NEXT_PUBLIC_", "Видно в браузере", "Только переменные с префиксом NEXT_PUBLIC_ попадают в клиентский код — и их видит любой посетитель.", "Ключ к базе с этим префиксом — утечка."),
      tip("Секреты — без префикса и только на сервере. NEXT_PUBLIC_ — только для публичного.")
    ],
    quizzes: [
      single("ck-set", "Установка", "Где можно установить cookie?",
        [["action", "В Server Action или route.ts"], ["rsc", "В любом серверном компоненте при отрисовке"], ["css", "В CSS"], ["layout", "Только в корневом layout"]], "action",
        "При отрисовке cookie только читают."),
      single("ck-public", "Префикс", "Какие переменные окружения попадают в браузер?",
        [["public", "Только с префиксом NEXT_PUBLIC_"], ["all", "Все"], ["none", "Никакие"], ["secret", "Только с префиксом SECRET_"]], "public",
        "Их видит каждый посетитель."),
      single("ck-git", "Секреты", "Где хранить ключи при разработке?",
        [["local", "В .env.local, который не попадает в git"], ["code", "Прямо в коде"], ["readme", "В README"], ["public", "В папке public"]], "local",
        "На сервере — в настройках хостинга.")
    ]
  });
}
