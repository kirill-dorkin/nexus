// Chapter 2: color, units, fonts, text.
import { scene, prop, sel, at, fn, val, idea, rule, page, css, el, task, makeLesson } from "./kit.mjs";

export default function colorText(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "colors", title: "Цвета", summary: "Как записать любой цвет: имена, hex, rgb, hsl, oklch, прозрачность и смешивание.",
    skill: ["css-colors", "Цвета", "Записывать цвета разными способами, задавать прозрачность и смешивать."],
    now: "Соня прислала палитру «Зерна»: кофе, сливки, корица. Переводим её в CSS.",
    body: [
      scene("Палитра",
        ["sonya", "Палитра: кофе `#6b3e26`, сливки `#fdf6ec`, корица `#c8763a`. И полупрозрачная плашка поверх фото."],
        ["bro", "Цвет можно записать пятью способами — я пойму все. Выбирай самый удобный для задачи."]),
      prop("color", "Цвет текста", "Цвет текста и `currentColor` элемента.", "Фирменный цвет заголовков и текста.", page("h1 { color: #6b3e26; }", "<h1>Кофе</h1>")),
      prop("background-color", "Цвет фона", "Заливка фона элемента.", "Фон страницы цвета сливок, плашки, кнопки.", page("body { background-color: #fdf6ec; }", "<p>Фон цвета сливок</p>")),
      val("#hex", "Шестнадцатеричный цвет", "`#rrggbb` или коротко `#rgb`, с прозрачностью — `#rrggbbaa`.", "Так цвета приходят из макетов.", page(".a { color: #c8763a; } .b { color: #c8763a80; }", "<p class=\"a\">Корица</p><p class=\"b\">Корица 50%</p>")),
      fn("rgb()", "Красный, зелёный, синий", "`rgb(107 62 38)` или с прозрачностью `rgb(107 62 38 / 50%)`.", "Когда нужна прозрачность или цвет из кода.", page("p { background: rgb(107 62 38 / 20%); padding: 8px; }", "<p>Плашка 20%</p>")),
      fn("hsl()", "Тон, насыщенность, светлота", "`hsl(25 48% 28%)`: тон по кругу 0–360°, насыщенность и светлота в процентах.", "Легко сделать оттенок светлее, меняя только светлоту.", page(".a { color: hsl(25 48% 28%); } .b { color: hsl(25 48% 55%); }", "<p class=\"a\">Тёмный</p><p class=\"b\">Светлее</p>")),
      fn("oklch()", "Цвет «как видит глаз»", "`oklch(45% 0.08 50)`: яркость, насыщенность, тон. Равные шаги яркости выглядят равными.", "Современный способ строить ровные палитры и яркие цвета широкой гаммы.", page(".a { color: oklch(45% 0.08 50); } .b { color: oklch(70% 0.12 50); }", "<p class=\"a\">Кофе</p><p class=\"b\">Карамель</p>")),
      val("currentColor", "Текущий цвет текста", "Ключевое слово: значение `color` элемента.", "Рамка или иконка всегда в цвет текста.", page("button { color: #c8763a; border: 2px solid currentColor; }", "<button>Заказать</button>")),
      prop("opacity", "Прозрачность элемента", "От `0` (невидим) до `1` (непрозрачен), действует на всё содержимое.", "Неактивные карточки, плавное появление.", page(".off { opacity: 0.4; }", "<p>Доступно</p><p class=\"off\">Закончилось</p>")),
      fn("color-mix()", "Смешать цвета", "`color-mix(in oklch, #6b3e26 60%, white)` — смесь двух цветов в заданной пропорции.", "Оттенки из одного фирменного цвета без новых hex.", page("p { background: color-mix(in oklch, #6b3e26 25%, white); padding: 8px; }", "<p>Кофе с молоком</p>")),
      rule("Палитру держи в нескольких фирменных цветах, оттенки получай через `hsl`/`oklch` или `color-mix`.")
    ],
    tasks: [task("Палитра Марты", "Задай `body` фон `#fdf6ec`, заголовку `h1` цвет `#6b3e26`, а плашке `.note` полупрозрачный фон через `rgb()` с `/ 20%`.", {
      start: page("", "<h1>Зерно</h1>\n<p class=\"note\">Сегодня второй раф в подарок</p>"),
      checks: [css("body", "background-color", "Фон страницы `#fdf6ec`", { value: "#fdf6ec" }), css("h1", "color", "Заголовок `#6b3e26`", { value: "#6b3e26" }), css(".note", "background-color", "Плашка через `rgb(... / 20%)`", { includes: "/20%" })],
      hint: "`rgb(200 118 58 / 20%)` — цвет корицы с прозрачностью 20%.",
      solution: page("body { background-color: #fdf6ec; }\nh1 { color: #6b3e26; }\n.note { background-color: rgb(200 118 58 / 20%); }", "<h1>Зерно</h1>\n<p class=\"note\">Сегодня второй раф в подарок</p>")
    })],
    quizzes: [
      single("css-color-alpha", "Прозрачность", "Как записать цвет с прозрачностью 50%?", [["rgb", "`rgb(0 0 0 / 50%)`"], ["rgbcomma", "`rgb(0, 0, 0)`"], ["hex6", "`#000000`"], ["named", "`black`"]], "rgb", "Прозрачность задают после косой черты или восьмизначным hex."),
      single("css-color-current", "currentColor", "Что значит `border-color: currentColor`?", [["text", "Рамка того же цвета, что текст элемента"], ["parent", "Цвет фона родителя"], ["black", "Всегда чёрный"], ["random", "Случайный цвет"]], "text", "`currentColor` — текущее значение `color`.")
    ]
  });

  L({
    slug: "units", title: "Единицы и размеры", summary: "px, em, rem, %, vw, vh, dvh, ch и функции calc, min, max, clamp.",
    skill: ["css-units", "Единицы измерения", "Выбирать единицы под задачу и считать размеры функциями."],
    now: "На телефоне заголовок огромный, на мониторе — мелкий. Разбираемся с единицами.",
    body: [
      scene("Размер под экран",
        ["marta", "На телефоне заголовок в три строки, на ноутбуке — крошечный."],
        ["nika", "Пиксели одинаковы везде. Нужны относительные единицы и `clamp` — и заголовок сам подстроится."]),
      val("px", "Пиксель", "Абсолютная единица экрана.", "Тонкие рамки, точные мелочи. Для текста лучше `rem`.", page("p { border: 1px solid #c8763a; padding: 8px; }", "<p>Рамка 1px</p>")),
      val("rem", "От корневого шрифта", "`1rem` = размер шрифта `html` (обычно 16px).", "Шрифты и отступы, которые растут, если человек увеличил шрифт в браузере.", page("h1 { font-size: 2rem; } p { font-size: 1rem; }", "<h1>2rem</h1><p>1rem</p>")),
      val("em", "От своего шрифта", "`1em` = размер шрифта текущего элемента.", "Отступы кнопки, которые растут вместе с её текстом.", page("button { font-size: 20px; padding: 0.5em 1em; }", "<button>Отступы в em</button>")),
      val("%", "Процент", "Доля от размера родителя (для ширины — от ширины родителя).", "Резиновые колонки и картинки.", page(".half { width: 50%; background: #fdf6ec; }", "<div class=\"half\">50% ширины</div>")),
      val("vw · vh", "Доля экрана", "`1vw` — 1% ширины окна, `1vh` — 1% высоты.", "Блок на весь экран, размер от ширины окна.", page(".hero { height: 40vh; background: #6b3e26; color: white; }", "<div class=\"hero\">40% высоты окна</div>")),
      val("dvh", "Динамическая высота", "`100dvh` учитывает выезжающую панель браузера на телефоне.", "Первый экран точно на всю высоту телефона, без обрезанного низа.", page(".full { min-height: 30dvh; background: #fdf6ec; }", "<div class=\"full\">30dvh</div>")),
      val("ch", "Ширина символа", "`1ch` — ширина цифры «0» в шрифте.", "Удобная длина строки: `max-width: 65ch`.", page("p { max-width: 20ch; background: #fdf6ec; }", "<p>Строка не длиннее двадцати символов</p>")),
      fn("calc()", "Вычислить", "Арифметика с разными единицами: `calc(100% - 2rem)`.", "Ширина минус отступы, высота минус шапка.", page(".box { width: calc(100% - 40px); background: #fdf6ec; }", "<div class=\"box\">100% минус 40px</div>")),
      fn("min()", "Меньшее из", "`min(100%, 600px)` — не больше 600px, но и не шире родителя.", "Резиновый контейнер с ограничением.", page(".box { width: min(100%, 200px); background: #fdf6ec; }", "<div class=\"box\">min()</div>")),
      fn("max()", "Большее из", "`max(16px, 1vw)` — не меньше 16px.", "Минимальный читаемый размер.", page("p { font-size: max(16px, 1vw); }", "<p>Не меньше 16px</p>")),
      fn("clamp()", "От и до", "`clamp(минимум, желаемое, максимум)`: `clamp(1.5rem, 5vw, 3rem)`.", "Заголовок плавно растёт с экраном, но в пределах.", page("h1 { font-size: clamp(1.5rem, 6vw, 3rem); }", "<h1>Резиновый заголовок</h1>")),
      rule("Текст — в `rem`, мелкие рамки — в `px`, ширины — в `%` и `min()`, крупные заголовки — через `clamp()`.")
    ],
    tasks: [task("Резиновый заголовок", "Задай `h1` размер `clamp(1.5rem, 5vw, 3rem)`, а абзацам — `max-width: 65ch`.", {
      start: page("h1 { font-size: 48px; }", "<h1>Кофейня «Зерно» в центре Казани</h1>\n<p>Обжариваем зерно сами каждое утро и варим кофе так, как любим сами.</p>"),
      checks: [css("h1", "font-size", "`h1` через `clamp()`", { value: "clamp(1.5rem,5vw,3rem)" }), css("p", "max-width", "Строка не шире `65ch`", { value: "65ch" })],
      solution: page("h1 { font-size: clamp(1.5rem, 5vw, 3rem); }\np { max-width: 65ch; }", "<h1>Кофейня «Зерно» в центре Казани</h1>\n<p>Обжариваем зерно сами каждое утро и варим кофе так, как любим сами.</p>")
    })],
    quizzes: [
      single("css-units-rem", "rem", "От чего считается `1rem`?", [["root", "От размера шрифта корневого элемента `html`"], ["parent", "От размера шрифта родителя"], ["screen", "От ширины экрана"], ["px", "Всегда равен 1px"]], "root", "`rem` — root em: размер шрифта `html`."),
      single("css-units-clamp", "clamp", "Что делает `clamp(1rem, 4vw, 2rem)`?", [["range", "Растёт с экраном, но не меньше 1rem и не больше 2rem"], ["sum", "Складывает три значения"], ["max", "Всегда берёт 2rem"], ["error", "Это ошибка"]], "range", "Минимум, желаемое значение и максимум.")
    ]
  });

  L({
    slug: "fonts", title: "Шрифты", summary: "Семейство, свои шрифты через @font-face, размер, насыщенность, начертание, межстрочный интервал.",
    skill: ["css-fonts", "Шрифты", "Подключать свои шрифты и настраивать размер, насыщенность и интервалы."],
    now: "У Сони фирменный шрифт для заголовков. Подключаем его к сайту.",
    body: [
      scene("Фирменный шрифт",
        ["sonya", "Заголовки — нашим шрифтом «Brand», текст — системным. И межстрочный посвободнее."],
        ["bro", "Дай мне файл шрифта через `@font-face` и запасные варианты — если файл не загрузится, покажу запасной."]),
      prop("font-family", "Семейство", "Список шрифтов через запятую, в конце — общий: `sans-serif`, `serif`, `monospace`.", "Если первого шрифта нет, браузер берёт следующий.", page("h1 { font-family: \"Georgia\", serif; } p { font-family: system-ui, sans-serif; }", "<h1>Зерно</h1><p>Системный шрифт</p>")),
      at("@font-face", "Свой шрифт", "Описывает шрифт: имя, файл в `src`, насыщенность.", "Фирменный шрифт без зависимости от компьютера гостя.", page("@font-face { font-family: \"Brand\"; src: url(\"brand.woff2\") format(\"woff2\"); font-display: swap; }\nh1 { font-family: \"Brand\", Georgia, serif; }", "<h1>Шрифт Brand (или запасной)</h1>")),
      prop("font-display", "Пока шрифт грузится", "Дескриптор `@font-face`: `swap` — сразу показать запасной, потом подменить.", "Текст виден сразу, без пустого места.", undefined),
      prop("font-size", "Размер", "Размер шрифта: `1rem`, `1.25rem`, `clamp(...)`.", "Иерархия: заголовки крупнее, примечания мельче.", page("h2 { font-size: 1.5rem; } small { font-size: 0.8rem; }", "<h2>Меню</h2><small>Цены в рублях</small>")),
      prop("font-weight", "Насыщенность", "`400` — обычный, `700` — жирный, от `100` до `900`.", "Выделить заголовки и цены.", page(".price { font-weight: 700; }", "<p>Раф — <span class=\"price\">290 ₽</span></p>")),
      prop("font-style", "Начертание", "`normal` или `italic`.", "Курсив для пометок и цитат.", page(".note { font-style: italic; }", "<p class=\"note\">Без лактозы по запросу</p>")),
      prop("line-height", "Межстрочный интервал", "Лучше без единиц: `1.5` — полтора размера шрифта.", "Текст легче читать. Без единиц интервал правильно наследуется.", page("p { line-height: 1.6; max-width: 30ch; }", "<p>Обжариваем зерно сами каждое утро и варим кофе так, как любим сами.</p>")),
      prop("font", "Короткая запись", "`font: italic 700 1.25rem/1.4 Georgia, serif` — всё сразу.", "Компактно, но сбрасывает неуказанные части — осторожно.", page("p { font: italic 700 1.1rem/1.4 Georgia, serif; }", "<p>Всё одной строкой</p>")),
      rule("Всегда заканчивай `font-family` общим семейством. `line-height` — без единиц, около 1.5 для текста.")
    ],
    tasks: [task("Типографика главной", "Подключи шрифт `\"Brand\"` через `@font-face` с файлом `brand.woff2` и `font-display: swap`; заголовкам `h1` задай `font-family` с ним и запасным `serif`; `body` — `line-height: 1.6`.", {
      start: page("", "<h1>Зерно</h1>\n<p>Свежая обжарка каждый день.</p>"),
      checks: [css("@font-face", "font-family", "Описан шрифт Brand", { includes: "brand" }), css("@font-face", "font-display", "`font-display: swap`", { value: "swap" }), css("h1", "font-family", "У `h1` Brand и запасной serif", { includes: "serif" }), css("body", "line-height", "Межстрочный `1.6`", { value: "1.6" })],
      solution: page("@font-face { font-family: \"Brand\"; src: url(\"brand.woff2\") format(\"woff2\"); font-display: swap; }\nh1 { font-family: \"Brand\", Georgia, serif; }\nbody { line-height: 1.6; }", "<h1>Зерно</h1>\n<p>Свежая обжарка каждый день.</p>")
    })],
    quizzes: [
      single("css-fonts-fallback", "Запасной шрифт", "Зачем в конце `font-family` писать `sans-serif`?", [["fallback", "Это запасной вариант, если других шрифтов нет"], ["bold", "Чтобы шрифт стал жирным"], ["required", "Без него свойство не работает"], ["speed", "Чтобы шрифт грузился быстрее"]], "fallback", "Общее семейство гарантирует, что текст будет показан хоть каким-то похожим шрифтом."),
      single("css-fonts-lh", "Интервал", "Почему `line-height` лучше писать без единиц, например `1.5`?", [["inherit", "Дети пересчитают интервал от своего размера шрифта"], ["short", "Так короче"], ["px", "Это то же, что 1.5px"], ["only", "Только так можно"]], "inherit", "Безразмерный множитель наследуется как коэффициент, а не готовое число пикселей.")
    ]
  });

  L({
    slug: "text-styling", title: "Оформление текста", summary: "Выравнивание, подчёркивания, регистр, интервалы, тени, переносы и обрезка длинного текста.",
    skill: ["css-text", "Оформление текста", "Выравнивать, украшать и переносить текст, обрезать длинные строки."],
    now: "Тексты на сайте на месте. Доводим их до вида как в макете.",
    body: [
      scene("Детали",
        ["sonya", "Заголовок по центру, подзаголовок капсом с разрядкой, а длинные названия в карточке — с троеточием."],
        ["nika", "Всё это свойства текста. Ни одной картинки не понадобится."]),
      prop("text-align", "Выравнивание", "`left`, `center`, `right`, `justify` или логические `start`/`end`.", "Заголовок первого экрана по центру.", page("h1 { text-align: center; }", "<h1>Зерно</h1>")),
      prop("text-decoration", "Подчёркивание", "`underline`, `line-through`, `none`, с цветом и толщиной: `underline 2px #c8763a`.", "Убрать подчёркивание у меню или сделать фирменное.", page("a { text-decoration: underline 2px #c8763a; text-underline-offset: 4px; }", "<a href=\"#\">Фирменная ссылка</a>")),
      prop("text-transform", "Регистр", "`uppercase`, `lowercase`, `capitalize`.", "Капс в подписях без переписывания текста.", page(".kicker { text-transform: uppercase; }", "<p class=\"kicker\">Новинка осени</p>")),
      prop("letter-spacing", "Разрядка", "Расстояние между буквами: `0.1em`.", "Капс читается лучше с разрядкой.", page(".kicker { text-transform: uppercase; letter-spacing: 0.12em; }", "<p class=\"kicker\">Новинка осени</p>")),
      prop("word-spacing", "Между словами", "Дополнительное расстояние между словами.", "Редко: для декоративных подписей.", page("p { word-spacing: 0.6em; }", "<p>Кофе чай десерты</p>")),
      prop("text-indent", "Красная строка", "Отступ первой строки абзаца.", "Классическая вёрстка статей.", page("p { text-indent: 2em; max-width: 30ch; }", "<p>Обжариваем зерно сами каждое утро и варим кофе так, как любим сами.</p>")),
      prop("text-shadow", "Тень текста", "`смещение-x смещение-y размытие цвет`.", "Текст поверх фото читается лучше.", page("h1 { color: white; background: #c8763a; text-shadow: 0 2px 6px rgb(0 0 0 / 50%); }", "<h1>Поверх фото</h1>")),
      prop("white-space", "Пробелы и переносы", "`nowrap` — не переносить, `pre` — как в коде, `pre-line` — переносы из текста.", "Цена «290 ₽» не разорвётся на две строки.", page(".price { white-space: nowrap; }", "<p style=\"width:80px\">Раф <span class=\"price\">290 ₽</span></p>")),
      prop("overflow-wrap", "Перенос длинных слов", "`anywhere` или `break-word` — переносить слово, которое не влезает.", "Длинный адрес не вылезет за экран телефона.", page("p { width: 120px; overflow-wrap: anywhere; background: #fdf6ec; }", "<p>kofeinya-zerno-kazan.ru</p>")),
      prop("word-break", "Разрыв слов", "`break-all` рвёт слова в любом месте, `keep-all` — не рвёт.", "Таблицы с длинными кодами.", page("p { width: 120px; word-break: break-all; }", "<p>ZERNO2026PROMOCODE</p>")),
      prop("hyphens", "Переносы по слогам", "`hyphens: auto` с `lang` на странице — переносы с дефисом.", "Узкие колонки без рваных пробелов.", page("p { hyphens: auto; width: 120px; }", "<p lang=\"ru\">Ультрасовременная кофемашина</p>")),
      prop("text-overflow", "Троеточие", "`ellipsis` вместе с `overflow: hidden` и `white-space: nowrap`.", "Длинное название в карточке не ломает сетку.", page(".title { width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }", "<p class=\"title\">Раф с лавандой и мёдом по-казански</p>")),
      prop("text-wrap", "Красивые переносы", "`balance` — ровные строки в заголовке, `pretty` — без одинокого слова в конце абзаца.", "Заголовки не заканчиваются одним словом на строке.", page("h2 { text-wrap: balance; width: 220px; }", "<h2>Самый вкусный раф в центре Казани</h2>")),
      prop("vertical-align", "Выравнивание в строке", "`middle`, `top`, `baseline` для строчных элементов и ячеек таблиц.", "Иконка ровно по центру строки.", page("img { vertical-align: middle; }", "<p><img src=\"https://picsum.photos/id/30/24/24\" alt=\"\" width=\"24\" height=\"24\"> Наше зерно</p>")),
      rule("Капс — только через `text-transform` и с разрядкой. Троеточие требует трёх свойств сразу.")
    ],
    tasks: [task("Карточка с длинным названием", "У `.title` длинное название вылезает. Обрежь его троеточием: `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`. А подпись `.kicker` сделай капсом (`uppercase`).", {
      start: page(".title { width: 160px; }", "<p class=\"kicker\">новинка</p>\n<p class=\"title\">Раф с лавандой и мёдом по-казански</p>"),
      checks: [css(".title", "white-space", "Без переноса", { value: "nowrap" }), css(".title", "overflow", "Лишнее скрыто", { value: "hidden" }), css(".title", "text-overflow", "Троеточие", { value: "ellipsis" }), css(".kicker", "text-transform", "Подпись капсом", { value: "uppercase" })],
      solution: page(".title { width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.kicker { text-transform: uppercase; }", "<p class=\"kicker\">новинка</p>\n<p class=\"title\">Раф с лавандой и мёдом по-казански</p>")
    })],
    quizzes: [
      multi("css-text-ellipsis", "Троеточие", "Какие свойства нужны для обрезки строки с троеточием?", [["ws", "`white-space: nowrap`"], ["of", "`overflow: hidden`"], ["to", "`text-overflow: ellipsis`"], ["ta", "`text-align: center`"]], ["ws", "of", "to"], "Все три вместе: строка не переносится, лишнее скрыто, вместо него троеточие."),
      single("css-text-caps", "Капс", "Как сделать текст заглавными буквами, не переписывая его?", [["tt", "`text-transform: uppercase`"], ["fv", "`font-weight: 900`"], ["fs", "`font-size: big`"], ["caps", "`text-caps: on`"]], "tt", "`text-transform` меняет только отображение.")
    ]
  });

  L({
    slug: "lists-links-states", title: "Списки, ссылки и состояния", summary: "Маркеры списков, ::marker и состояния ссылок: :link, :visited, :hover, :focus, :active.",
    skill: ["css-links-states", "Ссылки и состояния", "Оформлять маркеры списков и все состояния ссылок, включая фокус."],
    now: "Меню сайта — список ссылок. Делаем, чтобы на них хотелось нажать.",
    body: [
      scene("Живые ссылки",
        ["sonya", "Ссылка при наведении темнеет, а маркеры в меню — маленькие зёрнышки."],
        ["lev", "И фокус с клавиатуры обязательно видимый. Я хожу Tab-ом."]),
      prop("list-style-type", "Вид маркера", "`disc`, `decimal`, `none` или строка: `\"☕ \"`.", "Свои маркеры или их отключение в меню.", page("ul { list-style-type: \"☕ \"; }", "<ul><li>Раф</li><li>Латте</li></ul>")),
      prop("list-style-position", "Где маркер", "`outside` (по умолчанию) или `inside` — внутри блока пункта.", "Маркер внутри рамки пункта.", page("li { list-style-position: inside; border: 1px solid #c8763a; }", "<ul><li>Внутри</li></ul>")),
      prop("list-style", "Короткая запись", "`list-style: none` — убрать маркеры совсем.", "Меню навигации без точек.", page("nav ul { list-style: none; padding: 0; }", "<nav><ul><li>Меню</li><li>Бронь</li></ul></nav>")),
      sel("::marker", "Маркер пункта", "Псевдоэлемент маркера: цвет, размер.", "Маркеры в фирменном цвете.", page("li::marker { color: #c8763a; }", "<ul><li>Раф</li><li>Латте</li></ul>")),
      sel(":link", "Непосещённая ссылка", "Ссылка, по которой ещё не переходили.", "Базовый вид ссылок.", page("a:link { color: #6b3e26; }", "<a href=\"#unvisited-xyz\">Ссылка</a>")),
      sel(":visited", "Посещённая", "Ссылка, по которой уже переходили (можно менять только цвета).", "Подсказка в длинных списках: что уже прочитано.", page("a:visited { color: #8e44ad; }", "<a href=\"#\">Уже посещали</a>")),
      sel(":hover", "Наведение мыши", "Пока курсор над элементом.", "Обратная связь: на это можно нажать.", page("a:hover { color: #c8763a; }", "<a href=\"#\">Наведи на меня</a>")),
      sel(":focus", "Фокус", "Элемент получил фокус: кликом или Tab.", "Видно, где сейчас ввод.", page("input:focus { outline: 3px solid #c8763a; }", "<input placeholder=\"Кликни\">")),
      sel(":active", "Нажатие", "В момент нажатия.", "Кнопка «вдавливается».", page("button:active { transform: translateY(2px); }", "<button>Нажми</button>")),
      rule("Порядок для ссылок: `:link`, `:visited`, `:hover`, `:focus`, `:active` — иначе правила перебивают друг друга.")
    ],
    tasks: [task("Меню без точек", "Убери у `nav ul` маркеры (`list-style: none`), а ссылкам при наведении (`nav a:hover`) задай цвет `#c8763a`.", {
      start: page("", "<nav><ul><li><a href=\"/menu\">Меню</a></li><li><a href=\"/booking\">Бронь</a></li></ul></nav>"),
      checks: [css("nav ul", "list-style", "Без маркеров", { value: "none" }), css("nav a:hover", "color", "Цвет при наведении", { value: "#c8763a" })],
      solution: page("nav ul { list-style: none; }\nnav a:hover { color: #c8763a; }", "<nav><ul><li><a href=\"/menu\">Меню</a></li><li><a href=\"/booking\">Бронь</a></li></ul></nav>")
    })],
    quizzes: [
      single("css-links-hover", "Наведение", "Какой псевдокласс срабатывает при наведении мыши?", [["hover", "`:hover`"], ["focus", "`:focus`"], ["active", "`:active`"], ["visited", "`:visited`"]], "hover", "`:hover` — пока курсор над элементом."),
      single("css-links-focus", "Фокус", "Почему нельзя убирать видимый фокус без замены?", [["kbd", "Люди без мыши не увидят, где находятся"], ["ugly", "Это некрасиво"], ["seo", "Сайт хуже ранжируется"], ["slow", "Страница тормозит"]], "kbd", "Фокус — главный ориентир при навигации с клавиатуры.")
    ]
  });

  L({
    slug: "project-typography", title: "Проект: типографика меню", summary: "Собираем красивую страницу меню из цвета, шрифтов и оформления текста.",
    skill: ["css-project-type", "Типографика страницы", "Оформить страницу текстом: палитра, шрифты, иерархия, состояния ссылок."],
    now: "Проект главы: Марта хочет красивую страницу меню без единой картинки.",
    body: [
      scene("Меню без картинок",
        ["marta", "Хочу меню, которое приятно читать. Как в хорошем ресторане."],
        ["sonya", "Только типографика: палитра, шрифт, иерархия. Собери по шагам."])
    ],
    tasks: [
      task("Шаг 1. Палитра и шрифт", "Задай `body` фон `#fdf6ec`, цвет `#3b2a1e`, шрифт `system-ui, sans-serif` и `line-height: 1.6`.", {
        start: page("", "<h1>Меню</h1>\n<p class=\"kicker\">Сезон осень</p>\n<h2>Раф <span class=\"price\">290 ₽</span></h2>\n<p>Эспрессо, сливки, ваниль.</p>"),
        checks: [css("body", "background-color", "Фон", { value: "#fdf6ec" }), css("body", "color", "Цвет текста", { value: "#3b2a1e" }), css("body", "font-family", "Шрифт с запасным", { includes: "sans-serif" }), css("body", "line-height", "Интервал 1.6", { value: "1.6" })],
        solution: page("body { background-color: #fdf6ec; color: #3b2a1e; font-family: system-ui, sans-serif; line-height: 1.6; }", "<h1>Меню</h1>\n<p class=\"kicker\">Сезон осень</p>\n<h2>Раф <span class=\"price\">290 ₽</span></h2>\n<p>Эспрессо, сливки, ваниль.</p>")
      }),
      task("Шаг 2. Иерархия", "Заголовок `h1` — `clamp(2rem, 6vw, 3.5rem)` и цвет `#6b3e26`; подпись `.kicker` — капсом с `letter-spacing: 0.12em`.", {
        start: page("body { background-color: #fdf6ec; color: #3b2a1e; font-family: system-ui, sans-serif; line-height: 1.6; }", "<h1>Меню</h1>\n<p class=\"kicker\">Сезон осень</p>\n<h2>Раф <span class=\"price\">290 ₽</span></h2>"),
        checks: [css("h1", "font-size", "Резиновый размер", { includes: "clamp(" }), css("h1", "color", "Кофейный цвет", { value: "#6b3e26" }), css(".kicker", "text-transform", "Капс", { value: "uppercase" }), css(".kicker", "letter-spacing", "Разрядка", { value: "0.12em" })],
        solution: page("body { background-color: #fdf6ec; color: #3b2a1e; font-family: system-ui, sans-serif; line-height: 1.6; }\nh1 { font-size: clamp(2rem, 6vw, 3.5rem); color: #6b3e26; }\n.kicker { text-transform: uppercase; letter-spacing: 0.12em; }", "<h1>Меню</h1>\n<p class=\"kicker\">Сезон осень</p>\n<h2>Раф <span class=\"price\">290 ₽</span></h2>")
      }),
      task("Шаг 3. Цены", "Цены `.price` — корица `#c8763a`, `font-weight: 700` и `white-space: nowrap`, чтобы «290 ₽» не разрывалось.", {
        start: page("h1 { color: #6b3e26; }", "<h2>Раф <span class=\"price\">290 ₽</span></h2>"),
        checks: [css(".price", "color", "Цвет корицы", { value: "#c8763a" }), css(".price", "font-weight", "Жирные", { value: ["700", "bold"] }), css(".price", "white-space", "Не разрываются", { value: "nowrap" })],
        solution: page("h1 { color: #6b3e26; }\n.price { color: #c8763a; font-weight: 700; white-space: nowrap; }", "<h2>Раф <span class=\"price\">290 ₽</span></h2>")
      })
    ],
    quizzes: [
      single("css-proj-type-hier", "Иерархия", "Что лучше всего создаёт иерархию текста на странице?", [["size", "Разный размер, насыщенность и цвет заголовков и текста"], ["caps", "Весь текст капсом"], ["colors", "Каждое слово своим цветом"], ["center", "Всё по центру"]], "size", "Иерархия строится контрастом размеров и насыщенности.")
    ]
  });
}
