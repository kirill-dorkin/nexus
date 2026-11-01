export function styleBaseMeta(c) {
  const { html, code, mdn, lesson, single } = c;
  lesson({
    slug: "style-base-meta", title: "style, base и служебные meta", minutes: 10,
    summary: "Встроенные стили, атрибут style, базовый адрес base и meta для обновления и реферера.",
    skill: ["html-head-misc", "Служебные элементы head", "Применять элемент style, атрибут style, base и служебные meta по назначению."],
    body: [
      `## Три способа подключить CSS`,
      html(`<style>
  .note { padding: 12px; border-left: 4px solid #c5f23a; background: #f4f9e3; }
</style>
<p class="note">Стиль из элемента style.</p>
<p style="color: crimson">Стиль из атрибута style.</p>`),
      `1. **Внешний файл** \`<link rel="stylesheet" href="styles.css">\` — основной способ: один файл для всех страниц, браузер его кэширует.
2. **Элемент \`<style>\`** в \`head\` — стили только для этой страницы. Подходит для небольших страниц и критичных стилей первого экрана.
3. **Атрибут \`style\`** — стиль одного элемента. Удобно для быстрых проверок и значений, которые подставляет скрипт; в обычной вёрстке не используйте — такие стили трудно менять.`,
      `## base — базовый адрес`,
      code("html", `<head>
  <base href="https://example.com/docs/" target="_blank">
</head>
<body>
  <a href="intro.html">Введение</a>  <!-- → https://example.com/docs/intro.html -->
</body>`),
      `\`base\` меняет точку отсчёта для **всех** относительных адресов на странице, а \`target\` — поведение всех ссылок. Элемент один на страницу и стоит в начале \`head\`. Используется редко: легко сломать якоря и пути. Знайте, что он существует, чтобы распознать его в чужом коде.`,
      `## Служебные meta`,
      code("html", `<!-- Перенаправить через 5 секунд (лучше делать на сервере) -->
<meta http-equiv="refresh" content="5; url=https://example.com/new">

<!-- Какую часть адреса страницы передавать другим сайтам -->
<meta name="referrer" content="strict-origin-when-cross-origin">

<!-- Цветовые схемы, которые поддерживает страница -->
<meta name="color-scheme" content="light dark">

<!-- Автор и программа, сделавшая страницу -->
<meta name="author" content="Анна Петрова">
<meta name="generator" content="Nexus Studio">`),
      `- \`http-equiv="refresh"\` — автообновление или переход. Внезапная перезагрузка сбивает людей и читалки; перенаправления делают на сервере.
- \`referrer\` — политика передачи адреса при переходах.
- \`color-scheme\` — браузер нарисует поля форм и полосы прокрутки в светлой или тёмной теме.`,
      `## Практика`,
      `В песочнице добавьте элемент \`style\` и оформите им класс \`.warning\`. Затем добавьте \`meta name="color-scheme" content="dark"\` и посмотрите, как изменятся поля формы.`,
      mdn("Element/style", "Элемент style")
    ],
    quizzes: [
      single("head-misc-css", "Основной способ", "Как правильно подключить стили, общие для всех страниц сайта?",
        [["link", "Внешним файлом через <link rel=\"stylesheet\">"], ["style-attr", "Атрибутом style у каждого элемента"], ["style-el", "Копировать <style> на каждую страницу"], ["base", "Через <base>"]], "link",
        "Внешний файл подключается одной строкой, кэшируется и меняется в одном месте."),
      single("head-misc-base", "Элемент base", "Что делает <base href=\"…\">?",
        [["relative", "Меняет точку отсчёта для всех относительных адресов на странице"], ["redirect", "Перенаправляет на другой сайт"], ["font", "Задаёт базовый шрифт"], ["db", "Подключает базу данных"]], "relative",
        "base задаёт базовый URL для всех относительных ссылок и ресурсов.")
    ]
  });
}

