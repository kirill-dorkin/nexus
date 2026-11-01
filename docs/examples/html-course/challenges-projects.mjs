// Projects as step-by-step builds: every step starts from the previous step's result,
// so the learner assembles one finished page. Validated like every other challenge.
const el = (selector, label, extra = {}) => ({ label, selector, ...extra });
const src = (contains, label, extra = {}) => ({ label, contains, ...extra });
const step = (title, text, { start, checks, solution, hint }) => ({ title, task: text, start, checks, solution, ...(hint ? { hint } : {}) });

const doc = (title, body, head = "") =>
  `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <title>${title}</title>${head}\n</head>\n<body>\n${body}\n</body>\n</html>`;

/* ---------- Рецепт ---------- */
const recipe1 = doc("Раф «Зерно» дома", `  <h1>Раф «Зерно» дома</h1>\n  <figure>\n    <img src="https://picsum.photos/id/431/400/250" alt="Раф с корицей в высоком стакане" width="400" height="250">\n    <figcaption>Фирменный раф кофейни</figcaption>\n  </figure>`);
const recipe2 = recipe1.replace("</figure>", `</figure>\n  <h2>Ингредиенты</h2>\n  <ul>\n    <li>Эспрессо — 30&nbsp;мл</li>\n    <li>Сливки 10% — 150&nbsp;мл</li>\n    <li>Ванильный сахар — 10&nbsp;г</li>\n  </ul>`);
const recipe3 = recipe2.replace("  </ul>\n</body>", `  </ul>\n  <h2>Как готовить</h2>\n  <ol>\n    <li>Свари эспрессо.</li>\n    <li>Смешай со сливками и сахаром.</li>\n    <li>Взбей паром до пены.</li>\n  </ol>\n  <dl>\n    <dt>Время</dt><dd><time datetime="PT5M">5 минут</time></dd>\n    <dt>Порции</dt><dd>1</dd>\n  </dl>\n</body>`);

/* ---------- Галерея ---------- */
const g = (id, alt, cap, lazy, sized) =>
  `    <li><figure><img src="https://picsum.photos/id/${id}/300/200" alt="${alt}"${sized ? ' width="300" height="200"' : ""}${lazy ? ' loading="lazy"' : ""}>${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure></li>`;
const galleryItems = (cap, sized, lazy) => [
  g(1060, "Бариста наливает молоко в чашку", cap && "Тимур за работой", false, sized),
  g(225, "Чашка чая на деревянном столе", cap && "Чай из Фуцзяни", lazy, sized),
  g(30, "Кофейные зёрна в мешке", cap && "Наше зерно", lazy, sized)
].join("\n");
const gallery1 = doc("Наши фото — Зерно", `  <h1>Наши фото</h1>\n  <ul>\n${galleryItems(false, false, false)}\n  </ul>`);
const gallery2 = doc("Наши фото — Зерно", `  <h1>Наши фото</h1>\n  <ul>\n${galleryItems(true, true, false)}\n  </ul>`);
const gallery3 = doc("Наши фото — Зерно", `  <h1>Наши фото</h1>\n  <ul>\n${galleryItems(true, true, true)}\n  </ul>`);

/* ---------- Клуб гостей ---------- */
const club1 = doc("Клуб гостей «Зерно»", `  <h1>Клуб гостей</h1>\n  <form action="/club" method="post">\n    <label for="name">Имя</label>\n    <input id="name" name="name">\n    <label for="email">Email</label>\n    <input id="email" name="email">\n    <label for="password">Пароль</label>\n    <input id="password" name="password" type="password">\n  </form>`);
const club2 = club1
  .replace('<input id="name" name="name">', '<input id="name" name="name" autocomplete="name" required>')
  .replace('<input id="email" name="email">', '<input id="email" name="email" type="email" autocomplete="email" required>')
  .replace('<input id="password" name="password" type="password">', '<input id="password" name="password" type="password" minlength="8" autocomplete="new-password" required>');
const club3 = club2.replace("  </form>", `    <fieldset>\n      <legend>Любимый напиток</legend>\n      <label><input type="radio" name="drink" value="raf" checked> Раф</label>\n      <label><input type="radio" name="drink" value="latte"> Латте</label>\n    </fieldset>\n    <label><input type="checkbox" name="terms" required> Согласен с правилами клуба</label>\n    <button type="submit">Вступить в клуб</button>\n  </form>`);

