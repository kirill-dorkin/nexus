export default function forms(c) {
  const { html, code, mdn, lesson, single, multi, short, diagram, demo } = c;

  lesson({
    slug: "kak-rabotayut-formy", title: "Как работают формы", minutes: 12,
    summary: "form, action, method и name: что происходит, когда человек нажимает «Отправить».",
    skill: ["html-form-basics", "Отправка форм", "Понимать, как форма отправляет данные: action, method GET и POST, имена полей."],
    body: [
      `## Форма — способ передать данные серверу`,
      html(`<form action="/search" method="get">
  <label for="q">Поиск по курсам</label>
  <input id="q" name="q" type="search">
  <button>Найти</button>
</form>`),
      diagram({ kind: "flow", title: "Что происходит при отправке формы", steps: [
        { title: "Нажатие", text: "человек нажимает «Найти»" },
        { title: "Сбор", text: "браузер собирает пары name=значение: q=html" },
        { title: "Запрос", text: "GET /search?q=html на адрес из action" },
        { title: "Сервер", text: "программа на сервере ищет и готовит ответ" },
        { title: "Ответ", text: "браузер показывает новую страницу" }
      ] }),
      `Когда человек нажимает кнопку, браузер собирает значения всех полей с атрибутом \`name\` и отправляет их по адресу из \`action\`. Для запроса «html» браузер перейдёт на \`/search?q=html\`.`,
      `## name — без него поле не отправится`,
      `Данные уходят парами \`name=значение\`. Поле без \`name\` браузер **не отправит**, даже если человек его заполнил. \`id\` нужен для связи с подписью, \`name\` — для сервера. Часто они совпадают, но это разные вещи.`,
      `## GET или POST`,
      `- \`method="get"\` (по умолчанию) — данные попадают в адрес страницы: \`?q=html&page=2\`. Подходит для поиска и фильтров: такую ссылку можно сохранить и отправить другу.
- \`method="post"\` — данные идут в теле запроса и не видны в адресе. Для всего, что **меняет** данные: регистрация, заказ, сообщение. Пароли — только POST.`,
      code("html", `<form action="/signup" method="post">
  <label for="email">Почта</label>
  <input id="email" name="email" type="email">
  <label for="password">Пароль</label>
  <input id="password" name="password" type="password">
  <button>Зарегистрироваться</button>
</form>`),
      `## Кодировка отправки: accept-charset`,
      `Атрибут \`accept-charset\` у формы задаёт кодировку отправляемых данных. Сегодня единственное разумное значение — \`UTF-8\`, и оно используется по умолчанию, если страница в UTF-8. Атрибут встречается в старом коде, писать его самому не нужно.`,
      `## Кто обрабатывает форму`,
      `HTML только собирает и отправляет данные. Принять их, проверить и сохранить должен **сервер** (PHP, Node.js, Python…) или сервис форм. Без сервера форма просто перезагрузит страницу. В песочнице этого урока отправка заблокирована — это нормально.`,
      `## Проверка на сервере обязательна`,
      `Встроенная проверка в браузере (её разберём позже) помогает человеку, но её легко обойти. Сервер всегда должен проверять данные заново.`,
      `## Практика`,
      `Соберите в песочнице форму поиска с методом GET и полем \`name="q"\`. Представьте, какой адрес получится при запросе «таблицы».`,
      mdn("Element/form", "Элемент form")
    ],
    quizzes: [
      single("forms-name", "Без имени", "Человек заполнил поле, но на сервер оно не пришло. Чего, скорее всего, не хватает у поля?",
        [["name", "Атрибута name"], ["id", "Атрибута id"], ["label", "Подписи label"], ["type", "Атрибута type"]], "name",
        "Браузер отправляет только поля с name — именно он становится ключом в данных."),
      single("forms-method", "Метод для пароля", "Каким методом отправлять форму входа с паролем?",
        [["post", "POST"], ["get", "GET"], ["any", "Любым, разницы нет"], ["put", "PUT в атрибуте method"]], "post",
        "GET кладёт данные в адрес страницы, где их видно и сохраняет история. Для паролей и изменений — POST."),
      short("forms-action", "Куда отправлять", "Какой атрибут <form> задаёт адрес, куда отправляются данные?",
        ["action"], "Адрес обработчика задаётся атрибутом action.")
    ]
  });

  lesson({
    slug: "polya-i-podpisi", title: "Поля и подписи", minutes: 10,
    summary: "input и label: каждое поле с подписью, placeholder как подсказка, а не замена.",
    skill: ["html-form-labels", "Подписи полей", "Связывать каждое поле с подписью и использовать placeholder и подсказки правильно."],
    body: [
      `## Поле всегда с подписью`,
      html(`<form>
  <label for="name">Имя</label>
  <input id="name" name="name" type="text">

  <label>
    Город
    <input name="city" type="text">
  </label>
</form>`),
      `Связать подпись с полем можно двумя способами:
1. \`<label for="name">\` + \`<input id="name">\` — значения \`for\` и \`id\` совпадают.
2. Вложить поле внутрь \`label\`.

Что даёт связь: клик по подписи ставит курсор в поле (большая цель для пальца), а читалка произносит подпись, когда человек попадает в поле.`,
      `## placeholder — не подпись`,
      html(`<label for="phone">Телефон</label>
<input id="phone" name="phone" type="tel" placeholder="+7 999 000-00-00">`),
      `\`placeholder\` — бледный пример внутри поля. Он **исчезает** при вводе, у него слабый контраст, и его не всегда читают читалки. Используйте его только как пример формата, а подпись — всегда в \`label\`.`,
      `## Подсказка к полю`,
      html(`<label for="pass">Пароль</label>
<input id="pass" name="pass" type="password" aria-describedby="pass-hint">
<p id="pass-hint">Не меньше 12 символов, лучше фраза из нескольких слов.</p>`),
      `\`aria-describedby\` связывает поле с поясняющим текстом: читалка прочитает подпись, а затем подсказку.`,
      `## Начальное значение`,
      html(`<label for="qty">Количество</label>
<input id="qty" name="qty" type="number" value="1">`),
      `\`value\` задаёт значение, которое уже стоит в поле.`,
      `## Практика`,
      `В песочнице сделайте форму обратной связи: имя, почта с примером в placeholder и подсказкой под полем. У каждого поля — подпись.`,
      mdn("Element/label", "Элемент label")
    ],
    quizzes: [
      single("labels-for", "Связь подписи", "Как связать <label> с полем <input id=\"phone\">?",
        [["for", "<label for=\"phone\">"], ["name", "<label name=\"phone\">"], ["placeholder", "Достаточно placeholder в поле"], ["id", "<label id=\"phone\">"]], "for",
        "Атрибут for у label должен совпадать с id поля. Ещё можно вложить поле внутрь label."),
      single("labels-placeholder", "placeholder вместо подписи", "Почему нельзя заменять label на placeholder?",
        [["vanish", "placeholder исчезает при вводе, слабо контрастен и не всегда читается читалками"], ["error", "Браузер выдаст ошибку"], ["send", "Поле не отправится на сервер"], ["style", "placeholder нельзя стилизовать"]], "vanish",
        "Подпись должна оставаться видимой и доступной. placeholder — только пример формата.")
    ]
  });

  lesson({
    slug: "tipy-input", title: "Типы полей input", minutes: 13,
    summary: "text, email, tel, url, password, number, range, date, time, color, search, hidden: правильный тип — удобная клавиатура и проверка бесплатно.",
    skill: ["html-input-types", "Типы полей", "Выбирать тип input под данные, чтобы получить подходящую клавиатуру, виджет и проверку."],
    body: [
      `## Тип поля меняет всё`,
      `Атрибут \`type\` определяет, как поле выглядит, какая клавиатура откроется на телефоне и как браузер проверит значение.`,
      html(`<form>
  <p><label>Текст <input type="text" name="t"></label></p>
  <p><label>Почта <input type="email" name="e"></label></p>
  <p><label>Телефон <input type="tel" name="p"></label></p>
  <p><label>Сайт <input type="url" name="u"></label></p>
  <p><label>Пароль <input type="password" name="pw"></label></p>
  <p><label>Поиск <input type="search" name="s"></label></p>
</form>`),
      `- \`email\` — клавиатура с «@», проверка формата адреса. С \`multiple\` — несколько адресов через запятую.
- \`tel\` — цифровая клавиатура. Формат номера не проверяется: в разных странах он разный.
- \`url\` — клавиатура с «/» и «.com», проверка, что это адрес.
- \`password\` — символы скрыты, браузер предложит сохранить и сгенерировать пароль.
- \`search\` — поле поиска, часто с крестиком для очистки.`,
      `## Числа и диапазоны`,
      html(`<form>
  <p><label>Количество <input type="number" name="qty" min="1" max="10" step="1" value="1"></label></p>
  <p><label>Громкость <input type="range" name="vol" min="0" max="100" value="50"></label></p>
</form>`),
      `\`number\` — со стрелками и проверкой границ \`min\`/\`max\`/\`step\`. Не используйте его для номеров карт, индексов, телефонов — это не числа, с которыми считают: возьмите \`text\` с \`inputmode="numeric"\` (урок про удобство форм). \`range\` — ползунок, когда точное значение не важно.`,
      `## Дата и время`,
      html(`<form>
  <p><label>Дата <input type="date" name="d"></label></p>
  <p><label>Время <input type="time" name="tm"></label></p>
  <p><label>Дата и время <input type="datetime-local" name="dt"></label></p>
  <p><label>Месяц <input type="month" name="m"></label></p>
  <p><label>Неделя <input type="week" name="w"></label></p>
</form>`),
      `Браузер покажет календарь. Значение всегда уходит в формате \`ГГГГ-ММ-ДД\`, даже если человек видит «01.11.2026». Тип \`week\` поддерживают не все браузеры.`,
      `## Цвет и скрытые поля`,
      html(`<form>
  <p><label>Цвет темы <input type="color" name="color" value="#c5f23a"></label></p>
  <input type="hidden" name="source" value="landing">
</form>`),
      `\`hidden\` — невидимое поле, которое отправится вместе с формой: например, откуда пришёл человек. Не храните в нём секреты: его видно в коде страницы и его легко подменить.`,
      `## Если браузер не знает тип`,
      `Неизвестный или неподдерживаемый тип превращается в обычное текстовое поле — форма не сломается.`,
      `## Практика`,
      `Соберите в песочнице форму записи к врачу: имя, телефон, почта, дата визита, время, количество пациентов (number от 1 до 3).`,
      mdn("Element/input", "Элемент input")
    ],
    quizzes: [
      single("input-email", "Клавиатура с @", "Какой тип поля откроет на телефоне клавиатуру с символом @ и проверит формат адреса?",
        [["email", "type=\"email\""], ["text", "type=\"text\""], ["url", "type=\"url\""], ["tel", "type=\"tel\""]], "email",
        "type=\"email\" даёт подходящую клавиатуру и встроенную проверку формата."),
      single("input-card", "Номер карты", "Какой тип поля лучше подходит для номера банковской карты?",
        [["text", "type=\"text\" с inputmode=\"numeric\""], ["number", "type=\"number\""], ["tel", "type=\"tel\""], ["range", "type=\"range\""]], "text",
        "Номер карты — не число для вычислений: у number есть стрелки и прокрутка колёсиком, он съедает ведущие нули. Нужен text с цифровой клавиатурой."),
      multi("input-types", "Реальные типы", "Какие значения атрибута type существуют у <input>?",
        [["date", "date"], ["color", "color"], ["range", "range"], ["phone", "phone"], ["paragraph", "paragraph"]], ["date", "color", "range"],
        "date, color и range — реальные типы. Для телефона тип называется tel, а типа paragraph нет.")
    ]
  });

  lesson({
    slug: "flazhki-i-pereklyuchateli", title: "Флажки и переключатели", minutes: 10,
    summary: "checkbox, radio, fieldset и legend: выбор одного или нескольких вариантов.",
    skill: ["html-form-choices", "Флажки и переключатели", "Строить группы выбора из checkbox и radio и подписывать их через fieldset и legend."],
    body: [
      `## checkbox — да или нет, несколько из многих`,
      html(`<form>
  <label><input type="checkbox" name="news" checked> Присылать новости курса</label>

  <fieldset>
    <legend>Что хотите изучить?</legend>
    <label><input type="checkbox" name="topics" value="html"> HTML</label>
    <label><input type="checkbox" name="topics" value="css"> CSS</label>
    <label><input type="checkbox" name="topics" value="js"> JavaScript</label>
  </fieldset>
</form>`),
      `Каждый флажок независим. \`checked\` — отмечен заранее. \`value\` уходит на сервер, если флажок отмечен; без \`value\` уйдёт \`on\`. Неотмеченный флажок не отправляется вовсе.`,
      `## radio — один из нескольких`,
      html(`<form>
  <fieldset>
    <legend>Ваш уровень</legend>
    <label><input type="radio" name="level" value="new" checked> Новичок</label>
    <label><input type="radio" name="level" value="some"> Немного знаю</label>
    <label><input type="radio" name="level" value="pro"> Уже работаю</label>
  </fieldset>
</form>`),
      `Переключатели с **одинаковым \`name\`** образуют группу: выбрать можно только один. Стрелками на клавиатуре можно переключаться внутри группы.`,
      `## fieldset и legend`,
      `\`fieldset\` объединяет связанные поля, \`legend\` — подпись всей группы. Читалка скажет «Ваш уровень, группа», затем «Новичок, переключатель». Без \`legend\` человек услышит варианты, не зная вопроса.`,
      `## checkbox или radio?`,
      `- Можно выбрать несколько или ни одного → checkbox.
- Ровно один вариант → radio. Если «ничего не выбрано» — допустимый ответ, добавьте вариант «Не важно».
- Вариантов больше 5–7 → подумайте о \`select\` (следующий урок).`,
      `## Подпись справа, кликабельная целиком`,
      `Ставьте флажок слева от текста и делайте подпись \`label\`: так кликабельна вся строка, а не крошечный квадрат.`,
      `## Практика`,
      `Соберите в песочнице анкету: размер футболки (radio: S, M, L, XL) и дополнительные опции (checkbox: подарочная упаковка, открытка). Каждая группа в \`fieldset\`.`,
      mdn("Element/input/radio", "Переключатель radio")
    ],
    quizzes: [
      single("choices-radio-group", "Группа переключателей", "Что объединяет радиокнопки в одну группу, где можно выбрать только одну?",
        [["name", "Одинаковый атрибут name"], ["id", "Одинаковый id"], ["value", "Одинаковый value"], ["fieldset", "Только fieldset вокруг них"]], "name",
        "Группу задаёт общий name. fieldset подписывает группу для людей, но не связывает поведение."),
      single("choices-legend", "Подпись группы", "Каким элементом подписывают группу полей внутри <fieldset>?",
        [["legend", "<legend>"], ["label", "<label>"], ["caption", "<caption>"], ["h2", "<h2>"]], "legend",
        "legend — подпись всей группы fieldset."),
      single("choices-which", "Выбор типа", "Пользователь выбирает интересующие темы, можно несколько. Что использовать?",
        [["checkbox", "Флажки checkbox"], ["radio", "Переключатели radio"], ["text", "Текстовое поле"], ["range", "Ползунок range"]], "checkbox",
        "Несколько независимых вариантов — флажки.")
    ]
  });

  lesson({
    slug: "spiski-vybora", title: "Списки выбора", minutes: 10,
    summary: "select, option, optgroup, multiple и datalist: выпадающие списки и подсказки при вводе.",
    skill: ["html-form-select", "Списки выбора", "Строить выпадающие списки с группами и подсказки ввода через datalist."],
    body: [
      `## Выпадающий список`,
      html(`<form>
  <label for="city">Город</label>
  <select id="city" name="city">
    <option value="">Выберите город</option>
    <option value="msk">Москва</option>
    <option value="spb" selected>Санкт-Петербург</option>
    <option value="kzn">Казань</option>
  </select>
</form>`),
      `- \`option\` — вариант. \`value\` уходит на сервер, текст видит человек.
- \`selected\` — выбран заранее.
- Первый пустой вариант «Выберите…» вместе с \`required\` заставит сделать осознанный выбор.`,
      `## Группы вариантов`,
      html(`<label for="course">Курс</label>
<select id="course" name="course">
  <optgroup label="Вёрстка">
    <option value="html">HTML</option>
    <option value="css">CSS</option>
  </optgroup>
  <optgroup label="Программирование">
    <option value="js">JavaScript</option>
    <option value="py" disabled>Python (скоро)</option>
  </optgroup>
</select>`),
      `\`optgroup\` с \`label\` делит длинный список на разделы. \`disabled\` показывает вариант, но не даёт его выбрать.`,
      `## Множественный выбор`,
      html(`<label for="days">Удобные дни</label>
<select id="days" name="days" multiple size="4">
  <option>Понедельник</option>
  <option>Среда</option>
  <option>Пятница</option>
  <option>Суббота</option>
</select>`),
      `С \`multiple\` можно выбрать несколько, удерживая Ctrl или ⌘. Это неочевидно для многих людей — часто удобнее группа флажков.`,
      `## datalist — подсказки, но свободный ввод`,
      html(`<label for="browser">Ваш браузер</label>
<input id="browser" name="browser" list="browsers">
<datalist id="browsers">
  <option value="Chrome"></option>
  <option value="Firefox"></option>
  <option value="Safari"></option>
  <option value="Яндекс Браузер"></option>
</datalist>`),
      `\`datalist\` предлагает варианты, пока человек печатает, но не запрещает ввести своё. Связь — через атрибут \`list\` у поля и \`id\` у \`datalist\`.`,
      `## Что выбрать`,
      `- 2–5 вариантов → radio (видно всё сразу).
- Много вариантов, один ответ → select.
- Популярные варианты, но возможен свой → datalist.`,
      `## Практика`,
      `Сделайте в песочнице выбор страны через \`select\` с двумя \`optgroup\` (Европа, Азия) и поле «Профессия» с подсказками \`datalist\`.`,
      mdn("Element/select", "Элемент select")
    ],
    quizzes: [
      single("select-optgroup", "Группы", "Какой элемент делит длинный выпадающий список на подписанные разделы?",
        [["optgroup", "<optgroup label=\"…\">"], ["fieldset", "<fieldset>"], ["hr", "<hr>"], ["datalist", "<datalist>"]], "optgroup",
        "optgroup с атрибутом label группирует варианты внутри select."),
      single("select-datalist", "Свой вариант", "Нужно подсказывать популярные значения, но разрешить ввести своё. Что подходит?",
        [["datalist", "input со связанным datalist"], ["select", "select"], ["radio", "Группа radio"], ["multiple", "select multiple"]], "datalist",
        "datalist только подсказывает, а поле остаётся свободным для ввода.")
    ]
  });

  lesson({
    slug: "textarea-i-knopki", title: "Многострочный текст и кнопки", minutes: 10,
    summary: "textarea, button и его типы: отправка, сброс и кнопки для скриптов.",
    skill: ["html-form-buttons", "Текстовые области и кнопки", "Использовать textarea и кнопки с правильным type: submit, reset и button."],
    body: [
      `## textarea`,
      html(`<form>
  <label for="msg">Сообщение</label>
  <textarea id="msg" name="msg" rows="5" cols="40" maxlength="500">Начальный текст можно написать прямо внутри</textarea>
</form>`),
      `Для отзывов, комментариев и любого длинного текста. В отличие от \`input\`, начальное значение пишут **между тегами**, а не в \`value\`. \`rows\` — высота в строках. Человек может растянуть поле за уголок.`,
      `## Переносы строк: wrap`,
      html(`<textarea name="poem" rows="4" cols="20" wrap="hard">Длинная строка будет разбита на строки по 20 символов при отправке.</textarea>`),
      `\`wrap="soft"\` (по умолчанию) переносит строки только визуально. \`wrap="hard"\` вставляет реальные переносы в отправленный текст по ширине \`cols\` — нужно редко, например для старых систем, ожидающих строки фиксированной длины.`,
      `## button и его типы`,
      html(`<form>
  <label>Имя <input name="n"></label>
  <button type="submit">Отправить</button>
  <button type="reset">Очистить</button>
  <button type="button">Показать подсказку</button>
</form>`),
      `- \`submit\` — отправляет форму. **Это тип по умолчанию** для кнопки внутри формы.
- \`reset\` — возвращает все поля к начальным значениям. Опасен: случайный клик стирает заполненную форму. Используйте редко.
- \`button\` — ничего не делает сам, нужен для скриптов: открыть окно, показать пароль.

Частая ошибка: кнопка «Показать пароль» без \`type="button"\` внутри формы неожиданно отправляет форму.`,
      `## button лучше, чем input type="submit"`,
      html(`<form>
  <button type="submit"><strong>Записаться</strong> бесплатно</button>
</form>`),
      `Внутри \`button\` можно положить разметку: иконку, выделение. У \`<input type="submit" value="…">\` — только текст.`,
      `## Отправка в другое место`,
      code("html", `<form action="/order" method="post">
  …
  <button>Оформить заказ</button>
  <button formaction="/draft" formnovalidate>Сохранить черновик</button>
</form>`),
      `Атрибуты \`formaction\`, \`formmethod\`, \`formnovalidate\` у кнопки переопределяют настройки формы — удобно для второй кнопки «Сохранить черновик», которая не требует заполнить всё.`,
      `## Текст кнопки — это глагол`,
      `«Отправить заявку», «Скачать», «Записаться» лучше, чем «ОК» и «Далее»: человек должен понимать, что произойдёт.`,
      `## Практика`,
      `В песочнице сделайте форму отзыва: \`textarea\` на 5 строк с ограничением 300 символов, кнопка отправки и отдельная \`type="button"\` «Вставить шаблон».`,
      mdn("Element/button", "Элемент button")
    ],
    quizzes: [
      single("buttons-default", "Тип по умолчанию", "Какой тип у кнопки <button> внутри формы, если type не указан?",
        [["submit", "submit"], ["button", "button"], ["reset", "reset"], ["none", "Никакого, она не работает"]], "submit",
        "По умолчанию button внутри формы — submit, поэтому кнопки для скриптов помечают type=\"button\"."),
      single("buttons-textarea-value", "Начальный текст", "Как задать начальный текст в <textarea>?",
        [["content", "Написать его между тегами <textarea>…</textarea>"], ["value", "Атрибутом value"], ["placeholder", "Только через placeholder"], ["text", "Атрибутом text"]], "content",
        "У textarea нет атрибута value: начальное значение — его содержимое.")
    ]
  });

  lesson({
    slug: "zagruzka-fajlov", title: "Загрузка файлов", minutes: 9,
    summary: "input type=file, accept, multiple, capture и enctype: как принять от человека фото и документы.",
    skill: ["html-file-upload", "Загрузка файлов", "Принимать файлы через input file с ограничением типов и правильной кодировкой формы."],
    body: [
      `## Поле выбора файла`,
      html(`<form>
  <label for="avatar">Фото профиля</label>
  <input id="avatar" name="avatar" type="file" accept="image/png, image/jpeg, image/webp">
</form>`),
      `Откроется системное окно выбора файла. \`accept\` фильтрует подходящие файлы: по MIME-типу (\`image/png\`), по группе (\`image/*\`) или по расширению (\`.pdf\`). Это подсказка для окна выбора, а не защита: сервер обязан проверить файл сам.`,
      `## Несколько файлов и камера`,
      html(`<form>
  <label for="docs">Документы</label>
  <input id="docs" name="docs" type="file" accept=".pdf,.docx" multiple>

  <label for="photo">Сфотографировать</label>
  <input id="photo" name="photo" type="file" accept="image/*" capture="environment">
</form>`),
      `\`multiple\` разрешает выбрать несколько файлов. \`capture\` на телефоне предлагает сразу открыть камеру: \`environment\` — основную, \`user\` — фронтальную.`,
      `## Кодировка формы: enctype`,
      code("html", `<form action="/upload" method="post" enctype="multipart/form-data">
  <label for="cv">Резюме (PDF до 5 МБ)</label>
  <input id="cv" name="cv" type="file" accept=".pdf" required>
  <button>Отправить</button>
</form>`),
      `Чтобы файл действительно ушёл на сервер, нужны **оба** условия: \`method="post"\` и \`enctype="multipart/form-data"\`. Иначе отправится только имя файла.`,
      `## Подскажите ограничения заранее`,
      `Напишите рядом с полем, какие форматы и размер принимаются. В HTML нельзя ограничить размер файла — это проверяет сервер (и JavaScript, если нужно предупредить раньше).`,
      `## Практика`,
      `Соберите в песочнице форму загрузки домашнего задания: поле для нескольких файлов PDF или изображений, подсказка о формате и размере, правильные \`method\` и \`enctype\`.`,
      mdn("Element/input/file", "Поле file")
    ],
    quizzes: [
      single("file-enctype", "Отправка файла", "Что обязательно нужно у формы, чтобы файл ушёл на сервер?",
        [["both", "method=\"post\" и enctype=\"multipart/form-data\""], ["get", "method=\"get\""], ["accept", "Только accept у поля"], ["multiple", "Атрибут multiple"]], "both",
        "Файлы передаются только в POST-запросе с кодировкой multipart/form-data."),
      single("file-accept", "Что делает accept", "Защищает ли атрибут accept от загрузки неподходящих файлов?",
        [["hint", "Нет, это подсказка для окна выбора. Проверять должен сервер"], ["yes", "Да, полностью защищает"], ["size", "Да, и ещё ограничивает размер"], ["only-js", "Работает только с JavaScript"]], "hint",
        "accept фильтрует окно выбора, но его легко обойти. Тип и размер проверяет сервер.")
    ]
  });

  lesson({
    slug: "validaciya-form", title: "Встроенная проверка форм", minutes: 13,
    summary: "required, minlength, maxlength, min, max, step, pattern и novalidate: браузер проверит форму без JavaScript.",
    skill: ["html-form-validation", "Встроенная проверка форм", "Задавать ограничения полей атрибутами проверки и понимать их пределы."],
    body: [
      `## Браузер умеет проверять сам`,
      html(`<form>
  <label for="u">Логин</label>
  <input id="u" name="u" required minlength="3" maxlength="20">

  <label for="age">Возраст</label>
  <input id="age" name="age" type="number" min="14" max="99">

  <label for="mail">Почта</label>
  <input id="mail" name="mail" type="email" required>

  <button>Проверить</button>
</form>`),
      `Нажмите «Проверить» с пустыми полями: браузер не отправит форму и покажет сообщение у первого неверного поля. В песочнице отправка заблокирована, но проверка работает.`,
      `## Атрибуты проверки`,
      `- \`required\` — поле обязательно.
- \`minlength\` / \`maxlength\` — длина текста. \`maxlength\` просто не даст ввести больше.
- \`min\` / \`max\` — границы для чисел и дат.
- \`step\` — шаг: \`step="0.01"\` для копеек, \`step="5"\` для пятиминуток. По умолчанию у \`number\` шаг 1, и дробь не пройдёт.
- \`type\` — \`email\` и \`url\` сами проверяют формат.`,
      `## pattern — свой формат`,
      html(`<form>
  <label for="zip">Почтовый индекс</label>
  <input id="zip" name="zip" pattern="[0-9]{6}" inputmode="numeric"
         title="6 цифр, например 123456" aria-describedby="zip-hint">
  <p id="zip-hint">6 цифр, например 123456</p>
  <button>Проверить</button>
</form>`),
      `\`pattern\` — регулярное выражение, которому должно соответствовать **всё** значение целиком. \`[0-9]{6}\` — ровно шесть цифр. Обязательно опишите формат текстом рядом с полем: сообщение браузера «Введите данные в указанном формате» ничего не объясняет.`,
      `## Отключить проверку`,
      code("html", `<form novalidate>…</form>
<button formnovalidate>Сохранить черновик</button>`),
      `\`novalidate\` у формы выключает встроенную проверку — так делают, когда проверку и сообщения об ошибках берёт на себя JavaScript. \`formnovalidate\` у кнопки — только для неё.`,
      `## Пределы встроенной проверки`,
      `- Сообщения об ошибках выглядят по-разному в разных браузерах и показываются по одному.
- Их легко обойти — **сервер проверяет всегда**.
- Не придумывайте лишних ограничений: имена бывают из одной буквы и с дефисами, телефоны — в разных форматах.`,
      `## Практика`,
      `Соберите в песочнице регистрацию: логин 3–20 символов, обязательная почта, пароль от 12 символов, возраст от 14 и поле «Промокод» из 8 латинских букв или цифр через \`pattern\`. Попробуйте отправить с ошибками.`,
      mdn("../../Learn/Forms/Form_validation", "Проверка форм")
    ],
    quizzes: [
      single("validation-required", "Обязательное поле", "Какой атрибут делает поле обязательным для заполнения?",
        [["required", "required"], ["needed", "needed"], ["validate", "validate"], ["min", "min=\"1\""]], "required",
        "required не даст отправить форму, пока поле пустое."),
      single("validation-pattern", "Шаблон", "Значение должно состоять ровно из 6 цифр. Какой pattern подходит?",
        [["six", "[0-9]{6}"], ["any", "[0-9]*"], ["plus", "[0-9]+"], ["letters", "[a-z]{6}"]], "six",
        "{6} — ровно шесть повторений, а pattern всегда проверяет значение целиком."),
      single("validation-server", "Нужна ли проверка на сервере", "Если в форме настроены required и pattern, нужна ли проверка на сервере?",
        [["yes", "Да, всегда: браузерную проверку легко обойти"], ["no", "Нет, браузер всё проверил"], ["sometimes", "Только для паролей"], ["js", "Только если нет JavaScript"]], "yes",
        "Браузерная проверка — удобство для человека. Безопасность обеспечивает только сервер.")
    ]
  });

  lesson({
    slug: "udobnye-formy", title: "Удобные формы", minutes: 11,
    summary: "autocomplete, inputmode, enterkeyhint, autofocus, disabled и readonly: формы, которые заполняются за секунды.",
    skill: ["html-form-ux", "Удобство форм", "Ускорять заполнение форм автозаполнением, правильной клавиатурой и состояниями полей."],
    body: [
      `## Автозаполнение`,
      html(`<form>
  <label for="fn">Имя и фамилия</label>
  <input id="fn" name="fullname" autocomplete="name">

  <label for="em">Почта</label>
  <input id="em" name="email" type="email" autocomplete="email">

  <label for="tl">Телефон</label>
  <input id="tl" name="phone" type="tel" autocomplete="tel">

  <label for="adr">Адрес</label>
  <input id="adr" name="address" autocomplete="street-address">
</form>`),
      `\`autocomplete\` подсказывает браузеру, что за данные в поле, и он предложит подставить сохранённые: имя, почту, адрес, данные карты. Полезные значения: \`name\`, \`email\`, \`tel\`, \`street-address\`, \`postal-code\`, \`cc-number\` (номер карты), \`bday\`.`,
      `## Пароли и коды`,
      html(`<form>
  <label for="cur">Текущий пароль</label>
  <input id="cur" type="password" autocomplete="current-password">
  <label for="new">Новый пароль</label>
  <input id="new" type="password" autocomplete="new-password">
  <label for="otp">Код из СМС</label>
  <input id="otp" inputmode="numeric" autocomplete="one-time-code">
</form>`),
      `\`current-password\` позволит менеджеру паролей подставить пароль, \`new-password\` — предложит сгенерировать надёжный, \`one-time-code\` — подставить код из СМС на телефоне.`,
      `## inputmode — какая клавиатура`,
      html(`<form>
  <label>Код карты лояльности <input inputmode="numeric"></label>
  <label>Сумма <input inputmode="decimal"></label>
</form>`),
      `\`inputmode\` меняет только экранную клавиатуру, не проверяя значение: \`numeric\` — цифры, \`decimal\` — цифры с запятой, \`tel\`, \`email\`, \`url\`, \`search\`.`,
      `## enterkeyhint — подпись клавиши Enter`,
      html(`<form>
  <label>Сообщение <input enterkeyhint="send"></label>
</form>`),
      `На телефоне клавиша Enter покажет «Отправить». Значения: \`enter\`, \`done\`, \`go\`, \`next\`, \`previous\`, \`search\`, \`send\`.`,
      `## Состояния полей`,
      html(`<form>
  <label>Логин <input value="anna" readonly></label>
  <label>Промокод <input value="Недоступно" disabled></label>
</form>`),
      `- \`readonly\` — нельзя изменить, но можно выделить и скопировать, и значение **отправится**.
- \`disabled\` — поле неактивно, на него нельзя перейти, и значение **не отправится**.
- \`autofocus\` — курсор в поле сразу при загрузке. Используйте только когда форма — главное на странице (поиск, вход), иначе это сбивает, особенно пользователей читалок.`,
      `## Практика`,
      `Улучшите в песочнице форму доставки: имя, телефон, адрес, индекс — с правильными \`autocomplete\`, \`inputmode\` и \`enterkeyhint="done"\` у последнего поля.`,
      mdn("Attributes/autocomplete", "Атрибут autocomplete")
    ],
    quizzes: [
      single("ux-new-password", "Новый пароль", "Какое значение autocomplete подсказывает менеджеру паролей сгенерировать надёжный пароль?",
        [["new", "new-password"], ["current", "current-password"], ["off", "off"], ["password", "password"]], "new",
        "new-password говорит браузеру, что это создание пароля, и он предложит сгенерировать его."),
      single("ux-readonly", "Отправка значения", "Чем readonly отличается от disabled?",
        [["sent", "Значение readonly отправляется с формой, disabled — нет"], ["same", "Ничем"], ["style", "Только внешним видом"], ["focus", "На disabled можно перейти Tab, на readonly — нет"]], "sent",
        "readonly нельзя изменить, но оно отправляется и доступно с клавиатуры. disabled выключено полностью."),
      short("ux-inputmode", "Цифровая клавиатура", "Какое значение inputmode откроет на телефоне клавиатуру только с цифрами?",
        ["numeric"], "inputmode=\"numeric\" — цифровая клавиатура без проверки значения.")
    ]
  });

  lesson({
    slug: "output-progress-meter", title: "output, progress и meter", minutes: 9,
    summary: "Элементы для результатов вычислений, хода выполнения и измерений.",
    skill: ["html-form-indicators", "Индикаторы и результаты", "Показывать результат вычисления, ход процесса и измеряемые значения правильным элементом."],
    body: [
      `## output — результат вычисления`,
      html(`<form>
  <label>Цена <input id="price" name="price" type="number" value="990"></label>
  <label>Кол-во <input id="qty" name="qty" type="number" value="2"></label>
  <p>Итого: <output name="total" for="price qty">1980</output> ₽</p>
</form>`),
      `\`output\` — место для результата, который считает скрипт. Атрибут \`for\` перечисляет \`id\` полей, от которых зависит результат. Читалки сообщают об изменении значения.`,
      `## progress — ход выполнения`,
      html(`<label for="upload">Загрузка файла</label>
<progress id="upload" value="70" max="100">70%</progress>

<p>Ждём ответ сервера: <progress></progress></p>`),
      `\`progress\` показывает, насколько выполнена задача: загрузка, прохождение курса. Без \`value\` — «неопределённый» индикатор, когда конец неизвестен. Текст внутри видят только старые браузеры.`,
      `## meter — измерение в диапазоне`,
      html(`<p>Заряд батареи: <meter value="0.2" min="0" max="1" low="0.25" high="0.75" optimum="1">20%</meter></p>
<p>Занято на диске: <meter value="85" min="0" max="100" low="60" high="80" optimum="20">85%</meter></p>`),
      `\`meter\` — значение в известных пределах: заряд, заполненность диска, сложность пароля. \`low\`, \`high\` и \`optimum\` задают «плохую», «нормальную» и «хорошую» зоны — браузер окрасит полосу в зелёный, жёлтый или красный.`,
      `## progress или meter?`,
      `**progress** — процесс, который идёт к завершению. **meter** — величина, которая просто есть и может быть хорошей или плохой. Прогресс курса — \`progress\`, уровень заряда — \`meter\`.`,
      `## Не забывайте подпись`,
      `Свяжите индикатор с текстом через \`label\` или \`aria-labelledby\` — иначе читалка скажет «70 процентов», не объяснив, чего именно.`,
      `## Практика`,
      `В песочнице покажите прохождение курса «Пройдено 7 из 11 уроков» через \`progress\` и сложность пароля через \`meter\` с зонами.`,
      mdn("Element/meter", "Элемент meter")
    ],
    quizzes: [
      single("indicators-which", "Заряд батареи", "Какой элемент подходит для уровня заряда батареи?",
        [["meter", "<meter>"], ["progress", "<progress>"], ["output", "<output>"], ["range", "<input type=\"range\">"]], "meter",
        "Заряд — измеряемая величина в пределах, а не процесс. Это meter."),
      single("indicators-progress", "Загрузка", "Как показать индикатор загрузки, когда неизвестно, сколько осталось?",
        [["noval", "<progress> без атрибута value"], ["zero", "<progress value=\"0\">"], ["meter", "<meter> без value"], ["output", "<output>"]], "noval",
        "progress без value — неопределённый индикатор.")
    ]
  });
}
