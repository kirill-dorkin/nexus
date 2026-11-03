// Chapter 10: Modern CSS — variables, nesting, layers, logical properties, color schemes, forms, counters.
import { scene, prop, sel, at, fn, val, idea, rule, page, css, src, task, makeLesson } from "./kit.mjs";

const box = "background: #fdf6ec; border: 1px solid #c8763a; padding: 6px;";

export default function modern(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "custom-properties", title: "Переменные: --цвет и var()", summary: "Пользовательские свойства --x, var() с запасным значением, область видимости и @property.",
    skill: ["css-variables", "CSS-переменные", "Хранить цвета и размеры в переменных и менять тему одной строкой."],
    now: "Храним цвета и размеры в CSS-переменных.",
    body: [
      scene("Сорок раз",
        ["you", "Хочу фирменный цвет потемнее. Это же быстро?"],
        ["bro", "Он у нас в сорока местах. Заведём переменную `--brand` — и цвет будет меняться в одном месте."]),
      prop("--имя", "Своя переменная", "`:root { --brand: #c8763a; }` — свойство, которое придумал ты. Имя начинается с двух дефисов.", "Цвета, отступы, радиусы — в одном месте.", undefined),
      fn("var()", "Взять значение", "`color: var(--brand)`; запасное значение: `var(--brand, orange)`.", "Использовать переменную где угодно.", page(":root { --brand: #7c3f1d; } button { background: var(--brand); color: white; border: 0; padding: 8px 12px; } .alt { --brand: #c8763a; }", "<button>Обычная</button> <button class=\"alt\">Переопределила --brand</button>")),
      idea("Каскад переменных", "Переменные наследуются", "Переопредели переменную в `.dark` или в карточке — изменятся все потомки.", "Темы и варианты компонентов без копирования правил.", undefined),
      at("@property", "Переменная с типом", "`@property --angle { syntax: \"<angle>\"; inherits: false; initial-value: 0deg; }` — браузер знает тип и может её анимировать.", "Анимированные градиенты.", undefined),
      rule("Повторяется дважды — в переменную. Тема сайта — набор переменных.")
    ],
    tasks: [task("Фирменный цвет", "Заведи в `:root` переменную `--brand: #7c3f1d` и используй её у `.order`: `background-color: var(--brand)`.", {
      start: page(".order { background-color: #c8763a; color: white; }", "<button class=\"order\">Заказать</button>"),
      checks: [css(":root", "--brand", "Переменная заведена", { value: "#7c3f1d" }), css(".order", "background-color", "Кнопка берёт цвет из переменной", { value: "var(--brand)" })],
      solution: page(":root { --brand: #7c3f1d; }\n.order { background-color: var(--brand); color: white; }", "<button class=\"order\">Заказать</button>")
    })],
    quizzes: [
      single("css-var-fallback", "Запасное значение", "Что выведет `color: var(--accent, tomato)`, если `--accent` не задана?", [["tomato", "`tomato`"], ["black", "Чёрный"], ["error", "Ошибку"], ["none", "Ничего"]], "tomato", "Второй аргумент — запасной."),
      short("css-var-prefix", "Имя", "С каких символов начинается имя CSS-переменной? Введи их.", ["--"], "`--brand`, `--gap`.")
    ]
  });

  L({
    slug: "nesting-layers", title: "Вложенность, @layer и @scope", summary: "Нативная вложенность с &, каскадные слои @layer и область @scope.",
    skill: ["css-nesting-layers", "Структура стилей", "Писать вложенные правила и управлять порядком каскада через слои."],
    now: "Наводим порядок в стилях: вложенность, @layer и @scope.",
    body: [
      scene("Наводим порядок",
        ["lev", "Раньше для вложенности ставили препроцессоры. Теперь браузер умеет сам."],
        ["bro", "И ещё `@layer`: сброс, база, компоненты — и больше никаких войн специфичности."]),
      sel("&", "Вложенность", "Правила внутри правил: `.card { & h3 { … } &:hover { … } }`. `&` — это родитель.", "Стили компонента в одном блоке.", page(".card { padding: 8px; background: #fdf6ec; & b { color: #c8763a; } &:hover { background: #fbe7d3; } }", "<div class=\"card\"><b>Ручка</b> — наведи</div>")),
      at("@layer", "Каскадные слои", "`@layer reset, base, components;` — слой позже в списке побеждает, независимо от специфичности.", "Предсказуемый каскад в большом проекте.", page("@layer base, components; @layer components { .btn { background: #c8763a; color: white; } } @layer base { button { background: #ddd; } }", "<button class=\"btn\">Слой components победил</button>")),
      at("@scope", "Область стилей", "`@scope (.card) { img { … } }` — правила работают только внутри `.card`.", "Стили компонента не протекают наружу.", undefined),
      rule("Слои решают порядок, вложенность — читаемость, `@scope` — границы.")
    ],
    tasks: [task("Вложенная карточка", "Внутри правила `.card` вложи `&:hover` с `background-color: #fbe7d3`.", {
      start: page(".card { padding: 16px; background-color: #fffaf3; }", "<article class=\"card\">Ручка</article>"),
      checks: [css(".card:hover", "background-color", "Наведение описано вложенно", { value: "#fbe7d3" }), src("&:hover", "Использован &")],
      solution: page(".card {\n  padding: 16px;\n  background-color: #fffaf3;\n  &:hover { background-color: #fbe7d3; }\n}", "<article class=\"card\">Ручка</article>")
    }), task("Слой компонентов", "Внутри `@layer components` задай `.btn` `background-color: #c8763a`.", {
      start: page("@layer base, components;\n@layer base { button { background-color: #ddd; } }", "<button class=\"btn\">Заказать</button>"),
      checks: [css(".btn", "background-color", "Кнопка в слое components", { value: "#c8763a", within: "@layer components" })],
      solution: page("@layer base, components;\n@layer base { button { background-color: #ddd; } }\n@layer components { .btn { background-color: #c8763a; } }", "<button class=\"btn\">Заказать</button>")
    })],
    quizzes: [
      single("css-nest-amp", "&", "Что означает `&` во вложенном правиле?", [["parent", "Родительский селектор"], ["and", "Логическое «и» между свойствами"], ["all", "Все элементы"], ["root", "`:root`"]], "parent", "`&:hover` внутри `.card` = `.card:hover`."),
      single("css-layer-win", "Слои", "Кто побеждает при `@layer base, components;`?", [["later", "Правила слоя `components`, даже с меньшей специфичностью"], ["spec", "Всегда более специфичный селектор"], ["first", "Слой `base`"], ["random", "Как повезёт"]], "later", "Порядок слоёв важнее специфичности.")
    ]
  });

  L({
    slug: "logical-properties", title: "Логические свойства", summary: "margin-inline, margin-block, padding-inline, padding-block, inline-size, block-size, inset-inline и writing-mode.",
    skill: ["css-logical", "Логические свойства", "Писать отступы и размеры, которые работают при любом направлении текста."],
    now: "Пишем отступы и размеры, которые работают при любом направлении текста.",
    body: [
      scene("Справа налево",
        ["you", "Открываемся в Дубае! Сайт будет и на арабском."],
        ["nika", "Там текст справа налево. `margin-left` окажется не с той стороны. Логические свойства знают направление сами."]),
      prop("margin-inline", "Отступы по строке", "Слева и справа (при письме слева направо). `margin-inline: auto` центрирует.", "Работает при любом направлении текста.", page(".a { margin-inline: 24px; background: #fdf6ec; padding: 4px; }", "<div class=\"a\">margin-inline: 24px</div>")),
      prop("margin-block", "Отступы по блоку", "Сверху и снизу.", "Ритм между разделами.", undefined),
      prop("padding-inline · padding-block", "Внутренние логические отступы", "Как padding, но по осям текста.", "Кнопки, которые верно смотрятся на любом языке.", page("button { padding-inline: 20px; padding-block: 6px; }", "<button>Заказать</button>")),
      prop("inline-size · block-size", "Логические размеры", "`inline-size` — ширина по строке, `block-size` — высота.", "Размеры в вертикальном письме тоже верны.", undefined),
      prop("inset-inline-start", "Логическая координата", "Вместо `left` — «начало строки».", "Плашка в начале строки на любом языке.", undefined),
      prop("writing-mode", "Направление письма", "`vertical-rl` — вертикальный текст.", "Вертикальная надпись на обложке.", page(".v { writing-mode: vertical-rl; background: #c8763a; color: white; padding: 6px; height: 90px; }", "<div class=\"v\">СЕВЕР</div>")),
      rule("Пишешь left/right — подумай, не нужен ли inline-start/inline-end.")
    ],
    tasks: [task("Готовы к арабскому", "У `.btn` замени отступы на логические: `padding-inline: 20px` и `padding-block: 8px`.", {
      start: page(".btn { padding: 8px 20px; }", "<button class=\"btn\">Заказать</button>"),
      checks: [css(".btn", "padding-inline", "Отступы по строке", { value: "20px" }), css(".btn", "padding-block", "Отступы по блоку", { value: "8px" })],
      solution: page(".btn { padding-inline: 20px; padding-block: 8px; }", "<button class=\"btn\">Заказать</button>")
    })],
    quizzes: [
      single("css-logical-inline", "inline", "Чему соответствует `margin-inline` при письме слева направо?", [["lr", "Левому и правому отступам"], ["tb", "Верхнему и нижнему"], ["all", "Всем четырём"], ["in", "Внутреннему отступу"]], "lr", "Inline — ось строки."),
      single("css-logical-why", "Зачем", "Зачем логические свойства?", [["dir", "Стили работают при любом направлении текста"], ["fast", "Быстрее отрисовка"], ["short", "Короче запись"], ["old", "Для старых браузеров"]], "dir", "Арабский, иврит, вертикальное письмо.")
    ]
  });

  L({
    slug: "color-scheme-supports", title: "color-scheme, light-dark() и @supports", summary: "color-scheme, функция light-dark(), проверка поддержки @supports и практика clamp().",
    skill: ["css-modern-functions", "Современные функции", "Делать тему одной строкой, проверять поддержку и задавать плавные размеры."],
    now: "Делаем тему одной строкой, проверяем поддержку и задаём плавные размеры.",
    body: [
      scene("Короче",
        ["bro", "Для тёмной темы мы писали целые медиазапросы. А можно одной функцией."],
        ["nika", "И заголовок, который плавно растёт с экраном, — без единого медиазапроса."]),
      prop("color-scheme", "Какие темы поддерживаешь", "`:root { color-scheme: light dark; }` — браузер сам перекрасит формы и полосы прокрутки.", "Поля ввода не остаются белыми в тёмной теме.", undefined),
      fn("light-dark()", "Цвет для двух тем", "`color: light-dark(#2b1d14, #f5e6d3)` — первый для светлой, второй для тёмной. Нужен `color-scheme`.", "Тема без медиазапросов.", page(":root { color-scheme: light dark; } body { background: light-dark(#fffaf3, #1c1410); color: light-dark(#2b1d14, #f5e6d3); }", "<p>Подстраиваюсь под тему</p>")),
      at("@supports", "Если браузер умеет", "`@supports (display: grid) { … }` — стили только при поддержке.", "Новые возможности с запасным вариантом.", undefined),
      rule("`clamp()` вместо трёх медиазапросов для размеров шрифта.")
    ],
    tasks: [task("Тема одной строкой", "В `:root` задай `color-scheme: light dark`, а `body` — `color: light-dark(#2b1d14, #f5e6d3)`.", {
      start: page("body { color: #2b1d14; }", "<h1>Мой сайт</h1>"),
      checks: [css(":root", "color-scheme", "Обе темы", { value: "light dark" }), css("body", "color", "Цвет для двух тем", { value: "light-dark(#2b1d14,#f5e6d3)" })],
      solution: page(":root { color-scheme: light dark; }\nbody { color: light-dark(#2b1d14, #f5e6d3); }", "<h1>Мой сайт</h1>")
    }), task("Резиновый заголовок", "Задай `h1` `font-size: clamp(2rem, 5vw, 4rem)`.", {
      start: page("h1 { font-size: 48px; }", "<h1>Мой сайт</h1>"),
      checks: [css("h1", "font-size", "Плавный размер", { value: "clamp(2rem,5vw,4rem)" })],
      solution: page("h1 { font-size: clamp(2rem, 5vw, 4rem); }", "<h1>Мой сайт</h1>")
    })],
    quizzes: [
      single("css-clamp", "clamp", "Что значит `clamp(16px, 4vw, 32px)`?", [["range", "Желательно 4vw, но не меньше 16px и не больше 32px"], ["avg", "Среднее трёх значений"], ["first", "Всегда 16px"], ["sum", "Сумма"]], "range", "Минимум, желаемое, максимум."),
      single("css-light-dark", "light-dark", "Что нужно, чтобы `light-dark()` работала?", [["cs", "`color-scheme: light dark`"], ["media", "Обязательно `@media`"], ["js", "JavaScript"], ["var", "CSS-переменные"]], "cs", "Функция смотрит на схему цвета.")
    ]
  });

  L({
    slug: "forms-ui", title: "Формы и интерфейс", summary: "accent-color, appearance, caret-color, cursor, pointer-events, user-select, resize и field-sizing.",
    skill: ["css-forms-ui", "Стили форм", "Красить элементы форм и управлять поведением интерфейса."],
    now: "Оформляем элементы форм и управляем поведением интерфейса.",
    body: [
      scene("Из 2005-го",
        ["you", "Галочки и ползунки синие, а у нас коричневый бренд."],
        ["bro", "Одно свойство `accent-color` — и все галочки фирменные."]),
      prop("accent-color", "Цвет элементов форм", "Красит галочки, радио, ползунки и прогресс.", "Форма в цветах бренда одной строкой.", page("form { accent-color: #c8763a; }", "<form><label><input type=\"checkbox\" checked> С собой</label> <input type=\"range\"></form>")),
      prop("appearance", "Убрать системный вид", "`appearance: none` — сбросить вид браузера и нарисовать свой.", "Свой стиль селектов и чекбоксов.", undefined),
      prop("caret-color", "Цвет курсора ввода", "Цвет мигающей палочки в поле.", "Фирменная деталь.", page("input { caret-color: #c8763a; }", "<input value=\"Кликни сюда\">")),
      prop("cursor", "Курсор мыши", "`pointer`, `not-allowed`, `grab`, `text`.", "Подсказать, что элемент кликабелен или недоступен.", page("span { cursor: not-allowed; background: #eee; padding: 4px; } b { cursor: grab; }", "<span>Нельзя</span> <b>Тащи</b>")),
      prop("pointer-events", "Пропускать клики", "`pointer-events: none` — клики проходят насквозь.", "Декоративный слой поверх кнопки не мешает.", undefined),
      prop("user-select", "Выделение текста", "`user-select: none` — нельзя выделить; `all` — выделить целиком одним кликом.", "Промокод выделяется сразу целиком.", page(".code { user-select: all; background: #fdf6ec; padding: 4px; }", "Промокод: <span class=\"code\">SALE10</span>")),
      prop("resize", "Тянуть размер", "`resize: vertical` у textarea — только по высоте.", "Поле пожеланий не ломает раскладку.", undefined),
      prop("field-sizing", "Поле по содержимому", "`field-sizing: content` — поле растёт с текстом.", "Textarea без JavaScript-авторазмера.", undefined),
      rule("Неактивное — `cursor: not-allowed`, кликабельное — `cursor: pointer`.")
    ],
    tasks: [task("Фирменная форма", "Задай `form` `accent-color: #c8763a`, а `textarea` — `resize: vertical`.", {
      start: page("", "<form><label><input type=\"checkbox\"> У окна</label><textarea></textarea></form>"),
      checks: [css("form", "accent-color", "Галочки фирменные", { value: "#c8763a" }), css("textarea", "resize", "Только по высоте", { value: "vertical" })],
      solution: page("form { accent-color: #c8763a; }\ntextarea { resize: vertical; }", "<form><label><input type=\"checkbox\"> У окна</label><textarea></textarea></form>")
    })],
    quizzes: [
      single("css-accent", "Галочки", "Какое свойство красит чекбоксы и ползунки в цвет бренда?", [["accent", "`accent-color`"], ["color", "`color`"], ["bg", "`background`"], ["caret", "`caret-color`"]], "accent", "`accent-color`."),
      single("css-pointer-events", "Насквозь", "Как сделать, чтобы клики проходили сквозь декоративный слой?", [["pe", "`pointer-events: none`"], ["us", "`user-select: none`"], ["cur", "`cursor: none`"], ["vis", "`visibility: hidden`"]], "pe", "Элемент перестаёт ловить мышь.")
    ]
  });

  L({
    slug: "counters-content", title: "Счётчики и content", summary: "counter-reset, counter-increment, counter() и content в псевдоэлементах.",
    skill: ["css-counters", "Счётчики", "Автоматически нумеровать шаги и разделы средствами CSS."],
    now: "Нумеруем шаги и разделы средствами CSS.",
    body: [
      scene("Шаг 1, шаг 2",
        ["you", "В рецепте шаги «Шаг 1», «Шаг 2». Добавляю шаг в середину — всё перенумеровывать?"],
        ["bro", "CSS умеет считать. Ставим счётчик — он нумерует сам."]),
      prop("counter-reset", "Завести счётчик", "`counter-reset: step` у контейнера — счётчик начинается с нуля.", "Своя нумерация в каждом рецепте.", undefined),
      prop("counter-increment", "Прибавить", "`counter-increment: step` у каждого элемента.", "Каждый шаг увеличивает счёт.", undefined),
      fn("counter()", "Вывести число", "`content: \"Шаг \" counter(step)` в `::before`.", "Нумерация в любом оформлении.", page(".r { counter-reset: step; } .r p { counter-increment: step; margin: 2px 0; } .r p::before { content: \"Шаг \" counter(step) \": \"; color: #c8763a; font-weight: bold; }", "<div class=\"r\"><p>Карандаш</p><p>Сливки</p><p>Взбить</p></div>")),
      rule("Нумерация, которая должна сама пересчитываться, — счётчик CSS.")
    ],
    tasks: [task("Шаги рецепта", "У `.recipe` задай `counter-reset: step`, у `.recipe li` — `counter-increment: step`, а в `.recipe li::before` — `content: \"Шаг \" counter(step)`.", {
      start: page(".recipe { list-style: none; }", "<ol class=\"recipe\"><li>Карандаш</li><li>Сливки и сахар</li><li>Взбить паром</li></ol>"),
      checks: [css(".recipe", "counter-reset", "Счётчик заведён", { value: "step" }), css(".recipe li", "counter-increment", "Каждый шаг считается", { value: "step" }), css(".recipe li::before", "content", "Номер выведен", { includes: "counter(step)" })],
      solution: page(".recipe { list-style: none; counter-reset: step; }\n.recipe li { counter-increment: step; }\n.recipe li::before { content: \"Шаг \" counter(step) \". \"; }", "<ol class=\"recipe\"><li>Карандаш</li><li>Сливки и сахар</li><li>Взбить паром</li></ol>")
    })],
    quizzes: [single("css-counter-order", "Порядок", "Где ставят `counter-reset`?", [["parent", "На контейнере списка"], ["each", "На каждом пункте"], ["before", "В `::before`"], ["root", "Только на html"]], "parent", "Сброс — на контейнере, прибавка — на пунктах.")]
  });
}