/* ---------- Визитка Тимура ---------- */
const card1 = `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Тимур Галиев — бариста</title>\n</head>\n<body>\n</body>\n</html>`;
const card2 = card1.replace("<body>\n</body>", `<body>\n  <header>\n    <img src="https://picsum.photos/id/1062/160/160" alt="Тимур с питчером у кофемашины" width="160" height="160">\n    <h1>Тимур Галиев</h1>\n  </header>\n  <main>\n    <h2>Обо мне</h2>\n    <p>Бариста кофейни «Зерно», пять лет за стойкой.</p>\n  </main>\n</body>`);
const card3 = card2.replace("  </main>\n</body>", `    <h2>Что умею</h2>\n    <ul>\n      <li>Латте-арт</li>\n      <li>Обжарка</li>\n      <li>Альтернативное заваривание</li>\n    </ul>\n  </main>\n  <footer>\n    <a href="mailto:timur@zerno.ru">timur@zerno.ru</a>\n    <a href="tel:+79000000000">+7 900 000-00-00</a>\n  </footer>\n</body>`);

/* ---------- Лендинг мастер-класса ---------- */
const land1 = `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Латте-арт за один вечер — Зерно</title>\n  <meta name="description" content="Мастер-класс по латте-арту в кофейне «Зерно»: сердце и розетта за три часа.">\n  <meta property="og:title" content="Латте-арт за один вечер">\n</head>\n<body>\n</body>\n</html>`;
const land2 = land1.replace("<body>\n</body>", `<body>\n  <header>\n    <nav aria-label="Главное меню">\n      <a href="#program">Программа</a>\n      <a href="#signup">Запись</a>\n    </nav>\n  </header>\n  <main>\n    <h1>Латте-арт за один вечер</h1>\n    <p>Нарисуешь сердце и розетту, даже если никогда не держал питчер.</p>\n    <a href="#signup">Записаться</a>\n  </main>\n</body>`);
const land3 = land2.replace("  </main>\n</body>", `    <section id="program">\n      <h2>Программа</h2>\n      <ol>\n        <li>Молоко и пена</li>\n        <li>Сердце</li>\n        <li>Розетта</li>\n      </ol>\n    </section>\n    <section id="signup">\n      <h2>Запись</h2>\n      <form action="/masterclass" method="post">\n        <label for="mail">Email</label>\n        <input id="mail" name="email" type="email" autocomplete="email" required>\n        <button type="submit">Записаться</button>\n      </form>\n    </section>\n  </main>\n</body>`);

/* ---------- Статья ---------- */
const art1 = doc("Как мы обжариваем кофе — Зерно", `  <main>\n    <article>\n      <header>\n        <h1>Как мы обжариваем кофе</h1>\n        <p>Марта, <time datetime="2026-11-01">1 ноября 2026</time></p>\n      </header>\n    </article>\n  </main>`);
const art2 = art1.replace("      </header>\n    </article>", `      </header>\n      <nav aria-label="Оглавление">\n        <ul>\n          <li><a href="#beans">Зелёное зерно</a></li>\n          <li><a href="#roast">Обжарка</a></li>\n        </ul>\n      </nav>\n      <section id="beans">\n        <h2>Зелёное зерно</h2>\n        <p>Везём из Эфиопии и Бразилии.</p>\n      </section>\n      <section id="roast">\n        <h2>Обжарка</h2>\n        <p>Двенадцать минут и ни секундой больше.</p>\n      </section>\n    </article>`);
const art3 = art2.replace("      </section>\n    </article>", `      </section>\n      <figure>\n        <img src="https://picsum.photos/id/30/600/300" alt="Горячее зерно в ростере">\n        <figcaption>Наш ростер</figcaption>\n      </figure>\n      <blockquote><p>Обжарка — как стейк: секунды решают всё.</p></blockquote>\n      <aside><p>Кстати: зерно после обжарки отдыхает три дня.</p></aside>\n    </article>`);

