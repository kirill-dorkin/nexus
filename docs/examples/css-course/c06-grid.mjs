// Chapter 6: Grid.
import { scene, prop, fn, val, idea, rule, page, css, task, makeLesson } from "./kit.mjs";

const cells = (n) => Array.from({ length: n }, (_, i) => `<div>${i + 1}</div>`).join("");
const base = ".g > * { background: #fdf6ec; border: 1px solid #c8763a; padding: 6px; }";

export default function grid(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "grid-basics", title: "Grid: колонки и строки", summary: "display: grid, grid-template-columns и rows, единица fr, repeat() и minmax().",
    skill: ["css-grid-basics", "Основы Grid", "Строить сетку из колонок и строк с гибкими размерами."],
    now: "Строим сетку из колонок и строк с Grid.",
    body: [
      scene("Сетка",
        ["you", "Каталог — три колонки карточек одинаковой ширины."],
        ["bro", "Флекс — для одного ряда. Grid — для сетки в двух измерениях: колонки И строки сразу."]),
      idea("display: grid", "Грид-контейнер", "Дети раскладываются по ячейкам сетки, которую ты описываешь.", "Карточки меню, галереи, раскладка всей страницы.", page(`.g { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; } ${base}`, `<div class="g">${cells(6)}</div>`)),
      prop("grid-template-columns", "Колонки", "Ширины колонок через пробел: `200px 1fr 1fr`.", "Описать сетку одной строкой.", page(`.g { display: grid; grid-template-columns: 80px 1fr 2fr; gap: 8px; } ${base}`, `<div class="g">${cells(3)}</div>`)),
      prop("grid-template-rows", "Строки", "Высоты строк: `auto 1fr auto`.", "Шапка, содержимое, подвал.", page(`.g { display: grid; grid-template-rows: 30px 60px; gap: 4px; } ${base}`, `<div class="g">${cells(2)}</div>`)),
      val("fr", "Доля свободного места", "`1fr 2fr` — вторая колонка вдвое шире первой.", "Гибкие колонки без процентов и calc.", page(`.g { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; } ${base}`, `<div class="g"><div>1fr</div><div>2fr</div></div>`)),
      fn("repeat()", "Повторить", "`repeat(3, 1fr)` = `1fr 1fr 1fr`.", "Не писать одно и то же много раз.", page(`.g { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; } ${base}`, `<div class="g">${cells(4)}</div>`)),
      fn("minmax()", "От и до", "`minmax(200px, 1fr)` — не уже 200px, но может расти.", "Колонки, которые не сжимаются до нечитаемого.", page(`.g { display: grid; grid-template-columns: minmax(120px, 1fr) 2fr; gap: 8px; } ${base}`, `<div class="g">${cells(2)}</div>`)),
      rule("Одномерный ряд — флекс. Сетка из колонок и строк — грид.")
    ],
    tasks: [task("Три колонки меню", "Сделай `.menu` гридом из трёх равных колонок (`repeat(3, 1fr)`) с промежутком `16px`.", {
      start: page("", "<div class=\"menu\"><article>Пенал</article><article>Ручка</article><article>Блокнот</article></div>"),
      checks: [css(".menu", "display", "Грид", { value: "grid" }), css(".menu", "grid-template-columns", "Три равные колонки", { value: ["repeat(3,1fr)", "1fr 1fr 1fr"] }), css(".menu", "gap", "Промежуток", { value: "16px" })],
      solution: page(".menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }", "<div class=\"menu\"><article>Пенал</article><article>Ручка</article><article>Блокнот</article></div>")
    })],
    quizzes: [
      single("css-grid-fr", "fr", "Что значит `grid-template-columns: 1fr 3fr`?", [["ratio", "Вторая колонка втрое шире первой"], ["px", "1px и 3px"], ["count", "4 колонки"], ["rows", "Это про строки"]], "ratio", "`fr` — доля свободного места."),
      single("css-grid-vs-flex", "Грид или флекс", "Что лучше подходит для сетки карточек в несколько строк и колонок?", [["grid", "Grid"], ["flex", "Только Flexbox"], ["float", "float"], ["table", "Таблица"]], "grid", "Grid управляет обоими измерениями сразу.")
    ]
  });

  L({
    slug: "grid-placement", title: "Grid: расстановка и области", summary: "grid-column, grid-row, span, grid-area и именованные области grid-template-areas.",
    skill: ["css-grid-placement", "Расстановка в гриде", "Ставить элементы в нужные ячейки и описывать раскладку областями."],
    now: "Расставляем элементы в сетке и описываем раскладку областями.",
    body: [
      scene("Раскладка картинкой",
        ["you", "Шапка сверху на всю ширину, слева каталог, справа новости, внизу подвал."],
        ["bro", "Нарисуй мне раскладку словами в `grid-template-areas` — я расставлю всё по местам."]),
      prop("grid-column", "Колонки элемента", "`grid-column: 1 / 3` — с первой линии по третью; `span 2` — на две колонки.", "Широкая карточка «Хит недели».", page(`.g { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; } .wide { grid-column: span 2; } ${base}`, `<div class="g"><div class="wide">На 2 колонки</div>${cells(4)}</div>`)),
      prop("grid-row", "Строки элемента", "`grid-row: 1 / 3` или `span 2`.", "Высокое фото на две строки.", page(`.g { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .tall { grid-row: span 2; } ${base}`, `<div class="g"><div class="tall">На 2 строки</div>${cells(2)}</div>`)),
      prop("grid-template-areas", "Именованные области", "Раскладка строками: `\"header header\" \"menu aside\"`.", "Раскладка страницы читается как схема.", page(`.g { display: grid; grid-template-areas: "h h" "m a"; gap: 6px; } .h { grid-area: h; } .m { grid-area: m; } .a { grid-area: a; } ${base}`, `<div class="g"><div class="h">Шапка</div><div class="m">Меню</div><div class="a">Акции</div></div>`)),
      prop("grid-area", "Место в области", "Ставит элемент в именованную область или задаёт строки и колонки сразу.", "Каждый блок страницы — в свою область.", undefined),
      rule("Раскладка страницы в `grid-template-areas` читается как картинка — удобно и через полгода.")
    ],
    tasks: [task("Раскладка главной", "Опиши `.page` областями: `grid-template-areas: \"header header\" \"menu aside\"`, и поставь `header` в область `header` через `grid-area`.", {
      start: page(".page { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }", "<div class=\"page\"><header>Шапка</header><main class=\"menu\">Меню</main><aside>Акции</aside></div>"),
      checks: [css(".page", "grid-template-areas", "Области описаны", { value: "\"header header\" \"menu aside\"" }), css("header", "grid-area", "Шапка в своей области", { value: "header" })],
      solution: page(".page { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; grid-template-areas: \"header header\" \"menu aside\"; }\nheader { grid-area: header; }\n.menu { grid-area: menu; }\naside { grid-area: aside; }", "<div class=\"page\"><header>Шапка</header><main class=\"menu\">Меню</main><aside>Акции</aside></div>")
    })],
    quizzes: [
      single("css-grid-span", "span", "Что значит `grid-column: span 2`?", [["two", "Элемент занимает две колонки"], ["second", "Элемент во второй колонке"], ["gap", "Промежуток 2"], ["rows", "Две строки"]], "two", "`span` — растянуть на N дорожек."),
      single("css-grid-areas", "Области", "Зачем нужен `grid-template-areas`?", [["picture", "Описать раскладку именами областей, как схему"], ["color", "Покрасить ячейки"], ["count", "Посчитать элементы"], ["anim", "Анимировать сетку"]], "picture", "Раскладка читается как картинка.")
    ]
  });

  L({
    slug: "grid-auto", title: "Grid: автоматическая сетка", summary: "auto-fill и auto-fit, неявные строки grid-auto-rows и grid-auto-columns, grid-auto-flow и dense.",
    skill: ["css-grid-auto", "Автоматическая сетка", "Строить адаптивную сетку без медиазапросов."],
    now: "Строим адаптивную сетку без медиазапросов.",
    body: [
      scene("Сама подстроится",
        ["you", "Иногда в каталоге три товара, иногда двенадцать. И на телефоне тоже должно быть красиво."],
        ["nika", "Одна строка CSS: `repeat(auto-fill, minmax(200px, 1fr))`. Сколько колонок влезет — столько и будет."]),
      val("auto-fill · auto-fit", "Сколько влезет", "`repeat(auto-fill, minmax(200px, 1fr))` — столько колонок, сколько поместится. `auto-fit` растягивает элементы, если их мало.", "Адаптивная сетка без медиазапросов.", page(`.g { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; } ${base}`, `<div class="g">${cells(7)}</div>`)),
      prop("grid-auto-rows", "Высота новых строк", "Размер строк, которые грид создаёт сам.", "Все строки карточек одной высоты.", page(`.g { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 50px; gap: 6px; } ${base}`, `<div class="g">${cells(6)}</div>`)),
      prop("grid-auto-columns", "Ширина новых колонок", "Размер колонок, созданных автоматически.", "Горизонтальная лента карточек.", page(`.g { display: grid; grid-auto-flow: column; grid-auto-columns: 80px; gap: 6px; overflow-x: auto; } ${base}`, `<div class="g">${cells(5)}</div>`)),
      prop("grid-auto-flow", "Как заполнять", "`row` (по умолчанию), `column`, `dense` — заполнять дыры.", "Плотная галерея из фото разного размера.", page(`.g { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-flow: dense; gap: 6px; } .w { grid-column: span 2; } ${base}`, `<div class="g"><div>1</div><div class="w">2 широкая</div><div class="w">3 широкая</div><div>4</div></div>`)),
      rule("`repeat(auto-fill, minmax(…, 1fr))` — самая полезная строчка Grid. Запомни её.")
    ],
    tasks: [task("Меню без медиазапросов", "Сделай `.menu` гридом с колонками `repeat(auto-fill, minmax(200px, 1fr))` и промежутком `16px`.", {
      start: page(".menu { display: grid; grid-template-columns: repeat(3, 1fr); }", "<div class=\"menu\"><article>Пенал</article><article>Ручка</article><article>Ластик</article><article>Чай</article></div>"),
      checks: [css(".menu", "grid-template-columns", "Колонки сами подстраиваются", { value: ["repeat(auto-fill,minmax(200px,1fr))", "repeat(auto-fit,minmax(200px,1fr))"] }), css(".menu", "gap", "Промежуток", { value: "16px" })],
      solution: page(".menu { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }", "<div class=\"menu\"><article>Пенал</article><article>Ручка</article><article>Ластик</article><article>Чай</article></div>")
    })],
    quizzes: [
      single("css-grid-autofill", "Адаптивная сетка", "Что делает `repeat(auto-fill, minmax(200px, 1fr))`?", [["fit", "Ставит столько колонок шириной от 200px, сколько влезет"], ["fixed", "Ровно 200 колонок"], ["one", "Одну колонку 200px"], ["rows", "Создаёт строки по 200px"]], "fit", "Число колонок зависит от ширины контейнера."),
      single("css-grid-dense", "dense", "Зачем `grid-auto-flow: dense`?", [["holes", "Заполнять пустые места более поздними элементами"], ["speed", "Ускорить отрисовку"], ["column", "Ставить в колонку"], ["fix", "Запретить перенос"]], "holes", "Плотная упаковка, порядок может меняться визуально.")
    ]
  });

  L({
    slug: "grid-alignment", title: "Grid: выравнивание и subgrid", summary: "justify-items, justify-self, place-items, place-content, place-self и subgrid.",
    skill: ["css-grid-align", "Выравнивание в гриде", "Выравнивать ячейки и содержимое и выравнивать вложенные сетки по родительской."],
    now: "Выравниваем ячейки сетки и используем subgrid.",
    body: [
      scene("На одной линии",
        ["you", "В карточках разной длины описания, но цены и кнопки должны стоять на одной линии."],
        ["bro", "`subgrid` даст вложенной сетке те же строки, что у родителя. И всё совпадёт."]),
      prop("justify-items", "Ячейки по горизонтали", "Выравнивание содержимого всех ячеек по строковой оси: `start`, `center`, `stretch`.", "Иконки по центру ячеек.", page(`.g { display: grid; grid-template-columns: repeat(3, 1fr); justify-items: center; gap: 6px; } ${base}`, `<div class="g">${cells(3)}</div>`)),
      prop("justify-self", "Одна ячейка", "Выравнивание одного элемента по строковой оси.", "Кнопка справа в ячейке.", page(`.g { display: grid; } .r { justify-self: end; } ${base}`, `<div class="g"><div class="r">Справа</div></div>`)),
      prop("place-items", "Обе оси сразу", "`place-items: center` = `align-items` + `justify-items`.", "Центр по обеим осям одной строкой.", page(".box { display: grid; place-items: center; height: 70px; background: #fdf6ec; }", "<div class=\"box\">По центру</div>")),
      prop("place-content", "Вся сетка в контейнере", "Выравнивает всю сетку, если она меньше контейнера.", "Сетка карточек по центру страницы.", page(`.g { display: grid; grid-template-columns: repeat(2, 60px); place-content: center; height: 80px; gap: 4px; background: #fffaf3; } ${base}`, `<div class="g">${cells(2)}</div>`)),
      prop("place-self", "Один элемент по обеим осям", "`place-self: center` для одного элемента.", "Значок по центру своей ячейки.", page(`.g { display: grid; height: 60px; } .c { place-self: center; } ${base}`, `<div class="g"><div class="c">Центр</div></div>`)),
      val("subgrid", "Сетка родителя", "`grid-template-rows: subgrid` — вложенный грид берёт строки родителя.", "Цены и кнопки в разных карточках на одной линии.", page(`.g { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; } .card { display: grid; grid-row: span 3; grid-template-rows: subgrid; background: #fdf6ec; padding: 6px; }`, `<div class="g"><div class="card"><b>Пенал</b><span>Короткое</span><button>290 ₽</button></div><div class="card"><b>Ручка</b><span>Очень длинное описание в несколько строк текста</span><button>220 ₽</button></div></div>`)),
      rule("Хочешь, чтобы части разных карточек совпадали по линиям, — `subgrid`.")
    ],
    tasks: [task("Центр без мучений", "Отцентруй содержимое `.badge` по обеим осям через грид: `display: grid` и `place-items: center`.", {
      start: page(".badge { width: 80px; height: 80px; background: #c8763a; color: white; border-radius: 50%; }", "<div class=\"badge\">NEW</div>"),
      checks: [css(".badge", "display", "Грид", { value: "grid" }), css(".badge", "place-items", "По центру", { value: "center" })],
      solution: page(".badge { width: 80px; height: 80px; background: #c8763a; color: white; border-radius: 50%; display: grid; place-items: center; }", "<div class=\"badge\">NEW</div>")
    })],
    quizzes: [
      single("css-grid-place", "Центр", "Как одной строкой отцентровать содержимое грид-контейнера по обеим осям?", [["pi", "`place-items: center`"], ["ta", "`text-align: center`"], ["m", "`margin: auto` у контейнера"], ["jc", "`justify-content: center` только"]], "pi", "`place-items` — сокращение для align-items и justify-items."),
      single("css-grid-subgrid", "subgrid", "Зачем `subgrid`?", [["align", "Чтобы вложенная сетка использовала дорожки родителя"], ["speed", "Чтобы ускорить грид"], ["nest", "Чтобы запретить вложенность"], ["gap", "Чтобы убрать gap"]], "align", "Части разных карточек выравниваются по общим линиям.")
    ]
  });

  L({
    slug: "project-menu-grid", title: "Проект: сетка каталога", summary: "Адаптивное меню из карточек на Grid с широкой карточкой хита.",
    skill: ["css-project-grid", "Сетка меню", "Собрать адаптивную сетку карточек на Grid."],
    now: "Проект: адаптивная сетка карточек.",
    body: [scene("Меню-сетка", ["you", "Сетка карточек, хит недели — на две колонки, на телефоне всё в одну."], ["nika", "Сетка, широкая карточка и ровные строки — по шагу."])],
    tasks: [
      task("Шаг 1. Адаптивная сетка", "`.menu`: грид, `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`, `gap: 20px`.", {
        start: page("", "<section class=\"menu\"><article class=\"hit\">Хит: пенал</article><article>Ручка</article><article>Ластик</article><article>Чай</article></section>"),
        checks: [css(".menu", "display", "Грид", { value: "grid" }), css(".menu", "grid-template-columns", "Адаптивные колонки", { includes: "minmax(220px,1fr)" }), css(".menu", "gap", "Промежутки", { value: "20px" })],
        solution: page(".menu { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }", "<section class=\"menu\"><article class=\"hit\">Хит: пенал</article><article>Ручка</article><article>Ластик</article><article>Чай</article></section>")
      }),
      task("Шаг 2. Хит недели", "Карточка `.hit` занимает две колонки: `grid-column: span 2`.", {
        start: page(".menu { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }", "<section class=\"menu\"><article class=\"hit\">Хит: пенал</article><article>Ручка</article></section>"),
        checks: [css(".hit", "grid-column", "На две колонки", { value: "span 2" })],
        solution: page(".menu { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }\n.hit { grid-column: span 2; }", "<section class=\"menu\"><article class=\"hit\">Хит: пенал</article><article>Ручка</article></section>")
      }),
      task("Шаг 3. Ровные строки", "Задай `.menu` `grid-auto-rows: 1fr`, чтобы все строки были одной высоты, а карточкам `.menu article` — `padding: 16px` и фон `#fffaf3`.", {
        start: page(".menu { display: grid; gap: 20px; }", "<section class=\"menu\"><article>Ручка</article><article>Ластик</article></section>"),
        checks: [css(".menu", "grid-auto-rows", "Строки одной высоты", { value: "1fr" }), css(".menu article", "padding", "Отступы карточек", { value: "16px" }), css(".menu article", "background-color", "Фон карточек", { value: "#fffaf3" })],
        solution: page(".menu { display: grid; gap: 20px; grid-auto-rows: 1fr; }\n.menu article { padding: 16px; background-color: #fffaf3; }", "<section class=\"menu\"><article>Ручка</article><article>Ластик</article></section>")
      })
    ],
    quizzes: [single("css-proj-grid-span", "Широкая карточка", "Как сделать карточку шириной в две колонки грида?", [["span", "`grid-column: span 2`"], ["width", "`width: 200%`"], ["flex", "`flex: 2`"], ["cols", "`columns: 2`"]], "span", "Растягиваем элемент на две дорожки.")]
  });
}
