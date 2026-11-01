// Hands-on challenges for every lesson, checked live in the learner's browser.
// Each one is validated by apps/web/src/components/learning/html-course-challenges.test.ts:
// the solution must pass every check and the starting code must not.
//
// task(title, text, { start, checks, solution, hint, at })
//   checks: el(selector, label, { text, attr, value, count, absent }) | src(fragment, label, { absent })

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
    task("Ваша первая строчка HTML", "Это настоящая страница. Замените текст заголовка на своё имя, а в абзаце напишите, зачем учите HTML. Результат обновится сразу.", {
      at: "Как выглядит HTML",
      start: "<h1>Моя первая страница</h1>\n<p>Привет! Я учу HTML.</p>",
      checks: [
        el("h1", "Заголовок `h1` остался на месте"),
        el("h1", "В заголовке больше нет «Моя первая страница»", { text: "Моя первая страница", absent: true }),
        el("p", "Абзац `p` на месте"),
        el("p", "Абзац рассказывает о вашей цели", { text: "Привет! Я учу HTML.", absent: true })
      ],
      hint: "Меняйте только текст между `<h1>` и `</h1>`, сами теги не трогайте.",
      solution: "<h1>Аня Смирнова</h1>\n<p>Хочу сделать сайт для своей мастерской.</p>"
    })
  ],
  tools: [
    task("Разверните сокращение вручную", "Emmet превратил бы `ul>li*3` в список. Сделайте то же самое руками: список `ul` с тремя пунктами — браузер, VS Code и Live Server.", {
      start: "<!-- ваш список здесь -->",
      checks: [
        el("ul", "Есть список `ul`"),
        el("ul > li", "Внутри три пункта `li`", { count: 3 }),
        el("li", "Один из пунктов — VS Code", { text: "VS Code" })
      ],
      hint: "Каждый пункт — пара `<li>…</li>` внутри `<ul>…</ul>`.",
      solution: "<ul>\n  <li>Браузер</li>\n  <li>VS Code</li>\n  <li>Live Server</li>\n</ul>"
    })
  ],
  "first-page": [
    task("Соберите страницу целиком", "Напишите полный документ: doctype, `html` с языком `ru`, `head` с кодировкой и заголовком вкладки, а в `body` — заголовок «Привет, мир!».", {
      start: "",
      checks: [
        src("<!doctype html>", "Первая строка — `<!doctype html>`"),
        el("html", "У `html` есть `lang=\"ru\"`", { attr: "lang", value: "ru" }),
        el("meta[charset]", "Указана кодировка `meta charset`"),
        el("title", "Есть заголовок вкладки `title`"),
        el("body h1", "В `body` заголовок «Привет, мир!»", { text: "Привет, мир" })
      ],
      hint: "В VS Code это `!` + Tab. Здесь напишите по памяти или подсмотрите пример выше.",
      solution: "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Мой первый сайт</title>\n</head>\n<body>\n  <h1>Привет, мир!</h1>\n</body>\n</html>"
    })
  ],
  "how-to-learn": [
    task("Найдите и исправьте ошибку", "В коде опечатка: абзац не закрыт, и браузер растянул его на всё подряд. Поставьте закрывающий тег там, где он нужен, чтобы получилось два отдельных абзаца.", {
      start: "<p>Первый абзац\n<p>Второй абзац</p>\n<strong>Важно</strong> всегда закрывать теги.",
      checks: [
        src("<p>Первый абзац</p>", "Первый абзац закрыт: `<p>Первый абзац</p>`"),
        el("p", "На странице ровно два абзаца", { count: 2 })
      ],
      hint: "Добавьте `</p>` сразу после слов «Первый абзац».",
      solution: "<p>Первый абзац</p>\n<p>Второй абзац</p>\n<strong>Важно</strong> всегда закрывать теги."
    })
  ],

  /* ---------- 1. Основы ---------- */
  "what-is-html": [
    task("Элемент, вложение, атрибут", "Сделайте абзац о себе, выделите в нём одно слово тегом `strong`, а под ним добавьте ссылку на любимый сайт с атрибутом `href`.", {
      at: "Атрибуты — настройки элемента",
      start: "<p>Меня зовут Аня.</p>",
      checks: [
        el("p strong", "Внутри абзаца есть `strong`"),
        el("a", "Есть ссылка с адресом в `href`", { attr: "href" }),
        el("a", "У ссылки есть текст", { text: "" })
      ],
      hint: "Вложение: `<p>Я люблю <strong>горы</strong></p>`. Ссылка: `<a href=\"https://…\">текст</a>`.",
      solution: "<p>Меня зовут Аня, я <strong>дизайнер</strong>.</p>\n<a href=\"https://developer.mozilla.org\">MDN</a>"
    }),
    task("Пустой элемент", "Добавьте под абзацем картинку: у `img` нет закрывающего тега, всё задаётся атрибутами `src` и `alt`.", {
      start: "<p>Мой кот:</p>\n",
      checks: [
        el("img", "Есть `img` с адресом в `src`", { attr: "src" }),
        el("img", "У картинки есть описание `alt`", { attr: "alt" }),
        src("</img>", "Нет лишнего `</img>`", { absent: true })
      ],
      hint: "Адрес можно взять такой: `https://picsum.photos/300/200`.",
      solution: "<p>Мой кот:</p>\n<img src=\"https://picsum.photos/300/200\" alt=\"Рыжий кот спит на диване\">"
    })
  ],
  "document-skeleton": [
    task("Почините каркас", "У страницы перепутаны части: заголовок вкладки попал в `body`, а языка нет. Перенесите `title` в `head` и укажите `lang=\"ru\"`.", {
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
    task("Комментарий и правильная вложенность", "Теги закрыты крест-накрест: `<strong><em>…</strong></em>`. Исправьте порядок закрытия и оставьте над абзацем комментарий «Акция до пятницы».", {
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
    task("Структура статьи", "Сделайте статью «Как заварить чай»: один `h1`, два раздела с `h2` «Что нужно» и «Как заварить», под каждым — абзац.", {
      start: "<h1>Как заварить чай</h1>",
      checks: [
        el("h1", "Ровно один `h1` — название статьи", { count: 1 }),
        el("h2", "Два подзаголовка `h2`", { count: 2 }),
        el("h2", "Есть раздел «Что нужно»", { text: "Что нужно" }),
        el("h2 + p", "Под каждым `h2` идёт абзац", { count: 2 })
      ],
      hint: "Порядок: `h2`, затем `p`, затем снова `h2` и `p`.",
      solution: "<h1>Как заварить чай</h1>\n<h2>Что нужно</h2>\n<p>Чайник, заварка и вода 90 °C.</p>\n<h2>Как заварить</h2>\n<p>Залейте заварку и подождите три минуты.</p>"
    })
  ],
  "whitespace-and-entities": [
    task("Адрес, разделитель и спецсимволы", "Оформите подпись: имя и город на разных строках через `br`, потом линия `hr`, а в последнем абзаце выведите текст `<p> — это абзац` так, чтобы теги показались буквально.", {
      start: "<p>Анна Петрова Москва</p>\n<p><p> — это абзац</p>",
      checks: [
        el("p br", "Имя и город разделены `br`"),
        el("hr", "Есть разделитель `hr`"),
        src("&lt;p&gt;", "Теги в тексте записаны мнемониками `&lt;` и `&gt;`")
      ],
      hint: "Знак `<` в тексте пишется как `&lt;`, а `>` — как `&gt;`.",
      solution: "<p>Анна Петрова<br>Москва</p>\n<hr>\n<p>&lt;p&gt; — это абзац</p>"
    })
  ],
  "global-attributes": [
    task("id, class, title и data-*", "Это карточка товара. Дайте `article` id `product-42`, класс `card`, атрибут `data-price=\"1990\"`, а у слова «хит» сделайте всплывающую подсказку через `title`.", {
      start: "<article>\n  <h2>Рюкзак</h2>\n  <p>Наш <span>хит</span> сезона</p>\n</article>",
      checks: [
        el("article", "id `product-42`", { attr: "id", value: "product-42" }),
        el("article.card", "Класс `card`"),
        el("article", "`data-price=\"1990\"`", { attr: "data-price", value: "1990" }),
        el("span", "У «хит» есть подсказка `title`", { attr: "title" })
      ],
      hint: "Атрибуты пишутся через пробел в открывающем теге: `<article id=\"…\" class=\"…\">`.",
      solution: "<article id=\"product-42\" class=\"card\" data-price=\"1990\">\n  <h2>Рюкзак</h2>\n  <p>Наш <span title=\"Самый продаваемый\">хит</span> сезона</p>\n</article>"
    })
  ],
  "block-and-inline": [
    task("Блок и строка", "Оберните карточку в `div` с классом `card`, а цену внутри абзаца — в `span` с классом `price`.", {
      start: "<h2>Пицца «Маргарита»</h2>\n<p>Всего 590 ₽</p>",
      checks: [
        el("div.card", "Есть `div class=\"card\"`"),
        el("div.card h2", "Заголовок внутри карточки"),
        el("div.card p span.price", "Цена в `span class=\"price\"` внутри абзаца", { text: "590" })
      ],
      solution: "<div class=\"card\">\n  <h2>Пицца «Маргарита»</h2>\n  <p>Всего <span class=\"price\">590 ₽</span></p>\n</div>"
    })
  ],

  /* ---------- 2. Текст ---------- */
  "text-emphasis": [
    task("Предупреждение на этикетке", "Выделите по смыслу: «Не принимать натощак» — важное (`strong`), слово «обязательно» — интонационное ударение (`em`), а «до 31.12» — отметка маркером (`mark`).", {
      start: "<p>Не принимать натощак. Перед едой обязательно встряхнуть. Акция до 31.12.</p>",
      checks: [
        el("strong", "Важное в `strong`", { text: "Не принимать натощак" }),
        el("em", "Ударение в `em`", { text: "обязательно" }),
        el("mark", "Отметка в `mark`", { text: "до 31.12" })
      ],
      solution: "<p><strong>Не принимать натощак.</strong> Перед едой <em>обязательно</em> встряхнуть. Акция <mark>до 31.12</mark>.</p>"
    })
  ],
  "inline-semantics": [
    task("Химия и даты", "Напишите формулу воды с нижним индексом (`sub`), площадь в м² с верхним (`sup`), а дату концерта оформите тегом `time` с машиночитаемым `datetime=\"2026-12-31\"`.", {
      start: "<p>Формула воды: H2O. Площадь: 40 м2. Концерт 31 декабря.</p>",
      checks: [
        el("sub", "`2` в H2O — нижний индекс", { text: "2" }),
        el("sup", "`2` в м2 — верхний индекс", { text: "2" }),
        el("time", "Дата в `time datetime=\"2026-12-31\"`", { attr: "datetime", value: "2026-12-31" })
      ],
      solution: "<p>Формула воды: H<sub>2</sub>O. Площадь: 40 м<sup>2</sup>. Концерт <time datetime=\"2026-12-31\">31 декабря</time>.</p>"
    }),
    task("Правка цены", "Покажите скидку: старая цена зачёркнута через `del`, новая добавлена через `ins`, а сокращение «шт.» расшифровано в `abbr` с `title`.", {
      start: "<p>Цена: 1200 ₽ 900 ₽ за 1 шт.</p>",
      checks: [
        el("del", "Старая цена в `del`", { text: "1200" }),
        el("ins", "Новая цена в `ins`", { text: "900" }),
        el("abbr", "«шт.» в `abbr` с подсказкой", { attr: "title" })
      ],
      solution: "<p>Цена: <del>1200 ₽</del> <ins>900 ₽</ins> за 1 <abbr title=\"штуку\">шт.</abbr></p>"
    })
  ],
  "code-in-text": [
    task("Инструкция для программиста", "Оформите: команду `npm install` — как код (`code`), сочетание Ctrl + C — клавишами (`kbd`, по одной на клавишу), а ответ терминала «Готово» — как вывод программы (`samp`).", {
      start: "<p>Выполните npm install, скопируйте ошибку через Ctrl + C. Терминал ответит: Готово</p>",
      checks: [
        el("code", "Команда в `code`", { text: "npm install" }),
        el("kbd", "Две клавиши в `kbd`", { count: 2 }),
        el("samp", "Вывод в `samp`", { text: "Готово" })
      ],
      solution: "<p>Выполните <code>npm install</code>, скопируйте ошибку через <kbd>Ctrl</kbd> + <kbd>C</kbd>. Терминал ответит: <samp>Готово</samp></p>"
    })
  ],
  "quotes-and-addresses": [
    task("Цитата с подписью", "Оформите цитату через `figure`: сама цитата в `blockquote`, а подпись с автором в `figcaption`. Ниже — контакты автора блога в `address`.", {
      start: "Простота — залог надёжности. Эдсгер Дейкстра\nПишите: blog@example.com",
      checks: [
        el("figure blockquote", "Цитата в `blockquote` внутри `figure`"),
        el("figure figcaption", "Автор в `figcaption`", { text: "Дейкстра" }),
        el("address", "Контакты в `address`", { text: "blog@example.com" })
      ],
      solution: "<figure>\n  <blockquote><p>Простота — залог надёжности.</p></blockquote>\n  <figcaption>Эдсгер Дейкстра</figcaption>\n</figure>\n<address>Пишите: <a href=\"mailto:blog@example.com\">blog@example.com</a></address>"
    })
  ],
  lists: [
    task("Топ-3 и план дня", "Сделайте топ-3 фильмов нумерованным списком в обратном порядке (`ol reversed`), а под ним — маркированный план дня, где у пункта «Работа» есть вложенный список из двух дел.", {
      start: "<h2>Мой топ-3</h2>\n\n<h2>План дня</h2>\n",
      checks: [
        el("ol[reversed]", "Нумерованный список с `reversed`"),
        el("ol > li", "В топе три фильма", { count: 3 }),
        el("ul > li > ul > li", "Вложенный список из двух дел", { count: 2 })
      ],
      hint: "Вложенный `ul` ставится внутрь `li`, до его закрывающего тега.",
      solution: "<h2>Мой топ-3</h2>\n<ol reversed>\n  <li>Интерстеллар</li>\n  <li>Амели</li>\n  <li>Матрица</li>\n</ol>\n<h2>План дня</h2>\n<ul>\n  <li>Зарядка</li>\n  <li>Работа\n    <ul>\n      <li>Созвон</li>\n      <li>Отчёт</li>\n    </ul>\n  </li>\n</ul>"
    })
  ],
  "description-lists": [
    task("Характеристики ноутбука", "Превратите абзацы в список определений `dl`: каждое название в `dt`, значение в `dd`.", {
      start: "<p>Процессор: M3</p>\n<p>Память: 16 ГБ</p>\n<p>Вес: 1,2 кг</p>",
      checks: [
        el("dl", "Есть `dl`"),
        el("dl dt", "Три названия `dt`", { count: 3 }),
        el("dl dd", "Три значения `dd`", { count: 3 }),
        el("p", "Абзацев больше нет", { absent: true })
      ],
      solution: "<dl>\n  <dt>Процессор</dt><dd>M3</dd>\n  <dt>Память</dt><dd>16 ГБ</dd>\n  <dt>Вес</dt><dd>1,2 кг</dd>\n</dl>"
    })
  ],
  "language-and-direction": [
    task("Многоязычный абзац", "Отметьте английскую фразу атрибутом `lang=\"en\"`, а имя пользователя неизвестного языка изолируйте тегом `bdi`.", {
      start: "<p>Девиз компании — <span>Think different</span>. Победитель: إيان — 120 очков.</p>",
      checks: [
        el("[lang=\"en\"]", "Английская фраза с `lang=\"en\"`", { text: "Think different" }),
        el("bdi", "Имя в `bdi`")
      ],
      solution: "<p>Девиз компании — <span lang=\"en\">Think different</span>. Победитель: <bdi>إيان</bdi> — 120 очков.</p>"
    })
  ],
  "project-recipe": [
    task("Соберите рецепт", "Сделайте страницу рецепта блинов: заголовок `h1`, фото в `figure` с подписью, ингредиенты маркированным списком (не меньше трёх), шаги — нумерованным, а время готовки в `time`.", {
      start: "<h1>Блины</h1>\n",
      checks: [
        el("figure img[alt]", "Фото с `alt` внутри `figure`"),
        el("figure figcaption", "У фото есть подпись"),
        el("ul li", "Не меньше трёх ингредиентов", { count: 3 }),
        el("ol li", "Шаги нумерованным списком", { count: 2 }),
        el("time", "Время готовки в `time`")
      ],
      solution: "<h1>Блины</h1>\n<figure>\n  <img src=\"https://picsum.photos/400/250\" alt=\"Стопка блинов со сметаной\">\n  <figcaption>Готовятся за <time datetime=\"PT30M\">30 минут</time></figcaption>\n</figure>\n<h2>Ингредиенты</h2>\n<ul>\n  <li>Молоко — 500 мл</li>\n  <li>Мука — 200 г</li>\n  <li>Яйца — 2 шт.</li>\n</ul>\n<h2>Как готовить</h2>\n<ol>\n  <li>Смешайте всё венчиком.</li>\n  <li>Жарьте на горячей сковороде.</li>\n</ol>"
    })
  ]
};
