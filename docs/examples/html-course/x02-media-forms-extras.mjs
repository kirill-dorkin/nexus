export function imageMaps(c) {
  const { html, code, mdn, lesson, single } = c;
  lesson({
    slug: "karty-izobrazhenij", title: "Карты-изображения и object", minutes: 9,
    summary: "map и area: кликабельные области на картинке. object: встраивание PDF и других документов.",
    skill: ["html-image-maps", "Карты-изображения и object", "Делать кликабельные области на картинке через map и area и встраивать документы через object с запасным содержимым."],
    body: [
      `## Кликабельные области: map и area`,
      html(`<img src="https://picsum.photos/seed/map/400/200" alt="План этажа" width="400" height="200" usemap="#floor">
<map name="floor">
  <area shape="rect" coords="0,0,200,200" href="#hall" alt="Холл">
  <area shape="circle" coords="300,100,60" href="#kitchen" alt="Кухня">
</map>
<p id="hall">Холл</p>
<p id="kitchen">Кухня</p>`),
      `- \`usemap="#floor"\` у картинки связывает её с \`map name="floor"\`.
- \`area\` — область-ссылка: \`shape\` (\`rect\`, \`circle\`, \`poly\`), \`coords\` — координаты в пикселях исходной картинки, \`href\` — куда ведёт, \`alt\` — **обязательный** текст области.`,
      `## Ограничения`,
      `Координаты привязаны к реальному размеру картинки: если CSS растянет её, области съедут. Поэтому сегодня карты-изображения используют редко — для схем, планов и инфографики с фиксированным размером. Чаще те же задачи решают кнопками поверх картинки или интерактивным SVG.`,
      `## object — встроить документ`,
      code("html", `<object data="/files/program.pdf" type="application/pdf" width="600" height="400">
  <p>Не удалось показать PDF. <a href="/files/program.pdf">Скачайте программу курса</a>.</p>
</object>`),
      `\`object\` встраивает внешний ресурс: PDF, SVG, другую страницу. Содержимое внутри — запасной вариант, если браузер не может показать файл (например, на телефоне PDF часто не встраивается). Для PDF надёжнее дать ссылку на скачивание или открыть в \`iframe\`.`,
      `## embed`,
      `\`<embed src="file.pdf" type="application/pdf">\` — пустой элемент для того же, но без запасного содержимого. Остался со времён плагинов вроде Flash. В новом коде используйте \`iframe\`, \`object\` или просто ссылку.`,
      `## Практика`,
      `Сделайте в песочнице картинку с двумя областями \`area\`, которые ведут на якоря ниже. Проверьте, что у каждой области есть \`alt\`.`,
      mdn("Element/map", "Элемент map")
    ],
    quizzes: [
      single("maps-link", "Связь карты", "Как связать картинку с элементом <map name=\"plan\">?",
        [["usemap", "usemap=\"#plan\" у img"], ["map", "map=\"plan\" у img"], ["href", "href=\"#plan\" у img"], ["for", "for=\"plan\" у img"]], "usemap",
        "Атрибут usemap с решёткой указывает имя карты."),
      single("maps-object-fallback", "Запасной вариант", "Зачем писать содержимое внутри <object>?",
        [["fallback", "Это запасной вариант, если браузер не может показать файл"], ["title", "Это подпись над документом"], ["required", "Без него object не работает"], ["nothing", "Оно никогда не отображается"]], "fallback",
        "Содержимое object показывается, только если встроить ресурс не удалось.")
    ]
  });
}