/* ---------- Финальный проект ---------- */
const fin1 = `<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Кофейня «Зерно» — Казань</title>\n  <meta name="description" content="Кофейня «Зерно» в Казани: своя обжарка, завтраки, бронь столиков.">\n  <link rel="icon" href="/favicon.svg" type="image/svg+xml">\n</head>\n<body>\n</body>\n</html>`;
const fin2 = fin1.replace("<body>\n</body>", `<body>\n  <a href="#main">Перейти к содержимому</a>\n  <header>\n    <nav aria-label="Главное меню">\n      <a href="index.html" aria-current="page">Главная</a>\n      <a href="menu.html">Меню</a>\n    </nav>\n  </header>\n  <main id="main">\n    <h1>Кофейня «Зерно»</h1>\n  </main>\n</body>`);
const fin3 = fin2.replace("  </main>\n</body>", `    <article><h2>Раф</h2><p>Фирменный, с ванилью.</p></article>\n    <article><h2>Чизкейк</h2><p>Печём каждое утро.</p></article>\n    <section>\n      <h2>Как нас найти</h2>\n      <address>Казань, ул. Баумана, 12 · <a href="tel:+78431234567">+7 843 123-45-67</a></address>\n    </section>\n  </main>\n  <footer>© 2026 Зерно</footer>\n</body>`);
const fin4 = fin3.replace("    <section>\n      <h2>Как нас найти</h2>", `    <section>\n      <h2>Бронь столика</h2>\n      <form action="/booking" method="post">\n        <label for="guest">Имя</label>\n        <input id="guest" name="guest" autocomplete="name" required>\n        <label for="phone">Телефон</label>\n        <input id="phone" name="phone" type="tel" autocomplete="tel" required>\n        <button type="submit">Забронировать</button>\n      </form>\n    </section>\n    <section>\n      <h2>Как нас найти</h2>`);

