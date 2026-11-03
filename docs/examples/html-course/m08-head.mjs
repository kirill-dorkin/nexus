export default function head(c) {
  const { lesson, single, short } = c;

  lesson({
    slug: "metadata", title: "Метаданные страницы", minutes: 11,
    summary: "title, description, viewport, charset и robots: что страница рассказывает о себе браузеру и поисковикам.",
    skill: ["html-meta", "Метаданные страницы", "Заполнять head: кодировка, viewport, title, description, robots и canonical."],
    body: [], // текст урока — stories/*.mjs
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
    body: [], // текст урока — stories/*.mjs
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
    body: [], // текст урока — stories/*.mjs
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
