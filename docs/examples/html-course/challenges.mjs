// Hands-on challenges for every lesson, checked live in the learner's browser.
// Every task is a request from the story (Marta's coffee shop «Зерно»).
// Each one is validated by apps/web/src/components/learning/html-course-challenges.test.ts:
// the solution must pass every check and the starting code must not.
//
// task(title, text, { start, checks, solution, hint, at })
//   checks: el(selector, label, { text, attr, value, count, max, absent }) | src(fragment, label, { absent })

const el = (selector, label, extra = {}) => ({ label, selector, ...extra });
const src = (contains, label, extra = {}) => ({ label, contains, ...extra });
const task = (title, text, { start, checks, solution, hint, at }) => ({
  ...(at ? { at } : {}), title, task: text, start, checks, solution, ...(hint ? { hint } : {})
});

import more from "./challenges-2.mjs";

export default {
  ...more,

  /* ---------- 0. Старт ---------- */
  "how-the-web-works": [
    task("Первая строчка сайта Марты", "Это настоящая страница. Напишите в заголовке «Кофейня «Зерно»», а в абзаце — чем она хороша. Результат обновится сразу.", {
      at: "Как выглядит HTML",
      start: "<h1>Моя первая страница</h1>\n<p>Привет! Я учу HTML.</p>",
      checks: [
        el("h1", "Заголовок `h1` — название кофейни", { text: "Зерно" }),
        el("p", "Абзац `p` на месте"),
        el("p", "Абзац рассказывает о кофейне, а не про «учу HTML»", { text: "Я учу HTML", absent: true })
      ],
      hint: "Меняйте только текст между тегами: `<h1>Кофейня «Зерно»</h1>`.",
      solution: "<h1>Кофейня «Зерно»</h1>\n<p>Свежая обжарка каждый день и самый вкусный раф в городе.</p>"
    })
  ],
  tools: [
    task("Меню вручную", "Emmet превратил бы `ul>li*3` в список. Сделайте то же самое руками: меню `ul` из трёх напитков — капучино, латте и раф.", {
      start: "<!-- меню кофейни здесь -->",
      checks: [
        el("ul", "Есть список `ul`"),
        el("ul > li", "Внутри три пункта `li`", { count: 3 }),
        el("li", "Один из напитков — раф", { text: "раф" })
      ],
      hint: "Каждый пункт — пара `<li>…</li>` внутри `<ul>…</ul>`.",
      solution: "<ul>\n  <li>Капучино</li>\n  <li>Латте</li>\n  <li>Раф</li>\n</ul>"
    })
  ],
  "first-page": [
    task("index.html кофейни", "Соберите главную страницу целиком: doctype, `html` с языком `ru`, `head` с кодировкой и заголовком вкладки «Кофейня «Зерно»», а в `body` — заголовок `h1` с названием.", {
      start: "",
      checks: [
        src("<!doctype html>", "Первая строка — `<!doctype html>`"),
        el("html", "У `html` есть `lang=\"ru\"`", { attr: "lang", value: "ru" }),
        el("meta[charset]", "Указана кодировка `meta charset`"),
        el("title", "Заголовок вкладки про «Зерно»", { text: "Зерно" }),
        el("body h1", "В `body` есть `h1`")
      ],
      hint: "В VS Code это `!` + Tab. Здесь напишите по памяти или подсмотрите пример выше.",
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Кофейня «Зерно»</title>\n</head>\n<body>\n  <h1>Кофейня «Зерно»</h1>\n</body>\n</html>"
    })
  ],
  "how-to-learn": [
    task("Найдите опечатку Марты", "Марта сама поправила сайт — и всё поехало: абзац не закрыт, и браузер растянул его на всё подряд. Поставьте закрывающий тег, чтобы получилось два отдельных абзаца.", {
      start: "<p>Открыты с 8 до 22\n<p>Wi-Fi бесплатный</p>\n<strong>Ждём вас!</strong>",
      checks: [
        src("<p>Открыты с 8 до 22</p>", "Первый абзац закрыт: `<p>Открыты с 8 до 22</p>`"),
        el("p", "На странице ровно два абзаца", { count: 2 })
      ],
      hint: "Добавьте `</p>` сразу после «Открыты с 8 до 22».",
      solution: "<p>Открыты с 8 до 22</p>\n<p>Wi-Fi бесплатный</p>\n<strong>Ждём вас!</strong>"
    })
  ],

  /* ---------- 1. Основы ---------- */
  "what-is-html": [
    task("Элемент, вложение, атрибут", "Напишите абзац о кофейне, выделите в нём слово «раф» тегом `strong`, а ниже добавьте ссылку на страницу меню (`href=\"/menu\"`).", {
      at: "Атрибуты — настройки элемента",
      start: "<p>Кофейня «Зерно»</p>",
      checks: [
        el("p strong", "Внутри абзаца есть `strong` со словом «раф»", { text: "раф" }),
        el("a[href=\"/menu\"]", "Ссылка на меню `href=\"/menu\"`")
      ],
      hint: "Вложение: `<p>Попробуйте <strong>раф</strong></p>`. Ссылка: `<a href=\"/menu\">Меню</a>`.",
      solution: "<p>В «Зерне» лучший <strong>раф</strong> в городе.</p>\n<a href=\"/menu\">Меню</a>"
    }),
    task("Фото фирменного рафа", "Добавьте под абзацем фото: у `img` нет закрывающего тега, всё задаётся атрибутами `src` и `alt`.", {
      start: "<p>Наш фирменный раф:</p>\n",
      checks: [
        el("img", "Есть `img` с адресом в `src`", { attr: "src" }),
        el("img", "У фото есть описание `alt`", { attr: "alt" }),
        src("</img>", "Нет лишнего `</img>`", { absent: true })
      ],
      hint: "Адрес можно взять такой: `https://picsum.photos/300/200`.",
      solution: "<p>Наш фирменный раф:</p>\n<img src=\"https://picsum.photos/300/200\" alt=\"Раф с корицей в высоком стакане\">"
    })
  ],
  "document-skeleton": [
    task("Почините каркас", "У страницы кофейни перепутаны части: заголовок вкладки попал в `body`, а языка нет. Перенесите `title` в `head` и укажите `lang=\"ru\"`.", {
      start: "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n</head>\n<body>\n  <title>Кофейня «Зерно»</title>\n  <h1>Кофейня «Зерно»</h1>\n</body>\n</html>",
      checks: [
        el("html", "У `html` есть `lang=\"ru\"`", { attr: "lang", value: "ru" }),
        el("head title", "`title` стоит в `head`"),
        el("body title", "В `body` заголовка вкладки больше нет", { absent: true }),
        el("body h1", "Заголовок `h1` остался в `body`")
      ],
      hint: "Вырежьте строку с `<title>` и вставьте её под `<meta charset=\"utf-8\">`.",
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Кофейня «Зерно»</title>\n</head>\n<body>\n  <h1>Кофейня «Зерно»</h1>\n</body>\n</html>"
    })
  ],
  "how-browsers-read-html": [
    task("Бро запутался", "Теги закрыты крест-накрест: `<strong><em>…</strong></em>`. Исправьте порядок закрытия и оставьте над абзацем комментарий «Акция до пятницы».", {
      start: "<p><strong><em>Скидка 20%</strong></em> на всё меню</p>",
      checks: [
        src("</em></strong>", "Сначала закрыт внутренний `em`, потом `strong`"),
        src("<!--", "Есть комментарий `<!-- … -->`"),
        src("Акция до пятницы", "В комментарии написано «Акция до пятницы»")
      ],
      hint: "Последним открылся `em` — значит, он закрывается первым.",
      solution: "<!-- Акция до пятницы -->\n<p><strong><em>Скидка 20%</em></strong> на всё меню</p>"
    })
  ],
  "headings-and-paragraphs": [
    task("Главная страница", "Марта хочет: название крупно, а ниже разделы «О нас» и «Как нас найти». Один `h1`, два `h2`, под каждым — абзац.", {
      start: "<h1>Кофейня «Зерно»</h1>",
      checks: [
        el("h1", "Ровно один `h1` — название кофейни", { count: 1 }),
        el("h2", "Два раздела `h2`", { count: 2 }),
        el("h2", "Есть раздел «Как нас найти»", { text: "Как нас найти" }),
        el("h2 + p", "Под каждым `h2` идёт абзац", { count: 2 })
      ],
      hint: "Порядок: `h2`, затем `p`, затем снова `h2` и `p`.",
      solution: "<h1>Кофейня «Зерно»</h1>\n<h2>О нас</h2>\n<p>Обжариваем зерно сами, каждое утро.</p>\n<h2>Как нас найти</h2>\n<p>Казань, ул. Баумана, 12.</p>"
    })
  ],
  "whitespace-and-entities": [
    task("Адрес в подвале", "Оформите подвал: улица и город на разных строках через `br`, потом линия `hr`, а последний абзац — «© Зерно» через мнемонику `&copy;`, с неразрывным пробелом `&nbsp;` перед годом.", {
      start: "<p>ул. Баумана, 12 Казань</p>\n<p>(c) Зерно 2026</p>",
      checks: [
        el("p br", "Улица и город разделены `br`"),
        el("hr", "Есть разделитель `hr`"),
        src("&copy;", "Знак © записан как `&copy;`"),
        src("&nbsp;", "Есть неразрывный пробел `&nbsp;`")
      ],
      hint: "Подвал: `<p>&copy; Зерно&nbsp;2026</p>`.",
      solution: "<p>ул. Баумана, 12<br>Казань</p>\n<hr>\n<p>&copy; Зерно&nbsp;2026</p>"
    })
  ],
  "global-attributes": [
    task("Карточка напитка", "Это карточка в меню. Дайте `article` id `raf`, класс `drink`, атрибут `data-price=\"290\"`, а у «БЛ» сделайте подсказку «Без лактозы» через `title`.", {
      start: "<article>\n  <h2>Раф</h2>\n  <p>Можно <span>БЛ</span></p>\n</article>",
      checks: [
        el("article", "id `raf`", { attr: "id", value: "raf" }),
        el("article.drink", "Класс `drink`"),
        el("article", "`data-price=\"290\"`", { attr: "data-price", value: "290" }),
        el("span", "У «БЛ» есть подсказка `title`", { attr: "title" })
      ],
      hint: "Атрибуты пишутся через пробел в открывающем теге: `<article id=\"…\" class=\"…\">`.",
      solution: "<article id=\"raf\" class=\"drink\" data-price=\"290\">\n  <h2>Раф</h2>\n  <p>Можно <span title=\"Без лактозы\">БЛ</span></p>\n</article>"
    })
  ],
  "block-and-inline": [
    task("Рамочка для карточки", "Оберните карточку в `div` с классом `card`, а цену внутри абзаца — в `span` с классом `price`.", {
      start: "<h2>Чизкейк</h2>\n<p>Всего 260 ₽</p>",
      checks: [
        el("div.card", "Есть `div class=\"card\"`"),
        el("div.card h2", "Заголовок внутри карточки"),
        el("div.card p span.price", "Цена в `span class=\"price\"` внутри абзаца", { text: "260" })
      ],
      solution: "<div class=\"card\">\n  <h2>Чизкейк</h2>\n  <p>Всего <span class=\"price\">260 ₽</span></p>\n</div>"
    })
  ],

  /* ---------- 2. Текст ---------- */
  "text-emphasis": [
    task("Объявление на двери", "Выделите по смыслу: «Не заходить с мороженым» — важное (`strong`), слово «второй» — интонация (`em`), «до пятницы» — маркер (`mark`).", {
      start: "<p>Не заходить с мороженым. Второй капучино за полцены до пятницы.</p>",
      checks: [
        el("strong", "Важное в `strong`", { text: "Не заходить с мороженым" }),
        el("em", "Интонация в `em`", { text: "второй" }),
        el("mark", "Отметка в `mark`", { text: "до пятницы" })
      ],
      solution: "<p><strong>Не заходить с мороженым.</strong> <em>Второй</em> капучино за полцены <mark>до пятницы</mark>.</p>"
    })
  ],
  "inline-semantics": [
    task("Открытие и площадь", "Напишите площадь зала в м² через `sup`, «БЛ» — через `abbr` с расшифровкой, а дату открытия — тегом `time` с `datetime=\"2026-12-01\"`.", {
      start: "<p>Зал 40 м2. Есть БЛ молоко. Открытие 1 декабря.</p>",
      checks: [
        el("sup", "`2` в м2 — верхний индекс", { text: "2" }),
        el("abbr", "«БЛ» в `abbr` с подсказкой", { attr: "title" }),
        el("time", "Дата в `time datetime=\"2026-12-01\"`", { attr: "datetime", value: "2026-12-01" })
      ],
      solution: "<p>Зал 40 м<sup>2</sup>. Есть <abbr title=\"без лактозы\">БЛ</abbr> молоко. Открытие <time datetime=\"2026-12-01\">1 декабря</time>.</p>"
    }),
    task("Новая цена чизкейка", "Покажите скидку: старая цена зачёркнута через `del`, новая добавлена через `ins`, а вода в составе лимонада — H₂O через `sub`.", {
      start: "<p>Чизкейк 290 ₽ 260 ₽. Лимонад: H2O, лимон, мята.</p>",
      checks: [
        el("del", "Старая цена в `del`", { text: "290" }),
        el("ins", "Новая цена в `ins`", { text: "260" }),
        el("sub", "`2` в H2O — нижний индекс", { text: "2" })
      ],
      solution: "<p>Чизкейк <del>290 ₽</del> <ins>260 ₽</ins>. Лимонад: H<sub>2</sub>O, лимон, мята.</p>"
    })
  ],
  "code-in-text": [
    task("Инструкция к кассе", "Бариста Тимур пишет памятку. Оформите: файл `zakaz.txt` — как код (`code`), сочетание Ctrl + P — клавишами (`kbd`, по одной на клавишу), ответ кассы «Оплата прошла» — как вывод (`samp`).", {
      start: "<p>Откройте zakaz.txt, напечатайте чек через Ctrl + P. Касса ответит: Оплата прошла</p>",
      checks: [
        el("code", "Файл в `code`", { text: "zakaz.txt" }),
        el("kbd", "Две клавиши в `kbd`", { count: 2 }),
        el("samp", "Ответ кассы в `samp`", { text: "Оплата прошла" })
      ],
      solution: "<p>Откройте <code>zakaz.txt</code>, напечатайте чек через <kbd>Ctrl</kbd> + <kbd>P</kbd>. Касса ответит: <samp>Оплата прошла</samp></p>"
    })
  ],
  "quotes-and-addresses": [
    task("Отзыв блогера", "Повесьте отзыв через `figure`: сама цитата в `blockquote`, автор в `figcaption`. Ниже — контакты кофейни в `address`.", {
      start: "Лучший раф в Казани. Аня, фуд-блогер\nЗвоните: +7 843 123-45-67",
      checks: [
        el("figure blockquote", "Цитата в `blockquote` внутри `figure`"),
        el("figure figcaption", "Автор в `figcaption`", { text: "Аня" }),
        el("address", "Контакты в `address`", { text: "123-45-67" })
      ],
      solution: "<figure>\n  <blockquote><p>Лучший раф в Казани.</p></blockquote>\n  <figcaption>— Аня, фуд-блогер</figcaption>\n</figure>\n<address>Звоните: <a href=\"tel:+78431234567\">+7 843 123-45-67</a></address>"
    })
  ],
  lists: [
    task("Меню и топ недели", "Сделайте топ-3 напитков недели нумерованным списком в обратном порядке (`ol reversed`), а под ним — маркированное меню, где у пункта «Кофе» есть вложенный список из двух напитков.", {
      start: "<h2>Топ-3 недели</h2>\n\n<h2>Меню</h2>\n",
      checks: [
        el("ol[reversed]", "Нумерованный список с `reversed`"),
        el("ol > li", "В топе три напитка", { count: 3 }),
        el("ul > li > ul > li", "Вложенный список из двух напитков", { count: 2 })
      ],
      hint: "Вложенный `ul` ставится внутрь `li`, до его закрывающего тега.",
      solution: "<h2>Топ-3 недели</h2>\n<ol reversed>\n  <li>Латте</li>\n  <li>Капучино</li>\n  <li>Раф</li>\n</ol>\n<h2>Меню</h2>\n<ul>\n  <li>Кофе\n    <ul>\n      <li>Раф</li>\n      <li>Флэт уайт</li>\n    </ul>\n  </li>\n  <li>Десерты</li>\n</ul>"
    })
  ],
  "description-lists": [
    task("Состав рафа", "Превратите абзацы в список определений `dl`: каждое название в `dt`, значение в `dd`.", {
      start: "<p>Объём: 350 мл</p>\n<p>Калории: 240 ккал</p>\n<p>Цена: 290 ₽</p>",
      checks: [
        el("dl", "Есть `dl`"),
        el("dl dt", "Три названия `dt`", { count: 3 }),
        el("dl dd", "Три значения `dd`", { count: 3 }),
        el("p", "Абзацев больше нет", { absent: true })
      ],
      solution: "<dl>\n  <dt>Объём</dt><dd>350 мл</dd>\n  <dt>Калории</dt><dd>240 ккал</dd>\n  <dt>Цена</dt><dd>290 ₽</dd>\n</dl>"
    })
  ],
  "language-and-direction": [
    task("Для туристов", "Отметьте английский девиз атрибутом `lang=\"en\"`, а имя гостя из отзывов (на неизвестном языке) изолируйте тегом `bdi`.", {
      start: "<p>Наш девиз — <span>Coffee first</span>. Лучший отзыв: إيان — 5 звёзд.</p>",
      checks: [
        el("[lang=\"en\"]", "Девиз с `lang=\"en\"`", { text: "Coffee first" }),
        el("bdi", "Имя гостя в `bdi`")
      ],
      solution: "<p>Наш девиз — <span lang=\"en\">Coffee first</span>. Лучший отзыв: <bdi>إيان</bdi> — 5 звёзд.</p>"
    })
  ],
  "project-recipe": [
    task("Рецепт фирменного рафа", "Сделайте страницу рецепта: заголовок `h1`, фото в `figure` с подписью, ингредиенты маркированным списком (не меньше трёх), шаги — нумерованным, время приготовления в `time`.", {
      start: "<h1>Раф «Зерно» дома</h1>\n",
      checks: [
        el("figure img[alt]", "Фото с `alt` внутри `figure`"),
        el("figure figcaption", "У фото есть подпись"),
        el("ul li", "Не меньше трёх ингредиентов", { count: 3 }),
        el("ol li", "Шаги нумерованным списком", { count: 2 }),
        el("time", "Время в `time`")
      ],
      solution: "<h1>Раф «Зерно» дома</h1>\n<figure>\n  <img src=\"https://picsum.photos/400/250\" alt=\"Раф в высоком стакане с корицей\">\n  <figcaption>Готовится за <time datetime=\"PT5M\">5 минут</time></figcaption>\n</figure>\n<h2>Ингредиенты</h2>\n<ul>\n  <li>Эспрессо — 30&nbsp;мл</li>\n  <li>Сливки 10% — 150&nbsp;мл</li>\n  <li>Ванильный сахар — 1&nbsp;ч.&nbsp;л.</li>\n</ul>\n<h2>Как готовить</h2>\n<ol>\n  <li>Смешайте всё в питчере.</li>\n  <li>Взбейте паром до пены.</li>\n</ol>"
    })
  ]
};
