// Chapter 11: Accessibility, performance, effects, print, tables and the final project.
import { scene, prop, sel, at, fn, val, idea, rule, page, css, task, makeLesson } from "./kit.mjs";

export default function quality(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "accessible-css", title: "Доступный CSS", summary: "Контраст, видимый фокус, forced-colors, скрытый для глаз текст sr-only и размер целей.",
    skill: ["css-a11y", "Доступность в CSS", "Делать стили, которыми удобно пользоваться всем: с клавиатуры, при плохом зрении, со скринридером."],
    now: "Гость-незрячий и гость с клавиатурой пожаловались: на сайте не видно фокуса и серый текст не читается.",
    body: [
      scene("Жалоба",
        ["marta", "Пришло письмо: «Не вижу, где я на странице, когда жму Tab. А серый текст на бежевом не читается»."],
        ["nika", "Это не мелочи — это люди, которые не могут сделать заказ. Чиним контраст, фокус и скрытые подписи."]),
      idea("Контраст", "Текст должен читаться", "Обычный текст — контраст не меньше 4.5:1 к фону, крупный — 3:1. Проверка — в DevTools у цвета.", "Читают все: на солнце, со слабым зрением.", page(".bad { color: #c9b8a6; } .good { color: #5a3a22; } p { background: #fffaf3; margin: 2px 0; padding: 4px; }", "<p class=\"bad\">Плохо: бледно</p><p class=\"good\">Хорошо: читается</p>")),
      val("forced-colors", "Режим высокой контрастности", "`@media (forced-colors: active)` — система сама задаёт цвета. Проверь, что рамки и иконки не пропадают.", "Люди со слабым зрением.", undefined),
      idea("sr-only", "Видно только скринридеру", "Класс, который прячет текст от глаз, но оставляет для чтения: `position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;`.", "Подпись «Корзина» у кнопки-иконки.", undefined),
      idea("Размер цели", "Палец больше курсора", "Кнопки и ссылки — не меньше 24×24px, лучше 44×44px.", "Не промахнуться пальцем.", undefined),
      rule("Убрал outline — поставь свой видимый фокус. Всегда.")
    ],
    tasks: [task("Видимый фокус", "Дай ссылкам на `a:focus-visible` `outline: 3px solid #c8763a` и `outline-offset: 2px`.", {
      start: page("a { color: #7c3f1d; }\na:focus { outline: none; }", "<nav><a href=\"#menu\">Меню</a> <a href=\"#contacts\">Контакты</a></nav>"),
      checks: [css("a:focus-visible", "outline", "Фокус видно", { value: "3px solid #c8763a" }), css("a:focus-visible", "outline-offset", "Рамка с отступом", { value: "2px" })],
      solution: page("a { color: #7c3f1d; }\na:focus { outline: none; }\na:focus-visible { outline: 3px solid #c8763a; outline-offset: 2px; }", "<nav><a href=\"#menu\">Меню</a> <a href=\"#contacts\">Контакты</a></nav>")
    }), task("Подпись для скринридера", "Сделай класс `.sr-only`: `position: absolute`, `width: 1px`, `height: 1px`, `overflow: hidden`.", {
      start: page("", "<button>🛒<span class=\"sr-only\">Корзина</span></button>"),
      checks: [css(".sr-only", "position", "Вне потока", { value: "absolute" }), css(".sr-only", "width", "Ширина 1px", { value: "1px" }), css(".sr-only", "height", "Высота 1px", { value: "1px" }), css(".sr-only", "overflow", "Лишнее скрыто", { value: "hidden" })],
      solution: page(".sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }", "<button>🛒<span class=\"sr-only\">Корзина</span></button>")
    })],
    quizzes: [
      single("css-a11y-outline", "outline: none", "Что не так с `:focus { outline: none; }` без замены?", [["kbd", "Люди с клавиатуры не видят, где находятся"], ["nothing", "Всё нормально"], ["slow", "Страница тормозит"], ["color", "Меняется цвет текста"]], "kbd", "Нужен видимый фокус, например через `:focus-visible`."),
      single("css-a11y-srhide", "Спрятать правильно", "Как спрятать подпись от глаз, но оставить её скринридеру?", [["sr", "Класс sr-only (1px, overflow: hidden, absolute)"], ["none", "`display: none`"], ["vis", "`visibility: hidden`"], ["op", "`opacity: 0` и всё"]], "sr", "`display: none` и `visibility: hidden` скрывают и от скринридера."),
      short("css-a11y-contrast", "Контраст", "Какой минимальный контраст нужен обычному тексту по WCAG AA? Введи как 4.5:1.", ["4.5:1", "4.5"], "4.5:1 для обычного текста, 3:1 для крупного.")
    ]
  });

  L({
    slug: "performance-effects", title: "Быстрый CSS и эффекты", summary: "content-visibility, contain, will-change, clip-path и практика фильтров и object-fit.",
    skill: ["css-performance", "Производительность и эффекты", "Ускорять отрисовку длинных страниц и делать эффекты без картинок."],
    now: "Страница меню с сотней позиций тормозит на старом телефоне. И Соня хочет фото в форме зерна.",
    body: [
      scene("Тормозит",
        ["marta", "На моём старом телефоне меню листается рывками."],
        ["bro", "Браузер рисует все сто карточек сразу. Скажем ему: «рисуй, только когда видно»."]),
      prop("content-visibility", "Рисовать, когда видно", "`content-visibility: auto` — браузер пропускает отрисовку блоков за экраном.", "Длинные страницы открываются быстрее.", undefined),
      prop("contain", "Изолировать перерисовку", "`contain: layout paint` — изменения внутри не заставят пересчитывать всю страницу.", "Виджеты и карточки, которые часто меняются.", undefined),
      prop("will-change", "Предупредить браузер", "`will-change: transform` — заранее подготовить слой. Ставь точечно, не на всё подряд.", "Плавная тяжёлая анимация.", undefined),
      prop("clip-path", "Обрезать формой", "`clip-path: circle(50%)`, `polygon(…)`, `ellipse(…)`.", "Фото в форме зерна без редактора.", page(".bean { width: 70px; height: 90px; background: #7c3f1d; clip-path: ellipse(40% 50% at 50% 50%); }", "<div class=\"bean\"></div>")),
      rule("Самая быстрая отрисовка — та, которой нет: `content-visibility: auto` для длинных страниц.")
    ],
    tasks: [task("Быстрое меню", "Задай `.menu article` `content-visibility: auto`, а распроданной `.sold` — `filter: grayscale(1)`.", {
      start: page(".menu article { padding: 16px; }", "<div class=\"menu\"><article>Латте</article><article class=\"sold\">Раф</article></div>"),
      checks: [css(".menu article", "content-visibility", "Отрисовка по требованию", { value: "auto" }), css(".sold", "filter", "Распродано — серое", { value: ["grayscale(1)", "grayscale(100%)"] })],
      solution: page(".menu article { padding: 16px; content-visibility: auto; }\n.sold { filter: grayscale(1); }", "<div class=\"menu\"><article>Латте</article><article class=\"sold\">Раф</article></div>")
    }), task("Фото без искажений", "Задай `.card img` `width: 100%`, `aspect-ratio: 4 / 3` и `object-fit: cover`.", {
      start: page(".card img { width: 100%; }", "<article class=\"card\"><img src=\"latte.jpg\" alt=\"Латте\"></article>"),
      checks: [css(".card img", "aspect-ratio", "Пропорции 4:3", { value: "4/3" }), css(".card img", "object-fit", "Заполнить без искажений", { value: "cover" })],
      solution: page(".card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }", "<article class=\"card\"><img src=\"latte.jpg\" alt=\"Латте\"></article>")
    })],
    quizzes: [
      single("css-perf-cv", "Длинная страница", "Что ускорит открытие страницы со ста карточками?", [["cv", "`content-visibility: auto` у карточек"], ["wc", "`will-change: all` у всего"], ["z", "`z-index: 1`"], ["imp", "`!important`"]], "cv", "Блоки за экраном не рисуются."),
      single("css-object-fit", "Обрезать фото", "Как заполнить рамку фотографией без искажений, обрезав лишнее?", [["cover", "`object-fit: cover`"], ["contain", "`object-fit: contain`"], ["fill", "`object-fit: fill`"], ["stretch", "`width: 100%; height: 100%` и всё"]], "cover", "`contain` впишет целиком с полями, `fill` растянет.")
    ]
  });

  L({
    slug: "print-tables", title: "Печать и таблицы", summary: "@media print, @page, break-inside, а также border-collapse, border-spacing, table-layout и caption-side.",
    skill: ["css-print-tables", "Печать и таблицы", "Готовить страницу к печати и аккуратно оформлять таблицы."],
    now: "Марта печатает прайс для поставщиков: на бумаге вылезают меню, кнопки, а таблица разваливается.",
    body: [
      scene("На бумаге",
        ["marta", "Распечатала прайс — там шапка, кнопки, а таблица разорвана посередине строки."],
        ["lev", "Для бумаги свои правила: прячем лишнее, не рвём строки, задаём поля листа."]),
      at("@media print", "Стили для печати", "`@media print { nav, button { display: none; } }`.", "На бумаге — только нужное.", undefined),
      at("@page", "Лист бумаги", "`@page { margin: 2cm; size: A4; }`.", "Поля и формат при печати.", undefined),
      prop("break-inside", "Не разрывать", "`break-inside: avoid` — блок не разрывается между страницами.", "Карточка или строка таблицы целиком на одном листе.", undefined),
      prop("border-collapse", "Слить рамки таблицы", "`collapse` — соседние рамки ячеек сливаются в одну линию.", "Аккуратная таблица без двойных линий.", page("table { border-collapse: collapse; } td { border: 1px solid #c8763a; padding: 4px 8px; }", "<table><tr><td>Латте</td><td>220 ₽</td></tr><tr><td>Раф</td><td>290 ₽</td></tr></table>")),
      prop("border-spacing", "Расстояние между ячейками", "Работает при `border-collapse: separate`.", "Таблица-плитка.", page("table { border-spacing: 6px; } td { background: #fdf6ec; padding: 4px 8px; }", "<table><tr><td>Латте</td><td>220 ₽</td></tr></table>")),
      prop("table-layout", "Как считать ширины", "`fixed` — ширины колонок по первой строке, быстро и предсказуемо.", "Длинный текст не раздувает колонку.", undefined),
      prop("caption-side", "Где подпись", "`caption-side: bottom` — подпись таблицы снизу.", "Подпись «Цены на ноябрь» под таблицей.", page("table { caption-side: bottom; } caption { font-size: 12px; color: #7c3f1d; }", "<table><caption>Цены на ноябрь</caption><tr><td>Латте</td><td>220 ₽</td></tr></table>")),
      sel(":nth-child(even)", "Полосатые строки", "`tr:nth-child(even) { background: … }` — каждая вторая строка.", "Глаз не теряет строку в длинной таблице.", page("tr:nth-child(even) { background: #fdf6ec; } td { padding: 3px 8px; }", "<table><tr><td>Латте</td></tr><tr><td>Раф</td></tr><tr><td>Какао</td></tr></table>")),
      rule("Печатная версия — это одна медиа-секция: спрятать лишнее, не рвать блоки.")
    ],
    tasks: [task("Аккуратный прайс", "Задай `table` `border-collapse: collapse`, а строкам `tr:nth-child(even)` — фон `#fdf6ec`.", {
      start: page("td { border: 1px solid #c8763a; }", "<table><tr><td>Латте</td><td>220</td></tr><tr><td>Раф</td><td>290</td></tr></table>"),
      checks: [css("table", "border-collapse", "Рамки слиты", { value: "collapse" }), css("tr:nth-child(even)", "background-color", "Полосатые строки", { value: "#fdf6ec" })],
      solution: page("table { border-collapse: collapse; }\ntd { border: 1px solid #c8763a; }\ntr:nth-child(even) { background-color: #fdf6ec; }", "<table><tr><td>Латте</td><td>220</td></tr><tr><td>Раф</td><td>290</td></tr></table>")
    }), task("Готово к печати", "Внутри `@media print` спрячь `nav` (`display: none`) и запрети разрыв строк `tr` (`break-inside: avoid`).", {
      start: page("", "<nav>Меню сайта</nav><table><tr><td>Латте</td><td>220</td></tr></table>"),
      checks: [css("nav", "display", "Навигация не печатается", { value: "none", within: "@media print" }), css("tr", "break-inside", "Строки не рвутся", { value: "avoid", within: "@media print" })],
      solution: page("@media print {\n  nav { display: none; }\n  tr { break-inside: avoid; }\n}", "<nav>Меню сайта</nav><table><tr><td>Латте</td><td>220</td></tr></table>")
    })],
    quizzes: [
      single("css-table-collapse", "Двойные линии", "Как убрать двойные рамки между ячейками таблицы?", [["collapse", "`border-collapse: collapse`"], ["spacing", "`border-spacing: 2px`"], ["none", "`border: none`"], ["layout", "`table-layout: fixed`"]], "collapse", "Соседние рамки сливаются."),
      single("css-print-break", "Не рвать", "Какое свойство не даёт блоку разорваться между печатными страницами?", [["bi", "`break-inside: avoid`"], ["pb", "`page: keep`"], ["ov", "`overflow: hidden`"], ["ws", "`white-space: nowrap`"]], "bi", "`break-inside: avoid`.")
    ]
  });

  L({
    slug: "project-final-site", title: "Финальный проект: сайт Зерна целиком", summary: "Собираем всё: переменные, сетка, адаптив, анимации, доступность.",
    skill: ["css-project-final", "Сайт целиком", "Собрать красивый, адаптивный и доступный сайт из всего, что изучено."],
    now: "Финал. Собираем сайт Зерна целиком — и Марта показывает его гостям.",
    minutes: 15,
    body: [
      scene("Открытие",
        ["marta", "Завтра открытие новой точки. Хочу показать гостям сайт, которым можно гордиться."],
        ["sonya", "Макет готов. Цвета — в переменных, меню — сеткой, всё живое и для всех."],
        ["nika", "Ты уже знаешь всё, что нужно. Четыре шага — и сайт готов."])
    ],
    tasks: [
      task("Шаг 1. Тема в переменных", "В `:root` заведи `--brand: #c8763a` и `--bg: #fffaf3`; `body` — `background-color: var(--bg)`.", {
        start: page("", "<header>Зерно</header><main class=\"menu\"><article>Латте</article><article>Раф</article></main>"),
        checks: [css(":root", "--brand", "Фирменный цвет", { value: "#c8763a" }), css(":root", "--bg", "Фон", { value: "#fffaf3" }), css("body", "background-color", "Фон из переменной", { value: "var(--bg)" })],
        solution: page(":root { --brand: #c8763a; --bg: #fffaf3; }\nbody { background-color: var(--bg); }", "<header>Зерно</header><main class=\"menu\"><article>Латте</article><article>Раф</article></main>")
      }),
      task("Шаг 2. Липкая шапка-флекс", "`header`: `display: flex`, `justify-content: space-between`, `position: sticky`, `top: 0`.", {
        start: page(":root { --brand: #c8763a; --bg: #fffaf3; }\nbody { background-color: var(--bg); }", "<header><b>Зерно</b><nav>Меню</nav></header><main class=\"menu\"><article>Латте</article></main>"),
        checks: [css("header", "display", "Флекс", { value: "flex" }), css("header", "justify-content", "Лого и меню по краям", { value: "space-between" }), css("header", "position", "Липкая", { value: "sticky" }), css("header", "top", "К верху", { value: "0" })],
        solution: page(":root { --brand: #c8763a; --bg: #fffaf3; }\nbody { background-color: var(--bg); }\nheader { display: flex; justify-content: space-between; position: sticky; top: 0; }", "<header><b>Зерно</b><nav>Меню</nav></header><main class=\"menu\"><article>Латте</article></main>")
      }),
      task("Шаг 3. Меню-сетка", "`.menu`: `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`, `gap: 20px`.", {
        start: page("header { display: flex; justify-content: space-between; position: sticky; top: 0; }", "<header><b>Зерно</b></header><main class=\"menu\"><article>Латте</article><article>Раф</article></main>"),
        checks: [css(".menu", "display", "Грид", { value: "grid" }), css(".menu", "grid-template-columns", "Адаптивные колонки", { includes: "minmax(220px,1fr)" }), css(".menu", "gap", "Промежутки", { value: "20px" })],
        solution: page("header { display: flex; justify-content: space-between; position: sticky; top: 0; }\n.menu { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }", "<header><b>Зерно</b></header><main class=\"menu\"><article>Латте</article><article>Раф</article></main>")
      }),
      task("Шаг 4. Живые и доступные карточки", "`.menu article`: `transition: transform 0.2s`; на `.menu article:hover` — `transform: translateY(-4px)`; и видимый фокус `a:focus-visible { outline: 3px solid var(--brand); }`.", {
        start: page(".menu { display: grid; gap: 20px; }", "<main class=\"menu\"><article><a href=\"#latte\">Латте</a></article></main>"),
        checks: [css(".menu article", "transition", "Плавно", { value: ["transform 0.2s", "transform .2s", "transform 200ms"] }), css(".menu article:hover", "transform", "Тянется к гостю", { value: "translatey(-4px)" }), css("a:focus-visible", "outline", "Фокус виден", { value: "3px solid var(--brand)" })],
        solution: page(".menu { display: grid; gap: 20px; }\n.menu article { transition: transform 0.2s; }\n.menu article:hover { transform: translateY(-4px); }\na:focus-visible { outline: 3px solid var(--brand); }", "<main class=\"menu\"><article><a href=\"#latte\">Латте</a></article></main>")
      })
    ],
    quizzes: [
      multi("css-final-tools", "Инструменты", "Что из этого помогает сделать сайт удобным для всех?", [["focus", "Видимый `:focus-visible`"], ["contrast", "Контраст текста 4.5:1"], ["motion", "Уважение к `prefers-reduced-motion`"], ["nooutline", "`outline: none` везде"]], ["focus", "contrast", "motion"], "Убирать outline без замены — вредно."),
      single("css-final-layout", "Раскладка", "Что лучше подходит для шапки «лого слева, меню справа»?", [["flex", "Flexbox с `justify-content: space-between`"], ["float", "float: left и float: right"], ["table", "Таблица"], ["abs", "position: absolute для обоих"]], "flex", "Одномерный ряд — флекс.")
    ]
  });
}