export function projectGallery(c) {
  const { html, lesson, multi } = c;
  lesson({
    slug: "mini-proekt-galereya", title: "Мини-проект: фотогалерея", minutes: 25,
    summary: "Галерея путешествия: адаптивные картинки с подписями, ленивая загрузка, видео с субтитрами и иконки SVG.",
    skill: ["html-project-gallery", "Мини-проект: галерея", "Собрать медиастраницу с адаптивными изображениями, подписями, видео и доступными иконками."],
    body: [
      `## Задача`,
      `Сделайте страницу «Моё путешествие» — фотогалерея и видео. Проект закрепляет модули «Ссылки» и «Медиа».`,
      `## Требования`,
      `1. \`h1\` и вступительный абзац; ссылка на карту места (внешняя, в новой вкладке, с правильным \`rel\`).
2. Минимум 6 фото, каждое в \`figure\` с \`figcaption\`; список фото — \`ul\` с \`li\`.
3. У каждой картинки: осмысленный \`alt\`, \`width\` и \`height\`, \`srcset\` минимум из двух размеров и \`sizes\`.
4. Первая картинка грузится сразу, остальные — \`loading="lazy"\`.
5. Одна картинка через \`picture\` с отдельным кадрированием для телефона.
6. Видео с \`poster\`, \`controls\` и \`preload="metadata"\`.
7. Иконка «камера» в SVG рядом с текстом — скрыта от читалок.`,
      `## Заготовка`,
      html(`<h1>Алтай за неделю</h1>
<p>Горы, озёра и <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">карта маршрута</a>.</p>

<ul>
  <li>
    <figure>
      <img src="https://picsum.photos/seed/altai1/800/533"
           srcset="https://picsum.photos/seed/altai1/400/267 400w, https://picsum.photos/seed/altai1/800/533 800w"
           sizes="(max-width: 600px) 100vw, 400px"
           alt="Бирюзовое озеро между заснеженными вершинами" width="800" height="533">
      <figcaption>Кучерлинское озеро, день 3.</figcaption>
    </figure>
  </li>
  <!-- Ещё 5 фото с loading="lazy" -->
</ul>

<p>
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="9" r="4" fill="currentColor"/></svg>
  Все фото сняты на телефон.
</p>`),
      `## Чек-лист`,
      `- У всех картинок alt описывает, что на фото, а figcaption дополняет, а не повторяет.
- Ленивая загрузка не стоит на первой картинке.
- Видео можно поставить на паузу и включить звук только по желанию.
- Нет горизонтальной прокрутки на телефоне.`
    ],
    quizzes: [
      multi("gallery-check", "Проверка галереи", "Что правильно для галереи?",
        [["alt", "Осмысленный alt у каждого фото"], ["lazy", "loading=\"lazy\" у фото ниже первого экрана"], ["size", "width и height у каждой картинки"], ["autoplay", "Видео с автозапуском и звуком"], ["lazyfirst", "loading=\"lazy\" у самой первой картинки"]], ["alt", "lazy", "size"],
        "alt, размеры и ленивая загрузка ниже первого экрана — правильно. Автозапуск со звуком и lazy у первой картинки вредят.")
    ]
  });
}

export function advancedForms(c) {
  const { html, code, mdn, lesson, single } = c;
  lesson({
    slug: "prodvinutye-formy", title: "Продвинутые возможности форм", minutes: 11,
    summary: "Атрибут form, formtarget, fieldset disabled, input image, dirname и несколько форм на странице.",
    skill: ["html-form-advanced", "Продвинутые формы", "Связывать поля с формой на расстоянии, переопределять поведение кнопок и блокировать группы полей."],
    body: [
      `## Поле вне формы: атрибут form`,
      html(`<form id="search" action="/search">
  <label for="q">Поиск</label>
  <input id="q" name="q">
</form>

<p>… другая часть страницы …</p>

<button form="search">Найти</button>
<input type="hidden" name="source" value="footer" form="search">`),
      `Атрибут \`form="id"\` привязывает поле или кнопку к форме, даже если они находятся в другом месте разметки. Удобно, когда дизайн разносит кнопку и поля по разным блокам. Внутри одной формы нельзя вложить другую — \`form\` в \`form\` запрещено, а атрибут \`form\` решает задачу без вложения.`,
      `## Отключить группу полей`,
      html(`<form>
  <label><input type="checkbox" name="delivery"> Нужна доставка</label>
  <fieldset disabled>
    <legend>Адрес доставки</legend>
    <label>Улица <input name="street"></label>
    <label>Дом <input name="house"></label>
  </fieldset>
</form>`),
      `\`disabled\` у \`fieldset\` отключает сразу все поля внутри. Скрипт включит группу, когда человек отметит флажок.`,
      `## Где открыть ответ: target и formtarget`,
      code("html", `<form action="/preview" target="_blank">…</form>
<button formaction="/print" formtarget="_blank">Версия для печати</button>`),
      `\`target\` у формы и \`formtarget\` у кнопки открывают результат отправки в новой вкладке. Вместе с \`formaction\`, \`formmethod\`, \`formenctype\` и \`formnovalidate\` у одной формы может быть несколько кнопок с разным поведением.`,
      `## Кнопка-картинка`,
      code("html", `<input type="image" src="/img/send.png" alt="Отправить" width="120" height="40">`),
      `Работает как кнопка отправки и вдобавок передаёт координаты клика. Используется редко; \`alt\` обязателен — это текст кнопки. Обычно лучше \`button\` с картинкой внутри.`,
      `## Направление введённого текста: dirname`,
      code("html", `<input name="comment" dir="auto" dirname="comment.dir">`),
      `Вместе со значением отправится направление текста (\`ltr\` или \`rtl\`) — пригодится многоязычным сайтам.`,
      `## Имя формы и отключение автозаполнения`,
      `\`name\` у формы позволяет обратиться к ней из скрипта; \`autocomplete="off"\` у формы или поля просит браузер не подсказывать сохранённые значения. Для полей логина и пароля его лучше не выключать: менеджеры паролей помогают людям.`,
      `## Практика`,
      `В песочнице сделайте форму заказа, где кнопка «Оформить» вынесена в отдельный блок ниже и связана атрибутом \`form\`, а группа «Адрес» отключена через \`fieldset disabled\`.`,
      mdn("Element/input#form", "Атрибут form")
    ],
    quizzes: [
      single("forms-adv-attr", "Кнопка вне формы", "Кнопка находится вне <form id=\"order\">. Как связать её с формой?",
        [["form", "form=\"order\" у кнопки"], ["for", "for=\"order\" у кнопки"], ["target", "target=\"order\""], ["nest", "Вложить вторую форму"]], "form",
        "Атрибут form со значением id формы связывает элемент с ней на расстоянии."),
      single("forms-adv-fieldset", "Группа полей", "Как одним атрибутом отключить все поля адреса?",
        [["fieldset", "disabled у их общего fieldset"], ["form", "disabled у form"], ["hidden", "hidden у каждого поля"], ["readonly", "readonly у legend"]], "fieldset",
        "disabled у fieldset отключает все элементы внутри группы.")
    ]
  });
}

