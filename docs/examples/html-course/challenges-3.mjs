// Challenges, part 3: structure, head, accessibility, JavaScript bridge, projects and reference.
const el = (selector, label, extra = {}) => ({ label, selector, ...extra });
const src = (contains, label, extra = {}) => ({ label, contains, ...extra });
const task = (title, text, { start, checks, solution, hint, at }) => ({
  ...(at ? { at } : {}), title, task: text, start, checks, solution, ...(hint ? { hint } : {})
});

export default {
  /* ---------- 7. Структура ---------- */
  semantics: [
    task("Из div-супа — в смысл", "Замените безликие `div` на семантические: шапку — на `header`, меню — на `nav`, основное содержимое — на `main`, подвал — на `footer`.", {
      start: "<div class=\"header\">\n  <div class=\"nav\"><a href=\"/\">Главная</a> <a href=\"/blog\">Блог</a></div>\n</div>\n<div class=\"main\">\n  <h1>Блог о путешествиях</h1>\n</div>\n<div class=\"footer\">© 2026</div>",
      checks: [
        el("header nav", "Меню `nav` внутри `header`"),
        el("main h1", "Заголовок в `main`"),
        el("footer", "Подвал в `footer`"),
        el("div", "Безликих `div` не осталось", { absent: true })
      ],
      solution: "<header>\n  <nav><a href=\"/\">Главная</a> <a href=\"/blog\">Блог</a></nav>\n</header>\n<main>\n  <h1>Блог о путешествиях</h1>\n</main>\n<footer>© 2026</footer>"
    })
  ],
  "page-sections": [
    task("Статья с врезкой", "Оформите пост в блоге: всё в `article`, внутри два раздела `section` с заголовками `h2`, а заметка «Кстати» — в `aside`.", {
      start: "<h1>Неделя в Стамбуле</h1>\n<h2>Где жить</h2>\n<p>Район Кадыкёй.</p>\n<h2>Что есть</h2>\n<p>Симит и чай.</p>\n<p>Кстати: музейная карта окупается за два дня.</p>",
      checks: [
        el("article h1", "Пост в `article`"),
        el("article section h2", "Два раздела `section` с `h2`", { count: 2 }),
        el("aside", "Заметка «Кстати» в `aside`", { text: "Кстати" })
      ],
      solution: "<article>\n  <h1>Неделя в Стамбуле</h1>\n  <section>\n    <h2>Где жить</h2>\n    <p>Район Кадыкёй.</p>\n  </section>\n  <section>\n    <h2>Что есть</h2>\n    <p>Симит и чай.</p>\n  </section>\n  <aside><p>Кстати: музейная карта окупается за два дня.</p></aside>\n</article>"
    })
  ],
  "details-summary": [
    task("FAQ-аккордеон", "Сделайте три вопроса FAQ через `details` и `summary`. Все три с одинаковым `name=\"faq\"`, чтобы открывался только один, а первый открыт сразу (`open`). Нажмите на вопросы в результате.", {
      start: "<h2>Частые вопросы</h2>\n",
      checks: [
        el("details summary", "Три вопроса с `summary`", { count: 3 }),
        el("details[name=\"faq\"]", "Все в одной группе `name=\"faq\"`", { count: 3 }),
        el("details[open]", "Первый открыт по умолчанию")
      ],
      solution: "<h2>Частые вопросы</h2>\n<details name=\"faq\" open>\n  <summary>Сколько длится курс?</summary>\n  <p>Около 15 часов.</p>\n</details>\n<details name=\"faq\">\n  <summary>Нужен ли опыт?</summary>\n  <p>Нет, начинаем с нуля.</p>\n</details>\n<details name=\"faq\">\n  <summary>Это бесплатно?</summary>\n  <p>Да.</p>\n</details>"
    })
  ],
  "dialog-and-popover": [
    task("Всплывающая подсказка без скриптов", "Сделайте кнопку, которая открывает `popover`: у кнопки `popovertarget=\"tip\"`, у блока — `id=\"tip\"` и атрибут `popover`.", {
      start: "<button>Что такое HTML?</button>\n<div>HTML — язык разметки страниц.</div>",
      checks: [
        el("button[popovertarget=\"tip\"]", "Кнопка с `popovertarget=\"tip\"`"),
        el("#tip[popover]", "Блок с `id=\"tip\"` и `popover`")
      ],
      solution: "<button popovertarget=\"tip\">Что такое HTML?</button>\n<div id=\"tip\" popover>HTML — язык разметки страниц.</div>"
    })
  ],

  /* ---------- 8. head ---------- */
  metadata: [
    task("Head для поисковиков и телефонов", "Заполните `head`: кодировка, `viewport` для телефонов, понятный `title` и описание `meta name=\"description\"`.", {
      start: "<!doctype html>\n<html lang=\"ru\">\n<head>\n</head>\n<body><h1>Кофейня «Зерно»</h1></body>\n</html>",
      checks: [
        el("meta[charset]", "Кодировка"),
        el("meta[name=\"viewport\"][content*=\"width=device-width\"]", "`viewport` с `width=device-width`"),
        el("head title", "Есть `title`", { text: "Зерно" }),
        el("meta[name=\"description\"][content]", "Есть описание `description`")
      ],
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Кофейня «Зерно» — свежая обжарка в центре Казани</title>\n  <meta name=\"description\" content=\"Кофе своей обжарки, завтраки весь день и розетки у каждого стола.\">\n</head>\n<body><h1>Кофейня «Зерно»</h1></body>\n</html>"
    })
  ],
  "social-and-icons": [
    task("Красивое превью ссылки", "Добавьте Open Graph: `og:title`, `og:description`, `og:image`, а ещё иконку сайта `link rel=\"icon\"`.", {
      start: "<head>\n  <title>Курс HTML</title>\n</head>",
      checks: [
        el("meta[property=\"og:title\"][content]", "`og:title`"),
        el("meta[property=\"og:description\"][content]", "`og:description`"),
        el("meta[property=\"og:image\"][content]", "`og:image`"),
        el("link[rel=\"icon\"][href]", "Иконка `link rel=\"icon\"`")
      ],
      solution: "<head>\n  <title>Курс HTML</title>\n  <meta property=\"og:title\" content=\"HTML с нуля\">\n  <meta property=\"og:description\" content=\"70 уроков с практикой в браузере\">\n  <meta property=\"og:image\" content=\"https://example.com/cover.png\">\n  <link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n</head>"
    })
  ],
  "linking-resources": [
    task("Стили, скрипт и шрифт", "Подключите в `head` стили `style.css`, скрипт `app.js` с `defer` и предварительное соединение `preconnect` с `https://fonts.gstatic.com`.", {
      start: "<head>\n  <title>Сайт</title>\n</head>",
      checks: [
        el("link[rel=\"stylesheet\"][href=\"style.css\"]", "Стили `style.css`"),
        el("script[src=\"app.js\"][defer]", "Скрипт `app.js` с `defer`"),
        el("link[rel=\"preconnect\"][href=\"https://fonts.gstatic.com\"]", "`preconnect` к шрифтам")
      ],
      solution: "<head>\n  <title>Сайт</title>\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link rel=\"stylesheet\" href=\"style.css\">\n  <script src=\"app.js\" defer></script>\n</head>"
    })
  ],
  "style-base-meta": [
    task("Встроенный стиль", "Сделайте заголовок красным тремя строчками CSS: добавьте в `head` элемент `style` с правилом для `h1`, а в `head` — `base` с адресом `https://example.com/`.", {
      start: "<head>\n</head>\n<h1>Распродажа</h1>",
      checks: [
        el("head style", "Есть `style` в `head`"),
        src("h1", "В стилях есть правило для `h1`"),
        src("color", "Правило задаёт цвет"),
        el("base[href=\"https://example.com/\"]", "`base` с адресом сайта")
      ],
      solution: "<head>\n  <base href=\"https://example.com/\">\n  <style>\n    h1 { color: crimson; }\n  </style>\n</head>\n<h1>Распродажа</h1>"
    })
  ],
  security: [
    task("Безопасный внешний скрипт", "Подключите скрипт с CDN безопасно: укажите `integrity` с хешем и `crossorigin=\"anonymous\"`, а ссылку в новой вкладке защитите `rel=\"noopener noreferrer\"`.", {
      start: "<script src=\"https://cdn.example.com/lib.js\"></script>\n<a href=\"https://partner.example\" target=\"_blank\">Партнёр</a>",
      checks: [
        el("script[integrity^=\"sha\"]", "Есть `integrity` с хешем"),
        el("script[crossorigin=\"anonymous\"]", "`crossorigin=\"anonymous\"`"),
        el("a[rel~=\"noopener\"][rel~=\"noreferrer\"]", "Ссылка с `noopener noreferrer`")
      ],
      solution: "<script src=\"https://cdn.example.com/lib.js\" integrity=\"sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC\" crossorigin=\"anonymous\"></script>\n<a href=\"https://partner.example\" target=\"_blank\" rel=\"noopener noreferrer\">Партнёр</a>"
    })
  ],
  "structured-data": [
    task("Микроданные для события", "Разметьте событие микроданными: у блока `itemscope` и `itemtype=\"https://schema.org/Event\"`, у названия `itemprop=\"name\"`, у даты — `time` с `itemprop=\"startDate\"`.", {
      start: "<div>\n  <h2>Митап по HTML</h2>\n  <p>15 декабря в 19:00</p>\n</div>",
      checks: [
        el("[itemscope][itemtype=\"https://schema.org/Event\"]", "Блок — `Event` с `itemscope`"),
        el("[itemprop=\"name\"]", "Название с `itemprop=\"name\"`"),
        el("time[itemprop=\"startDate\"][datetime]", "Дата в `time` с `itemprop=\"startDate\"`")
      ],
      solution: "<div itemscope itemtype=\"https://schema.org/Event\">\n  <h2 itemprop=\"name\">Митап по HTML</h2>\n  <p><time itemprop=\"startDate\" datetime=\"2026-12-15T19:00\">15 декабря в 19:00</time></p>\n</div>"
    })
  ],

  /* ---------- 9. Доступность ---------- */
  "accessibility-basics": [
    task("Починить доступность", "Исправьте четыре проблемы: у страницы нет языка, у картинки нет `alt`, поле без подписи, а «кнопка» сделана из `div`.", {
      start: "<html>\n<body>\n  <img src=\"chart.png\">\n  <input id=\"q\" placeholder=\"Поиск\">\n  <div onclick=\"search()\">Найти</div>\n</body>\n</html>",
      checks: [
        el("html[lang]", "У `html` есть `lang`"),
        el("img[alt]", "У картинки есть `alt`"),
        el("label[for=\"q\"]", "У поля есть `label for=\"q\"`"),
        el("button", "«Найти» — настоящая кнопка `button`", { text: "Найти" }),
        el("div[onclick]", "Кликабельного `div` больше нет", { absent: true })
      ],
      solution: "<html lang=\"ru\">\n<body>\n  <img src=\"chart.png\" alt=\"Продажи выросли на 20% за квартал\">\n  <label for=\"q\">Поиск</label>\n  <input id=\"q\">\n  <button type=\"button\">Найти</button>\n</body>\n</html>"
    })
  ],
  "keyboard-and-focus": [
    task("Ссылка «Перейти к содержимому»", "Добавьте первой на странице ссылку `href=\"#main\"` с текстом «Перейти к содержимому», а основному блоку `main` — `id=\"main\"`. Уберите положительный `tabindex`, ломающий порядок.", {
      start: "<nav><a href=\"/\">Главная</a> <a href=\"/blog\" tabindex=\"5\">Блог</a></nav>\n<main>\n  <h1>Статья</h1>\n</main>",
      checks: [
        el("body > a[href=\"#main\"]:first-child", "Первая ссылка ведёт на `#main`"),
        el("main#main", "У `main` есть `id=\"main\"`"),
        el("[tabindex=\"5\"]", "Нет положительного `tabindex`", { absent: true })
      ],
      solution: "<a href=\"#main\">Перейти к содержимому</a>\n<nav><a href=\"/\">Главная</a> <a href=\"/blog\">Блог</a></nav>\n<main id=\"main\">\n  <h1>Статья</h1>\n</main>"
    })
  ],
  aria: [
    task("Кнопка-иконка и ошибка поля", "У кнопки только иконка ✕ — дайте ей имя `aria-label=\"Закрыть\"`. Свяжите поле с текстом ошибки через `aria-describedby` и отметьте его `aria-invalid=\"true\"`.", {
      start: "<button>✕</button>\n<label for=\"mail\">Email</label>\n<input id=\"mail\" type=\"email\">\n<p id=\"mail-error\">Укажите почту с @</p>",
      checks: [
        el("button[aria-label=\"Закрыть\"]", "У кнопки есть имя «Закрыть»"),
        el("input[aria-describedby=\"mail-error\"]", "Поле ссылается на ошибку"),
        el("input[aria-invalid=\"true\"]", "Поле помечено как ошибочное")
      ],
      solution: "<button aria-label=\"Закрыть\">✕</button>\n<label for=\"mail\">Email</label>\n<input id=\"mail\" type=\"email\" aria-describedby=\"mail-error\" aria-invalid=\"true\">\n<p id=\"mail-error\">Укажите почту с @</p>"
    })
  ],

  /* ---------- JavaScript и интерактивность ---------- */
  "html-and-javascript": [
    task("Разметка для скрипта", "Подготовьте разметку, с которой скрипту будет удобно работать: кнопке — `id=\"like\"` и `type=\"button\"`, счётчику — `data-count=\"0\"`, а обработчик клика подключите атрибутом `onclick`.", {
      start: "<button>♥ Нравится</button>\n<span>0</span>",
      checks: [
        el("button#like[type=\"button\"]", "Кнопка `id=\"like\"` с `type=\"button\"`"),
        el("span[data-count=\"0\"]", "Счётчик с `data-count=\"0\"`"),
        el("button[onclick]", "Обработчик в `onclick`")
      ],
      hint: "В песочнице скрипты выключены — здесь проверяется только разметка.",
      solution: "<button id=\"like\" type=\"button\" onclick=\"like()\">♥ Нравится</button>\n<span data-count=\"0\">0</span>"
    })
  ],
  "editing-and-drag-and-drop": [
    task("Заметка, которую можно править", "Сделайте абзац редактируемым (`contenteditable`), карточку — перетаскиваемой (`draggable=\"true\"`), а скрытую подсказку — находимой поиском (`hidden=\"until-found\"`).", {
      start: "<p>Кликните и напишите заметку</p>\n<div>Перетащи меня</div>\n<div>Ответ: 42</div>",
      checks: [
        el("p[contenteditable]", "Абзац редактируемый"),
        el("[draggable=\"true\"]", "Карточка перетаскиваемая"),
        el("[hidden=\"until-found\"]", "Подсказка скрыта до поиска")
      ],
      solution: "<p contenteditable>Кликните и напишите заметку</p>\n<div draggable=\"true\">Перетащи меня</div>\n<div hidden=\"until-found\">Ответ: 42</div>"
    })
  ],
  "custom-elements": [
    task("Свой тег со слотом", "Создайте свой элемент `user-card` (в имени обязательно дефис) с декларативным Shadow DOM: внутри `template shadowrootmode=\"open\"` со `slot name=\"name\"`, а снаружи — `span slot=\"name\"` с именем.", {
      start: "<usercard>Анна</usercard>",
      checks: [
        el("user-card", "Есть элемент `user-card`"),
        src("shadowrootmode=\"open\"", "Есть `template shadowrootmode=\"open\"`"),
        src("<slot name=\"name\"", "В шаблоне есть `slot name=\"name\"`"),
        el("user-card span[slot=\"name\"]", "Имя передано в слот")
      ],
      solution: "<user-card>\n  <template shadowrootmode=\"open\">\n    <p>Пользователь: <slot name=\"name\"></slot></p>\n  </template>\n  <span slot=\"name\">Анна</span>\n</user-card>"
    })
  ],

  /* ---------- Проекты и качество ---------- */
  "project-business-card": [
    task("Визитка", "Соберите визитку: `header` с фото (с `alt`) и именем в `h1`, `main` с разделом «Обо мне» и списком навыков (не меньше трёх), `footer` со ссылкой на почту.", {
      start: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Визитка</title>\n</head>\n<body>\n\n</body>\n</html>",
      checks: [
        el("header img[alt]", "Фото с `alt` в шапке"),
        el("header h1", "Имя в `h1`"),
        el("main h2", "Раздел «Обо мне»", { text: "Обо мне" }),
        el("main ul li", "Минимум три навыка", { count: 3 }),
        el("footer a[href^=\"mailto:\"]", "Почта в подвале")
      ],
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Визитка</title>\n</head>\n<body>\n  <header>\n    <img src=\"https://picsum.photos/id/64/160/160\" alt=\"Анна улыбается\" width=\"160\" height=\"160\">\n    <h1>Анна Смирнова</h1>\n  </header>\n  <main>\n    <h2>Обо мне</h2>\n    <p>Учусь делать сайты.</p>\n    <ul>\n      <li>HTML</li>\n      <li>Фотография</li>\n      <li>Английский</li>\n    </ul>\n  </main>\n  <footer><a href=\"mailto:anna@example.com\">anna@example.com</a></footer>\n</body>\n</html>"
    })
  ],
  "project-landing": [
    task("Первый экран лендинга", "Сделайте первый экран: `header` с `nav`, `main` с `h1`, абзацем-обещанием и кнопкой-ссылкой «Записаться» на `#signup`, и раздел `section id=\"signup\"` ниже.", {
      start: "<body>\n\n</body>",
      checks: [
        el("header nav a", "Меню в шапке"),
        el("main h1", "Главный заголовок в `main`"),
        el("main a[href=\"#signup\"]", "Кнопка «Записаться» ведёт на `#signup`", { text: "Записаться" }),
        el("section#signup", "Раздел `#signup`")
      ],
      solution: "<body>\n  <header><nav><a href=\"#program\">Программа</a> <a href=\"#signup\">Запись</a></nav></header>\n  <main>\n    <h1>HTML за 30 дней</h1>\n    <p>Соберёте свой сайт с нуля, даже если никогда не писали код.</p>\n    <a href=\"#signup\">Записаться</a>\n    <section id=\"signup\"><h2>Запись</h2></section>\n  </main>\n</body>"
    })
  ],
  "project-article": [
    task("Статья для блога", "Сверстайте статью: `article` с `header` (заголовок `h1` и дата в `time`), минимум два раздела с `h2`, цитатой `blockquote` и картинкой в `figure`.", {
      start: "<main>\n\n</main>",
      checks: [
        el("article header h1", "Заголовок статьи в `header`"),
        el("article header time[datetime]", "Дата в `time`"),
        el("article h2", "Минимум два раздела", { count: 2 }),
        el("article blockquote", "Есть цитата"),
        el("article figure img[alt]", "Картинка в `figure`")
      ],
      solution: "<main>\n  <article>\n    <header>\n      <h1>Почему я начал учить HTML</h1>\n      <time datetime=\"2026-11-01\">1 ноября 2026</time>\n    </header>\n    <h2>С чего всё началось</h2>\n    <p>Захотелось свой сайт.</p>\n    <blockquote><p>Лучший способ научиться — сделать.</p></blockquote>\n    <h2>Что получилось</h2>\n    <figure><img src=\"https://picsum.photos/600/300\" alt=\"Мой первый сайт на экране ноутбука\"><figcaption>Первая версия</figcaption></figure>\n  </article>\n</main>"
    })
  ],
  "code-quality": [
    task("Найдите все ошибки", "Валидатор нашёл бы здесь четыре ошибки: два одинаковых `id`, картинку без `alt`, незакрытый `li` внутри `p` и `h1` после `h3`. Исправьте их.", {
      start: "<h3 id=\"top\">Магазин</h3>\n<h1 id=\"top\">Каталог</h1>\n<img src=\"bag.jpg\">\n<p>Список: <ul><li>Сумки</ul></p>",
      checks: [
        el("[id=\"top\"]", "`id=\"top\"` не повторяется", { count: 1, max: 1 }),
        el("img[alt]", "У картинки есть `alt`"),
        el("p ul", "Список не стоит внутри абзаца", { absent: true }),
        src("<h3", "Заголовки идут по порядку: нет `h3` перед `h1`", { absent: true })
      ],
      solution: "<h1 id=\"top\">Магазин</h1>\n<h2>Каталог</h2>\n<img src=\"bag.jpg\" alt=\"Кожаная сумка\">\n<p>Список:</p>\n<ul><li>Сумки</li></ul>"
    })
  ],
  "obsolete-elements": [
    task("Модернизация старого кода", "Перепишите код 2005 года: `center` и `font` устарели. Замените `center` на `div`, а `font` уберите, оставив текст в `strong`.", {
      start: "<center><font color=\"red\"><b>Скидки!</b></font></center>",
      checks: [
        el("center", "Нет `center`", { absent: true }),
        el("font", "Нет `font`", { absent: true }),
        el("strong", "Текст важный — в `strong`", { text: "Скидки" })
      ],
      solution: "<div><strong>Скидки!</strong></div>"
    })
  ],
  "whats-new": [
    task("Кнопка, которая открывает диалог сама", "Без JavaScript: дайте кнопке `command=\"show-modal\"` и `commandfor=\"hello\"`, а диалогу — `id=\"hello\"` и `closedby=\"any\"`, чтобы он закрывался кликом мимо.", {
      start: "<button>Открыть</button>\n<dialog>\n  <p>Привет из нового HTML!</p>\n</dialog>",
      checks: [
        el("button[command=\"show-modal\"][commandfor=\"hello\"]", "Кнопка с `command` и `commandfor`"),
        el("dialog#hello", "Диалог с `id=\"hello\"`"),
        el("dialog[closedby=\"any\"]", "`closedby=\"any\"`")
      ],
      solution: "<button command=\"show-modal\" commandfor=\"hello\">Открыть</button>\n<dialog id=\"hello\" closedby=\"any\">\n  <p>Привет из нового HTML!</p>\n</dialog>"
    })
  ],
  "element-reference": [
    task("Экзамен на 10 элементов", "Соберите страницу, где встречаются 10 разных элементов из справочника: `header`, `nav`, `main`, `h1`, `p`, `a`, `ul`, `li`, `img` и `footer`.", {
      start: "",
      checks: [
        el("header nav", "`header` и `nav`"),
        el("main h1", "`main` и `h1`"),
        el("p a[href]", "`p` со ссылкой `a`"),
        el("ul li", "`ul` и `li`"),
        el("img[alt]", "`img` с `alt`"),
        el("footer", "`footer`")
      ],
      solution: "<header><nav><a href=\"/\">Главная</a></nav></header>\n<main>\n  <h1>Справочник</h1>\n  <p>Вся карта — на <a href=\"#map\">одной странице</a>.</p>\n  <ul><li>Элементы</li><li>Атрибуты</li></ul>\n  <img src=\"map.png\" alt=\"Карта элементов HTML\">\n</main>\n<footer>© 2026</footer>"
    })
  ],
  "final-project": [
    task("Главная портфолио", "Соберите главную страницу портфолио: полный документ с `lang`, `viewport` и `description`, ссылка «Перейти к содержимому», шапка с меню, где текущая страница отмечена `aria-current=\"page\"`, `main` с `h1` и минимум двумя работами в `article`, подвал.", {
      start: "<!doctype html>\n",
      checks: [
        el("html[lang]", "`lang` у `html`"),
        el("meta[name=\"viewport\"]", "`viewport`"),
        el("meta[name=\"description\"]", "`description`"),
        el("a[href=\"#main\"]", "Ссылка «Перейти к содержимому»"),
        el("nav a[aria-current=\"page\"]", "Текущая страница отмечена `aria-current`"),
        el("main#main article h2", "Минимум две работы в `article`", { count: 2 }),
        el("footer", "Подвал")
      ],
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"description\" content=\"Портфолио Анны: сайты и лендинги\">\n  <title>Анна — портфолио</title>\n</head>\n<body>\n  <a href=\"#main\">Перейти к содержимому</a>\n  <header><nav><a href=\"/\" aria-current=\"page\">Главная</a> <a href=\"/about.html\">Обо мне</a></nav></header>\n  <main id=\"main\">\n    <h1>Делаю простые и понятные сайты</h1>\n    <article><h2>Кофейня «Зерно»</h2><p>Лендинг с меню.</p></article>\n    <article><h2>Блог о путешествиях</h2><p>Статьи и галерея.</p></article>\n  </main>\n  <footer>© 2026 Анна</footer>\n</body>\n</html>"
    })
  ]
};
