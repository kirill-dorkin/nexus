export function quality(c) {
  const { html, code, mdn, lesson, single, multi, diagram, demo } = c;

  lesson({
    slug: "code-quality", title: "Проверка и качество кода", minutes: 10,
    summary: "DevTools, Lighthouse и самые частые ошибки начинающих: как найти и исправить их самому.",
    skill: ["html-quality", "Качество разметки", "Проверять разметку инструментами браузера и находить частые ошибки."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("quality-id", "Повторяющийся id", "На странице два элемента с id=\"intro\". В чём проблема?",
        [["unique", "id должен быть уникальным: ссылки, подписи и скрипты найдут только первый"], ["none", "Никакой проблемы"], ["css", "Перестанет работать CSS"], ["slow", "Страница загрузится медленнее"]], "unique",
        "id обязан быть уникальным. Для повторяющихся групп используют class."),
      multi("quality-errors", "Найдите ошибки", "Какие записи нарушают правила HTML?",
        [["div-in-p", "<p><div>Текст</div></p>"], ["p-in-ul", "<ul><p>Пункт</p></ul>"], ["btn-in-a", "<a href=\"/\"><button>Купить</button></a>"], ["strong-in-p", "<p><strong>Важно</strong></p>"]], ["div-in-p", "p-in-ul", "btn-in-a"],
        "div нельзя в p, в ul только li, интерактивное нельзя в интерактивном. strong внутри p — правильно.")
    ]
  });
}

export function projectCard(c) {
  const { html, code, mdn, lesson, single, multi, diagram, demo } = c;

  lesson({
    slug: "project-business-card", title: "Проект 1: страница-визитка", minutes: 30,
    summary: "Соберите свою первую настоящую страницу из всего, что изучили в основах.",
    skill: ["html-project-card", "Проект: визитка", "Собрать целую страницу из базовых элементов и проверить её по чек-листу."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      multi("project-card-check", "Проверка визитки", "Отметьте всё, что обязательно для корректной и доступной визитки.",
        [["h1", "Один h1 и разделы на h2"], ["alt", "Осмысленный alt у фото"], ["label", "label у каждого поля формы"], ["table", "Раскладка страницы таблицей"], ["br", "Отступы через несколько <br>"]], ["h1", "alt", "label"],
        "Иерархия заголовков, alt и подписи полей — основа корректной страницы. Таблицы и br для раскладки не используют.")
    ]
  });
}

export function projectLanding(c) {
  const { html, code, mdn, lesson, single, multi, diagram, demo } = c;

  lesson({
    slug: "project-landing", title: "Проект 2: лендинг курса", minutes: 40,
    summary: "Одностраничный сайт для онлайн-курса: оффер, программа, видео, тарифы, FAQ и форма записи.",
    skill: ["html-project-landing", "Проект: лендинг", "Спроектировать и сверстать семантичный лендинг с медиа, таблицей тарифов, FAQ и формой."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      multi("project-landing-check", "Проверка лендинга", "Что обязательно должно быть в форме записи лендинга?",
        [["label", "label у каждого поля"], ["types", "Подходящие type: email, tel"], ["autocomplete", "autocomplete для имени, почты и телефона"], ["placeholder", "placeholder вместо подписей"], ["reset", "Кнопка «Очистить» рядом с «Отправить»"]], ["label", "types", "autocomplete"],
        "Подписи, правильные типы и автозаполнение делают форму быстрой и доступной. placeholder вместо label и кнопка сброса вредят.")
    ]
  });
}

export function projectArticle(c) {
  const { html, code, mdn, lesson, single, multi, diagram, demo } = c;

  lesson({
    slug: "project-article", title: "Проект 3: статья для блога", minutes: 35,
    summary: "Длинная статья с оглавлением, медиа, кодом, таблицей, цитатами и метаданными.",
    skill: ["html-project-article", "Проект: статья", "Сверстать длинную статью с оглавлением, богатой текстовой семантикой, медиа и метаданными."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("project-article-toc", "Оглавление", "Как правильно разметить оглавление статьи?",
        [["nav", "nav с подписью и списком ссылок на id разделов"], ["aside", "aside со списком без ссылок"], ["table", "Таблица разделов"], ["p", "Абзац с перечислением через запятую"]], "nav",
        "Оглавление — навигация по документу: nav со списком якорных ссылок.")
    ]
  });
}

export function projectFinal(c) {
  const { html, code, mdn, lesson, single, multi, diagram, demo } = c;

  lesson({
    slug: "final-project", title: "Финальный проект: сайт-портфолио", minutes: 45,
    summary: "Многостраничный сайт из трёх страниц с общей навигацией, формами, медиа и полной проверкой качества.",
    skill: ["html-project-portfolio", "Финальный проект: портфолио", "Собрать многостраничный сайт с общей структурой, правильными путями, метаданными и проверкой доступности."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("project-final-current", "Текущая страница", "Как отметить в меню ссылку на текущую страницу для читалок?",
        [["current", "aria-current=\"page\" у этой ссылки"], ["class", "Только class=\"active\""], ["bold", "Обернуть в strong"], ["remove", "Удалить ссылку на текущую страницу из меню"]], "current",
        "aria-current=\"page\" сообщает читалке, что ссылка ведёт на текущую страницу. Класс нужен только для оформления."),
      single("project-final-paths", "Пути между страницами", "Сайт открывают прямо с диска без сервера. Какие пути между страницами сработают?",
        [["relative", "Относительные: projects.html, images/avatar.webp"], ["root", "Корневые: /projects.html"], ["absolute", "Абсолютные на localhost"], ["any", "Любые"]], "relative",
        "Без сервера корневой путь / указывает на корень диска. Относительные пути работают и с диска, и на хостинге.")
    ]
  });
}