export function security(c) {
  const { code, html, mdn, lesson, single, multi } = c;
  lesson({
    slug: "bezopasnost-v-html", title: "Безопасность в HTML", minutes: 11,
    summary: "CSP, integrity, crossorigin, rel=noopener, sandbox и почему нельзя вставлять чужой HTML как есть.",
    skill: ["html-security", "Безопасность разметки", "Защищать страницу средствами HTML: CSP, проверка целостности внешних файлов, изоляция фреймов и ссылок."],
    body: [
      `## Главная угроза — чужой код на вашей странице`,
      `**XSS** (межсайтовый скриптинг) — когда злоумышленник вставляет свой \`<script>\` на ваш сайт: например, в комментарий. Если сайт выводит комментарий как HTML, скрипт выполнится у каждого читателя и сможет украсть данные. Поэтому **никогда не вставляйте пользовательский текст в страницу как HTML** — только как текст. Эта платформа, например, вырезает HTML из Markdown уроков.`,
      `## Content Security Policy`,
      code("html", `<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src 'self' https://images.example.com; script-src 'self'">`),
      `CSP — список разрешённых источников: откуда можно грузить скрипты, стили, картинки, фреймы. Даже если злоумышленник вставит \`<script src="https://evil.example">\`, браузер его не загрузит. Обычно CSP отдаёт сервер заголовком, но можно и через \`meta\`.`,
      `## integrity — файл не подменили`,
      code("html", `<script src="https://cdn.example.com/lib@1.2.3/lib.min.js"
        integrity="sha384-…хеш файла…"
        crossorigin="anonymous"></script>`),
      `**Subresource Integrity**: браузер посчитает хеш скачанного файла и не выполнит его, если хеш не совпадёт. Защищает, если взломают CDN. Хеш выдаёт сам CDN или генерируют утилитой.`,
      `## crossorigin`,
      `Атрибут \`crossorigin\` у \`script\`, \`link\`, \`img\`, \`audio\`, \`video\` говорит, как запрашивать файл с другого домена: \`anonymous\` — без cookies, \`use-credentials\` — с ними. Нужен для \`integrity\`, шрифтов с других доменов и чтения пикселей картинки на \`canvas\`.`,
      `## Изоляция ссылок и фреймов`,
      html(`<a href="https://example.com" target="_blank" rel="noopener noreferrer">Внешняя ссылка</a>
<iframe title="Виджет" sandbox srcdoc="<p>Без скриптов и навигации</p>"></iframe>`),
      `- \`rel="noopener"\` — открытая вкладка не получит доступ к вашей странице.
- \`sandbox\` у \`iframe\` — минимум прав для встроенного кода.
- \`referrerpolicy\` — не передавать лишнее о своих адресах.`,
      `## Формы и секреты`,
      `- Пароли — только \`type="password"\` и \`method="post"\`, только по HTTPS.
- Не храните токены, ключи и пароли в HTML, \`hidden\`-полях и комментариях: код страницы видит каждый.
- Проверка данных — всегда на сервере.`,
      `## Практика`,
      `Найдите в песочнице две проблемы безопасности в коде ниже.`,
      html(`<a href="https://partner.example" target="_blank">Партнёр</a>
<!-- api_key: sk_live_123456 -->
<form method="get" action="/login">
  <input type="password" name="password">
</form>`),
      mdn("../Security/Practical_implementation_guides/CSP", "Content Security Policy")
    ],
    quizzes: [
      single("security-xss", "Пользовательский текст", "Как безопасно вывести на странице комментарий пользователя?",
        [["text", "Как текст, без интерпретации HTML"], ["html", "Вставить как HTML, чтобы сохранить оформление"], ["script", "Обернуть в script"], ["comment", "Поместить в HTML-комментарий"]], "text",
        "Вывод пользовательского ввода как HTML открывает дорогу XSS. Выводите как текст."),
      single("security-integrity", "Подмена файла", "Какой атрибут не даст выполнить скрипт с CDN, если файл подменили?",
        [["integrity", "integrity"], ["defer", "defer"], ["async", "async"], ["nonce", "type=\"module\""]], "integrity",
        "integrity сравнивает хеш скачанного файла с ожидаемым."),
      multi("security-mistakes", "Ошибки", "Что из этого — ошибки безопасности?",
        [["key", "Ключ API в HTML-комментарии"], ["get", "Форма входа с method=\"get\""], ["noopener", "rel=\"noopener\" у внешней ссылки"], ["sandbox", "sandbox у чужого iframe"]], ["key", "get"],
        "Секреты в коде страницы видны всем, а GET кладёт пароль в адрес. noopener и sandbox — защитные меры.")
    ]
  });
}

