// Chapter 4: selectors.
import { scene, prop, sel, rule, page, css, task, makeLesson } from "./kit.mjs";

export default function selectors(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, short } = c;

  L({
    slug: "attribute-selectors", title: "Селекторы атрибутов", summary: "Выбор по атрибуту и его значению: [href], [type=\"email\"], ^=, $=, *=.",
    skill: ["css-attr-selectors", "Селекторы атрибутов", "Выбирать элементы по наличию и значению атрибутов."],
    now: "Выбираем элементы по атрибутам.",
    body: [
      scene("Значки у ссылок",
        ["you", "У ссылок на PDF — значок документа, у внешних — стрелочка. Классы руками не расставлять!"],
        ["bro", "Я умею выбирать по атрибутам: где ссылка начинается, чем заканчивается, что содержит."]),
      sel("[attr]", "Есть атрибут", "`[disabled]`, `[title]` — элементы с этим атрибутом.", "Стилизовать всё, у чего есть подсказка или запрет.", page("[title] { border-bottom: 1px dotted; }", "<abbr title=\"Без лактозы\">БЛ</abbr>")),
      sel("[attr=\"v\"]", "Точное значение", "`input[type=\"email\"]`.", "Разные поля формы по типу.", page("input[type=\"email\"] { border: 2px solid #c8763a; }", "<input type=\"email\" placeholder=\"email\"> <input placeholder=\"имя\">")),
      sel("[attr^=\"v\"]", "Начинается с", "`a[href^=\"https\"]` — внешние ссылки.", "Значок у внешних ссылок.", page("a[href^=\"http\"]::after { content: \" ↗\"; }", "<a href=\"https://partner.ru\">Партнёр</a> <a href=\"/menu\">Меню</a>")),
      sel("[attr$=\"v\"]", "Заканчивается на", "`a[href$=\".pdf\"]` — ссылки на PDF.", "Значок документа.", page("a[href$=\".pdf\"]::before { content: \"📄 \"; }", "<a href=\"menu.pdf\">Меню в PDF</a>")),
      sel("[attr*=\"v\"]", "Содержит", "`a[href*=\"site\"]` — в адресе есть «site».", "Свои ссылки среди чужих.", page("a[href*=\"site\"] { font-weight: 700; }", "<a href=\"https://example.com/menu\">наш сайт</a> <a href=\"https://other.ru\">чужой</a>")),
      rule("Селектор атрибута весит как класс. Им удобно размечать то, что уже есть в HTML.")
    ],
    tasks: [task("Значки у ссылок", "Ссылкам, у которых `href` заканчивается на `.pdf`, задай `font-weight: 700`; ссылкам, начинающимся с `https`, — `color: #c8763a`.", {
      start: page("", "<a href=\"menu.pdf\">Меню (PDF)</a>\n<a href=\"https://partner.ru\">Партнёр</a>"),
      checks: [css("a[href$=\".pdf\"]", "font-weight", "PDF жирные", { value: ["700", "bold"] }), css("a[href^=\"https\"]", "color", "Внешние цветом корицы", { value: "#c8763a" })],
      solution: page("a[href$=\".pdf\"] { font-weight: 700; }\na[href^=\"https\"] { color: #c8763a; }", "<a href=\"menu.pdf\">Меню (PDF)</a>\n<a href=\"https://partner.ru\">Партнёр</a>")
    })],
    quizzes: [
      single("css-attr-end", "Окончание", "Какой селектор выберет ссылки на PDF?", [["end", "`a[href$=\".pdf\"]`"], ["start", "`a[href^=\".pdf\"]`"], ["any", "`a[href*=\"pdf\"]` — только он"], ["class", "`a.pdf`"]], "end", "`$=` — «заканчивается на»."),
      short("css-attr-start", "Начало", "Каким оператором записать «атрибут начинается с»? Введи два символа.", ["^="], "`^=` — начинается, `$=` — заканчивается, `*=` — содержит.")
    ]
  });

  L({
    slug: "combinators", title: "Комбинаторы", summary: "Потомок, прямой ребёнок, соседи: пробел, >, + и ~.",
    skill: ["css-combinators", "Комбинаторы", "Выбирать элементы по положению относительно других."],
    now: "Выбираем элементы по их положению: комбинаторы.",
    body: [
      scene("По отношению",
        ["you", "Ссылки в меню — без подчёркивания. А абзац сразу после заголовка — крупнее."],
        ["nika", "Не нужны новые классы: опиши, где стоит элемент относительно других."]),
      sel("A B", "Потомок", "Пробел: B где угодно внутри A.", "Ссылки внутри навигации.", page("nav a { text-decoration: none; }", "<nav><a href=\"#\">Меню</a></nav><a href=\"#\">Обычная</a>")),
      sel("A > B", "Прямой ребёнок", "Только дети первого уровня.", "Пункты верхнего уровня меню, без вложенных.", page(".menu > li { font-weight: 700; }", "<ul class=\"menu\"><li>Канцтовары<ul><li>Пенал</li></ul></li></ul>")),
      sel("A + B", "Следующий сосед", "B сразу после A, у одного родителя.", "Лид-абзац сразу после заголовка.", page("h2 + p { font-size: 1.2em; }", "<h2>Пенал</h2><p>Первый абзац крупнее</p><p>Остальные обычные</p>")),
      sel("A ~ B", "Все следующие соседи", "Все B после A у одного родителя.", "Всё после отмеченного пункта.", page("h2 ~ p { color: #6b3e26; }", "<p>До</p><h2>Заголовок</h2><p>После</p><p>И это</p>")),
      rule("Короткие селекторы. `nav a` — хорошо, `body div ul li a` — хрупко и тяжело перебить.")
    ],
    tasks: [task("Меню и лид", "Ссылкам внутри `nav` убери подчёркивание (`text-decoration: none`), а абзацу сразу после `h1` задай `font-size: 1.25rem`.", {
      start: page("", "<nav><a href=\"/menu\">Меню</a></nav>\n<h1>Мой сайт</h1>\n<p>Заметки о путешествиях и фото.</p>\n<p>Открыты с 8 до 22.</p>"),
      checks: [css("nav a", "text-decoration", "Ссылки меню без подчёркивания", { value: "none" }), css("h1 + p", "font-size", "Лид после заголовка", { value: "1.25rem" })],
      solution: page("nav a { text-decoration: none; }\nh1 + p { font-size: 1.25rem; }", "<nav><a href=\"/menu\">Меню</a></nav>\n<h1>Мой сайт</h1>\n<p>Заметки о путешествиях и фото.</p>\n<p>Открыты с 8 до 22.</p>")
    })],
    quizzes: [
      single("css-comb-child", "Ребёнок", "Чем `ul > li` отличается от `ul li`?", [["direct", "`>` выбирает только прямых детей"], ["same", "Ничем"], ["next", "`>` выбирает соседей"], ["first", "`>` выбирает только первый li"]], "direct", "Пробел — любой уровень вложенности, `>` — только первый."),
      single("css-comb-plus", "Сосед", "Что выберет `h2 + p`?", [["next", "Абзац сразу после h2"], ["inside", "Абзацы внутри h2"], ["all", "Все абзацы после h2"], ["both", "И h2, и p"]], "next", "`+` — ровно следующий элемент-сосед.")
    ]
  });

  L({
    slug: "pseudo-classes", title: "Псевдоклассы", summary: "Структурные, логические и для форм: :first-child, :nth-child(), :not(), :is(), :where(), :has() и другие.",
    skill: ["css-pseudo-classes", "Псевдоклассы", "Выбирать элементы по положению, состоянию и содержимому."],
    now: "Стилизуем состояния элементов псевдоклассами.",
    body: [
      scene("Умные селекторы",
        ["you", "Каждая вторая строка списка — светлее. Карточка с фото — в две колонки, без фото — в одну."],
        ["bro", "Теперь я умею смотреть внутрь: `:has()` — «родитель, у которого есть…». Раньше это делали скриптами."]),
      sel(":first-child", "Первый ребёнок", "Элемент, который первый у родителя.", "Без верхнего отступа у первого пункта.", page("li:first-child { font-weight: 700; }", "<ul><li>Первый</li><li>Второй</li></ul>")),
      sel(":last-child", "Последний ребёнок", "Последний у родителя.", "Без разделителя после последнего пункта.", page("li { border-bottom: 1px solid #c8763a; } li:last-child { border-bottom: none; }", "<ul><li>Раз</li><li>Два</li><li>Последний без линии</li></ul>")),
      sel(":nth-child()", "По номеру", "`:nth-child(2n)` — чётные, `3` — третий, `-n+3` — первые три.", "«Зебра» в таблицах и списках.", page("li:nth-child(2n) { background: #fdf6ec; }", "<ul><li>1</li><li>2</li><li>3</li><li>4</li></ul>")),
      sel(":nth-of-type()", "По номеру среди своего типа", "Считает только элементы того же тега.", "Каждая вторая картинка среди абзацев.", page("p:nth-of-type(2) { color: #c8763a; }", "<h2>Заголовок</h2><p>Первый абзац</p><p>Второй абзац</p>")),
      sel(":not()", "Кроме", "`li:not(:last-child)` — все, кроме последнего.", "Разделители между пунктами без лишнего в конце.", page("li:not(:last-child)::after { content: \" ·\"; }", "<ul style=\"display:flex;gap:4px;list-style:none\"><li>Канцтовары</li><li>Чай</li><li>Аксессуары</li></ul>")),
      sel(":is()", "Любой из", "`:is(h1, h2, h3) a` — короче, чем перечислять. Вес — самого сильного внутри.", "Компактные селекторы.", page(":is(h1, h2) span { color: #c8763a; }", "<h1>Мой <span>блог</span></h1><h2>Меню <span>осень</span></h2>")),
      sel(":where()", "Любой из, с нулевым весом", "Как `:is()`, но специфичность 0.", "Базовые стили, которые легко перебить.", page(":where(ul, ol) { padding-left: 1rem; } .menu { padding-left: 0; }", "<ul class=\"menu\"><li>Перебили легко</li></ul>")),
      sel(":has()", "Родитель, у которого есть", "`.card:has(img)` — карточки, внутри которых есть картинка.", "Разная вёрстка в зависимости от содержимого — без скриптов.", page(".card:has(img) { border: 2px solid #c8763a; } .card { padding: 8px; margin: 4px 0; }", "<div class=\"card\"><img src=\"https://picsum.photos/id/431/60/40\" alt=\"\" width=\"60\" height=\"40\"> С фото</div><div class=\"card\">Без фото</div>")),
      sel(":empty", "Пустой", "Элемент без детей и текста.", "Скрыть пустую плашку.", page(".badge:empty { display: none; } .badge { background: #c8763a; color: white; padding: 2px 6px; }", "<span class=\"badge\">new</span> <span class=\"badge\"></span>")),
      sel(":root", "Корень документа", "Элемент `html`, удобно для переменных.", "Объявить цвета на весь сайт.", page(":root { --brand: #6b3e26; } h1 { color: var(--brand); }", "<h1>Мой сайт</h1>")),
      sel(":target", "Цель якоря", "Элемент, чей `id` в адресе после `#`.", "Подсветить раздел, к которому перешли.", undefined),
      sel(":focus-visible", "Фокус с клавиатуры", "Фокус, который нужно показать (обычно клавиатура, не клик мышью).", "Кольцо фокуса только для тех, кому оно нужно.", page("button:focus-visible { outline: 3px solid #c8763a; }", "<button>Tab ко мне</button>")),
      sel(":focus-within", "Фокус внутри", "Элемент, внутри которого что-то в фокусе.", "Подсветить всю форму поиска при вводе.", page("form:focus-within { box-shadow: 0 0 0 3px #c8763a; } form { padding: 6px; }", "<form><input placeholder=\"Поиск\"></form>")),
      sel(":checked", "Отмечен", "Отмеченный флажок, радио или option.", "Стилизовать выбранный вариант.", page("input:checked + label { font-weight: 700; color: #6b3e26; }", "<input type=\"checkbox\" id=\"w\" checked><label for=\"w\">У окна</label>")),
      sel(":disabled", "Отключён", "Отключённое поле или кнопка.", "Серый вид неактивной кнопки.", page("button:disabled { opacity: 0.5; cursor: not-allowed; }", "<button disabled>Нет мест</button>")),
      sel(":required", "Обязательное", "Поле с атрибутом `required`.", "Звёздочка у обязательных полей.", page("input:required { border-left: 4px solid #c8763a; }", "<input required placeholder=\"Телефон\">")),
      sel(":invalid", "Неверное", "Поле не прошло встроенную проверку (сразу, даже до ввода).", "Подсветить ошибку формата.", page("input:invalid { border-color: crimson; }", "<input type=\"email\" value=\"не почта\">")),
      sel(":user-invalid", "Неверное после ввода", "Как `:invalid`, но только после того, как человек взаимодействовал с полем.", "Не пугать красным пустую форму.", page("input:user-invalid { outline: 2px solid crimson; }", "<input type=\"email\" required placeholder=\"Почта\">")),
      rule("`:has()` — суперсила: «стилизуй родителя по содержимому». Раньше для этого был нужен JavaScript.")
    ],
    tasks: [task("Зебра и умные карточки", "Чётным пунктам `.menu li` задай фон `#fdf6ec` через `:nth-child(2n)`, а карточкам `.card`, в которых есть `img`, — рамку `2px solid #c8763a` через `:has()`.", {
      start: page("", "<ul class=\"menu\"><li>Пенал</li><li>Ручка</li><li>Блокнот</li></ul>\n<div class=\"card\"><img src=\"https://picsum.photos/id/431/80/60\" alt=\"Пенал\"> Пенал</div>"),
      checks: [css(".menu li:nth-child(2n)", "background-color", "Зебра", { value: "#fdf6ec" }), css(".card:has(img)", "border", "Рамка у карточек с фото", { value: "2px solid #c8763a" })],
      hint: "Можно писать и `:nth-child(even)`, но проверка ждёт `2n`.",
      solution: page(".menu li:nth-child(2n) { background-color: #fdf6ec; }\n.card:has(img) { border: 2px solid #c8763a; }", "<ul class=\"menu\"><li>Пенал</li><li>Ручка</li><li>Блокнот</li></ul>\n<div class=\"card\"><img src=\"https://picsum.photos/id/431/80/60\" alt=\"Пенал\"> Пенал</div>")
    })],
    quizzes: [
      single("css-pc-has", ":has()", "Что выберет `.card:has(img)`?", [["parent", "Карточки, внутри которых есть картинка"], ["img", "Картинки внутри карточек"], ["sibling", "Картинки рядом с карточками"], ["none", "Ничего, так нельзя"]], "parent", "`:has()` выбирает элемент по его содержимому."),
      single("css-pc-where", ":where()", "Чем `:where()` отличается от `:is()`?", [["zero", "У `:where()` нулевая специфичность"], ["faster", "Работает быстрее"], ["old", "Устарел"], ["same", "Ничем"]], "zero", "`:where()` не добавляет веса, поэтому его легко перебить."),
      single("css-pc-uinv", "Ошибка поля", "Какой псевдокласс подсветит ошибку только после того, как человек начал заполнять поле?", [["user", "`:user-invalid`"], ["inv", "`:invalid`"], ["req", "`:required`"], ["foc", "`:focus`"]], "user", "`:invalid` срабатывает сразу, `:user-invalid` — после взаимодействия.")
    ]
  });

  L({
    slug: "pseudo-elements", title: "Псевдоэлементы", summary: "::before и ::after с content, ::first-letter, ::first-line, ::selection, ::placeholder, ::backdrop.",
    skill: ["css-pseudo-elements", "Псевдоэлементы", "Добавлять декоративные элементы и стилизовать части текста."],
    now: "Добавляем оформление псевдоэлементами ::before, ::after и другими.",
    body: [
      scene("Декор без разметки",
        ["you", "Буквица у первого абзаца статьи, огромные кавычки у отзыва, фирменное выделение текста."],
        ["bro", "Могу нарисовать «виртуальные» элементы до и после содержимого. В HTML их нет — только в CSS."]),
      sel("::before", "Перед содержимым", "Виртуальный элемент в начале, нужен `content`.", "Значки, кавычки, декор.", page("blockquote::before { content: \"“\"; font-size: 3em; color: #c8763a; line-height: 0; vertical-align: -0.4em; }", "<blockquote>Лучший пенал в Казани</blockquote>")),
      sel("::after", "После содержимого", "Виртуальный элемент в конце.", "Стрелочка у внешней ссылки.", page("a::after { content: \" →\"; }", "<a href=\"#\">Читать дальше</a>")),
      prop("content", "Содержимое псевдоэлемента", "Строка `\"→\"`, `\"\"` для пустого декора, `counter()`, `attr()`.", "Без `content` псевдоэлемент не появится.", page(".new::after { content: \"NEW\"; background: #c8763a; color: white; font-size: 0.7em; margin-left: 6px; padding: 1px 4px; }", "<span class=\"new\">Пенал с лавандой</span>")),
      sel("::first-letter", "Первая буква", "Первая буква блока.", "Буквица в статье.", page("p::first-letter { font-size: 2.5em; float: left; line-height: 1; margin-right: 4px; color: #6b3e26; }", "<p>Обжарка — это искусство и немного химии. Мы занимаемся ей каждое утро.</p>")),
      sel("::first-line", "Первая строка", "Первая отображаемая строка блока.", "Первая строка статьи жирнее.", page("p::first-line { font-weight: 700; } p { width: 200px; }", "<p>Первая строка жирная, остальные — обычные, как в журнале.</p>")),
      sel("::selection", "Выделенный текст", "Цвет текста, выделенного мышью.", "Фирменное выделение.", page("::selection { background: #c8763a; color: white; }", "<p>Выдели меня мышью</p>")),
      sel("::placeholder", "Подсказка в поле", "Стиль текста `placeholder`.", "Подсказка не сливается с введённым текстом.", page("input::placeholder { color: #a08c7a; font-style: italic; }", "<input placeholder=\"Например, Анна\">")),
      sel("::backdrop", "Фон за диалогом", "Подложка за модальным `dialog` и полноэкранными элементами.", "Затемнить страницу под модальным окном.", page("dialog::backdrop { background: rgb(0 0 0 / 50%); }", "<dialog open>Окно</dialog>")),
      rule("Декор — в псевдоэлементах, смысл — в HTML. Текст в `content` скринридер может и не прочитать.")
    ],
    tasks: [task("Цитата с кавычкой", "Добавь отзыву `blockquote` декоративную кавычку через `::before` с `content: \"“\"` и цветом `#c8763a`, а первой букве `.article p` — `font-size: 2.5em`.", {
      start: page("", "<blockquote>Лучший пенал в Казани</blockquote>\n<div class=\"article\"><p>Обжарка — это искусство.</p></div>"),
      checks: [css("blockquote::before", "content", "Кавычка в `content`", { includes: "“" }), css("blockquote::before", "color", "Цвет корицы", { value: "#c8763a" }), css(".article p::first-letter", "font-size", "Буквица", { value: "2.5em" })],
      solution: page("blockquote::before { content: \"“\"; color: #c8763a; }\n.article p::first-letter { font-size: 2.5em; }", "<blockquote>Лучший пенал в Казани</blockquote>\n<div class=\"article\"><p>Обжарка — это искусство.</p></div>")
    })],
    quizzes: [
      single("css-pe-content", "content", "Что обязательно нужно, чтобы `::before` появился?", [["content", "Свойство `content`"], ["display", "`display: block`"], ["html", "Тег в HTML"], ["js", "JavaScript"]], "content", "Без `content` (хотя бы пустой строки) псевдоэлемента нет."),
      single("css-pe-colons", "Двоеточия", "Почему у псевдоэлементов два двоеточия (`::before`)?", [["distinct", "Чтобы отличать их от псевдоклассов"], ["required", "Одно не работает в браузерах"], ["faster", "Так быстрее"], ["css4", "Это CSS 4"]], "distinct", "Два двоеточия — псевдоэлемент, одно — псевдокласс.")
    ]
  });
}
