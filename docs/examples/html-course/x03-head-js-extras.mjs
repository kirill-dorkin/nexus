export function styleBaseMeta(c) {
  const { lesson, single } = c;
  lesson({
    slug: "style-base-meta", title: "style, base и служебные meta", minutes: 10,
    summary: "Встроенные стили, атрибут style, базовый адрес base и meta для обновления и реферера.",
    skill: ["html-head-misc", "Служебные элементы head", "Применять элемент style, атрибут style, base и служебные meta по назначению."],
    body: [], // текст урока — stories/*.mjs
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
  const { lesson, single, multi } = c;
  lesson({
    slug: "security", title: "Безопасность в HTML", minutes: 11,
    summary: "CSP, integrity, crossorigin, rel=noopener, sandbox и почему нельзя вставлять чужой HTML как есть.",
    skill: ["html-security", "Безопасность разметки", "Защищать страницу средствами HTML: CSP, проверка целостности внешних файлов, изоляция фреймов и ссылок."],
    body: [], // текст урока — stories/*.mjs
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
  const { lesson, single } = c;
  lesson({
    slug: "structured-data", title: "Структурированные данные", minutes: 10,
    summary: "JSON-LD и микроданные: как объяснить поисковикам, что на странице курс, рецепт, товар или статья.",
    skill: ["html-structured-data", "Структурированные данные", "Описывать сущности страницы словарём Schema.org через JSON-LD и микроданные."],
    body: [], // текст урока — stories/*.mjs
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
  const { lesson, single } = c;
  lesson({
    slug: "html-and-javascript", title: "HTML и JavaScript: события и DOM", minutes: 11,
    summary: "Как HTML связан со скриптами: атрибуты событий, id и data-*, почему addEventListener лучше onclick.",
    skill: ["html-js-bridge", "Связь HTML и JavaScript", "Понимать, как скрипт находит элементы и реагирует на события, и готовить для этого разметку."],
    body: [], // текст урока — stories/*.mjs
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
  const { lesson, single } = c;
  lesson({
    slug: "editing-and-drag-and-drop", title: "Редактирование и перетаскивание", minutes: 9,
    summary: "contenteditable, spellcheck, draggable, autocapitalize и hidden=until-found: встроенные возможности браузера.",
    skill: ["html-native-interactivity", "Встроенная интерактивность", "Включать редактирование, проверку орфографии, перетаскивание и находимый скрытый текст атрибутами HTML."],
    body: [], // текст урока — stories/*.mjs
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
  const { lesson, single } = c;
  lesson({
    slug: "custom-elements", title: "Свои элементы и Shadow DOM", minutes: 11,
    summary: "Custom elements, template, slot и декларативный Shadow DOM: как создают переиспользуемые компоненты на чистом HTML.",
    skill: ["html-web-components", "Веб-компоненты", "Понимать пользовательские элементы, слоты и Shadow DOM и распознавать их в разметке."],
    body: [], // текст урока — stories/*.mjs
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