export function structuredData(c) {
  const { code, html, mdn, lesson, single } = c;
  lesson({
    slug: "strukturirovannye-dannye", title: "Структурированные данные", minutes: 10,
    summary: "JSON-LD и микроданные: как объяснить поисковикам, что на странице курс, рецепт, товар или статья.",
    skill: ["html-structured-data", "Структурированные данные", "Описывать сущности страницы словарём Schema.org через JSON-LD и микроданные."],
    body: [
      `## Зачем`,
      `Поисковики умеют показывать **расширенные сниппеты**: звёзды рейтинга, цену, время приготовления, хлебные крошки, вопросы и ответы. Для этого им нужно точно знать, что описано на странице. Общий словарь таких описаний — **Schema.org**.`,
      `## JSON-LD — рекомендуемый способ`,
      code("html", `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "HTML: полный курс",
  "description": "Все возможности HTML с нуля.",
  "inLanguage": "ru",
  "provider": { "@type": "Organization", "name": "Nexus" }
}
</script>`),
      `Это \`script\` с данными, а не с кодом: браузер его не выполняет, а поисковик читает. Описание живёт отдельно от разметки, и его легко поддерживать. Кстати, страницы курсов этой платформы уже содержат такой блок — посмотрите в исходном коде.`,
      `## Микроданные — прямо в разметке`,
      html(`<article itemscope itemtype="https://schema.org/Recipe">
  <h2 itemprop="name">Сырники</h2>
  <p>Время: <time itemprop="totalTime" datetime="PT30M">30 минут</time></p>
  <p itemprop="recipeYield">4 порции</p>
</article>`),
      `- \`itemscope\` — здесь начинается описание сущности.
- \`itemtype\` — её тип из Schema.org.
- \`itemprop\` — свойство; значение берётся из текста элемента или из \`datetime\`, \`href\`, \`src\`, \`content\`.`,
      `## itemid и itemref`,
      html(`<div itemscope itemtype="https://schema.org/Book" itemid="urn:isbn:978-5-17-123456-7" itemref="book-author">
  <p itemprop="name">Мастер и Маргарита</p>
</div>
<p id="book-author">Автор: <span itemprop="author">Михаил Булгаков</span></p>`),
      `- \`itemid\` — глобальный идентификатор сущности (ISBN, URL), чтобы поисковик понял, что разные страницы описывают одно и то же.
- \`itemref\` — список \`id\` элементов вне блока, свойства которых тоже относятся к этой сущности.`,
      `## Популярные типы`,
      `\`Article\`, \`Product\` (с \`Offer\` и ценой), \`Recipe\`, \`Course\`, \`Event\`, \`FAQPage\`, \`BreadcrumbList\`, \`Organization\`, \`Person\`. У каждого типа на schema.org есть список свойств.`,
      `## Проверка`,
      `Инструменты «Проверка расширенных результатов» Google и валидатор schema.org покажут, что поисковик понял из страницы. Описывайте только то, что действительно есть на странице: выдуманные отзывы и рейтинги поисковики наказывают.`,
      `## Практика`,
      `Добавьте в песочнице микроданные к рецепту: название, время и количество порций. Затем напишите для себя тот же рецепт в JSON-LD.`,
      mdn("../../Glossary/JSON-LD", "JSON-LD")
    ],
    quizzes: [
      single("structured-jsonld", "Рекомендуемый формат", "Какой способ описания структурированных данных рекомендуют поисковики?",
        [["jsonld", "JSON-LD в <script type=\"application/ld+json\">"], ["meta", "Мета-тег keywords"], ["class", "Классы CSS с названиями сущностей"], ["comment", "HTML-комментарии"]], "jsonld",
        "JSON-LD отделён от разметки и проще в поддержке."),
      single("structured-itemprop", "Свойство", "Какой атрибут микроданных задаёт свойство сущности?",
        [["itemprop", "itemprop"], ["itemscope", "itemscope"], ["itemtype", "itemtype"], ["property", "property"]], "itemprop",
        "itemscope начинает сущность, itemtype задаёт тип, itemprop — свойства.")
    ]
  });
}