export default {
  "project-recipe": [
    step("Шаг 1. Шапка рецепта", "Начни страницу рецепта: заголовок `h1` и фото рафа в `figure` с `alt`, размерами и подписью `figcaption`.", {
      start: doc("Раф «Зерно» дома", "  "),
      checks: [el("h1", "Заголовок `h1`"), el("figure img[alt][width][height]", "Фото с `alt`, `width` и `height` в `figure`"), el("figure figcaption", "Подпись `figcaption`")],
      solution: recipe1
    }),
    step("Шаг 2. Ингредиенты", "Добавь раздел `h2` «Ингредиенты» и маркированный список минимум из трёх пунктов. Между числом и единицей — неразрывный пробел `&nbsp;`.", {
      start: recipe1,
      checks: [el("h2", "Раздел «Ингредиенты»", { text: "Ингредиенты" }), el("ul li", "Три ингредиента", { count: 3 }), src("&nbsp;мл", "Число и «мл» не разрываются (`&nbsp;`)")],
      solution: recipe2
    }),
    step("Шаг 3. Шаги и время", "Добавь шаги приготовления нумерованным списком (минимум три) и список определений `dl` с временем в `time` и количеством порций.", {
      start: recipe2,
      checks: [el("ol li", "Три шага в `ol`", { count: 3 }), el("dl dt", "Пары в `dl`", { count: 2 }), el("dd time[datetime]", "Время в `time` с `datetime`")],
      solution: recipe3
    })
  ],
  "project-gallery": [
    step("Шаг 1. Три фото", "Сделай галерею: список `ul`, в каждом пункте `figure` с фото и осмысленным `alt`. Нужно три фото.", {
      start: doc("Наши фото — Зерно", "  <h1>Наши фото</h1>"),
      checks: [el("ul > li > figure > img", "Три фото в `figure` внутри списка", { count: 3 }), el("img[alt]", "У каждого фото есть `alt`", { count: 3 })],
      solution: gallery1
    }),
    step("Шаг 2. Подписи и размеры", "Подпиши каждое фото `figcaption` и задай всем `width` и `height`, чтобы страница не прыгала при загрузке.", {
      start: gallery1,
      checks: [el("figure figcaption", "Три подписи", { count: 3 }), el("img[width][height]", "Размеры у трёх фото", { count: 3 })],
      solution: gallery2
    }),
    step("Шаг 3. Скорость", "Включи ленивую загрузку `loading=\"lazy\"` у второго и третьего фото. Первое фото видно сразу — его не трогай.", {
      start: gallery2,
      checks: [el("img[loading=\"lazy\"]", "Два фото грузятся лениво", { count: 2, max: 2 }), el("li:first-child img:not([loading])", "Первое фото без `loading`")],
      hint: "Первое фото на первом экране: если сделать его ленивым, оно появится позже.",
      solution: gallery3
    })
  ],
  "project-signup": [
    step("Шаг 1. Поля и подписи", "Сделай форму вступления в клуб: `method=\"post\"`, поля «Имя», «Email» и «Пароль», каждое со своим `label` через `for` и `id`.", {
      start: doc("Клуб гостей «Зерно»", "  <h1>Клуб гостей</h1>"),
      checks: [el("form[method=\"post\"]", "Форма отправляется методом POST"), el("label[for]", "Три подписи с `for`", { count: 3 }), el("input[type=\"password\"]", "Поле пароля")],
      solution: club1
    }),
    step("Шаг 2. Проверки и автозаполнение", "Сделай все три поля обязательными, у почты — `type=\"email\"`, у пароля — `minlength=\"8\"`, и включи `autocomplete`: `name`, `email`, `new-password`.", {
      start: club1,
      checks: [el("input[required]", "Три обязательных поля", { count: 3 }), el("input[type=\"email\"][autocomplete=\"email\"]", "Почта: тип и автозаполнение"), el("input[type=\"password\"][minlength=\"8\"][autocomplete=\"new-password\"]", "Пароль от 8 символов, менеджер паролей поможет"), el("input[autocomplete=\"name\"]", "Имя с `autocomplete=\"name\"`")],
      solution: club2
    }),
    step("Шаг 3. Выбор и согласие", "Добавь группу «Любимый напиток» — `fieldset` с `legend` и радиокнопками, обязательный флажок согласия и кнопку «Вступить в клуб».", {
      start: club2,
      checks: [el("fieldset legend", "Группа с названием `legend`"), el("fieldset input[type=\"radio\"][name=\"drink\"]", "Две радиокнопки с одним `name`", { count: 2 }), el("input[type=\"checkbox\"][required]", "Обязательный флажок согласия"), el("button", "Кнопка «Вступить в клуб»", { text: "Вступить в клуб" })],
      solution: club3
    })
  ],
  "project-business-card": [
    step("Шаг 1. Каркас", "Начни визитку Тимура с правильного каркаса: язык `ru`, кодировка, `viewport` для телефонов и понятный `title`.", {
      start: "<html>\n<head>\n</head>\n<body>\n</body>\n</html>",
      checks: [src("<!doctype html>", "Есть `<!doctype html>`"), el("html[lang=\"ru\"]", "`lang=\"ru\"`"), el("meta[charset]", "Кодировка"), el("meta[name=\"viewport\"]", "`viewport`"), el("title", "Заголовок вкладки с именем Тимура", { text: "Тимур" })],
      solution: card1
    }),
    step("Шаг 2. Шапка и «Обо мне»", "Добавь `header` с фото (с `alt`) и именем в `h1`, а в `main` — раздел «Обо мне».", {
      start: card1,
      checks: [el("header img[alt]", "Фото с `alt` в шапке"), el("header h1", "Имя в `h1`"), el("main h2", "Раздел «Обо мне»", { text: "Обо мне" }), el("main p", "Пара слов о себе")],
      solution: card2
    }),
    step("Шаг 3. Навыки и контакты", "Добавь список навыков (минимум три) и `footer` со ссылками на почту и телефон.", {
      start: card2,
      checks: [el("main ul li", "Три навыка", { count: 3 }), el("footer a[href^=\"mailto:\"]", "Почта"), el("footer a[href^=\"tel:\"]", "Телефон")],
      solution: card3
    })
  ],
  "project-landing": [
    step("Шаг 1. Head лендинга", "Заполни `head` лендинга мастер-класса: `viewport`, `title`, описание для поиска и `og:title` для превью в мессенджерах.", {
      start: doc("Документ", ""),
      checks: [el("meta[name=\"viewport\"]", "`viewport`"), el("title", "Название мастер-класса во вкладке", { text: "латте" }), el("meta[name=\"description\"][content]", "Описание `description`"), el("meta[property=\"og:title\"]", "`og:title`")],
      solution: land1
    }),
    step("Шаг 2. Первый экран", "Сделай шапку с меню (`#program`, `#signup`) и первый экран: `h1`, абзац-обещание и ссылку «Записаться» на `#signup`.", {
      start: land1,
      checks: [el("header nav a[href=\"#program\"]", "Меню: «Программа»"), el("main h1", "Главный заголовок"), el("main a[href=\"#signup\"]", "Кнопка «Записаться»", { text: "Записаться" })],
      solution: land2
    }),
    step("Шаг 3. Программа и запись", "Добавь раздел `#program` с программой (`ol`, три пункта) и раздел `#signup` с формой: почта с `label`, `type=\"email\"`, `autocomplete` и `required`, и кнопка.", {
      start: land2,
      checks: [el("section#program ol li", "Программа из трёх пунктов", { count: 3 }), el("section#signup form label[for]", "У поля почты есть подпись"), el("section#signup input[type=\"email\"][required][autocomplete=\"email\"]", "Правильное поле почты"), el("section#signup button", "Кнопка отправки")],
      solution: land3
    })
  ],
  "project-article": [
    step("Шаг 1. Шапка статьи", "Начни статью Марты: `article` с `header`, в нём заголовок `h1` и дата публикации в `time` с `datetime`.", {
      start: doc("Как мы обжариваем кофе — Зерно", "  <main>\n  </main>"),
      checks: [el("main article header h1", "Заголовок в `header` статьи"), el("article header time[datetime]", "Дата в `time`")],
      solution: art1
    }),
    step("Шаг 2. Оглавление и разделы", "Добавь оглавление — `nav` с `aria-label` и списком ссылок — и два раздела `section` с `h2` и `id`, на которые эти ссылки ведут.", {
      start: art1,
      checks: [el("article nav[aria-label] ul li a[href^=\"#\"]", "Оглавление из двух ссылок", { count: 2 }), el("article section[id] h2", "Два раздела с `id`", { count: 2 }), el("section#roast", "Ссылка `#roast` ведёт на раздел")],
      solution: art2
    }),
    step("Шаг 3. Иллюстрация и цитата", "Добавь фото ростера в `figure` с подписью, цитату обжарщика в `blockquote` и заметку «Кстати» в `aside`.", {
      start: art2,
      checks: [el("article figure img[alt]", "Фото с `alt` в `figure`"), el("article figure figcaption", "Подпись к фото"), el("article blockquote", "Цитата"), el("article aside", "Врезка «Кстати»", { text: "Кстати" })],
      solution: art3
    })
  ],
  "final-project": [
    step("Шаг 1. Head сайта", "Главная кофейни начинается с `head`: язык, кодировка, `viewport`, `title`, описание и иконка вкладки.", {
      start: "<!doctype html>\n<html>\n<head>\n</head>\n<body>\n</body>\n</html>",
      checks: [el("html[lang=\"ru\"]", "`lang=\"ru\"`"), el("meta[charset]", "Кодировка"), el("meta[name=\"viewport\"]", "`viewport`"), el("meta[name=\"description\"][content]", "Описание"), el("link[rel=\"icon\"]", "Иконка вкладки")],
      solution: fin1
    }),
    step("Шаг 2. Каркас и навигация", "Добавь ссылку «Перейти к содержимому», шапку с меню, где главная отмечена `aria-current=\"page\"`, и `main` с `id=\"main\"` и заголовком.", {
      start: fin1,
      checks: [el("body > a[href=\"#main\"]:first-child", "Первая ссылка — к содержимому"), el("header nav a[aria-current=\"page\"]", "Текущая страница отмечена"), el("main#main h1", "`main` с `id=\"main\"` и `h1`")],
      solution: fin2
    }),
    step("Шаг 3. Меню и контакты", "Наполни главную: две карточки напитков в `article`, раздел «Как нас найти» с `address` и кликабельным телефоном, и `footer`.", {
      start: fin2,
      checks: [el("main article h2", "Две карточки напитков", { count: 2 }), el("main address a[href^=\"tel:\"]", "Адрес с телефоном"), el("footer", "Подвал")],
      solution: fin3
    }),
    step("Шаг 4. Бронь столика", "Последний штрих — форма брони: имя и телефон с подписями, `type=\"tel\"`, `autocomplete` и `required`, кнопка «Забронировать». Лев должен пройти её сам.", {
      start: fin3,
      checks: [el("form[method=\"post\"]", "Форма отправляется POST"), el("form label[for]", "Подписи у двух полей", { count: 2 }), el("input[type=\"tel\"][autocomplete=\"tel\"][required]", "Телефон: тип, автозаполнение, обязательный"), el("form button", "Кнопка «Забронировать»", { text: "Забронировать" })],
      solution: fin4
    })
  ]
};
