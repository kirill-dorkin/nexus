// Chapter 5: Flexbox.
import { scene, prop, idea, rule, page, css, task, makeLesson, diagram } from "./kit.mjs";

const items = (n = 3) => Array.from({ length: n }, (_, i) => `<div>${["Раф", "Латте", "Капучино", "Флэт уайт", "Какао"][i]}</div>`).join("");
const base = "div > div { background: #fdf6ec; border: 1px solid #c8763a; padding: 6px 10px; }";

export default function flex(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "flex-basics", title: "Flexbox: основы", summary: "display: flex, направление, перенос и промежутки gap.",
    skill: ["css-flex-basics", "Основы Flexbox", "Выстраивать элементы в ряд или колонку с переносом и промежутками."],
    now: "Меню в шапке стоит столбиком. Ставим пункты в ряд с Flexbox.",
    body: [
      scene("В ряд",
        ["sonya", "Пункты меню — в одну строку, с равными промежутками."],
        ["bro", "Скажи контейнеру `display: flex` — и я выстрою детей вдоль оси. По умолчанию — в ряд."]),
      idea("display: flex", "Флекс-контейнер", "Дети становятся флекс-элементами и выстраиваются вдоль главной оси.", "Самый простой способ поставить элементы в ряд и выровнять.", page(`.row { display: flex; } ${base}`, `<div class="row">${items()}</div>`)),
      diagram({ kind: "flow", title: "Две оси флекса", steps: [
        { title: "Главная ось", text: "Вдоль неё идут элементы (по умолчанию — слева направо)" },
        { title: "Поперечная ось", text: "Перпендикулярно главной (сверху вниз)" }
      ] }),
      prop("flex-direction", "Направление", "`row`, `column`, `row-reverse`, `column-reverse`.", "Колонка на телефоне, ряд на компьютере.", page(`.col { display: flex; flex-direction: column; gap: 4px; } ${base}`, `<div class="col">${items()}</div>`)),
      prop("flex-wrap", "Перенос", "`nowrap` (по умолчанию) или `wrap` — переносить на новую строку.", "Теги и карточки, которые не влезают в одну строку.", page(`.row { display: flex; flex-wrap: wrap; gap: 6px; width: 200px; } ${base}`, `<div class="row">${items(5)}</div>`)),
      prop("flex-flow", "Короткая запись", "`flex-flow: row wrap` — направление и перенос вместе.", "Компактно.", page(`.row { display: flex; flex-flow: row wrap; gap: 6px; width: 200px; } ${base}`, `<div class="row">${items(4)}</div>`)),
      prop("gap", "Промежутки", "Расстояние между элементами (во флексе и в гриде).", "Равные промежутки без margin и без лишнего отступа у краёв.", page(`.row { display: flex; gap: 16px; } ${base}`, `<div class="row">${items()}</div>`)),
      prop("row-gap", "Между строками", "Промежуток только между строками.", "При переносе — свой отступ по вертикали.", page(`.row { display: flex; flex-wrap: wrap; row-gap: 16px; column-gap: 4px; width: 200px; } ${base}`, `<div class="row">${items(4)}</div>`)),
      prop("column-gap", "Между колонками", "Промежуток только между элементами в строке.", "Плотнее по горизонтали, свободнее по вертикали.", undefined),
      rule("Ряд элементов, меню, кнопки рядом — это флекс. Отступы между ними — `gap`, а не margin.")
    ],
    tasks: [task("Меню в ряд", "Сделай `nav ul` флекс-контейнером с промежутком `24px` и убери маркеры (`list-style: none`).", {
      start: page("", "<nav><ul><li>Меню</li><li>Бронь</li><li>Контакты</li></ul></nav>"),
      checks: [css("nav ul", "display", "Флекс", { value: "flex" }), css("nav ul", "gap", "Промежуток 24px", { value: "24px" }), css("nav ul", "list-style", "Без маркеров", { value: "none" })],
      solution: page("nav ul { display: flex; gap: 24px; list-style: none; }", "<nav><ul><li>Меню</li><li>Бронь</li><li>Контакты</li></ul></nav>")
    })],
    quizzes: [
      single("css-flex-dir", "Колонка", "Как поставить флекс-элементы в колонку?", [["col", "`flex-direction: column`"], ["wrap", "`flex-wrap: column`"], ["vert", "`display: vertical`"], ["block", "`display: block-flex`"]], "col", "`flex-direction` задаёт главную ось."),
      single("css-flex-gap", "Промежутки", "Чем `gap` лучше `margin` для промежутков во флексе?", [["edges", "Не добавляет лишнего отступа у краёв"], ["color", "Умеет цвет"], ["old", "margin во флексе не работает"], ["same", "Ничем"]], "edges", "`gap` — только между элементами.")
    ]
  });

  L({
    slug: "flex-alignment", title: "Flexbox: выравнивание", summary: "justify-content, align-items, align-self, align-content и order.",
    skill: ["css-flex-align", "Выравнивание во флексе", "Выравнивать элементы по обеим осям и менять их порядок."],
    now: "Логотип слева, меню справа, всё ровно по центру по высоте — классическая шапка.",
    body: [
      scene("Логотип и меню",
        ["sonya", "Логотип слева, меню справа, и всё ровно по середине высоты шапки."],
        ["nika", "Два свойства: `justify-content` — по главной оси, `align-items` — по поперечной."]),
      prop("justify-content", "По главной оси", "`flex-start`, `center`, `space-between`, `space-around`, `space-evenly`.", "Логотип слева, меню справа: `space-between`.", page(`.row { display: flex; justify-content: space-between; } ${base}`, `<div class="row"><div>Зерно</div><div>Меню</div></div>`)),
      prop("align-items", "По поперечной оси", "`stretch` (по умолчанию), `center`, `flex-start`, `flex-end`, `baseline`.", "Элементы разной высоты по центру.", page(`.row { display: flex; align-items: center; height: 70px; background: #fffaf3; gap: 8px; } ${base}`, `<div class="row"><div style="font-size:24px">Зерно</div><div>Меню</div></div>`)),
      prop("align-self", "Один элемент", "Своё выравнивание для одного элемента.", "Кнопка прижата к низу карточки.", page(`.row { display: flex; height: 70px; gap: 8px; background: #fffaf3; } .end { align-self: flex-end; } ${base}`, `<div class="row"><div>Раф</div><div class="end">Внизу</div></div>`)),
      prop("align-content", "Строки при переносе", "Как распределить несколько строк флекса по поперечной оси.", "Ровная раскладка тегов в высоком блоке.", page(`.row { display: flex; flex-wrap: wrap; align-content: space-between; height: 100px; width: 200px; gap: 4px; } ${base}`, `<div class="row">${items(5)}</div>`)),
      prop("order", "Порядок", "Число: элементы с меньшим `order` идут раньше.", "Поменять порядок визуально. Осторожно: Tab идёт по порядку в HTML.", page(`.row { display: flex; gap: 6px; } .first { order: -1; } ${base}`, `<div class="row"><div>Раф</div><div class="first">Хит!</div></div>`)),
      idea("Центрирование", "Идеально по центру", "`display: flex; justify-content: center; align-items: center;` — центр по обеим осям.", "Знаменитая задача «отцентровать div» в три строки.", page(".box { display: flex; justify-content: center; align-items: center; height: 80px; background: #fdf6ec; }", "<div class=\"box\">Ровно по центру</div>")),
      rule("Порядок через `order` не меняет порядок для клавиатуры и читалки. Важный порядок — меняй в HTML.")
    ],
    tasks: [task("Классическая шапка", "Сделай `header` флексом: логотип и меню по краям (`justify-content: space-between`) и по центру высоты (`align-items: center`).", {
      start: page("header { padding: 12px; }", "<header><div class=\"logo\">Зерно</div><nav>Меню · Бронь</nav></header>"),
      checks: [css("header", "display", "Флекс", { value: "flex" }), css("header", "justify-content", "По краям", { value: "space-between" }), css("header", "align-items", "По центру высоты", { value: "center" })],
      solution: page("header { padding: 12px; display: flex; justify-content: space-between; align-items: center; }", "<header><div class=\"logo\">Зерно</div><nav>Меню · Бронь</nav></header>")
    })],
    quizzes: [
      single("css-flex-jc", "По краям", "Как разнести два элемента по краям флекс-контейнера?", [["sb", "`justify-content: space-between`"], ["ai", "`align-items: stretch`"], ["center", "`justify-content: center`"], ["order", "`order: 2`"]], "sb", "`space-between` прижимает крайние элементы к краям."),
      single("css-flex-order", "order", "Что не меняет свойство `order`?", [["tab", "Порядок обхода клавишей Tab"], ["visual", "Визуальный порядок"], ["position", "Место элемента на экране"], ["all", "Всё меняет"]], "tab", "Tab и читалки идут по порядку в HTML.")
    ]
  });

  L({
    slug: "flex-items", title: "Flexbox: гибкие элементы", summary: "flex-grow, flex-shrink, flex-basis и короткая запись flex.",
    skill: ["css-flex-items", "Гибкие элементы", "Управлять тем, как флекс-элементы растут и сжимаются."],
    now: "Поле поиска должно занимать всё свободное место, а кнопка — оставаться своего размера.",
    body: [
      scene("Растянуть поле",
        ["sonya", "Поиск по меню: поле на всю ширину, кнопка «Найти» — сколько нужно."],
        ["bro", "Скажи полю, что оно умеет расти, — отдам ему всё свободное место."]),
      prop("flex-grow", "Рост", "Доля свободного места, которую забирает элемент. `1` — забрать всё (поровну с другими единицами).", "Поле поиска растягивается.", page(`.row { display: flex; gap: 6px; } .grow { flex-grow: 1; } ${base}`, `<div class="row"><div class="grow">Поле</div><div>Найти</div></div>`)),
      prop("flex-shrink", "Сжатие", "Насколько элемент сжимается при нехватке места. `0` — не сжимать.", "Логотип не сплющивается.", page(`.row { display: flex; width: 160px; gap: 6px; } .keep { flex-shrink: 0; } ${base}`, `<div class="row"><div class="keep">Логотип-Зерно</div><div>Длинное меню сайта</div></div>`)),
      prop("flex-basis", "Исходный размер", "Размер до распределения места: `200px`, `30%`, `auto`.", "Колонки одинаковой базовой ширины.", page(`.row { display: flex; gap: 6px; } .row > div { flex-basis: 100px; } ${base}`, `<div class="row">${items()}</div>`)),
      prop("flex", "Короткая запись", "`flex: 1` — расти и сжимайся от нуля; `flex: 0 0 200px` — ровно 200px.", "Самая частая запись во флексе.", page(`.row { display: flex; gap: 6px; } .row > div { flex: 1; } ${base}`, `<div class="row">${items()}</div>`)),
      rule("`flex: 1` у всех — равные колонки. `flex: 1` у одного — он забирает свободное место.")
    ],
    tasks: [task("Поиск по меню", "Сделай `.search` флексом с `gap: 8px`, а полю `.search input` задай `flex: 1`.", {
      start: page("", "<form class=\"search\"><input placeholder=\"Раф, латте…\"><button>Найти</button></form>"),
      checks: [css(".search", "display", "Флекс", { value: "flex" }), css(".search", "gap", "Промежуток", { value: "8px" }), css(".search input", "flex", "Поле растягивается", { value: ["1", "1 1 0%", "1 1 0", "auto"] })],
      solution: page(".search { display: flex; gap: 8px; }\n.search input { flex: 1; }", "<form class=\"search\"><input placeholder=\"Раф, латте…\"><button>Найти</button></form>")
    })],
    quizzes: [
      single("css-flex-grow", "Рост", "Что значит `flex-grow: 1` у одного элемента, а у остальных `0`?", [["takes", "Он забирает всё свободное место"], ["half", "Он занимает ровно половину"], ["first", "Он встаёт первым"], ["nothing", "Ничего не меняется"]], "takes", "Свободное место делится между элементами с ненулевым flex-grow."),
      short("css-flex-shrink", "Не сжимать", "Какое значение `flex-shrink` запрещает элементу сжиматься? Введи число.", ["0"], "`flex-shrink: 0`.")
    ]
  });

  L({
    slug: "project-header", title: "Проект: шапка сайта", summary: "Собираем адаптивную шапку: логотип, меню, кнопка брони.",
    skill: ["css-project-header", "Шапка на флексе", "Собрать шапку сайта на Flexbox."],
    now: "Проект главы: шапка «Зерна» по макету Сони.",
    body: [scene("Шапка", ["sonya", "Логотип слева, меню посередине, кнопка «Забронировать» справа. На узком экране всё переносится."], ["marta", "И кнопка брони — заметная!"])],
    tasks: [
      task("Шаг 1. Ряд", "`header`: флекс, `align-items: center`, `gap: 24px`, `padding: 16px 24px`.", {
        start: page("", "<header><a class=\"logo\" href=\"/\">Зерно</a><nav><a href=\"/menu\">Меню</a> <a href=\"/about\">О нас</a></nav><a class=\"cta\" href=\"/booking\">Забронировать</a></header>"),
        checks: [css("header", "display", "Флекс", { value: "flex" }), css("header", "align-items", "По центру", { value: "center" }), css("header", "gap", "Промежутки", { value: "24px" }), css("header", "padding", "Отступы", { value: "16px 24px" })],
        solution: page("header { display: flex; align-items: center; gap: 24px; padding: 16px 24px; }", "<header><a class=\"logo\" href=\"/\">Зерно</a><nav><a href=\"/menu\">Меню</a> <a href=\"/about\">О нас</a></nav><a class=\"cta\" href=\"/booking\">Забронировать</a></header>")
      }),
      task("Шаг 2. Меню посередине", "Пусть `nav` растягивается (`flex: 1`), а шапка переносится на узком экране (`flex-wrap: wrap`).", {
        start: page("header { display: flex; align-items: center; gap: 24px; padding: 16px 24px; }", "<header><a class=\"logo\" href=\"/\">Зерно</a><nav><a href=\"/menu\">Меню</a></nav><a class=\"cta\" href=\"/booking\">Забронировать</a></header>"),
        checks: [css("nav", "flex", "Меню растягивается", { value: ["1", "1 1 0%", "auto"] }), css("header", "flex-wrap", "Перенос", { value: "wrap" })],
        solution: page("header { display: flex; align-items: center; gap: 24px; padding: 16px 24px; flex-wrap: wrap; }\nnav { flex: 1; }", "<header><a class=\"logo\" href=\"/\">Зерно</a><nav><a href=\"/menu\">Меню</a></nav><a class=\"cta\" href=\"/booking\">Забронировать</a></header>")
      }),
      task("Шаг 3. Кнопка брони", "`.cta`: фон `#6b3e26`, белый текст, `padding: 10px 20px`, `border-radius: 999px`, без подчёркивания.", {
        start: page("header { display: flex; gap: 24px; }", "<header><a class=\"logo\" href=\"/\">Зерно</a><a class=\"cta\" href=\"/booking\">Забронировать</a></header>"),
        checks: [css(".cta", "background-color", "Кофейный фон", { value: "#6b3e26" }), css(".cta", "color", "Белый текст", { value: ["white", "#fff", "#ffffff"] }), css(".cta", "padding", "Отступы", { value: "10px 20px" }), css(".cta", "border-radius", "Пилюля", { value: "999px" }), css(".cta", "text-decoration", "Без подчёркивания", { value: "none" })],
        solution: page("header { display: flex; gap: 24px; }\n.cta { background-color: #6b3e26; color: white; padding: 10px 20px; border-radius: 999px; text-decoration: none; }", "<header><a class=\"logo\" href=\"/\">Зерно</a><a class=\"cta\" href=\"/booking\">Забронировать</a></header>")
      })
    ],
    quizzes: [single("css-proj-header-wrap", "Перенос", "Что позволит шапке аккуратно переноситься на узком экране?", [["wrap", "`flex-wrap: wrap`"], ["nowrap", "`white-space: nowrap`"], ["overflow", "`overflow: hidden`"], ["order", "`order: 1`"]], "wrap", "Перенос флекс-элементов на новую строку.")]
  });
}
