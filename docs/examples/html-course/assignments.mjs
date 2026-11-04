// File assignments of the HTML course (ADR-0073): one per project lesson, optional homework.
// The learner downloads the starter files, builds the page in their own editor and uploads it;
// the server reads the markup — nothing is executed. Every solution must pass its own checks
// (packages/checks/src/course-assignments.test.ts).

const page = (title, body, head = "") =>
  `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <title>${title}</title>${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;

const svg = (label, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="${color}"/><text x="160" y="108" font-size="24" text-anchor="middle" fill="#fff">${label}</text></svg>\n`;

export default {
  "project-recipe": {
    slug: "recipe-files",
    title: "Сдать файлы: страница рецепта",
    instructions:
      "Сверстайте страницу рецепта в файле `index.html`: название блюда, время приготовления, ингредиенты списком, шаги по порядку и характеристики блюда. Откройте страницу в браузере, проверьте её и загрузите файл.",
    allowedFiles: ["index.html"],
    starterFiles: { "index.html": page("Рецепт", "  <!-- Здесь будет рецепт -->\n  <p>Название блюда</p>") },
    checks: [
      { label: "Страница объявляет язык", selector: "html[lang]", hint: "Добавьте атрибут lang к тегу html, например lang=\"ru\"." },
      { label: "Название блюда — заголовок первого уровня", selector: "h1", hint: "Название оформляется тегом h1, он один на странице." },
      { label: "Ингредиенты — маркированный список из трёх пунктов и больше", selector: "ul li", count: 3, hint: "Порядок ингредиентов не важен, поэтому нужен ul с элементами li." },
      { label: "Шаги — нумерованный список из трёх шагов и больше", selector: "ol li", count: 3, hint: "Порядок шагов важен, поэтому нужен ol." },
      { label: "Характеристики — список определений", selector: "dl dt + dd", hint: "Пары «название — значение» (время, порции) оформляются через dl, dt и dd." },
      { label: "Время приготовления размечено машиночитаемо", selector: "time[datetime]", hint: "Оберните время в time с атрибутом datetime, например datetime=\"PT30M\"." }
    ],
    solutionFiles: {
      "index.html": page(
        "Сырники",
        `  <h1>Сырники</h1>
  <p>Время: <time datetime="PT30M">30 минут</time></p>
  <h2>Ингредиенты</h2>
  <ul>
    <li>Творог — 400&nbsp;г</li>
    <li>Яйцо — 1&nbsp;шт.</li>
    <li>Мука — 3&nbsp;ст.&nbsp;л.</li>
  </ul>
  <h2>Приготовление</h2>
  <ol>
    <li>Смешайте творог с яйцом.</li>
    <li>Добавьте муку и сформуйте сырники.</li>
    <li>Обжарьте с двух сторон до румяной корочки.</li>
  </ol>
  <dl>
    <dt>Порции</dt><dd>4</dd>
    <dt>Сложность</dt><dd><strong>простая</strong></dd>
  </dl>`
      )
    }
  },

  "project-gallery": {
    slug: "gallery-files",
    title: "Сдать файлы: фотогалерея",
    instructions:
      "Соберите галерею из трёх картинок папки `images`: у каждой — подпись и альтернативный текст, размеры указаны заранее, чтобы страница не прыгала при загрузке.",
    allowedFiles: ["index.html", "images/*.svg"],
    starterFiles: {
      "index.html": page("Галерея", "  <h1>Галерея</h1>\n  <!-- Картинки лежат в папке images -->"),
      "images/sea.svg": svg("Море", "#0e7490"),
      "images/forest.svg": svg("Лес", "#15803d"),
      "images/city.svg": svg("Город", "#7c3aed")
    },
    checks: [
      { label: "Три картинки, каждая в figure", selector: "figure img", count: 3, hint: "Оберните каждую картинку и её подпись в figure." },
      { label: "У каждой картинки есть подпись", selector: "figure figcaption", count: 3, hint: "Подпись под картинкой — figcaption внутри того же figure." },
      { label: "Ни одной картинки без альтернативного текста", selector: "img:not([alt])", absent: true, hint: "Атрибут alt описывает картинку для тех, кто её не видит." },
      { label: "У картинок заданы ширина и высота", selector: "img[width][height]", count: 3, hint: "width и height резервируют место до загрузки картинки." },
      { label: "Картинки берутся из папки images", selector: 'img[src^="images/"]', count: 3, hint: "Путь относительный: images/sea.svg." }
    ],
    solutionFiles: {
      "index.html": page(
        "Галерея",
        `  <h1>Галерея</h1>
  <figure><img src="images/sea.svg" alt="Бирюзовое море" width="320" height="200"><figcaption>Море</figcaption></figure>
  <figure><img src="images/forest.svg" alt="Зелёный лес" width="320" height="200"><figcaption>Лес</figcaption></figure>
  <figure><img src="images/city.svg" alt="Фиолетовый город" width="320" height="200"><figcaption>Город</figcaption></figure>`
      ),
      "images/sea.svg": svg("Море", "#0e7490"),
      "images/forest.svg": svg("Лес", "#15803d"),
      "images/city.svg": svg("Город", "#7c3aed")
    }
  },

  "project-signup": {
    slug: "signup-files",
    title: "Сдать файлы: форма регистрации",
    instructions:
      "Сверстайте форму регистрации: имя, электронная почта и пароль. У каждого поля — подпись, обязательные поля помечены, форма отправляется методом POST.",
    allowedFiles: ["index.html"],
    starterFiles: { "index.html": page("Регистрация", "  <h1>Регистрация</h1>\n  <!-- Здесь будет форма -->") },
    checks: [
      { label: "Форма отправляется методом POST", selector: 'form[method="post"][action]', hint: "Укажите action и method=\"post\": пароль не должен попадать в адрес." },
      { label: "Три подписи связаны с полями", selector: "label[for]", count: 3, hint: "Атрибут for подписи совпадает с id поля." },
      { label: "Поле почты — обязательное, типа email", selector: 'input[type="email"][required]', hint: "type=\"email\" проверяет формат, required не даёт отправить пустое поле." },
      { label: "Пароль не короче восьми символов", selector: 'input[type="password"][minlength]', hint: "Добавьте minlength=\"8\" к полю пароля." },
      { label: "Браузер может подсказать данные", selector: "input[autocomplete]", count: 2, hint: "autocomplete=\"email\", \"new-password\" помогают заполнить форму." },
      { label: "Есть кнопка отправки", selector: 'button[type="submit"]', hint: "Кнопка с type=\"submit\" отправляет форму." }
    ],
    solutionFiles: {
      "index.html": page(
        "Регистрация",
        `  <h1>Регистрация</h1>
  <form action="/signup" method="post">
    <label for="name">Имя</label>
    <input id="name" name="name" autocomplete="name" required>
    <label for="email">Электронная почта</label>
    <input id="email" name="email" type="email" autocomplete="email" required>
    <label for="password">Пароль</label>
    <input id="password" name="password" type="password" minlength="8" autocomplete="new-password" required>
    <button type="submit">Создать аккаунт</button>
  </form>`
      )
    }
  },

  "project-business-card": {
    slug: "business-card-files",
    title: "Сдать файлы: визитка",
    instructions:
      "Сверстайте страницу-визитку с семантической структурой: шапка, основное содержимое и подвал, контакты в теге address, ссылки для письма и звонка.",
    allowedFiles: ["index.html"],
    starterFiles: { "index.html": page("Визитка", "  <div>Имя Фамилия</div>\n  <div>Профессия</div>") },
    checks: [
      { label: "Есть шапка, основное содержимое и подвал", selector: "body > header ~ main ~ footer", hint: "Используйте header, main и footer вместо div." },
      { label: "Имя — заголовок первого уровня", selector: "header h1", hint: "Имя — главный заголовок, он в шапке." },
      { label: "Контакты в теге address", selector: "address", hint: "address — контакты автора страницы." },
      { label: "Ссылка, чтобы написать письмо", selector: 'address a[href^="mailto:"]', hint: "Ссылка вида mailto:имя@почта открывает почтовую программу." },
      { label: "Ссылка, чтобы позвонить", selector: 'address a[href^="tel:"]', hint: "Ссылка вида tel:+70000000000 начинает звонок на телефоне." }
    ],
    solutionFiles: {
      "index.html": page(
        "Анна Иванова — дизайнер",
        `  <header><h1>Анна Иванова</h1><p>Дизайнер интерфейсов</p></header>
  <main>
    <p>Проектирую понятные сайты и приложения.</p>
  </main>
  <footer>
    <address>
      <a href="mailto:anna@example.test">anna@example.test</a><br>
      <a href="tel:+70000000000">+7 000 000-00-00</a>
    </address>
  </footer>`
      )
    }
  },

  "project-landing": {
    slug: "landing-files",
    title: "Сдать файлы: лендинг с метаданными",
    instructions:
      "Доделайте лендинг: заполните head — заголовок вкладки, описание для поиска, настройку для телефонов, иконку и превью для мессенджеров, — а в теле добавьте меню из трёх ссылок на разделы.",
    allowedFiles: ["index.html", "favicon.svg"],
    starterFiles: {
      "index.html": "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n</head>\n<body>\n  <main>\n    <h1>Курсы рисования</h1>\n    <section id=\"about\"><h2>О курсах</h2></section>\n    <section id=\"prices\"><h2>Цены</h2></section>\n    <section id=\"contacts\"><h2>Контакты</h2></section>\n  </main>\n</body>\n</html>\n",
      "favicon.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"14\" fill=\"#f59e0b\"/></svg>\n"
    },
    checks: [
      { label: "У вкладки есть заголовок", selector: "head title", hint: "title — текст вкладки и заголовок в результатах поиска." },
      { label: "Есть описание для поиска", selector: 'meta[name="description"][content]', hint: "meta name=\"description\" — короткий текст под заголовком в поиске." },
      { label: "Страница настроена для телефонов", selector: 'meta[name="viewport"][content*="width=device-width"]', hint: "Без viewport телефон покажет страницу уменьшенной копией компьютерной." },
      { label: "Подключена иконка сайта", selector: 'link[rel="icon"][href]', hint: "link rel=\"icon\" указывает на favicon.svg." },
      { label: "Есть превью для мессенджеров", selector: 'meta[property="og:title"][content]', hint: "Разметка Open Graph: meta property=\"og:title\"." },
      { label: "Меню из трёх ссылок на разделы", selector: 'nav a[href^="#"]', count: 3, hint: "Ссылки вида #about ведут к элементу с таким id." }
    ],
    solutionFiles: {
      "index.html": "<!doctype html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Курсы рисования для взрослых</title>\n  <meta name=\"description\" content=\"Рисование с нуля: восемь занятий, маленькие группы.\">\n  <link rel=\"icon\" href=\"favicon.svg\" type=\"image/svg+xml\">\n  <meta property=\"og:title\" content=\"Курсы рисования для взрослых\">\n</head>\n<body>\n  <nav aria-label=\"Разделы\"><a href=\"#about\">О курсах</a> <a href=\"#prices\">Цены</a> <a href=\"#contacts\">Контакты</a></nav>\n  <main>\n    <h1>Курсы рисования</h1>\n    <section id=\"about\"><h2>О курсах</h2></section>\n    <section id=\"prices\"><h2>Цены</h2></section>\n    <section id=\"contacts\"><h2>Контакты</h2></section>\n  </main>\n</body>\n</html>\n",
      "favicon.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"14\" fill=\"#f59e0b\"/></svg>\n"
    }
  },

  "project-article": {
    slug: "article-files",
    title: "Сдать файлы: доступная статья",
    instructions:
      "Сверстайте статью, удобную для всех: ссылка «к содержимому» для клавиатуры, основная область, статья с заголовками по порядку, картинка с описанием и кнопки, которые сообщают своё назначение.",
    allowedFiles: ["index.html", "images/*.svg"],
    starterFiles: {
      "index.html": page("Статья", "  <div class=\"article\">\n    <div class=\"title\">Как выбрать велосипед</div>\n  </div>"),
      "images/bike.svg": svg("Велосипед", "#be123c")
    },
    checks: [
      { label: "Первая ссылка ведёт к основному содержимому", selector: 'body > a[href="#main"]:first-child', hint: "Ссылка-пропуск — первый элемент body, она ведёт к main с id=\"main\"." },
      { label: "Основная область помечена", selector: "main#main", hint: "Оберните содержимое в main с id=\"main\"." },
      { label: "Статья с заголовком первого уровня", selector: "main article h1", hint: "Используйте article и один h1." },
      { label: "Есть разделы с подзаголовками", selector: "article h2", count: 2, hint: "Заголовки идут по порядку: после h1 — h2." },
      { label: "Ни одной картинки без альтернативного текста", selector: "img:not([alt])", absent: true, hint: "Опишите картинку в alt." },
      { label: "Кнопки не отправляют форму случайно", selector: "button:not([type])", absent: true, hint: "Укажите type=\"button\" для кнопок, которые не отправляют форму." }
    ],
    solutionFiles: {
      "index.html": page(
        "Как выбрать велосипед",
        `  <a href="#main">Перейти к содержимому</a>
  <main id="main">
    <article>
      <h1>Как выбрать велосипед</h1>
      <img src="images/bike.svg" alt="Красный городской велосипед" width="320" height="200">
      <h2>Рама</h2>
      <p>Размер рамы зависит от роста.</p>
      <h2>Колёса</h2>
      <p>Широкие шины мягче на неровной дороге.</p>
      <button type="button" aria-pressed="false">Сохранить статью</button>
    </article>
  </main>`
      ),
      "images/bike.svg": svg("Велосипед", "#be123c")
    }
  },

  "final-project": {
    slug: "portfolio-files",
    title: "Сдать файлы: сайт-портфолио",
    instructions:
      "Соберите многостраничное портфолио: главная `index.html` и ещё две страницы, общее меню, семантическая разметка и метаданные. Проверяется главная страница; остальные страницы загрузите вместе с ней.",
    allowedFiles: ["*.html", "style.css", "images/*.svg"],
    starterFiles: {
      "index.html": page("Портфолио", "  <h1>Моё портфолио</h1>"),
      "about.html": page("Обо мне", "  <h1>Обо мне</h1>"),
      "projects.html": page("Работы", "  <h1>Работы</h1>"),
      "style.css": ""
    },
    checks: [
      { label: "Страница настроена для телефонов", selector: 'meta[name="viewport"]', hint: "meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"." },
      { label: "Подключён общий файл стилей", selector: 'link[rel="stylesheet"][href="style.css"]', hint: "Один style.css подключается на всех страницах." },
      { label: "Меню ведёт на другие страницы", selector: 'header nav a[href$=".html"]', count: 3, hint: "Ссылки index.html, about.html и projects.html в nav внутри header." },
      { label: "Текущая страница отмечена в меню", selector: 'nav a[aria-current="page"]', hint: "aria-current=\"page\" сообщает, на какой странице находится читатель." },
      { label: "Основное содержимое в main с двумя разделами", selector: "main section", count: 2, hint: "Разделы главной — section с заголовками h2." },
      { label: "Есть подвал", selector: "body > footer", hint: "footer — контакты и год." }
    ],
    solutionFiles: {
      "index.html": page(
        "Портфолио — Анна Иванова",
        `  <header>
    <nav aria-label="Основное меню">
      <a href="index.html" aria-current="page">Главная</a>
      <a href="about.html">Обо мне</a>
      <a href="projects.html">Работы</a>
    </nav>
  </header>
  <main>
    <h1>Анна Иванова</h1>
    <section><h2>Чем занимаюсь</h2><p>Делаю понятные сайты.</p></section>
    <section><h2>Последние работы</h2><p>Лендинг курсов рисования.</p></section>
  </main>
  <footer><p>© 2026</p></footer>`,
        `\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link rel="stylesheet" href="style.css">`
      ),
      "about.html": page("Обо мне", "  <h1>Обо мне</h1>"),
      "projects.html": page("Работы", "  <h1>Работы</h1>"),
      "style.css": "body { font-family: system-ui, sans-serif; }\n"
    }
  }
};
