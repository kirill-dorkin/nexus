export default function head(c) {
  const { code, mdn, lesson, single, multi, short } = c;

  lesson({
    slug: "metadata", title: "Метаданные страницы", minutes: 11,
    summary: "title, description, viewport, charset и robots: что страница рассказывает о себе браузеру и поисковикам.",
    skill: ["html-meta", "Метаданные страницы", "Заполнять head: кодировка, viewport, title, description, robots и canonical."],
    body: [
      `## Что лежит в head`,
      code("html", `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HTML с нуля — бесплатный курс | Nexus</title>
  <meta name="description" content="11 коротких уроков: от первого тега до своей страницы. Живые примеры и задания с проверкой.">
  <link rel="canonical" href="https://example.com/courses/html">
</head>`),
      `Ничего из этого не видно на странице, но всё влияет на то, как её показывают браузеры, поисковики и соцсети.`,
      `## title — самый важный тег head`,
      `Текст на вкладке, в закладках, в истории и **заголовок в поисковой выдаче**. Делайте его уникальным для каждой страницы, сначала главное, потом название сайта: «Доставка и оплата — Пекарня Хлебушек». Оптимально до 60 символов: длиннее обрежется.`,
      `## description — описание для выдачи`,
      `Поисковик часто показывает его под заголовком. 1–2 предложения (до 160 символов), которые убеждают кликнуть. На рейтинг почти не влияет, но влияет на то, кликнут ли.`,
      `## viewport — без него мобильная вёрстка не работает`,
      `\`width=device-width, initial-scale=1\` говорит телефону: «ширина страницы равна ширине экрана». Без этого телефон рисует страницу шириной 980 px и уменьшает, и вся адаптивная вёрстка ломается. Не запрещайте масштабирование (\`user-scalable=no\`, \`maximum-scale=1\`): людям со слабым зрением нужно увеличивать текст.`,
      `## robots и canonical`,
      code("html", `<!-- Не показывать страницу в поиске (например, личный кабинет) -->
<meta name="robots" content="noindex, nofollow">

<!-- У страницы несколько адресов — главный вот этот -->
<link rel="canonical" href="https://example.com/courses/html">`),
      `\`robots\` управляет индексацией конкретной страницы. \`canonical\` указывает главный адрес, если одна страница доступна по нескольким (с метками рекламы, с \`/\` на конце и без).`,
      `## Цвет интерфейса браузера`,
      code("html", `<meta name="theme-color" content="#08090b">`),
      `Мобильные браузеры перекрасят адресную строку в цвет сайта.`,
      `## Практика`,
      `Откройте исходный код этой страницы (Ctrl+U) и найдите \`title\`, \`description\` и \`viewport\`. Затем напишите \`head\` для страницы вашей визитки.`,
      mdn("Element/meta", "Элемент meta")
    ],
    quizzes: [
      single("meta-viewport", "Мобильная вёрстка", "Что произойдёт на телефоне без <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">?",
        [["zoomed", "Страница отрисуется шириной ~980 px и будет уменьшена"], ["nothing", "Ничего не изменится"], ["error", "Страница не откроется"], ["bigger", "Текст станет крупнее"]], "zoomed",
        "Без viewport мобильный браузер эмулирует широкий десктопный экран, и адаптивные стили не срабатывают."),
      single("meta-title", "Заголовок в выдаче", "Какой элемент поисковики обычно показывают как заголовок страницы в результатах поиска?",
        [["title", "<title>"], ["h1", "Первый <h1>"], ["description", "<meta name=\"description\">"], ["og", "og:title"]], "title",
        "Заголовок в выдаче берётся из title. Поэтому он должен быть уникальным и понятным."),
      single("meta-zoom", "Масштабирование", "Почему не стоит запрещать масштабирование через user-scalable=no?",
        [["a11y", "Людям со слабым зрением нужно увеличивать страницу"], ["seo", "Поисковики понизят сайт"], ["speed", "Страница будет медленнее"], ["css", "Перестанет работать CSS"]], "a11y",
        "Запрет масштабирования мешает людям, которым нужно крупнее. Это нарушение требований доступности.")
    ]
  });

  lesson({
    slug: "social-and-icons", title: "Превью в соцсетях и иконки", minutes: 10,
    summary: "Open Graph, favicon, apple-touch-icon и web manifest: как сайт выглядит в мессенджерах, вкладках и на главном экране.",
    skill: ["html-social-icons", "Превью и иконки сайта", "Настраивать превью ссылок в мессенджерах и иконки сайта для вкладок и устройств."],
    body: [
      `## Красивое превью ссылки`,
      `Когда ссылку отправляют в Telegram, ВКонтакте или WhatsApp, мессенджер показывает карточку с заголовком, описанием и картинкой. Данные берутся из мета-тегов **Open Graph**:`,
      code("html", `<meta property="og:type" content="website">
<meta property="og:title" content="HTML с нуля — бесплатный курс">
<meta property="og:description" content="11 уроков с живыми примерами и заданиями.">
<meta property="og:image" content="https://example.com/og/html-course.png">
<meta property="og:url" content="https://example.com/courses/html">
<meta property="og:locale" content="ru_RU">`),
      `- Обратите внимание: у Open Graph атрибут \`property\`, а не \`name\`.
- \`og:image\` — **абсолютный** адрес картинки. Рекомендуемый размер 1200×630 px.
- Для X (Twitter) добавьте \`<meta name="twitter:card" content="summary_large_image">\`.`,
      `## Иконка сайта (favicon)`,
      code("html", `<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`),
      `- \`favicon.ico\` — для старых браузеров и вкладок.
- SVG-иконка — чёткая на любом экране, можно даже менять её под тёмную тему.
- \`apple-touch-icon\` — PNG 180×180 для главного экрана iPhone.`,
      `## Web App Manifest`,
      code("html", `<link rel="manifest" href="/manifest.webmanifest">`),
      code("json", `{
  "name": "Nexus — IT-курсы",
  "short_name": "Nexus",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#08090b",
  "theme_color": "#08090b"
}`),
      `Манифест описывает сайт как приложение: название и иконки для установки на главный экран Android и компьютера.`,
      `## Как проверить превью`,
      `После публикации отправьте ссылку себе в мессенджер. Мессенджеры кэшируют превью, поэтому после изменения тегов картинка может обновиться не сразу.`,
      `## Практика`,
      `Напишите для своей визитки набор Open Graph-тегов и тег иконки. Картинку превью можно сделать в любом графическом редакторе размером 1200×630.`,
      mdn("Element/link", "Элемент link")
    ],
    quizzes: [
      single("social-og-attr", "Атрибут Open Graph", "Какой атрибут используют мета-теги Open Graph для имени свойства?",
        [["property", "property"], ["name", "name"], ["rel", "rel"], ["content", "content"]], "property",
        "Open Graph использует property=\"og:…\", а значение — в content."),
      single("social-og-image", "Картинка превью", "Каким должен быть адрес в og:image?",
        [["absolute", "Абсолютным: https://example.com/og.png"], ["relative", "Относительным: og.png"], ["data", "Только data:URL"], ["none", "Любым, мессенджер разберётся"]], "absolute",
        "Мессенджер загружает картинку отдельно от страницы, поэтому нужен полный адрес."),
      short("social-icon", "Иконка вкладки", "Какое значение rel у <link> подключает иконку сайта для вкладки браузера?",
        ["icon"], "Иконка подключается через link rel=\"icon\".")
    ]
  });

  lesson({
    slug: "linking-resources", title: "Подключение стилей, скриптов и шрифтов", minutes: 12,
    summary: "link rel=stylesheet, preload, preconnect, script defer и async: порядок загрузки, от которого зависит скорость сайта.",
    skill: ["html-resources", "Подключение ресурсов", "Подключать CSS, JavaScript и шрифты так, чтобы страница показывалась быстро."],
    body: [
      `## Стили — в head`,
      code("html", `<link rel="stylesheet" href="/styles.css">`),
      `CSS подключают в \`head\`: браузер не покажет страницу, пока не загрузит стили, — иначе она мигнёт без оформления. Поэтому файлов стилей должно быть немного, и они должны быть лёгкими.`,
      `## Скрипты: где и как`,
      code("html", `<head>
  <script src="/app.js" defer></script>
  <script src="/analytics.js" async></script>
  <script type="module" src="/main.js"></script>
</head>`),
      `Обычный \`<script>\` без атрибутов **останавливает** разбор HTML, пока скрипт не загрузится и не выполнится. Раньше их ставили в конец \`body\`. Сейчас лучше:
- \`defer\` — загружается параллельно, выполняется после разбора HTML, строго по порядку. Для основного кода сайта.
- \`async\` — загружается параллельно, выполняется сразу по готовности, порядок не гарантирован. Для независимых скриптов: аналитика, виджеты.
- \`type="module"\` — ES-модули, по умолчанию отложены, как \`defer\`.`,
      `## Подсказки браузеру`,
      code("html", `<!-- Заранее установить соединение с сервером шрифтов -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Срочно загрузить ресурс, который понадобится сразу -->
<link rel="preload" href="/fonts/onest.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero.webp" as="image">

<!-- Загрузить в фоне то, что понадобится на следующей странице -->
<link rel="prefetch" href="/courses/html/lesson-2">`),
      `- \`preconnect\` — сэкономить время на установке соединения со сторонним сервером.
- \`preload\` — загрузить важный ресурс раньше, чем браузер найдёт его сам: шрифт, главную картинку. \`as\` обязателен.
- \`prefetch\` — низкоприоритетно подгрузить ресурс для следующего перехода.

Не злоупотребляйте: если всё «срочно», ничего не срочно.`,
      `## Приоритеты и блокировка`,
      code("html", `<!-- Главная картинка — грузить в первую очередь -->
<img src="/hero.webp" fetchpriority="high" alt="…" width="1200" height="600">
<!-- Картинка в карусели, которую не видно сразу -->
<img src="/slide-5.webp" fetchpriority="low" loading="lazy" alt="…" width="800" height="400">

<!-- Адаптивная предзагрузка: те же srcset и sizes, что у img -->
<link rel="preload" as="image" href="/hero-800.webp"
      imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1600.webp 1600w"
      imagesizes="100vw">

<!-- Не показывать страницу, пока не загрузится критичный стиль -->
<link rel="stylesheet" href="/critical.css" blocking="render">`),
      `- \`fetchpriority\` (\`high\`, \`low\`, \`auto\`) у \`img\`, \`link\`, \`script\` подсказывает браузеру относительную важность ресурса.
- \`imagesrcset\` и \`imagesizes\` у \`link rel="preload"\` — предзагрузка адаптивной картинки: браузер выберет тот же файл, что и \`img\` с таким же \`srcset\`.
- \`blocking="render"\` у \`link\`, \`script\` и \`style\` явно задерживает первую отрисовку до загрузки ресурса. Используйте очень осторожно: это замедляет показ страницы.`,
      `## Шрифты`,
      `Подключайте шрифты в формате WOFF2 и только нужные начертания. Каждый лишний файл шрифта — это задержка показа текста.`,
      `## Как увидеть порядок загрузки`,
      `Откройте DevTools → вкладка **Network** и перезагрузите страницу. Вы увидите каждый файл, его размер и время загрузки. Вкладка **Lighthouse** оценит скорость и подскажет, что мешает.`,
      `## Практика`,
      `Откройте вкладку Network на этой странице и найдите, в каком порядке загрузились CSS, скрипты и шрифт. Затем напишите \`head\` для визитки с подключением стилей и скрипта через \`defer\`.`,
      mdn("Attributes/rel/preload", "rel=preload")
    ],
    quizzes: [
      single("resources-async", "Счётчик аналитики", "Как подключить независимый скрипт аналитики, чтобы он не тормозил показ страницы и не зависел от порядка?",
        [["async", "<script async src=\"…\">"], ["plain", "<script src=\"…\"> в head без атрибутов"], ["preload", "<link rel=\"preload\">"], ["inline", "Вставить код прямо в head"]], "async",
        "async загружает скрипт параллельно и выполняет по готовности — для независимых скриптов это лучший вариант."),
      single("resources-css", "Место стилей", "Где подключают основной CSS-файл?",
        [["head", "В <head> через <link rel=\"stylesheet\">"], ["end", "В конце <body>"], ["script", "Через <script>"], ["img", "Через <img>"]], "head",
        "Стили подключают в head, чтобы страница сразу отрисовалась оформленной."),
      single("resources-preload", "Срочный шрифт", "Как попросить браузер загрузить главный шрифт как можно раньше?",
        [["preload", "<link rel=\"preload\" as=\"font\" …>"], ["prefetch", "<link rel=\"prefetch\">"], ["defer", "Атрибут defer"], ["lazy", "loading=\"lazy\""]], "preload",
        "preload с as=\"font\" повышает приоритет загрузки шрифта.")
    ]
  });
}