export function jsBridge(c) {
  const { html, code, mdn, lesson, single } = c;
  lesson({
    slug: "html-i-javascript", title: "HTML и JavaScript: события и DOM", minutes: 11,
    summary: "Как HTML связан со скриптами: атрибуты событий, id и data-*, почему addEventListener лучше onclick.",
    skill: ["html-js-bridge", "Связь HTML и JavaScript", "Понимать, как скрипт находит элементы и реагирует на события, и готовить для этого разметку."],
    body: [
      `## HTML — интерфейс для скриптов`,
      `JavaScript работает с DOM: находит элементы, читает и меняет их, реагирует на действия. Хорошая разметка облегчает ему работу: понятные \`id\`, классы, \`data-*\` атрибуты, правильные элементы.`,
      `## Атрибуты событий`,
      code("html", `<button onclick="alert('Привет!')">Нажми меня</button>`),
      `У элементов есть атрибуты \`onclick\`, \`oninput\`, \`onsubmit\`, \`onload\` и десятки других — они запускают код при событии. Так работает, но смешивает разметку с логикой и не дружит с CSP. В современном коде события вешают из скрипта:`,
      code("html", `<button id="greet" type="button" data-name="Аня">Поздороваться</button>
<output id="result"></output>

<script>
  const button = document.querySelector("#greet");
  button.addEventListener("click", () => {
    document.querySelector("#result").textContent = "Привет, " + button.dataset.name + "!";
  });
</script>`),
      `- \`document.querySelector("#greet")\` находит элемент по \`id\` (или любому CSS-селектору).
- \`addEventListener("click", …)\` подписывается на клик.
- \`dataset.name\` читает атрибут \`data-name\`.
- \`textContent\` меняет текст безопасно — без интерпретации HTML.`,
      `## Самые частые события`,
      `\`click\` — нажатие (и Enter или пробел на кнопке), \`input\` — изменение поля, \`change\` — значение подтверждено, \`submit\` — отправка формы, \`keydown\` — клавиша, \`focus\`/\`blur\` — фокус, \`load\` — загрузка картинки или страницы, \`DOMContentLoaded\` — HTML разобран.`,
      `## Разметка, которая помогает скриптам`,
      `- Интерактивное — только на \`button\`, \`a\`, полях форм: они сами получают фокус и клавиатурные события.
- Формы оставляйте настоящими \`form\` с \`name\` у полей — даже если отправку перехватывает скрипт.
- Страница должна быть понятна и без JavaScript: содержимое в HTML, а скрипт лишь улучшает.`,
      `## В песочнице скрипты выключены`,
      `Это сделано ради безопасности: код из урока не может ничего сделать с вашей страницей. Поэтому примеры здесь — для чтения. Попробуйте их в своём \`index.html\`.`,
      html(`<button type="button" data-action="like">Нравится</button>
<p>Кнопка готова к подключению скрипта через data-action.</p>`),
      mdn("../API/EventTarget/addEventListener", "addEventListener")
    ],
    quizzes: [
      single("js-listener", "Подписка на событие", "Как в современном коде подписаться на клик по кнопке?",
        [["listener", "button.addEventListener(\"click\", …) в скрипте"], ["onclick", "Только атрибутом onclick в HTML"], ["href", "Атрибутом href=\"javascript:…\""], ["css", "Через CSS"]], "listener",
        "addEventListener отделяет логику от разметки и работает с CSP."),
      single("js-dataset", "data-атрибуты", "Как скрипт прочитает значение атрибута data-price у элемента el?",
        [["dataset", "el.dataset.price"], ["data", "el.data.price"], ["attr", "el.price"], ["style", "el.style.price"]], "dataset",
        "Атрибуты data-* доступны через свойство dataset.")
    ]
  });
}

