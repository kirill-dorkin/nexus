// Chapter 8: Responsive design.
import { scene, prop, at, val, idea, rule, page, css, task, makeLesson } from "./kit.mjs";

const box = "background: #fdf6ec; border: 1px solid #c8763a; padding: 6px;";

export default function responsive(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "media-queries", title: "@media: сайт под любой экран", summary: "@media, ширина экрана, mobile-first, viewport-единицы и meta viewport.",
    skill: ["css-media", "Медиазапросы", "Менять стили в зависимости от ширины экрана, начиная с телефона."],
    now: "Подстраиваем страницу под экран медиазапросами, начиная с телефона.",
    body: [
      scene("С телефона",
        ["you", "Открываю сайт в метро — всё крошечное и уезжает вбок!"],
        ["nika", "Половина посетителей заходит с телефона. Пишем стили сначала для него, а для больших экранов — добавки в `@media`."]),
      at("@media", "Стили по условию", "`@media (min-width: 768px) { … }` — правила внутри работают, только когда условие выполнено.", "Одна страница — разные раскладки для телефона и компьютера.", page(`.menu { display: grid; gap: 6px; } @media (min-width: 400px) { .menu { grid-template-columns: 1fr 1fr; } } .menu > * { ${box} }`, `<div class="menu"><div>Ручка</div><div>Пенал</div></div>`)),
      idea("Mobile-first", "Сначала телефон", "Базовые стили — для узкого экрана, а `min-width`-медиазапросы добавляют колонки на широких.", "Телефону не грузятся лишние правила, код проще.", undefined),
      idea("meta viewport", "Без этого адаптив не заработает", "`<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` в `<head>` говорит телефону не притворяться компьютером.", "Иначе телефон уменьшит страницу целиком, и медиазапросы не сработают.", undefined),
      rule("Пиши для телефона, добавляй для больших экранов через `min-width`.")
    ],
    tasks: [task("Две колонки на планшете", "Базово `.menu` — грид в одну колонку. Добавь `@media (min-width: 768px)`, внутри которого у `.menu` `grid-template-columns: 1fr 1fr`.", {
      start: page(".menu { display: grid; gap: 16px; }", "<div class=\"menu\"><article>Ручка</article><article>Пенал</article></div>"),
      checks: [css(".menu", "display", "Базово — грид", { value: "grid" }), css(".menu", "grid-template-columns", "Две колонки от 768px", { value: ["1fr 1fr", "repeat(2,1fr)"], within: "min-width:768px" })],
      solution: page(".menu { display: grid; gap: 16px; }\n@media (min-width: 768px) {\n  .menu { grid-template-columns: 1fr 1fr; }\n}", "<div class=\"menu\"><article>Ручка</article><article>Пенал</article></div>")
    })],
    quizzes: [
      single("css-media-mobile-first", "Mobile-first", "Как пишут стили при подходе mobile-first?", [["min", "Базово для телефона, добавки в `@media (min-width: …)`"], ["max", "Базово для компьютера, урезаем в `max-width`"], ["two", "Два разных сайта"], ["js", "Через JavaScript"]], "min", "От простого к сложному."),
      single("css-media-viewport", "Viewport", "Без чего медиазапросы на телефоне не сработают как надо?", [["meta", "Без `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">`"], ["js", "Без JavaScript"], ["font", "Без шрифтов"], ["grid", "Без grid"]], "meta", "Иначе телефон рисует страницу «как на компьютере» и уменьшает её."),
      short("css-media-dvh", "Высота экрана", "Какая единица учитывает выезжающие панели браузера на телефоне — vh или dvh? Введи единицу.", ["dvh"], "`dvh` — динамическая высота окна.")
    ]
  });

  L({
    slug: "media-features", title: "@media: тёмная тема, движение, мышь", summary: "prefers-color-scheme, prefers-reduced-motion, hover, pointer и orientation.",
    skill: ["css-media-features", "Медиа-характеристики", "Подстраивать сайт под настройки и устройство пользователя."],
    now: "Учитываем тёмную тему, предпочтения движения и способ ввода.",
    body: [
      scene("Ночью",
        ["you", "Открываю сайт ночью — слепит белым!"],
        ["nika", "Телефон сам говорит сайту: «у меня тёмная тема», «не люблю анимации», «у меня палец, а не мышь». Слушаем."]),
      val("prefers-color-scheme", "Тёмная тема", "`@media (prefers-color-scheme: dark) { … }` — стили для тёмной темы системы.", "Сайт не слепит ночью.", page(`body { background: #fffaf3; color: #2b1d14; } @media (prefers-color-scheme: dark) { body { background: #1c1410; color: #f5e6d3; } }`, "<p>Подстраиваюсь под тему системы</p>")),
      val("prefers-reduced-motion", "Без лишнего движения", "`@media (prefers-reduced-motion: reduce)` — человек попросил систему меньше анимаций.", "Анимации могут вызывать тошноту — уважай настройку.", undefined),
      val("hover · pointer", "Мышь или палец", "`@media (hover: hover)` — есть наведение; `(pointer: coarse)` — палец, кнопки нужны крупнее.", "Эффекты наведения только там, где они есть.", undefined),
      val("orientation", "Как держат", "`(orientation: landscape)` — экран лёжа.", "Особая раскладка для планшета в альбомной ориентации.", undefined),
      rule("Настройки пользователя важнее твоего дизайна: тема, движение, способ ввода.")
    ],
    tasks: [task("Ночная магазин", "Добавь `@media (prefers-color-scheme: dark)`, внутри которого у `body` фон `#1c1410` и цвет текста `#f5e6d3`.", {
      start: page("body { background-color: #fffaf3; color: #2b1d14; }", "<h1>Мой сайт</h1>"),
      checks: [css("body", "background-color", "Тёмный фон", { value: "#1c1410", within: "prefers-color-scheme:dark" }), css("body", "color", "Светлый текст", { value: "#f5e6d3", within: "prefers-color-scheme:dark" })],
      solution: page("body { background-color: #fffaf3; color: #2b1d14; }\n@media (prefers-color-scheme: dark) {\n  body { background-color: #1c1410; color: #f5e6d3; }\n}", "<h1>Мой сайт</h1>")
    }), task("Бережно к движению", "Внутри `@media (prefers-reduced-motion: reduce)` отключи анимацию у `.pulse`: `animation: none`.", {
      start: page(".pulse { animation: rise 2s infinite; }", "<div class=\"pulse\">~</div>"),
      checks: [css(".pulse", "animation", "Анимация выключена по просьбе", { value: "none", within: "prefers-reduced-motion:reduce" })],
      solution: page(".pulse { animation: rise 2s infinite; }\n@media (prefers-reduced-motion: reduce) {\n  .pulse { animation: none; }\n}", "<div class=\"pulse\">~</div>")
    })],
    quizzes: [
      single("css-media-dark", "Тёмная тема", "Какой медиазапрос ловит тёмную тему системы?", [["pcs", "`prefers-color-scheme: dark`"], ["dark", "`theme: dark`"], ["night", "`night-mode`"], ["color", "`color: dark`"]], "pcs", "Система сообщает предпочтение пользователя."),
      multi("css-media-respect", "Уважать настройки", "Какие медиазапросы отражают предпочтения или устройство пользователя?", [["motion", "`prefers-reduced-motion`"], ["hover", "`hover`"], ["scheme", "`prefers-color-scheme`"], ["fonts", "`font-size`"]], ["motion", "hover", "scheme"], "`font-size` — не медиа-характеристика.")
    ]
  });

  L({
    slug: "container-queries", title: "@container: компонент сам решает", summary: "container-type, container-name, @container и единицы cqi.",
    skill: ["css-container", "Контейнерные запросы", "Делать компоненты, которые меняются от своей ширины, а не от ширины экрана."],
    now: "Делаем компоненты, которые подстраиваются под своё место: @container.",
    body: [
      scene("Карточка везде",
        ["you", "В ленте карточка широкая — фото слева. В сайдбаре узкая — фото сверху."],
        ["bro", "Медиазапрос смотрит на экран, а тут важна ширина места. Это `@container`."]),
      prop("container-type", "Стань контейнером", "`container-type: inline-size` — дети могут спрашивать ширину этого элемента.", "Обёртка карточки становится мерилом.", undefined),
      prop("container-name", "Имя контейнера", "`container-name: card` — чтобы обращаться к конкретному контейнеру.", "Вложенные контейнеры не путаются.", undefined),
      at("@container", "Стили по ширине контейнера", "`@container (min-width: 400px) { … }` — как `@media`, но про ширину контейнера.", "Компонент сам выбирает раскладку там, где стоит.", page(`.slot { container-type: inline-size; } .card { display: grid; gap: 6px; ${box} } @container (min-width: 220px) { .card { grid-template-columns: 60px 1fr; } } .pic { background: #c8763a; min-height: 30px; }`, `<div class="slot"><div class="card"><div class="pic"></div><div>Ручка — широкое место, фото слева</div></div></div>`)),
      val("cqi", "Доля ширины контейнера", "`5cqi` — 5% ширины контейнера.", "Заголовок карточки растёт вместе с карточкой.", undefined),
      rule("Раскладка страницы — `@media`. Раскладка компонента — `@container`.")
    ],
    tasks: [task("Умная карточка", "Сделай `.slot` контейнером (`container-type: inline-size`) и добавь `@container (min-width: 400px)`, где у `.card` `grid-template-columns: 120px 1fr`.", {
      start: page(".card { display: grid; gap: 12px; }", "<div class=\"slot\"><article class=\"card\"><img src=\"latte.jpg\" alt=\"\"><p>Ручка</p></article></div>"),
      checks: [css(".slot", "container-type", "Контейнер", { value: "inline-size" }), css(".card", "grid-template-columns", "Фото слева в широком месте", { value: "120px 1fr", within: "@container" })],
      solution: page(".card { display: grid; gap: 12px; }\n.slot { container-type: inline-size; }\n@container (min-width: 400px) {\n  .card { grid-template-columns: 120px 1fr; }\n}", "<div class=\"slot\"><article class=\"card\"><img src=\"latte.jpg\" alt=\"\"><p>Ручка</p></article></div>")
    })],
    quizzes: [
      single("css-container-vs-media", "Разница", "Чем `@container` отличается от `@media`?", [["size", "Смотрит на ширину контейнера, а не экрана"], ["same", "Ничем"], ["js", "Работает только с JS"], ["print", "Только для печати"]], "size", "Компонент подстраивается под своё место."),
      single("css-container-type", "Включить", "Что нужно задать обёртке, чтобы работал `@container`?", [["ct", "`container-type: inline-size`"], ["disp", "`display: container`"], ["pos", "`position: relative`"], ["name", "Только `id`"]], "ct", "Без этого детям не у кого спрашивать ширину.")
    ]
  });

  L({
    slug: "project-responsive-home", title: "Проект: адаптивная главная", summary: "Главная сайта: телефон, планшет, компьютер и тёмная тема.",
    skill: ["css-project-responsive", "Адаптивная страница", "Собрать главную, которая хорошо выглядит на любом экране и в тёмной теме."],
    now: "Проект: адаптивная главная страница.",
    body: [scene("Любой экран", ["you", "Хочу открыть сайт где угодно — и чтобы красиво."], ["nika", "Три шага: ограничим ширину, добавим колонки на широком, уважим тёмную тему."])],
    tasks: [
      task("Шаг 1. Читаемая ширина", "`.wrap`: `max-width: 1100px` и `margin-inline: auto`.", {
        start: page("", "<div class=\"wrap\"><header>Логотип</header><main class=\"menu\"><article>Ручка</article><article>Пенал</article><article>Ластик</article></main></div>"),
        checks: [css(".wrap", "max-width", "Не шире 1100px", { value: "1100px" }), css(".wrap", "margin-inline", "По центру", { value: "auto" })],
        solution: page(".wrap { max-width: 1100px; margin-inline: auto; }", "<div class=\"wrap\"><header>Логотип</header><main class=\"menu\"><article>Ручка</article><article>Пенал</article><article>Ластик</article></main></div>")
      }),
      task("Шаг 2. Колонки на широком", "`.menu` — грид. Внутри `@media (min-width: 768px)` дай ему `grid-template-columns: repeat(3, 1fr)`.", {
        start: page(".wrap { max-width: 1100px; margin-inline: auto; }", "<div class=\"wrap\"><main class=\"menu\"><article>Ручка</article><article>Пенал</article><article>Ластик</article></main></div>"),
        checks: [css(".menu", "display", "Грид", { value: "grid" }), css(".menu", "grid-template-columns", "Три колонки от 768px", { value: ["repeat(3,1fr)", "1fr 1fr 1fr"], within: "min-width:768px" })],
        solution: page(".wrap { max-width: 1100px; margin-inline: auto; }\n.menu { display: grid; gap: 16px; }\n@media (min-width: 768px) {\n  .menu { grid-template-columns: repeat(3, 1fr); }\n}", "<div class=\"wrap\"><main class=\"menu\"><article>Ручка</article><article>Пенал</article><article>Ластик</article></main></div>")
      }),
      task("Шаг 3. Тёмная тема", "Внутри `@media (prefers-color-scheme: dark)` дай `body` фон `#1c1410` и цвет `#f5e6d3`.", {
        start: page(".menu { display: grid; gap: 16px; }\n@media (min-width: 768px) {\n  .menu { grid-template-columns: repeat(3, 1fr); }\n}", "<main class=\"menu\"><article>Ручка</article></main>"),
        checks: [css("body", "background-color", "Тёмный фон", { value: "#1c1410", within: "prefers-color-scheme:dark" }), css("body", "color", "Светлый текст", { value: "#f5e6d3", within: "prefers-color-scheme:dark" })],
        solution: page(".menu { display: grid; gap: 16px; }\n@media (min-width: 768px) {\n  .menu { grid-template-columns: repeat(3, 1fr); }\n}\n@media (prefers-color-scheme: dark) {\n  body { background-color: #1c1410; color: #f5e6d3; }\n}", "<main class=\"menu\"><article>Ручка</article></main>")
      })
    ],
    quizzes: [single("css-proj-resp-order", "Порядок", "В mobile-first, где описать раскладку в три колонки?", [["media", "В `@media (min-width: …)`"], ["base", "В базовых стилях"], ["max", "В `@media (max-width: …)`"], ["none", "Нигде"]], "media", "Колонки — добавка для широких экранов.")]
  });
}
