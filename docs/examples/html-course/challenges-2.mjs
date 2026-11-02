// Challenges, part 2: links, media, tables and forms. See challenges.mjs for the format.
const el = (selector, label, extra = {}) => ({ label, selector, ...extra });
const src = (contains, label, extra = {}) => ({ label, contains, ...extra });
const task = (title, text, { start, checks, solution, hint, at }) => ({
  ...(at ? { at } : {}), title, task: text, start, checks, solution, ...(hint ? { hint } : {})
});

import more from "./challenges-3.mjs";

export default {
  ...more,

  /* ---------- 3. Ссылки ---------- */
  links: [
    task("Меню сайта", "Нужно меню сверху: ссылка на сайт партнёра (`https://example.org` — для теста), почта `hello@example.com` и якорь на раздел «Контакты» с `id=\"contacts\"` ниже.", {
      start: "<nav>\n  <!-- три ссылки -->\n</nav>\n\n<h2>Контакты</h2>\n<p>Мы на связи с 9 до 18.</p>",
      checks: [
        el("a[href^=\"https://example.org\"]", "Ссылка на партнёра"),
        el("a[href^=\"mailto:hello@example.com\"]", "Ссылка на почту через `mailto:`"),
        el("a[href=\"#contacts\"]", "Ссылка-якорь `#contacts`"),
        el("h2#contacts", "У заголовка «Контакты» есть `id=\"contacts\"`")
      ],
      hint: "Якорь работает в паре: `href=\"#contacts\"` у ссылки и `id=\"contacts\"` у цели.",
      solution: "<nav>\n  <a href=\"https://example.org\">Партнёр</a>\n  <a href=\"mailto:hello@example.com\">Написать нам</a>\n  <a href=\"#contacts\">Контакты</a>\n</nav>\n\n<h2 id=\"contacts\">Контакты</h2>\n<p>Мы на связи с 9 до 18.</p>"
    })
  ],
  "file-paths": [
    task("Пути из блога магазина", "Эта страница лежит в `site/blog/post.html`. Поставь правильные относительные пути: «На главную» → `site/index.html`, логотип → `site/images/logo.png`, «Следующий пост» → `site/blog/post-2.html`.", {
      start: "<a href=\"\">На главную</a>\n<img src=\"\" alt=\"Логотип\">\n<a href=\"\">Следующий пост</a>",
      checks: [
        el("a[href=\"../index.html\"]", "«На главную» → `../index.html`"),
        el("img[src=\"../images/logo.png\"]", "Логотип → `../images/logo.png`"),
        el("a[href=\"post-2.html\"]", "«Следующий пост» → `post-2.html`")
      ],
      hint: "`..` — подняться на папку вверх. Файл из той же папки пишется просто по имени.",
      solution: "<a href=\"../index.html\">На главную</a>\n<img src=\"../images/logo.png\" alt=\"Логотип\">\n<a href=\"post-2.html\">Следующий пост</a>"
    })
  ],
  "link-features": [
    task("Скачать меню", "Нужно: ссылка на `price.pdf` должна скачивать меню под именем `prais-2026.pdf`, а ссылка на партнёра `https://example.com` — открываться в новой вкладке безопасно (`rel=\"noopener\"`).", {
      start: "<a href=\"price.pdf\">Скачать прайс</a>\n<a href=\"https://example.com\">Партнёр</a>",
      checks: [
        el("a[href=\"price.pdf\"]", "Прайс скачивается под именем `prais-2026.pdf`", { attr: "download", value: "prais-2026.pdf" }),
        el("a[href=\"https://example.com\"][target=\"_blank\"]", "Партнёр открывается в новой вкладке"),
        el("a[target=\"_blank\"][rel~=\"noopener\"]", "У новой вкладки есть `rel=\"noopener\"`")
      ],
      solution: "<a href=\"price.pdf\" download=\"prais-2026.pdf\">Скачать прайс</a>\n<a href=\"https://example.com\" target=\"_blank\" rel=\"noopener\">Партнёр</a>"
    })
  ],

  /* ---------- 4. Медиа ---------- */
  images: [
    task("Фото зала", "Добавь фото зала магазина в `figure`: у `img` есть `src`, полезный `alt`, размеры `width` и `height`, а под фото — подпись `figcaption`.", {
      start: "<h2>Наш зал</h2>\n",
      checks: [
        el("figure img[src]", "Картинка внутри `figure`"),
        el("img[alt]", "Есть `alt`"),
        el("img[width][height]", "Указаны `width` и `height`"),
        el("figure figcaption", "Есть подпись `figcaption`")
      ],
      hint: "Адрес для теста: `https://picsum.photos/400/250`. Размеры — те же числа: 400 и 250.",
      solution: "<h2>Наш зал</h2>\n<figure>\n  <img src=\"https://picsum.photos/400/250\" alt=\"Светлый зал с диванами у окна\" width=\"400\" height=\"250\">\n  <figcaption>Зал на Баумана, 12</figcaption>\n</figure>"
    })
  ],
  "image-formats": [
    task("Логотип-зёрнышко", "Дизайнер прислал логотип в векторе. Замени растровый `logo.png` на `logo.svg` и оставь фотографию в современном формате `.webp`.", {
      start: "<img src=\"logo.png\" alt=\"Логотип «Север»\">\n<img src=\"photo.bmp\" alt=\"Зал магазина\">",
      checks: [
        el("img[src=\"logo.svg\"]", "Логотип в SVG"),
        el("img[src=\"photo.webp\"]", "Фото в WebP"),
        el("img[src$=\".bmp\"]", "BMP больше нет", { absent: true })
      ],
      solution: "<img src=\"logo.svg\" alt=\"Логотип «Север»\">\n<img src=\"photo.webp\" alt=\"Зал магазина\">"
    })
  ],
  "responsive-images": [
    task("Чёткий пенал на любом экране", "Добавь фото товара `srcset` с двумя файлами (`cat-1x.jpg 1x` и `cat-2x.jpg 2x`) и ленивую загрузку `loading=\"lazy\"`.", {
      start: "<img src=\"cat-1x.jpg\" alt=\"Кот в коробке\" width=\"400\" height=\"300\">",
      checks: [
        el("img[srcset*=\"cat-2x.jpg 2x\"]", "В `srcset` есть версия `2x`"),
        el("img[srcset*=\"cat-1x.jpg 1x\"]", "В `srcset` есть версия `1x`"),
        el("img[loading=\"lazy\"]", "Ленивая загрузка")
      ],
      solution: "<img src=\"cat-1x.jpg\" srcset=\"cat-1x.jpg 1x, cat-2x.jpg 2x\" alt=\"Кот в коробке\" width=\"400\" height=\"300\" loading=\"lazy\">"
    }),
    task("picture: AVIF с запасным JPEG", "Оберни картинку в `picture` и добавь перед ней `source` с `type=\"image/avif\"` и `srcset=\"cat.avif\"`.", {
      start: "<img src=\"cat.jpg\" alt=\"Кот в коробке\">",
      checks: [
        el("picture source[type=\"image/avif\"]", "`source` с типом AVIF внутри `picture`"),
        el("picture source[srcset=\"cat.avif\"]", "`srcset=\"cat.avif\"`"),
        el("picture img", "Запасной `img` остаётся последним")
      ],
      solution: "<picture>\n  <source type=\"image/avif\" srcset=\"cat.avif\">\n  <img src=\"cat.jpg\" alt=\"Кот в коробке\">\n</picture>"
    })
  ],
  video: [
    task("Ручка-арт на главной", "Добавь видео администратор: `controls`, постер `poster.jpg`, два источника — `film.webm` и `film.mp4` — и запасной текст для старых браузеров.", {
      start: "<h2>Трейлер</h2>\n",
      checks: [
        el("video[controls]", "У видео есть `controls`"),
        el("video[poster]", "Есть постер"),
        el("video source", "Два источника", { count: 2 }),
        el("video source[type=\"video/mp4\"]", "У MP4 указан `type`")
      ],
      solution: "<h2>Трейлер</h2>\n<video controls poster=\"poster.jpg\" width=\"640\">\n  <source src=\"film.webm\" type=\"video/webm\">\n  <source src=\"film.mp4\" type=\"video/mp4\">\n  Ваш браузер не поддерживает видео.\n</video>"
    })
  ],
  "audio-and-captions": [
    task("Подкаст «Разговоры о вебе»", "Сделай аудиоплеер `audio` с `controls` и источником `episode.mp3`, а под ним видео `lesson.mp4` с субтитрами `track` (`kind=\"subtitles\"`, `srclang=\"ru\"`, `label=\"Русский\"`).", {
      start: "",
      checks: [
        el("audio[controls]", "Аудио с `controls`"),
        el("audio source[src=\"episode.mp3\"], audio[src=\"episode.mp3\"]", "Источник `episode.mp3`"),
        el("video track[kind=\"subtitles\"][srclang=\"ru\"]", "Русские субтитры `track`"),
        el("track[label]", "У дорожки есть `label`")
      ],
      solution: "<audio controls src=\"episode.mp3\"></audio>\n<video controls src=\"lesson.mp4\">\n  <track kind=\"subtitles\" src=\"lesson.ru.vtt\" srclang=\"ru\" label=\"Русский\" default>\n</video>"
    })
  ],
  "iframe-embeds": [
    task("Карта проезда", "Встрой карту до магазина `https://example.com/map` через `iframe`: дай ему `title`, ленивую загрузку и песочницу `sandbox`.", {
      start: "<iframe src=\"https://example.com/map\"></iframe>",
      checks: [
        el("iframe[title]", "У `iframe` есть `title`"),
        el("iframe[loading=\"lazy\"]", "Ленивая загрузка"),
        el("iframe[sandbox]", "Включена песочница `sandbox`")
      ],
      solution: "<iframe src=\"https://example.com/map\" title=\"Карта: офис на Баумана\" loading=\"lazy\" sandbox width=\"600\" height=\"400\"></iframe>"
    })
  ],
  "svg-and-mathml": [
    task("Зёрнышко в SVG", "Нарисуй прямо в HTML значок-материал — жёлтый круг: `svg` с `viewBox=\"0 0 100 100\"` и внутри `circle` с центром 50,50, радиусом 40 и `fill=\"gold\"`. Дай значку `role=\"img\"` и `aria-label`.", {
      start: "<svg>\n</svg>",
      checks: [
        src("viewBox=\"0 0 100 100\"", "`viewBox=\"0 0 100 100\"`"),
        el("svg circle[r=\"40\"]", "Круг радиусом 40"),
        el("circle[fill=\"gold\"]", "Заливка `gold`"),
        el("svg[role=\"img\"][aria-label]", "У значка есть `role` и `aria-label`")
      ],
      solution: "<svg viewBox=\"0 0 100 100\" width=\"120\" role=\"img\" aria-label=\"Север\">\n  <circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"gold\"/>\n</svg>"
    })
  ],
  "script-elements": [
    task("Калькулятор обоев", "Подготовь место для калькулятора: `canvas` 300×150 с запасным текстом внутри, `template` с карточкой товара (`article` внутри) и `noscript` с просьбой включить JavaScript.", {
      start: "",
      checks: [
        el("canvas[width=\"300\"][height=\"150\"]", "`canvas` 300×150"),
        el("canvas", "Внутри холста есть запасной текст", { text: "" }),
        el("template", "Есть `template`"),
        el("noscript", "Есть `noscript`")
      ],
      hint: "Содержимое `template` не видно на странице — это заготовка для скриптов.",
      solution: "<canvas width=\"300\" height=\"150\">График: сколько обоев нужно на комнату</canvas>\n<template id=\"card\">\n  <article><h3></h3><p></p></article>\n</template>\n<noscript>Включи JavaScript, чтобы увидеть график.</noscript>"
    })
  ],
  "image-maps": [
    task("Схема этажа", "Свяжи схему этажа с картой кабинетов: у `img` атрибут `usemap=\"#floor\"`, у `map` — `name=\"floor\"`, внутри две области `area` со ссылками и `alt`.", {
      start: "<img src=\"floor.png\" alt=\"Схема этажа\" width=\"400\" height=\"200\">\n<map>\n</map>",
      checks: [
        el("img[usemap=\"#floor\"]", "`usemap=\"#floor\"` у картинки"),
        el("map[name=\"floor\"]", "`name=\"floor\"` у карты"),
        el("map area[href][alt]", "Две области со ссылкой и `alt`", { count: 2 })
      ],
      solution: "<img src=\"floor.png\" alt=\"Схема этажа\" width=\"400\" height=\"200\" usemap=\"#floor\">\n<map name=\"floor\">\n  <area shape=\"rect\" coords=\"0,0,200,200\" href=\"#room-1\" alt=\"Кабинет 101\">\n  <area shape=\"rect\" coords=\"200,0,400,200\" href=\"#room-2\" alt=\"Кабинет 102\">\n</map>"
    })
  ],

  /* ---------- 5. Таблицы ---------- */
  tables: [
    task("Цены товаров", "Сделай таблицу цен: подпись `caption`, строка заголовков `th` (Товар, Цена) и две строки данных.", {
      start: "<table>\n</table>",
      checks: [
        el("table caption", "Есть подпись `caption`"),
        el("table th", "Два заголовка столбцов `th`", { count: 2 }),
        el("table td", "Минимум четыре ячейки данных", { count: 4 })
      ],
      solution: "<table>\n  <caption>Цены, ₽</caption>\n  <tr><th>Товар</th><th>Цена</th></tr>\n  <tr><td>Ручка</td><td>220</td></tr>\n  <tr><td>Пенал</td><td>290</td></tr>\n</table>"
    })
  ],
  "complex-tables": [
    task("Отчёт для бухгалтера", "Разбей таблицу продаж на `thead`, `tbody` и `tfoot`, у заголовков столбцов поставь `scope=\"col\"`, а ячейку «Итого» растяни на два столбца (`colspan=\"2\"`).", {
      start: "<table>\n  <tr><th>Товар</th><th>Кол-во</th><th>Сумма</th></tr>\n  <tr><td>Тетрадь</td><td>2</td><td>400</td></tr>\n  <tr><td>Итого</td><td></td><td>400</td></tr>\n</table>",
      checks: [
        el("thead th[scope=\"col\"]", "Заголовки в `thead` со `scope=\"col\"`", { count: 3 }),
        el("tbody td", "Данные в `tbody`"),
        el("tfoot td[colspan=\"2\"]", "«Итого» в `tfoot` на два столбца", { text: "Итого" })
      ],
      solution: "<table>\n  <thead><tr><th scope=\"col\">Товар</th><th scope=\"col\">Кол-во</th><th scope=\"col\">Сумма</th></tr></thead>\n  <tbody><tr><td>Тетрадь</td><td>2</td><td>400</td></tr></tbody>\n  <tfoot><tr><td colspan=\"2\">Итого</td><td>400</td></tr></tfoot>\n</table>"
    })
  ],

  /* ---------- 6. Формы ---------- */
  "how-forms-work": [
    task("Поиск по меню", "Сделай поиск по меню — форму, которая отправляет запрос методом GET на `/search`: поле `input` с `name=\"q\"` и кнопка отправки.", {
      start: "<form>\n  <input>\n</form>",
      checks: [
        el("form[action=\"/search\"]", "`action=\"/search\"`"),
        el("form[method=\"get\"]", "Метод `get`"),
        el("input[name=\"q\"]", "У поля есть `name=\"q\"`"),
        el("form button, form input[type=\"submit\"]", "Есть кнопка отправки")
      ],
      hint: "Без `name` значение поля не попадёт в запрос.",
      solution: "<form action=\"/search\" method=\"get\">\n  <input name=\"q\" type=\"search\">\n  <button>Найти</button>\n</form>"
    })
  ],
  "fields-and-labels": [
    task("Подписи в форме", "Чтобы Лев смог заполнить форму, свяжи каждое поле с подписью: у `label` атрибут `for`, у `input` такой же `id`. Поля: «Имя» и «Email».", {
      start: "<form>\n  Имя <input name=\"name\">\n  Email <input name=\"email\" type=\"email\">\n</form>",
      checks: [
        el("label[for=\"name\"]", "Подпись «Имя» с `for=\"name\"`"),
        el("input#name", "Поле имени с `id=\"name\"`"),
        el("label[for=\"email\"]", "Подпись «Email» с `for=\"email\"`"),
        el("input#email", "Поле почты с `id=\"email\"`")
      ],
      solution: "<form>\n  <label for=\"name\">Имя</label>\n  <input id=\"name\" name=\"name\">\n  <label for=\"email\">Email</label>\n  <input id=\"email\" name=\"email\" type=\"email\">\n</form>"
    })
  ],
  "input-types": [
    task("Поля брони", "В форме брони поменяй типы полей, чтобы телефон открывал цифровую клавиатуру и браузер помогал с вводом: email → `email`, телефон → `tel`, дата → `date`, количество → `number` от 1 до 10.", {
      start: "<input name=\"email\">\n<input name=\"phone\">\n<input name=\"day\">\n<input name=\"count\">",
      checks: [
        el("input[name=\"email\"][type=\"email\"]", "Email — `type=\"email\"`"),
        el("input[name=\"phone\"][type=\"tel\"]", "Телефон — `type=\"tel\"`"),
        el("input[name=\"day\"][type=\"date\"]", "Дата — `type=\"date\"`"),
        el("input[name=\"count\"][type=\"number\"][min=\"1\"][max=\"10\"]", "Количество — число от 1 до 10")
      ],
      solution: "<input name=\"email\" type=\"email\">\n<input name=\"phone\" type=\"tel\">\n<input name=\"day\" type=\"date\">\n<input name=\"count\" type=\"number\" min=\"1\" max=\"10\">"
    })
  ],
  "checkboxes-and-radios": [
    task("Способ участия", "Сгруппируй три варианта — онлайн, очно, в записи — в `fieldset` с `legend`. Это `radio` с одинаковым `name=\"delivery\"`, первый выбран по умолчанию.", {
      start: "<form>\n  Онлайн\n  Очно\n  В записи\n</form>",
      checks: [
        el("fieldset legend", "Есть `fieldset` с `legend`"),
        el("input[type=\"radio\"][name=\"delivery\"]", "Три `radio` с `name=\"delivery\"`", { count: 3 }),
        el("input[type=\"radio\"][checked]", "Один вариант выбран по умолчанию"),
        el("label input[type=\"radio\"]", "Каждый вариант внутри `label`", { count: 3 })
      ],
      solution: "<form>\n  <fieldset>\n    <legend>Способ участия</legend>\n    <label><input type=\"radio\" name=\"delivery\" value=\"online\" checked> Онлайн</label>\n    <label><input type=\"radio\" name=\"delivery\" value=\"offline\"> Очно</label>\n    <label><input type=\"radio\" name=\"delivery\" value=\"recording\"> В записи</label>\n  </fieldset>\n</form>"
    })
  ],
  "select-lists": [
    task("Время брони", "Сделай выпадающий список `select` с подписью и тремя вариантами времени, сгруппированными в `optgroup` «Вечер».", {
      start: "<label for=\"city\">Время</label>\n",
      checks: [
        el("select#city", "`select` с `id=\"city\"`"),
        el("select optgroup[label]", "Есть `optgroup` с `label`"),
        el("optgroup option", "Три города", { count: 3 })
      ],
      solution: "<label for=\"city\">Время</label>\n<select id=\"city\" name=\"city\">\n  <optgroup label=\"Вечер\">\n    <option>18:00</option>\n    <option>19:00</option>\n    <option>20:00</option>\n  </optgroup>\n</select>"
    })
  ],
  "textarea-and-buttons": [
    task("Комментарий к брони", "Сделай поле комментария `textarea` (5 строк, с подписью) и две кнопки: «Отправить» (`type=\"submit\"`) и «Очистить» (`type=\"reset\"`).", {
      start: "<form>\n</form>",
      checks: [
        el("textarea[rows=\"5\"]", "`textarea` на 5 строк"),
        el("label", "У поля есть подпись"),
        el("button[type=\"submit\"]", "Кнопка отправки"),
        el("button[type=\"reset\"]", "Кнопка сброса")
      ],
      solution: "<form>\n  <label for=\"review\">Ваш отзыв</label>\n  <textarea id=\"review\" name=\"review\" rows=\"5\"></textarea>\n  <button type=\"submit\">Отправить</button>\n  <button type=\"reset\">Очистить</button>\n</form>"
    })
  ],
  "file-uploads": [
    task("Фото к отзыву", "Сделай форму, где посетитель прикрепляет фото к отзыву: метод POST, `enctype=\"multipart/form-data\"`, поле `type=\"file\"`, которое принимает только картинки и сразу несколько файлов.", {
      start: "<form action=\"/upload\">\n  <input name=\"photos\">\n  <button>Загрузить</button>\n</form>",
      checks: [
        el("form[method=\"post\"]", "Метод `post`"),
        el("form[enctype=\"multipart/form-data\"]", "`enctype=\"multipart/form-data\"`"),
        el("input[type=\"file\"][accept^=\"image\"]", "Принимает только картинки"),
        el("input[type=\"file\"][multiple]", "Можно выбрать несколько файлов")
      ],
      solution: "<form action=\"/upload\" method=\"post\" enctype=\"multipart/form-data\">\n  <input name=\"photos\" type=\"file\" accept=\"image/*\" multiple>\n  <button>Загрузить</button>\n</form>"
    })
  ],
  "form-validation": [
    task("Никаких пустых броней", "заказчику приходят брони без данных. Добавь встроенные проверки: имя обязательно (`required`), логин от 3 до 16 символов (`minlength`/`maxlength`), индекс — ровно 6 цифр (`pattern=\"[0-9]{6}\"`).", {
      start: "<form>\n  <input name=\"name\">\n  <input name=\"login\">\n  <input name=\"zip\">\n  <button>Отправить</button>\n</form>",
      checks: [
        el("input[name=\"name\"][required]", "Имя обязательно"),
        el("input[name=\"login\"][minlength=\"3\"][maxlength=\"16\"]", "Логин от 3 до 16 символов"),
        el("input[name=\"zip\"][pattern=\"[0-9]{6}\"]", "Индекс — 6 цифр")
      ],
      hint: "Попробуй отправить пустую форму в результате справа — браузер сам покажет ошибку.",
      solution: "<form>\n  <input name=\"name\" required>\n  <input name=\"login\" minlength=\"3\" maxlength=\"16\">\n  <input name=\"zip\" pattern=\"[0-9]{6}\">\n  <button>Отправить</button>\n</form>"
    })
  ],
  "usable-forms": [
    task("Бронь за 10 секунд", "Включи автозаполнение в форме брони: имя — `autocomplete=\"name\"`, почта — `email`, а коду из СМС дай `inputmode=\"numeric\"` и `autocomplete=\"one-time-code\"`.", {
      start: "<input name=\"name\">\n<input name=\"email\" type=\"email\">\n<input name=\"code\">",
      checks: [
        el("input[name=\"name\"][autocomplete=\"name\"]", "Имя с `autocomplete=\"name\"`"),
        el("input[name=\"email\"][autocomplete=\"email\"]", "Почта с `autocomplete=\"email\"`"),
        el("input[name=\"code\"][inputmode=\"numeric\"]", "Код открывает цифровую клавиатуру"),
        el("input[name=\"code\"][autocomplete=\"one-time-code\"]", "Код подставляется из СМС")
      ],
      solution: "<input name=\"name\" autocomplete=\"name\">\n<input name=\"email\" type=\"email\" autocomplete=\"email\">\n<input name=\"code\" inputmode=\"numeric\" autocomplete=\"one-time-code\">"
    })
  ],
  "output-progress-meter": [
    task("Загрузка и свободные места", "Покажи ход загрузки фото `progress` (70 из 100) и заполненность зала `meter` (0.2 из диапазона 0–1 с `low=\"0.3\"`). У обоих элементов должна быть подпись.", {
      start: "<p>Загрузка: 70%</p>\n<p>Заряд: 20%</p>",
      checks: [
        el("progress[value=\"70\"][max=\"100\"]", "`progress` 70 из 100"),
        el("meter[value=\"0.2\"]", "`meter` со значением 0.2"),
        el("meter[low=\"0.3\"]", "У `meter` есть порог `low`"),
        el("label", "Есть подписи", { count: 2 })
      ],
      solution: "<label for=\"up\">Загрузка</label>\n<progress id=\"up\" value=\"70\" max=\"100\">70%</progress>\n<label for=\"bat\">Заряд</label>\n<meter id=\"bat\" value=\"0.2\" min=\"0\" max=\"1\" low=\"0.3\">20%</meter>"
    })
  ],
  "advanced-forms": [
    task("Кнопка в подвале", "Дизайнер унёс кнопку «Подписаться» на новости магазина в подвал, далеко от формы. Дай форме `id=\"sub\"`, а кнопке — `form=\"sub\"`. Ещё отключи блок «Адрес» целиком через `fieldset disabled`.", {
      start: "<form>\n  <input name=\"email\" type=\"email\">\n  <fieldset>\n    <legend>Адрес</legend>\n    <input name=\"city\">\n  </fieldset>\n</form>\n<footer><button>Подписаться</button></footer>",
      checks: [
        el("form#sub", "У формы `id=\"sub\"`"),
        el("footer button[form=\"sub\"]", "Кнопка связана через `form=\"sub\"`"),
        el("fieldset[disabled]", "Блок «Адрес» отключён")
      ],
      solution: "<form id=\"sub\">\n  <input name=\"email\" type=\"email\">\n  <fieldset disabled>\n    <legend>Адрес</legend>\n    <input name=\"city\">\n  </fieldset>\n</form>\n<footer><button form=\"sub\">Подписаться</button></footer>"
    })
  ]
};
