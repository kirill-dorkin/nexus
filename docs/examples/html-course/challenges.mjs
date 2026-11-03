// Hands-on challenges for every lesson, checked live in the learner's browser.
// Every task is a request from the story (Marta's coffee shop «Север»).
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
import projects from "./challenges-projects.mjs";

export default {
  ...more,

  /* ---------- 0. Старт ---------- */
  "how-the-web-works": [
    task("Первая строчка сайта", "Это настоящая страница. Напиши в заголовке «Мой сайт», а в абзаце — чем она хороша. Результат обновится сразу.", {
      at: "Как выглядит HTML",
      start: "<h1>Моя первая страница</h1>\n<p>Привет! Я учу HTML.</p>",
      checks: [
        el("h1", "Заголовок `h1` — название сайта", { text: "Мой сайт" }),
        el("p", "Абзац `p` на месте"),
        el("p", "Абзац рассказывает о сайте, а не про «учу HTML»", { text: "Я учу HTML", absent: true })
      ],
      hint: "Меняй только текст между тегами: `<h1>Мой сайт</h1>`.",
      solution: "<h1>Мой сайт</h1>\n<p>Здесь мои заметки о путешествиях и фото из поездок.</p>"
    })
  ],
  tools: [
    task("Меню вручную", "Emmet превратил бы `ul>li*3` в список. Сделай то же самое руками: меню `ul` из трёх товаров — блокнот, ручка и пенал.", {
      start: "<!-- меню магазина здесь -->",
      checks: [
        el("ul", "Есть список `ul`"),
        el("ul > li", "Внутри три пункта `li`", { count: 3 }),
        el("li", "Один из товаров — пенал", { text: "пенал" })
      ],
      hint: "Каждый пункт — пара `<li>…</li>` внутри `<ul>…</ul>`.",
      solution: "<ul>\n  <li>Блокнот</li>\n  <li>Ручка</li>\n  <li>Пенал</li>\n</ul>"
    })
  ],
  "first-page": [
    task("index.html магазина", "Собери главную страницу целиком: doctype, `html` с языком `ru`, `head` с кодировкой и заголовком вкладки «Мой сайт», а в `body` — заголовок `h1` с названием.", {
      start: "",
      checks: [
        src("<!doctype html>", "Первая строка — `<!doctype html>`"),
        el("html", "У `html` есть `lang=\"ru\"`", { attr: "lang", value: "ru" }),
        el("meta[charset]", "Указана кодировка `meta charset`"),
        el("title", "Заголовок вкладки — название сайта", { text: "Мой сайт" }),
        el("body h1", "В `body` есть `h1`")
      ],
      hint: "В VS Code это `!` + Tab. Здесь напиши по памяти или подсмотри пример выше.",
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Мой сайт</title>\n</head>\n<body>\n  <h1>Мой сайт</h1>\n</body>\n</html>"
    })
  ],
  "how-to-learn": [
    task("Найди опечатку", "Кто-то поправил сайт вручную — и всё поехало: абзац не закрыт, и браузер растянул его на всё подряд. Поставь закрывающий тег, чтобы получилось два отдельных абзаца.", {
      start: "<p>Открыты с 8 до 22\n<p>Wi-Fi бесплатный</p>\n<strong>Ждём вас!</strong>",
      checks: [
        src("<p>Открыты с 8 до 22</p>", "Первый абзац закрыт: `<p>Открыты с 8 до 22</p>`"),
        el("p", "На странице ровно два абзаца", { count: 2 })
      ],
      hint: "Добавь `</p>` сразу после «Открыты с 8 до 22».",
      solution: "<p>Открыты с 8 до 22</p>\n<p>Wi-Fi бесплатный</p>\n<strong>Ждём вас!</strong>"
    })
  ],

  /* ---------- 1. Основы ---------- */
  "what-is-html": [
    task("Элемент, вложение, атрибут", "Напиши абзац о магазине, выдели в нём слово «пенал» тегом `strong`, а ниже добавь ссылку на страницу меню (`href=\"/menu\"`).", {
      at: "Атрибуты — настройки элемента",
      start: "<p>Мой сайт</p>",
      checks: [
        el("p strong", "Внутри абзаца есть `strong` со словом «пенал»", { text: "пенал" }),
        el("a[href=\"/menu\"]", "Ссылка на меню `href=\"/menu\"`")
      ],
      hint: "Вложение: `<p>Попробуй <strong>пенал</strong></p>`. Ссылка: `<a href=\"/menu\">Меню</a>`.",
      solution: "<p>В нашем магазине лучший <strong>пенал</strong> в городе.</p>\n<a href=\"/menu\">Меню</a>"
    }),
    task("Фото товара", "Добавь под абзацем фото: у `img` нет закрывающего тега, всё задаётся атрибутами `src` и `alt`.", {
      start: "<p>Наш фирменный пенал:</p>\n",
      checks: [
        el("img", "Есть `img` с адресом в `src`", { attr: "src" }),
        el("img", "У фото есть описание `alt`", { attr: "alt" }),
        src("</img>", "Нет лишнего `</img>`", { absent: true })
      ],
      hint: "Адрес можно взять такой: `https://picsum.photos/300/200`.",
      solution: "<p>Наш фирменный пенал:</p>\n<img src=\"https://picsum.photos/300/200\" alt=\"Пенал с корицей в высоком стакане\">"
    })
  ],
  "document-skeleton": [
    task("Почини каркас", "У страницы магазина перепутаны части: заголовок вкладки попал в `body`, а языка нет. Перенеси `title` в `head` и укажи `lang=\"ru\"`.", {
      start: "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n</head>\n<body>\n  <title>Мой сайт</title>\n  <h1>Мой сайт</h1>\n</body>\n</html>",
      checks: [
        el("html", "У `html` есть `lang=\"ru\"`", { attr: "lang", value: "ru" }),
        el("head title", "`title` стоит в `head`"),
        el("body title", "В `body` заголовка вкладки больше нет", { absent: true }),
        el("body h1", "Заголовок `h1` остался в `body`")
      ],
      hint: "Вырежь строку с `<title>` и вставь её под `<meta charset=\"utf-8\">`.",
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Мой сайт</title>\n</head>\n<body>\n  <h1>Мой сайт</h1>\n</body>\n</html>"
    })
  ],
  "how-browsers-read-html": [
    task("Бро запутался", "Теги закрыты крест-накрест: `<strong><em>…</strong></em>`. Исправь порядок закрытия и оставь над абзацем комментарий «Акция до пятницы».", {
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
    task("Главная страница", "Нужно: название крупно, а ниже разделы «О нас» и «Как нас найти». Один `h1`, два `h2`, под каждым — абзац.", {
      start: "<h1>Мой сайт</h1>",
      checks: [
        el("h1", "Ровно один `h1` — название магазина", { count: 1 }),
        el("h2", "Два раздела `h2`", { count: 2 }),
        el("h2", "Есть раздел «Как нас найти»", { text: "Как нас найти" }),
        el("h2 + p", "Под каждым `h2` идёт абзац", { count: 2 })
      ],
      hint: "Порядок: `h2`, затем `p`, затем снова `h2` и `p`.",
      solution: "<h1>Мой сайт</h1>\n<h2>О нас</h2>\n<p>Обжариваем материал сами, каждое утро.</p>\n<h2>Как нас найти</h2>\n<p>Казань, ул. Баумана, 12.</p>"
    })
  ],
  "whitespace-and-entities": [
    task("Адрес в подвале", "Оформи подвал: улица и город на разных строках через `br`, потом линия `hr`, а последний абзац — «© Север» через мнемонику `&copy;`, с неразрывным пробелом `&nbsp;` перед годом.", {
      start: "<p>ул. Баумана, 12 Казань</p>\n<p>(c) Север 2026</p>",
      checks: [
        el("p br", "Улица и город разделены `br`"),
        el("hr", "Есть разделитель `hr`"),
        src("&copy;", "Знак © записан как `&copy;`"),
        src("&nbsp;", "Есть неразрывный пробел `&nbsp;`")
      ],
      hint: "Подвал: `<p>&copy; Север&nbsp;2026</p>`.",
      solution: "<p>ул. Баумана, 12<br>Казань</p>\n<hr>\n<p>&copy; Север&nbsp;2026</p>"
    })
  ],
  "global-attributes": [
    task("Карточка товара", "Это карточка в меню. Дай `article` id `raf`, класс `drink`, атрибут `data-price=\"290\"`, а у «БЛ» сделай подсказку «Без лактозы» через `title`.", {
      start: "<article>\n  <h2>Пенал</h2>\n  <p>Можно <span>БЛ</span></p>\n</article>",
      checks: [
        el("article", "id `raf`", { attr: "id", value: "raf" }),
        el("article.drink", "Класс `drink`"),
        el("article", "`data-price=\"290\"`", { attr: "data-price", value: "290" }),
        el("span", "У «БЛ» есть подсказка `title`", { attr: "title" })
      ],
      hint: "Атрибуты пишутся через пробел в открывающем теге: `<article id=\"…\" class=\"…\">`.",
      solution: "<article id=\"raf\" class=\"drink\" data-price=\"290\">\n  <h2>Пенал</h2>\n  <p>Можно <span title=\"Без лактозы\">БЛ</span></p>\n</article>"
    })
  ],
  "block-and-inline": [
    task("Рамочка для карточки", "Оберни карточку в `div` с классом `card`, а цену внутри абзаца — в `span` с классом `price`.", {
      start: "<h2>Стикеры</h2>\n<p>Всего 260 ₽</p>",
      checks: [
        el("div.card", "Есть `div class=\"card\"`"),
        el("div.card h2", "Заголовок внутри карточки"),
        el("div.card p span.price", "Цена в `span class=\"price\"` внутри абзаца", { text: "260" })
      ],
      solution: "<div class=\"card\">\n  <h2>Стикеры</h2>\n  <p>Всего <span class=\"price\">260 ₽</span></p>\n</div>"
    })
  ],

  /* ---------- 2. Текст ---------- */
  "text-emphasis": [
    task("Объявление на двери", "Выдели по смыслу: «Не заходить с мороженым» — важное (`strong`), слово «второй» — интонация (`em`), «до пятницы» — маркер (`mark`).", {
      start: "<p>Не заходить с мороженым. Второй блокнот за полцены до пятницы.</p>",
      checks: [
        el("strong", "Важное в `strong`", { text: "Не заходить с мороженым" }),
        el("em", "Интонация в `em`", { text: "второй" }),
        el("mark", "Отметка в `mark`", { text: "до пятницы" })
      ],
      solution: "<p><strong>Не заходить с мороженым.</strong> <em>Второй</em> блокнот за полцены <mark>до пятницы</mark>.</p>"
    })
  ],
  "inline-semantics": [
    task("Открытие и площадь", "Напиши площадь зала в м² через `sup`, «БЛ» — через `abbr` с расшифровкой, а дату открытия — тегом `time` с `datetime=\"2026-12-01\"`.", {
      start: "<p>Зал 40 м2. Есть БП разъём. Открытие 1 декабря.</p>",
      checks: [
        el("sup", "`2` в м2 — верхний индекс", { text: "2" }),
        el("abbr", "«БЛ» в `abbr` с подсказкой", { attr: "title" }),
        el("time", "Дата в `time datetime=\"2026-12-01\"`", { attr: "datetime", value: "2026-12-01" })
      ],
      solution: "<p>Зал 40 м<sup>2</sup>. Есть <abbr title=\"блок питания\">БП</abbr> разъём. Открытие <time datetime=\"2026-12-01\">1 декабря</time>.</p>"
    }),
    task("Новая цена", "Покажи скидку: старая цена зачёркнута через `del`, новая добавлена через `ins`, а вода в составе лимонада — H₂O через `sub`.", {
      start: "<p>Стикеры 290 ₽ 260 ₽. Лимонад: H2O, лимон, мята.</p>",
      checks: [
        el("del", "Старая цена в `del`", { text: "290" }),
        el("ins", "Новая цена в `ins`", { text: "260" }),
        el("sub", "`2` в H2O — нижний индекс", { text: "2" })
      ],
      solution: "<p>Стикеры <del>290 ₽</del> <ins>260 ₽</ins>. Лимонад: H<sub>2</sub>O, лимон, мята.</p>"
    })
  ],
  "code-in-text": [
    task("Инструкция к программе", "Пишем памятку к программе. Оформи: файл `zakaz.txt` — как код (`code`), сочетание Ctrl + P — клавишами (`kbd`, по одной на клавишу), ответ программы «Оплата прошла» — как вывод (`samp`).", {
      start: "<p>Открой zakaz.txt, напечатай чек через Ctrl + P. Касса ответит: Оплата прошла</p>",
      checks: [
        el("code", "Файл в `code`", { text: "zakaz.txt" }),
        el("kbd", "Две клавиши в `kbd`", { count: 2 }),
        el("samp", "Ответ кассы в `samp`", { text: "Оплата прошла" })
      ],
      solution: "<p>Открой <code>zakaz.txt</code>, напечатай чек через <kbd>Ctrl</kbd> + <kbd>P</kbd>. Касса ответит: <samp>Оплата прошла</samp></p>"
    })
  ],
  "quotes-and-addresses": [
    task("Отзыв блогера", "Повесь отзыв через `figure`: сама цитата в `blockquote`, автор в `figcaption`. Ниже — контакты магазина в `address`.", {
      start: "Лучший магазин канцтоваров в Казани. Аня, покупатель\nЗвоните: +7 843 123-45-67",
      checks: [
        el("figure blockquote", "Цитата в `blockquote` внутри `figure`"),
        el("figure figcaption", "Автор в `figcaption`", { text: "Аня" }),
        el("address", "Контакты в `address`", { text: "123-45-67" })
      ],
      solution: "<figure>\n  <blockquote><p>Лучший магазин канцтоваров в Казани.</p></blockquote>\n  <figcaption>— Аня, покупатель</figcaption>\n</figure>\n<address>Звоните: <a href=\"tel:+78431234567\">+7 843 123-45-67</a></address>"
    })
  ],
  lists: [
    task("Каталог и топ недели", "Сделай топ-3 товаров недели нумерованным списком в обратном порядке (`ol reversed`), а под ним — маркированный каталог, где у пункта «Канцтовары» есть вложенный список из двух товаров.", {
      start: "<h2>Топ-3 недели</h2>\n\n<h2>Меню</h2>\n",
      checks: [
        el("ol[reversed]", "Нумерованный список с `reversed`"),
        el("ol > li", "В топе три товара", { count: 3 }),
        el("ul > li > ul > li", "Вложенный список из двух товаров", { count: 2 })
      ],
      hint: "Вложенный `ul` ставится внутрь `li`, до его закрывающего тега.",
      solution: "<h2>Топ-3 недели</h2>\n<ol reversed>\n  <li>Ручка</li>\n  <li>Блокнот</li>\n  <li>Пенал</li>\n</ol>\n<h2>Каталог</h2>\n<ul>\n  <li>Канцтовары\n    <ul>\n      <li>Пенал</li>\n      <li>Линейка</li>\n    </ul>\n  </li>\n  <li>Аксессуары</li>\n</ul>"
    })
  ],
  "description-lists": [
    task("Характеристики товара", "Преврати абзацы в список определений `dl`: каждое название в `dt`, значение в `dd`.", {
      start: "<p>Вес: 350 г</p>\n<p>Размер: 20×15 см</p>\n<p>Цена: 290 ₽</p>",
      checks: [
        el("dl", "Есть `dl`"),
        el("dl dt", "Три названия `dt`", { count: 3 }),
        el("dl dd", "Три значения `dd`", { count: 3 }),
        el("p", "Абзацев больше нет", { absent: true })
      ],
      solution: "<dl>\n  <dt>Вес</dt><dd>350 г</dd>\n  <dt>Размер</dt><dd>20×15 см</dd>\n  <dt>Цена</dt><dd>290 ₽</dd>\n</dl>"
    })
  ],
  "language-and-direction": [
    task("Для туристов", "Отметь английский девиз атрибутом `lang=\"en\"`, а имя посетителя из отзывов (на неизвестном языке) изолируй тегом `bdi`.", {
      start: "<p>Наш девиз — <span>Coffee first</span>. Лучший отзыв: إيان — 5 звёзд.</p>",
      checks: [
        el("[lang=\"en\"]", "Девиз с `lang=\"en\"`", { text: "Coffee first" }),
        el("bdi", "Имя посетителя в `bdi`")
      ],
      solution: "<p>Наш девиз — <span lang=\"en\">Coffee first</span>. Лучший отзыв: <bdi>إيان</bdi> — 5 звёзд.</p>"
    })
  ],

  // Projects: step-by-step builds that override nothing else.
  ...projects
};
