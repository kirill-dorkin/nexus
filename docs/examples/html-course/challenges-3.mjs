// Challenges, part 3: structure, head, accessibility, JavaScript bridge, projects and reference.
const el = (selector, label, extra = {}) => ({ label, selector, ...extra });
const src = (contains, label, extra = {}) => ({ label, contains, ...extra });
const task = (title, text, { start, checks, solution, hint, at }) => ({
  ...(at ? { at } : {}), title, task: text, start, checks, solution, ...(hint ? { hint } : {})
});

export default {
  /* ---------- 7. Структура ---------- */
  semantics: [
    task("Каркас сайта магазина", "Чтобы Лев мог прыгать по сайту, замени безликие `div` на семантические: шапку — на `header`, меню — на `nav`, основное содержимое — на `main`, подвал — на `footer`.", {
      start: "<div class=\"header\">\n  <div class=\"nav\"><a href=\"/\">Главная</a> <a href=\"/menu\">Меню</a></div>\n</div>\n<div class=\"main\">\n  <h1>Мой сайт</h1>\n</div>\n<div class=\"footer\">© 2026</div>",
      checks: [
        el("header nav", "Меню `nav` внутри `header`"),
        el("main h1", "Заголовок в `main`"),
        el("footer", "Подвал в `footer`"),
        el("div", "Безликих `div` не осталось", { absent: true })
      ],
      solution: "<header>\n  <nav><a href=\"/\">Главная</a> <a href=\"/menu\">Меню</a></nav>\n</header>\n<main>\n  <h1>Мой сайт</h1>\n</main>\n<footer>© 2026</footer>"
    })
  ],
  "page-sections": [
    task("Пост в блог магазина", "Оформи пост «Чайный гриб дома»: всё в `article`, внутри два раздела `section` с заголовками `h2`, а заметка «Кстати» — в `aside`.", {
      start: "<h1>Чайный гриб дома</h1>\n<h2>Что нужно</h2>\n<p>Банка, чай и сахар.</p>\n<h2>Как ухаживать</h2>\n<p>Менять раствор раз в неделю.</p>\n<p>Кстати: гриб живёт много лет.</p>",
      checks: [
        el("article h1", "Пост в `article`"),
        el("article section h2", "Два раздела `section` с `h2`", { count: 2 }),
        el("aside", "Заметка «Кстати» в `aside`", { text: "Кстати" })
      ],
      solution: "<article>\n  <h1>Чайный гриб дома</h1>\n  <section>\n    <h2>Что нужно</h2>\n    <p>Банка, чай и сахар.</p>\n  </section>\n  <section>\n    <h2>Как ухаживать</h2>\n    <p>Менять раствор раз в неделю.</p>\n  </section>\n  <aside><p>Кстати: гриб живёт много лет.</p></aside>\n</article>"
    })
  ],
  "details-summary": [
    task("FAQ магазина", "Посетители спрашивают одно и то же. Сделай три вопроса FAQ через `details` и `summary`. Все три с одинаковым `name=\"faq\"`, чтобы открывался только один, а первый открыт сразу (`open`). Нажми на вопросы в результате.", {
      start: "<h2>Частые вопросы</h2>\n",
      checks: [
        el("details summary", "Три вопроса с `summary`", { count: 3 }),
        el("details[name=\"faq\"]", "Все в одной группе `name=\"faq\"`", { count: 3 }),
        el("details[open]", "Первый открыт по умолчанию")
      ],
      solution: "<h2>Частые вопросы</h2>\n<details name=\"faq\" open>\n  <summary>Можно с собакой?</summary>\n  <p>Да, и миска с водой есть.</p>\n</details>\n<details name=\"faq\">\n  <summary>Есть Wi-Fi?</summary>\n  <p>Да, пароль на чеке.</p>\n</details>\n<details name=\"faq\">\n  <summary>Есть розетки?</summary>\n  <p>У каждого стола.</p>\n</details>"
    })
  ],
  "dialog-and-popover": [
    task("Подсказка «Состав»", "Сделай кнопку «Что такое пенал?», которая открывает `popover`: у кнопки `popovertarget=\"tip\"`, у блока — `id=\"tip\"` и атрибут `popover`.", {
      start: "<button>Что такое пенал?</button>\n<div>Карандаш, сливки и ваниль.</div>",
      checks: [
        el("button[popovertarget=\"tip\"]", "Кнопка с `popovertarget=\"tip\"`"),
        el("#tip[popover]", "Блок с `id=\"tip\"` и `popover`")
      ],
      solution: "<button popovertarget=\"tip\">Что такое пенал?</button>\n<div id=\"tip\" popover>Карандаш, сливки и ваниль.</div>"
    })
  ],

  /* ---------- 8. head ---------- */
  metadata: [
    task("Витрина в поиске", "Вместо «Document» в Яндексе — заполни `head` магазина: кодировка, `viewport` для телефонов, понятный `title` и описание `meta name=\"description\"`.", {
      start: "<!doctype html>\n<html lang=\"ru\">\n<head>\n</head>\n<body><h1>Мой сайт</h1></body>\n</html>",
      checks: [
        el("meta[charset]", "Кодировка"),
        el("meta[name=\"viewport\"][content*=\"width=device-width\"]", "`viewport` с `width=device-width`"),
        el("head title", "Есть `title`", { text: "Мой сайт" }),
        el("meta[name=\"description\"][content]", "Есть описание `description`")
      ],
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Мой сайт — заметки о путешествиях</title>\n  <meta name=\"description\" content=\"Маршруты, советы и фото из поездок по России.\">\n</head>\n<body><h1>Мой сайт</h1></body>\n</html>"
    })
  ],
  "social-and-icons": [
    task("Превью в мессенджере", "Чтобы ссылка на «Север» приходила с картинкой, добавь Open Graph: `og:title`, `og:description`, `og:image`, а ещё иконку сайта `link rel=\"icon\"`.", {
      start: "<head>\n  <title>Мой сайт</title>\n</head>",
      checks: [
        el("meta[property=\"og:title\"][content]", "`og:title`"),
        el("meta[property=\"og:description\"][content]", "`og:description`"),
        el("meta[property=\"og:image\"][content]", "`og:image`"),
        el("link[rel=\"icon\"][href]", "Иконка `link rel=\"icon\"`")
      ],
      solution: "<head>\n  <title>Мой сайт</title>\n  <meta property=\"og:title\" content=\"Мой сайт\">\n  <meta property=\"og:description\" content=\"Лучший магазин канцтоваров в Казани\">\n  <meta property=\"og:image\" content=\"https://example.com/cover.png\">\n  <link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n</head>"
    })
  ],
  "linking-resources": [
    task("Фирменный стиль", "Дизайнер прислал файлы. Подключи в `head` стили `style.css`, скрипт `app.js` с `defer` и предварительное соединение `preconnect` с `https://fonts.gstatic.com`.", {
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
    task("Красная распродажа", "Нужно красный заголовок акции — сделай его тремя строчками CSS: добавь в `head` элемент `style` с правилом для `h1`, а в `head` — `base` с адресом `https://example.com/`.", {
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
    task("Защита от Вредного Скрипта", "Вредный Скрипт может подменить файл на CDN. Подключи скрипт безопасно: укажи `integrity` с хешем и `crossorigin=\"anonymous\"`, а ссылку в новой вкладке защити `rel=\"noopener noreferrer\"`.", {
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
    task("Мастер-класс в поиске", "Чтобы мастер-класс по каллиграфии появился в поиске, разметь событие микроданными: у блока `itemscope` и `itemtype=\"https://schema.org/Event\"`, у названия `itemprop=\"name\"`, у даты — `time` с `itemprop=\"startDate\"`.", {
      start: "<div>\n  <h2>Мастер-класс по каллиграфии</h2>\n  <p>15 декабря в 19:00</p>\n</div>",
      checks: [
        el("[itemscope][itemtype=\"https://schema.org/Event\"]", "Блок — `Event` с `itemscope`"),
        el("[itemprop=\"name\"]", "Название с `itemprop=\"name\"`"),
        el("time[itemprop=\"startDate\"][datetime]", "Дата в `time` с `itemprop=\"startDate\"`")
      ],
      solution: "<div itemscope itemtype=\"https://schema.org/Event\">\n  <h2 itemprop=\"name\">Мастер-класс по каллиграфии</h2>\n  <p><time itemprop=\"startDate\" datetime=\"2026-12-15T19:00\">15 декабря в 19:00</time></p>\n</div>"
    })
  ],

  /* ---------- 9. Доступность ---------- */
  "accessibility-basics": [
    task("Лев проверяет сайт", "Скринридер Льва споткнулся четыре раза. Исправь: у страницы нет языка, у картинки нет `alt`, поле без подписи, а «кнопка» сделана из `div`.", {
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
    task("Без мыши", "Лев ходит клавишей Tab. Добавь первой на странице ссылку `href=\"#main\"` с текстом «Перейти к содержимому», а основному блоку `main` — `id=\"main\"`. Убери положительный `tabindex`, ломающий порядок.", {
      start: "<nav><a href=\"/\">Главная</a> <a href=\"/blog\" tabindex=\"5\">Блог</a></nav>\n<main>\n  <h1>Статья</h1>\n</main>",
      checks: [
        el("body > a[href=\"#main\"]:first-child", "Первая ссылка ведёт на `#main`"),
        el("main#main", "У `main` есть `id=\"main\"`"),
        el("[tabindex=\"5\"]", "Нет положительного `tabindex`", { absent: true })
      ],
      solution: "<a href=\"#main\">Перейти к содержимому</a>\n<nav><a href=\"/\">Главная</a> <a href=\"/menu\">Меню</a></nav>\n<main id=\"main\">\n  <h1>Статья</h1>\n</main>"
    })
  ],
  aria: [
    task("Чтобы Лев понял", "В форме брони у кнопки только иконка ✕ — дай ей имя `aria-label=\"Закрыть\"`. Свяжи поле с текстом ошибки через `aria-describedby` и отметь его `aria-invalid=\"true\"`.", {
      start: "<button>✕</button>\n<label for=\"mail\">Email</label>\n<input id=\"mail\" type=\"email\">\n<p id=\"mail-error\">Укажи почту с @</p>",
      checks: [
        el("button[aria-label=\"Закрыть\"]", "У кнопки есть имя «Закрыть»"),
        el("input[aria-describedby=\"mail-error\"]", "Поле ссылается на ошибку"),
        el("input[aria-invalid=\"true\"]", "Поле помечено как ошибочное")
      ],
      solution: "<button aria-label=\"Закрыть\">✕</button>\n<label for=\"mail\">Email</label>\n<input id=\"mail\" type=\"email\" aria-describedby=\"mail-error\" aria-invalid=\"true\">\n<p id=\"mail-error\">Укажи почту с @</p>"
    })
  ],

  /* ---------- JavaScript и интерактивность ---------- */
  "html-and-javascript": [
    task("Лайки под товарами", "Нужно сердечко под товаром. Подготовь разметку, с которой скрипту будет удобно работать: кнопке — `id=\"like\"` и `type=\"button\"`, счётчику — `data-count=\"0\"`, а обработчик клика подключи атрибутом `onclick`.", {
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
    task("Доска заказов", "Для администратор: сделай заметку редактируемой (`contenteditable`), карточку — перетаскиваемой (`draggable=\"true\"`), а скрытую подсказку — находимой поиском (`hidden=\"until-found\"`).", {
      start: "<p>Кликни и напиши заметку</p>\n<div>Заказ №12: пенал</div>\n<div>Пароль Wi-Fi: site2026</div>",
      checks: [
        el("p[contenteditable]", "Абзац редактируемый"),
        el("[draggable=\"true\"]", "Карточка перетаскиваемая"),
        el("[hidden=\"until-found\"]", "Подсказка скрыта до поиска")
      ],
      solution: "<p contenteditable>Кликни и напиши заметку</p>\n<div draggable=\"true\">Заказ №12: пенал</div>\n<div hidden=\"until-found\">Пароль Wi-Fi: site2026</div>"
    })
  ],
  "custom-elements": [
    task("Свой тег для карточки", "Карточка повторяется 30 раз. Создай свой элемент `user-card` (в имени обязательно дефис) с декларативным Shadow DOM: внутри `template shadowrootmode=\"open\"` со `slot name=\"name\"`, а снаружи — `span slot=\"name\"` с именем.", {
      start: "<usercard>Пенал</usercard>",
      checks: [
        el("user-card", "Есть элемент `user-card`"),
        src("shadowrootmode=\"open\"", "Есть `template shadowrootmode=\"open\"`"),
        src("<slot name=\"name\"", "В шаблоне есть `slot name=\"name\"`"),
        el("user-card span[slot=\"name\"]", "Имя передано в слот")
      ],
      solution: "<user-card>\n  <template shadowrootmode=\"open\">\n    <p>Товар: <slot name=\"name\"></slot></p>\n  </template>\n  <span slot=\"name\">Пенал</span>\n</user-card>"
    })
  ],

  /* ---------- Проекты и качество ---------- */
  "code-quality": [
    task("Код-ревью от Ники", "Ника нашла четыре ошибки: два одинаковых `id`, картинку без `alt`, незакрытый `li` внутри `p` и `h1` после `h3`. Исправь их.", {
      start: "<h3 id=\"top\">Север</h3>\n<h1 id=\"top\">Меню</h1>\n<img src=\"raf.jpg\">\n<p>Товары: <ul><li>Пенал</ul></p>",
      checks: [
        el("[id=\"top\"]", "`id=\"top\"` не повторяется", { count: 1, max: 1 }),
        el("img[alt]", "У картинки есть `alt`"),
        el("p ul", "Список не стоит внутри абзаца", { absent: true }),
        src("<h3", "Заголовки идут по порядку: нет `h3` перед `h1`", { absent: true })
      ],
      solution: "<h1 id=\"top\">Север</h1>\n<h2>Меню</h2>\n<img src=\"raf.jpg\" alt=\"Пенал с корицей\">\n<p>Товары:</p>\n<ul><li>Пенал</li></ul>"
    })
  ],
  "obsolete-elements": [
    task("Старый сайт", "Перепиши кусок сайта, который кто-то сделал в 2005-м: `center` и `font` устарели. Замени `center` на `div`, а `font` убери, оставив текст в `strong`.", {
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
    task("Отменить бронь?", "Без JavaScript: дай кнопке `command=\"show-modal\"` и `commandfor=\"hello\"`, а диалогу — `id=\"hello\"` и `closedby=\"any\"`, чтобы он закрывался кликом мимо.", {
      start: "<button>Отменить бронь</button>\n<dialog>\n  <p>Точно отменить бронь?</p>\n</dialog>",
      checks: [
        el("button[command=\"show-modal\"][commandfor=\"hello\"]", "Кнопка с `command` и `commandfor`"),
        el("dialog#hello", "Диалог с `id=\"hello\"`"),
        el("dialog[closedby=\"any\"]", "`closedby=\"any\"`")
      ],
      solution: "<button command=\"show-modal\" commandfor=\"hello\">Отменить бронь</button>\n<dialog id=\"hello\" closedby=\"any\">\n  <p>Точно отменить бронь?</p>\n</dialog>"
    })
  ],
  "element-reference": [
    task("Проверка перед запуском", "Собери главную магазина, где встречаются 10 разных элементов из справочника: `header`, `nav`, `main`, `h1`, `p`, `a`, `ul`, `li`, `img` и `footer`.", {
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
  ]
};
