// File assignments of the CSS course (ADR-0073): one per project lesson, optional homework.
// The markup comes ready in index.html; the learner writes style.css and uploads both files.
// The server reads the stylesheet — nothing is executed. Solutions must pass their own checks
// (packages/checks/src/course-assignments.test.ts).

const page = (title, body) =>
  `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${title}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

const linked = {
  label: "Файл стилей подключён",
  selector: 'link[rel="stylesheet"][href="style.css"]',
  hint: "Оставьте в head строку link rel=\"stylesheet\" href=\"style.css\"."
};

const files = (html, css) => ({ "index.html": html, "style.css": css });
const allowedFiles = ["index.html", "style.css"];

const priceHtml = page(
  "Прайс",
  `  <h1>Прайс мастерской</h1>
  <p class="lead">Ремонт велосипедов за один день.</p>
  <ul class="prices">
    <li>Настройка тормозов — <b>500 ₽</b></li>
    <li>Замена камеры — <b>300 ₽</b></li>
  </ul>
  <p><a href="#contacts">Записаться</a></p>`
);

const cardHtml = page(
  "Карточка",
  `  <article class="card">
    <img class="card__image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'/%3E" alt="Рюкзак">
    <h2 class="card__title">Городской рюкзак</h2>
    <p class="card__price">4 900 ₽</p>
  </article>`
);

const headerHtml = page(
  "Шапка",
  `  <header class="header">
    <a class="logo" href="#">Студия</a>
    <nav class="menu"><a href="#">Работы</a> <a href="#">Цены</a> <a href="#">Контакты</a></nav>
    <a class="button" href="#">Записаться</a>
  </header>`
);

const gridHtml = page(
  "Каталог",
  `  <main class="catalog">
    <article class="item item--wide">Хит недели</article>
    <article class="item">Лампа</article>
    <article class="item">Кресло</article>
    <article class="item">Стол</article>
  </main>`
);

const homeHtml = page(
  "Главная",
  `  <main class="features">
    <section class="feature">Быстро</section>
    <section class="feature">Удобно</section>
    <section class="feature">Надёжно</section>
  </main>`
);

const finalHtml = page(
  "Портфолио",
  `  <header class="site-header"><a class="logo" href="#">Анна</a></header>
  <main class="works">
    <a class="work" href="#">Лендинг</a>
    <a class="work" href="#">Магазин</a>
    <a class="work" href="#">Блог</a>
  </main>`
);

export default {
  "project-typography": {
    slug: "typography-files",
    title: "Сдать файлы: типографика прайса",
    instructions:
      "Разметка прайса уже готова в `index.html`. В `style.css` задайте шрифт и межстрочный интервал для `body`, размер заголовка `h1`, крупный вводный абзац `.lead` и цвет ссылок `a`. Загрузите оба файла.",
    allowedFiles,
    starterFiles: files(priceHtml, "/* Оформление прайса */\n"),
    checks: [
      linked,
      { label: "Шрифт страницы задан для body", css: { selector: "body", property: "font-family" }, hint: "Например: body { font-family: system-ui, sans-serif; }." },
      { label: "Межстрочный интервал для чтения", css: { selector: "body", property: "line-height" }, hint: "line-height: 1.5 — удобный интервал для текста." },
      { label: "Размер главного заголовка", css: { selector: "h1", property: "font-size" }, hint: "Задайте h1 { font-size: … }, например в rem." },
      { label: "Вводный абзац крупнее текста", css: { selector: ".lead", property: "font-size" }, hint: "Класс .lead уже стоит на абзаце." },
      { label: "Цвет ссылок", css: { selector: "a", property: "color" }, hint: "a { color: … }." }
    ],
    solutionFiles: files(
      priceHtml,
      "body { font-family: system-ui, sans-serif; line-height: 1.5; }\nh1 { font-size: 2.5rem; }\n.lead { font-size: 1.25rem; }\na { color: #7c3aed; }\n"
    )
  },

  "project-card": {
    slug: "card-files",
    title: "Сдать файлы: карточка товара",
    instructions:
      "Оформите карточку `.card` в `style.css`: размеры считаются с учётом рамки (`box-sizing` для всех элементов), у карточки — внутренние отступы, скруглённые углы и тень, а картинка `.card__image` не вылезает за ширину и держит пропорции.",
    allowedFiles,
    starterFiles: files(cardHtml, "/* Карточка товара */\n"),
    checks: [
      linked,
      { label: "Размеры всех элементов считаются с рамкой", css: { selector: "*", property: "box-sizing", value: "border-box" }, hint: "* { box-sizing: border-box; }." },
      { label: "У карточки есть внутренние отступы", css: { selector: ".card", property: "padding" }, hint: ".card { padding: 1rem; }." },
      { label: "Углы карточки скруглены", css: { selector: ".card", property: "border-radius" }, hint: ".card { border-radius: 12px; }." },
      { label: "У карточки есть тень", css: { selector: ".card", property: "box-shadow" }, hint: ".card { box-shadow: 0 4px 16px rgb(0 0 0 / 0.15); }." },
      { label: "Картинка не шире карточки", css: { selector: ".card__image", property: "max-width", value: "100%" }, hint: ".card__image { max-width: 100%; }." },
      { label: "Картинка держит пропорции", css: { selector: ".card__image", property: "aspect-ratio" }, hint: ".card__image { aspect-ratio: 4 / 3; }." }
    ],
    solutionFiles: files(
      cardHtml,
      "* { box-sizing: border-box; }\n.card { padding: 1rem; border-radius: 12px; box-shadow: 0 4px 16px rgb(0 0 0 / 0.15); max-width: 320px; }\n.card__image { max-width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }\n"
    )
  },

  "project-header": {
    slug: "header-files",
    title: "Сдать файлы: шапка на Flexbox",
    instructions:
      "Соберите шапку `.header` на Flexbox: логотип слева, кнопка справа, меню между ними, всё выровнено по центру по вертикали. У меню `.menu` — тоже Flexbox с промежутками между ссылками.",
    allowedFiles,
    starterFiles: files(headerHtml, "/* Шапка сайта */\n"),
    checks: [
      linked,
      { label: "Шапка — flex-контейнер", css: { selector: ".header", property: "display", value: "flex" }, hint: ".header { display: flex; }." },
      { label: "Элементы шапки разнесены по краям", css: { selector: ".header", property: "justify-content", value: "space-between" }, hint: "justify-content: space-between." },
      { label: "Элементы выровнены по центру по вертикали", css: { selector: ".header", property: "align-items", value: "center" }, hint: "align-items: center." },
      { label: "Меню — flex-контейнер", css: { selector: ".menu", property: "display", value: "flex" }, hint: ".menu { display: flex; }." },
      { label: "Между ссылками меню есть промежуток", css: { selector: ".menu", property: "gap" }, hint: ".menu { gap: 1rem; }." }
    ],
    solutionFiles: files(
      headerHtml,
      ".header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; }\n.menu { display: flex; gap: 1rem; }\n"
    )
  },

  "project-menu-grid": {
    slug: "grid-files",
    title: "Сдать файлы: каталог на Grid",
    instructions:
      "Сделайте каталог `.catalog` сеткой: колонки подстраиваются под ширину экрана сами (`repeat` с `auto-fit` и `minmax`), между карточками есть промежутки, а карточка-хит `.item--wide` занимает две колонки.",
    allowedFiles,
    starterFiles: files(gridHtml, "/* Каталог */\n"),
    checks: [
      linked,
      { label: "Каталог — grid-контейнер", css: { selector: ".catalog", property: "display", value: "grid" }, hint: ".catalog { display: grid; }." },
      { label: "Колонки подстраиваются под ширину", css: { selector: ".catalog", property: "grid-template-columns", includes: "auto-fit" }, hint: "grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))." },
      { label: "Ширина колонки задана через minmax", css: { selector: ".catalog", property: "grid-template-columns", includes: "minmax(" }, hint: "minmax(200px, 1fr): не уже 200px, остальное делится поровну." },
      { label: "Между карточками есть промежутки", css: { selector: ".catalog", property: "gap" }, hint: ".catalog { gap: 1rem; }." },
      { label: "Хит занимает две колонки", css: { selector: ".item--wide", property: "grid-column", includes: "span 2" }, hint: ".item--wide { grid-column: span 2; }." }
    ],
    solutionFiles: files(
      gridHtml,
      ".catalog { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }\n.item--wide { grid-column: span 2; }\n"
    )
  },

  "project-responsive-home": {
    slug: "responsive-files",
    title: "Сдать файлы: адаптивная главная",
    instructions:
      "Сделайте блок `.features` адаптивным: на телефоне карточки идут в одну колонку, а от ширины 768px — в три. Добавьте тёмную тему для `body` через `prefers-color-scheme`.",
    allowedFiles,
    starterFiles: files(homeHtml, "/* Главная */\n"),
    checks: [
      linked,
      { label: "На телефоне — одна колонка сетки", css: { selector: ".features", property: "display", value: "grid" }, hint: ".features { display: grid; } без колонок — это одна колонка." },
      { label: "От 768px — три колонки", css: { selector: ".features", property: "grid-template-columns", within: "min-width", includes: "repeat(3" }, hint: "@media (min-width: 768px) { .features { grid-template-columns: repeat(3, 1fr); } }." },
      { label: "Тёмная тема: фон", css: { selector: "body", property: "background-color", within: "prefers-color-scheme" }, hint: "@media (prefers-color-scheme: dark) { body { background-color: #111; } }." },
      { label: "Тёмная тема: цвет текста", css: { selector: "body", property: "color", within: "prefers-color-scheme" }, hint: "В той же медиа-функции задайте светлый color." }
    ],
    solutionFiles: files(
      homeHtml,
      ".features { display: grid; gap: 1rem; }\n@media (min-width: 768px) {\n  .features { grid-template-columns: repeat(3, 1fr); }\n}\n@media (prefers-color-scheme: dark) {\n  body { background-color: #111; color: #eee; }\n}\n"
    )
  },

  "project-final-site": {
    slug: "final-css-files",
    title: "Сдать файлы: стили портфолио",
    instructions:
      "Оформите портфолио: цвета — через переменные в `:root`, работы `.works` — адаптивной сеткой, у ссылок `.work` — плавный переход при наведении и видимый фокус с клавиатуры, а для тех, кто отключил анимации, переходы выключены.",
    allowedFiles,
    starterFiles: files(finalHtml, "/* Портфолио */\n"),
    checks: [
      linked,
      { label: "Цвет акцента — переменная в :root", css: { selector: ":root", property: "--accent" }, hint: ":root { --accent: #7c3aed; }." },
      { label: "Работы — адаптивная сетка", css: { selector: ".works", property: "grid-template-columns", includes: "auto-fit" }, hint: ".works { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }." },
      { label: "Ссылки работ меняются плавно", css: { selector: ".work", property: "transition" }, hint: ".work { transition: transform 0.2s; }." },
      { label: "Фокус с клавиатуры виден", css: { selector: ".work:focus-visible", property: "outline" }, hint: ".work:focus-visible { outline: 3px solid var(--accent); }." },
      { label: "Без анимаций для тех, кто их отключил", css: { selector: ".work", property: "transition", within: "prefers-reduced-motion" }, hint: "@media (prefers-reduced-motion: reduce) { .work { transition: none; } }." }
    ],
    solutionFiles: files(
      finalHtml,
      ":root { --accent: #7c3aed; }\n.works { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }\n.work { transition: transform 0.2s; }\n.work:hover { transform: translateY(-4px); }\n.work:focus-visible { outline: 3px solid var(--accent); }\n@media (prefers-reduced-motion: reduce) {\n  .work { transition: none; }\n}\n"
    )
  }
};