export function projectSignup(c) {
  const { html, lesson, multi } = c;
  lesson({
    slug: "mini-proekt-registraciya", title: "Мини-проект: форма регистрации", minutes: 25,
    summary: "Регистрация на онлайн-мероприятие: все типы полей, группы, проверка, автозаполнение и понятные подсказки.",
    skill: ["html-project-signup", "Мини-проект: регистрация", "Собрать доступную форму регистрации с подходящими типами полей, проверкой и автозаполнением."],
    body: [
      `## Задача`,
      `Сверстайте форму регистрации на онлайн-конференцию. Проект закрепляет модули «Таблицы» и «Формы».`,
      `## Требования`,
      `1. Личные данные: имя (\`autocomplete="name"\`), почта (\`type="email"\`, \`required\`), телефон (\`type="tel"\`, \`autocomplete="tel"\`).
2. Пароль: \`type="password"\`, \`minlength="12"\`, \`autocomplete="new-password"\`, подсказка через \`aria-describedby\`.
3. Дата рождения (\`type="date"\`, \`max\` — сегодня).
4. Формат участия: \`fieldset\` + \`legend\` и радиокнопки (онлайн, офлайн).
5. Интересующие секции: флажки в отдельном \`fieldset\`.
6. Город: \`input\` с \`datalist\`.
7. Аватар: \`type="file"\` с \`accept="image/*"\`; у формы \`method="post"\` и \`enctype="multipart/form-data"\`.
8. Промокод: \`pattern\` из 8 латинских букв или цифр с понятным описанием формата.
9. Согласие с правилами — обязательный флажок со ссылкой на правила.
10. Под формой — таблица тарифов (\`caption\`, \`thead\`, \`scope\`).`,
      `## Заготовка`,
      html(`<form action="/register" method="post" enctype="multipart/form-data">
  <fieldset>
    <legend>О вас</legend>
    <label for="name">Имя</label>
    <input id="name" name="name" autocomplete="name" required>
    <!-- почта, телефон, пароль, дата рождения -->
  </fieldset>

  <fieldset>
    <legend>Формат участия</legend>
    <label><input type="radio" name="format" value="online" checked> Онлайн</label>
    <label><input type="radio" name="format" value="offline"> В зале</label>
  </fieldset>

  <label><input type="checkbox" name="rules" required> Я принимаю <a href="#rules">правила</a></label>
  <button>Зарегистрироваться</button>
</form>`),
      `## Чек-лист`,
      `- Пройдите форму только клавиатурой — всё доступно.
- Нажмите «Зарегистрироваться» с пустыми полями — сообщения понятны.
- Каждое поле подписано \`label\`, группы — \`legend\`.
- Ни одного placeholder вместо подписи.`
    ],
    quizzes: [
      multi("signup-check", "Проверка регистрации", "Что обязательно для доступной формы регистрации?",
        [["label", "label у каждого поля"], ["legend", "fieldset и legend у групп переключателей"], ["autocomplete", "autocomplete у имени, почты и пароля"], ["placeholder", "placeholder вместо подписей ради минимализма"], ["reset", "Кнопка «Сбросить» рядом с отправкой"]], ["label", "legend", "autocomplete"],
        "Подписи, группы с legend и автозаполнение — основа удобной формы. placeholder вместо label и кнопка сброса вредят.")
    ]
  });
}