export function nativeInteractivity(c) {
  const { html, mdn, lesson, single } = c;
  lesson({
    slug: "redaktirovanie-i-peretaskivanie", title: "Редактирование и перетаскивание", minutes: 9,
    summary: "contenteditable, spellcheck, draggable, autocapitalize и hidden=until-found: встроенные возможности браузера.",
    skill: ["html-native-interactivity", "Встроенная интерактивность", "Включать редактирование, проверку орфографии, перетаскивание и находимый скрытый текст атрибутами HTML."],
    body: [
      `## Редактируемый текст`,
      html(`<div contenteditable="true" spellcheck="true" style="border:1px solid #ccc; padding:8px">
  Кликните и печатайте. Ошибки в словах подчеркнутся: превет, мир.
</div>
<p contenteditable="plaintext-only">Здесь можно вставить только текст без оформления.</p>`),
      `\`contenteditable\` превращает любой элемент в редактор — на этом построены визуальные редакторы статей. \`plaintext-only\` запрещает вставку оформления. \`spellcheck\` включает или выключает проверку орфографии (у полей паролей и кода её стоит выключать).`,
      `## Подсказки клавиатуре телефона`,
      html(`<label>Имя <input autocapitalize="words"></label>
<label>Ник <input autocapitalize="none" autocorrect="off" spellcheck="false"></label>`),
      `\`autocapitalize\` — делать ли заглавные буквы: \`words\`, \`sentences\`, \`characters\`, \`none\`. \`autocorrect\` — автоисправление (поддерживается Safari и частью браузеров).`,
      `## Перетаскивание`,
      html(`<p draggable="true" style="padding:8px; background:#eef">Перетащите этот блок</p>
<p>Ссылки и картинки перетаскиваются по умолчанию — попробуйте с картинкой:</p>
<img src="https://picsum.photos/seed/drag/160/100" alt="Пример картинки" width="160" height="100">`),
      `\`draggable="true"\` разрешает перетаскивать элемент. Куда он упадёт и что произойдёт — обрабатывает JavaScript (события \`dragstart\`, \`dragover\`, \`drop\`). Не делайте перетаскивание единственным способом действия: людям с клавиатурой и на телефонах нужна альтернатива — кнопки «Вверх» и «Вниз».`,
      `## Скрыто, но находится поиском`,
      html(`<p>Нажмите Ctrl+F и найдите слово «секрет».</p>
<div hidden="until-found">Это секрет, который браузер покажет, когда вы его найдёте.</div>`),
      `\`hidden="until-found"\` прячет блок, но поиск по странице его находит и раскрывает. Полезно для свёрнутых разделов. Поддерживается не всеми браузерами: где поддержки нет, блок просто скрыт. Проверяйте актуальное состояние на caniuse.com.`,
      `## Практика`,
      `Сделайте в песочнице «записку»: заголовок и редактируемый абзац с проверкой орфографии, а поле «Ник» — без заглавных и автоисправления.`,
      mdn("Global_attributes/contenteditable", "Атрибут contenteditable")
    ],
    quizzes: [
      single("native-editable", "Редактор", "Какой атрибут делает абзац редактируемым прямо на странице?",
        [["contenteditable", "contenteditable"], ["editable", "editable"], ["draggable", "draggable"], ["spellcheck", "spellcheck"]], "contenteditable",
        "contenteditable включает редактирование содержимого элемента."),
      single("native-drag", "Доступность перетаскивания", "Как сделать список с перетаскиванием доступным?",
        [["alt", "Дать альтернативу: кнопки «Вверх» и «Вниз», доступные с клавиатуры"], ["only", "Достаточно draggable"], ["hide", "Скрыть список от читалок"], ["mouse", "Попросить пользоваться мышью"]], "alt",
        "Перетаскивание не должно быть единственным способом выполнить действие.")
    ]
  });
}

