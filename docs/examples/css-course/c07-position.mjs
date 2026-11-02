// Chapter 7: Positioning, stacking, floats and multi-column text.
import { scene, prop, val, idea, rule, page, css, task, makeLesson } from "./kit.mjs";

const box = "background: #fdf6ec; border: 1px solid #c8763a; padding: 6px;";

export default function position(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "position", title: "position: где стоит элемент", summary: "static, relative, absolute, fixed, sticky и координаты top, right, bottom, left, inset.",
    skill: ["css-position", "Позиционирование", "Выбирать вид позиционирования и задавать координаты элемента."],
    now: "На фото латте нужна плашка «Хит», а шапка должна прилипать к верху при прокрутке.",
    body: [
      scene("Плашка и липкая шапка",
        ["sonya", "Плашка «Хит» — в углу фото. А шапка не уезжает при прокрутке."],
        ["bro", "Это `position`. Плашка — `absolute` внутри `relative`, шапка — `sticky`."]),
      prop("position", "Вид позиционирования", "Как элемент участвует в потоке: `static` (обычно), `relative`, `absolute`, `fixed`, `sticky`.", "Плашки, всплывашки, липкие шапки.", page(`.photo { position: relative; height: 70px; ${box} } .tag { position: absolute; top: 6px; right: 6px; background: #c8763a; color: white; padding: 2px 6px; }`, `<div class="photo">Фото латте<span class="tag">Хит</span></div>`)),
      val("relative", "Сдвиг от своего места", "Элемент остаётся в потоке, но его можно сдвинуть `top`/`left`. И главное — он становится опорой для `absolute`-детей.", "Опора для плашки.", page(`.a { position: relative; left: 20px; ${box} }`, `<div class="a">Сдвинут на 20px</div><div style="${box}">Соседу место не уступили</div>`)),
      val("absolute", "Вне потока", "Элемент вынут из потока и ставится относительно ближайшего позиционированного предка.", "Плашка в углу карточки, крестик закрытия.", page(`.card { position: relative; height: 60px; ${box} } .x { position: absolute; top: 4px; right: 6px; }`, `<div class="card">Окно<b class="x">×</b></div>`)),
      val("fixed", "Привязан к окну", "Стоит на месте при прокрутке, относительно окна браузера.", "Кнопка «Наверх», плашка cookies.", undefined),
      val("sticky", "Прилипает", "Ведёт себя как обычный, пока не доедет до `top` — дальше прилипает.", "Шапка и заголовки разделов меню.", page(`.wrap { height: 90px; overflow: auto; } h4 { position: sticky; top: 0; background: #c8763a; color: white; margin: 0; padding: 4px; } p { margin: 4px 0 40px; }`, `<div class="wrap"><h4>Кофе</h4><p>Прокрути…</p><h4>Чай</h4><p>Ещё…</p><p>…</p></div>`)),
      prop("top · right · bottom · left", "Координаты", "Расстояния от краёв опоры. Работают, только если `position` не `static`.", "Точно поставить плашку.", undefined),
      prop("inset", "Все стороны сразу", "`inset: 0` = `top: 0; right: 0; bottom: 0; left: 0`.", "Растянуть затемнение на всю карточку.", page(`.card { position: relative; height: 60px; ${box} } .shade { position: absolute; inset: 0; background: rgb(0 0 0 / .4); color: white; display: grid; place-items: center; }`, `<div class="card">Фото<div class="shade">Скоро</div></div>`)),
      rule("`absolute` ищет ближайшего предка с `position` — не забудь поставить ему `relative`.")
    ],
    tasks: [task("Плашка «Хит»", "Сделай `.photo` опорой (`position: relative`), а `.tag` поставь `position: absolute` с `top: 8px` и `right: 8px`.", {
      start: page(".photo { height: 120px; background: #e9d5bd; }\n.tag { background: #c8763a; color: white; padding: 2px 8px; }", "<div class=\"photo\"><span class=\"tag\">Хит</span></div>"),
      checks: [css(".photo", "position", "Опора", { value: "relative" }), css(".tag", "position", "Плашка вне потока", { value: "absolute" }), css(".tag", "top", "Сверху", { value: "8px" }), css(".tag", "right", "Справа", { value: "8px" })],
      solution: page(".photo { height: 120px; background: #e9d5bd; position: relative; }\n.tag { background: #c8763a; color: white; padding: 2px 8px; position: absolute; top: 8px; right: 8px; }", "<div class=\"photo\"><span class=\"tag\">Хит</span></div>")
    }), task("Липкая шапка", "Сделай `header` липким: `position: sticky` и `top: 0`.", {
      start: page("header { background: white; }", "<header>Зерно</header><main>Длинное меню…</main>"),
      checks: [css("header", "position", "Липкая", { value: "sticky" }), css("header", "top", "К верху", { value: "0" })],
      solution: page("header { background: white; position: sticky; top: 0; }", "<header>Зерно</header><main>Длинное меню…</main>")
    })],
    quizzes: [
      single("css-pos-absolute", "absolute", "Относительно чего ставится элемент с `position: absolute`?", [["ancestor", "Ближайшего предка с position не static"], ["parent", "Всегда родителя"], ["window", "Всегда окна"], ["self", "Своего места в потоке"]], "ancestor", "Поэтому родителю ставят `relative`."),
      single("css-pos-sticky", "sticky", "Как ведёт себя `position: sticky`?", [["stick", "Как обычный, пока не доедет до порога, потом прилипает"], ["fixed", "Всегда закреплён у окна"], ["out", "Вынут из потока"], ["none", "Ничего не делает"]], "stick", "Липкость начинается с заданного `top`."),
      short("css-pos-inset", "inset", "Какое значение `inset` растягивает absolute-элемент на всю опору? Введи значение.", ["0"], "`inset: 0`.")
    ]
  });

  L({
    slug: "z-index-stacking", title: "z-index и слои", summary: "z-index, контекст наложения и isolation.",
    skill: ["css-stacking", "Слои", "Управлять порядком наложения и понимать контекст наложения."],
    now: "Всплывашка корзины оказалась ПОД карточками. Разбираемся со слоями.",
    body: [
      scene("Под карточками",
        ["marta", "Нажимаю «Корзина» — а окошко прячется под фото!"],
        ["bro", "Слои. `z-index` решает, кто выше. Но только внутри своего контекста наложения."]),
      prop("z-index", "Кто выше", "Число: больше — ближе к зрителю. Работает у позиционированных элементов, флекс- и грид-детей.", "Модалки, выпадающие меню.", page(`.a, .b { position: absolute; width: 70px; height: 40px; ${box} } .a { top: 6px; left: 6px; z-index: 2; background: #c8763a; color: white; } .b { top: 22px; left: 40px; z-index: 1; } .wrap { position: relative; height: 70px; }`, `<div class="wrap"><div class="a">z 2</div><div class="b">z 1</div></div>`)),
      idea("Контекст наложения", "Слоёный пирог", "Элемент с `z-index` (и `opacity < 1`, `transform`…) создаёт свой контекст: его дети не выпрыгнут выше соседей родителя, какой бы z-index ни был.", "Понять, почему `z-index: 9999` «не работает».", undefined),
      prop("isolation", "Свой контекст", "`isolation: isolate` создаёт контекст наложения без побочных эффектов.", "Изолировать слои компонента от остальной страницы.", page(`.card { isolation: isolate; position: relative; ${box} } .card::before { content: ""; position: absolute; inset: 0; background: #f0abfc; z-index: -1; }`, `<div class="card">Фон-слой не уехал под страницу</div>`)),
      rule("Не гонись за `z-index: 9999` — разберись, какой контекст наложения мешает.")
    ],
    tasks: [task("Окно корзины поверх", "Поставь `.cart-popup` `position: absolute` и `z-index: 10`, чтобы окно было над карточками.", {
      start: page(".shop { position: relative; }\n.card { position: relative; z-index: 1; }\n.cart-popup { top: 0; right: 0; background: white; }", "<div class=\"shop\"><div class=\"cart-popup\">Корзина: 2</div><div class=\"card\">Латте</div></div>"),
      checks: [css(".cart-popup", "position", "Позиционировано", { value: "absolute" }), css(".cart-popup", "z-index", "Выше карточек", { value: "10" })],
      solution: page(".shop { position: relative; }\n.card { position: relative; z-index: 1; }\n.cart-popup { top: 0; right: 0; background: white; position: absolute; z-index: 10; }", "<div class=\"shop\"><div class=\"cart-popup\">Корзина: 2</div><div class=\"card\">Латте</div></div>")
    })],
    quizzes: [
      single("css-z-why", "Не работает", "Почему у ребёнка `z-index: 9999` он всё равно под соседом родителя?", [["context", "Родитель создал свой контекст наложения"], ["max", "9999 — слишком мало"], ["bug", "Это баг браузера"], ["px", "Нужно писать в px"]], "context", "Дети не выходят за пределы контекста родителя."),
      single("css-z-isolation", "isolation", "Что делает `isolation: isolate`?", [["ctx", "Создаёт новый контекст наложения"], ["hide", "Скрывает элемент"], ["block", "Делает блочным"], ["clip", "Обрезает содержимое"]], "ctx", "Без смены позиции и прозрачности.")
    ]
  });

  L({
    slug: "float-columns", title: "float и колонки текста", summary: "float, clear, columns, column-count, column-gap и column-rule.",
    skill: ["css-float-columns", "Обтекание и колонки", "Делать обтекание картинки текстом и газетные колонки."],
    now: "В блоге кофейни картинка должна обтекаться текстом, а длинная статья — делиться на колонки.",
    body: [
      scene("Как в журнале",
        ["marta", "Хочу блог как в журнале: фото, а текст его обтекает."],
        ["lev", "Раньше float верстали целые страницы. Теперь он для того, для чего придуман, — обтекания."]),
      prop("float", "Обтекание", "`float: left` — элемент прижимается влево, текст обтекает его справа.", "Фото в статье.", page(`.pic { float: left; width: 50px; height: 50px; background: #c8763a; margin: 0 8px 4px 0; } p { margin: 0; }`, `<div class="pic"></div><p>Текст обтекает картинку: зерно обжаривают в среду, а пьют уже в пятницу. Текст продолжается под ней.</p>`)),
      prop("clear", "Не обтекать", "`clear: both` — элемент встаёт ниже всех float.", "Следующий раздел начинается под картинкой.", page(`.pic { float: left; width: 40px; height: 40px; background: #c8763a; margin-right: 8px; } h5 { clear: both; margin: 4px 0 0; }`, `<div class="pic"></div><p style="margin:0">Коротко.</p><h5>Новый раздел — под фото</h5>`)),
      prop("columns", "Колонки текста", "`columns: 2` или `columns: 200px` — текст сам делится на колонки.", "Длинная статья как в газете.", page("p { columns: 2; column-gap: 16px; margin: 0; }", "<p>Зерно приезжает из Эфиопии и Колумбии. Мы обжариваем его маленькими партиями, чтобы вкус был ярким, а аромат держался дольше обычного.</p>")),
      prop("column-count", "Число колонок", "`column-count: 3` — ровно три колонки.", "Фиксированная вёрстка списка.", undefined),
      prop("column-rule", "Линия между колонками", "`column-rule: 1px solid #ccc` — как border, но между колонками.", "Газетная линейка.", page("p { columns: 2; column-gap: 16px; column-rule: 1px solid #c8763a; margin: 0; }", "<p>Линия между колонками рисуется сама. Её не надо добавлять разметкой — это просто CSS.</p>")),
      rule("float — для обтекания. Для раскладки страницы есть flex и grid.")
    ],
    tasks: [task("Фото в статье", "Прижми `.pic` влево (`float: left`) с отступом `margin-right: 16px`, а `h2` начни под ним (`clear: both`).", {
      start: page(".pic { width: 120px; }", "<img class=\"pic\" src=\"latte.jpg\" alt=\"Латте\"><p>Как мы варим латте…</p><h2>Рецепт</h2>"),
      checks: [css(".pic", "float", "Обтекание слева", { value: "left" }), css(".pic", "margin-right", "Отступ от текста", { value: "16px" }), css("h2", "clear", "Заголовок под фото", { value: "both" })],
      solution: page(".pic { width: 120px; float: left; margin-right: 16px; }\nh2 { clear: both; }", "<img class=\"pic\" src=\"latte.jpg\" alt=\"Латте\"><p>Как мы варим латте…</p><h2>Рецепт</h2>")
    }), task("Газетная статья", "Раздели `.article` на две колонки (`columns: 2`) с линией `column-rule: 1px solid #c8763a`.", {
      start: page(".article { line-height: 1.6; }", "<div class=\"article\">Длинная история зерна…</div>"),
      checks: [css(".article", "columns", "Две колонки", { value: "2" }), css(".article", "column-rule", "Линия между колонками", { value: "1px solid #c8763a" })],
      solution: page(".article { line-height: 1.6; columns: 2; column-rule: 1px solid #c8763a; }", "<div class=\"article\">Длинная история зерна…</div>")
    })],
    quizzes: [
      single("css-float-use", "float сегодня", "Для чего сегодня уместен `float`?", [["wrap", "Обтекание картинки текстом"], ["layout", "Раскладка всей страницы"], ["center", "Центрирование"], ["anim", "Анимации"]], "wrap", "Для раскладки есть flex и grid."),
      single("css-columns-rule", "Линия", "Какое свойство рисует линию между колонками текста?", [["rule", "`column-rule`"], ["border", "`border-column`"], ["gap", "`column-gap`"], ["line", "`column-line`"]], "rule", "`column-rule` — как border, но между колонками.")
    ]
  });
}