export function webComponents(c) {
  const { html, code, mdn, lesson, single } = c;
  lesson({
    slug: "svoi-elementy", title: "Свои элементы и Shadow DOM", minutes: 11,
    summary: "Custom elements, template, slot и декларативный Shadow DOM: как создают переиспользуемые компоненты на чистом HTML.",
    skill: ["html-web-components", "Веб-компоненты", "Понимать пользовательские элементы, слоты и Shadow DOM и распознавать их в разметке."],
    body: [
      `## Свой тег`,
      code("html", `<user-card name="Анна" role="Автор курса"></user-card>

<script>
  customElements.define("user-card", class extends HTMLElement {
    connectedCallback() {
      this.innerHTML = "<strong></strong> — <span></span>";
      this.querySelector("strong").textContent = this.getAttribute("name");
      this.querySelector("span").textContent = this.getAttribute("role");
    }
  });
</script>`),
      `**Пользовательские элементы** — свои теги с поведением на JavaScript. Правило: в имени обязательно дефис (\`user-card\`, \`nx-button\`), чтобы не столкнуться с будущими стандартными тегами. Пока скрипт не загрузился, браузер показывает элемент как обычный строчный контейнер.`,
      `## Shadow DOM — изолированное содержимое`,
      `Компонент может спрятать внутреннюю разметку и стили в **теневое дерево**: стили страницы не ломают компонент, а его стили не протекают наружу. Так устроены, например, встроенные \`video\` и \`input type="date"\`: внутри у них кнопки и календарь, которых нет в вашем DOM.`,
      `## Декларативный Shadow DOM — без JavaScript`,
      html(`<div>
  <template shadowrootmode="open">
    <style>p { color: crimson; font-weight: bold; }</style>
    <p>Я внутри Shadow DOM: мой стиль не влияет на страницу.</p>
    <slot></slot>
  </template>
  <p>А я — обычный абзац из страницы, показанный через slot.</p>
</div>`),
      `\`template shadowrootmode="open"\` прямо в HTML создаёт теневое дерево. \`slot\` — «окно», куда попадает обычное содержимое элемента. Стиль \`p\` внутри не красит абзацы снаружи. Поддерживается всеми современными браузерами.`,
      `## Именованные слоты`,
      code("html", `<template shadowrootmode="open">
  <header><slot name="title">Без названия</slot></header>
  <slot></slot>
</template>
<h3 slot="title">Карточка курса</h3>
<p>Описание попадёт в слот по умолчанию.</p>`),
      `Атрибут \`slot="title"\` отправляет элемент в слот с этим именем; текст внутри \`slot\` показывается, если ничего не передали. Атрибуты \`part\` и \`exportparts\` позволяют стилизовать отдельные части компонента снаружи.`,
      `## Расширение встроенных элементов: is`,
      code("html", `<button is="copy-button" data-text="Привет">Скопировать</button>
<script>
  customElements.define("copy-button", class extends HTMLButtonElement {}, { extends: "button" });
</script>`),
      `Атрибут \`is\` превращает обычный \`button\` в расширенную версию, сохраняя всю встроенную доступность. Поддерживается не во всех браузерах (Safari отказался), поэтому чаще делают отдельный пользовательский элемент.`,
      `## Настройки декларативного Shadow DOM`,
      code("html", `<template shadowrootmode="open"
          shadowrootdelegatesfocus
          shadowrootclonable
          shadowrootserializable
          shadowrootslotassignment="manual">
  …
</template>`),
      `- \`shadowrootdelegatesfocus\` — клик по компоненту передаёт фокус первому фокусируемому элементу внутри.
- \`shadowrootclonable\` — теневое дерево копируется вместе с элементом при \`cloneNode\`.
- \`shadowrootserializable\` — содержимое попадёт в HTML при сериализации (\`getHTML\`).
- \`shadowrootslotassignment="manual"\` — скрипт сам решает, что попадёт в какой слот.
- \`shadowrootcustomelementregistry\` — компонент может иметь собственный реестр пользовательских элементов (новая возможность).`,
      `## Когда это нужно`,
      `Веб-компоненты — основа дизайн-систем, которые работают в любом фреймворке. Для обычного сайта они не обязательны, но вы будете встречать их в чужом коде и библиотеках — теперь вы знаете, что это.`,
      `## Практика`,
      `В песочнице поменяйте текст и стиль внутри \`template\` из примера и убедитесь, что абзацы вне компонента не окрашиваются.`,
      mdn("../API/Web_components", "Веб-компоненты")
    ],
    quizzes: [
      single("components-name", "Имя тега", "Какое имя подходит для пользовательского элемента?",
        [["dash", "user-card"], ["single", "usercard"], ["upper", "UserCard"], ["std", "card"]], "dash",
        "В имени пользовательского элемента обязательно должен быть дефис."),
      single("components-slot", "Слот", "Что делает элемент <slot> внутри Shadow DOM?",
        [["window", "Показывает внутри компонента содержимое, переданное снаружи"], ["style", "Подключает стили"], ["script", "Запускает скрипт"], ["hide", "Скрывает компонент"]], "window",
        "slot — место, куда попадает обычное содержимое пользовательского элемента.")
    ]
  });
}
