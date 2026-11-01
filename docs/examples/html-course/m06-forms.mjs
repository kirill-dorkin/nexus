export default function forms(c) {
  const { html, code, mdn, lesson, single, multi, short, diagram, demo } = c;

  lesson({
    slug: "how-forms-work", title: "Как работают формы", minutes: 12,
    summary: "form, action, method и name: что происходит, когда человек нажимает «Отправить».",
    skill: ["html-form-basics", "Отправка форм", "Понимать, как форма отправляет данные: action, method GET и POST, имена полей."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "fields-and-labels", title: "Поля и подписи", minutes: 10,
    summary: "input и label: каждое поле с подписью, placeholder как подсказка, а не замена.",
    skill: ["html-form-labels", "Подписи полей", "Связывать каждое поле с подписью и использовать placeholder и подсказки правильно."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "input-types", title: "Типы полей input", minutes: 13,
    summary: "text, email, tel, url, password, number, range, date, time, color, search, hidden: правильный тип — удобная клавиатура и проверка бесплатно.",
    skill: ["html-input-types", "Типы полей", "Выбирать тип input под данные, чтобы получить подходящую клавиатуру, виджет и проверку."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "checkboxes-and-radios", title: "Флажки и переключатели", minutes: 10,
    summary: "checkbox, radio, fieldset и legend: выбор одного или нескольких вариантов.",
    skill: ["html-form-choices", "Флажки и переключатели", "Строить группы выбора из checkbox и radio и подписывать их через fieldset и legend."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "select-lists", title: "Списки выбора", minutes: 10,
    summary: "select, option, optgroup, multiple и datalist: выпадающие списки и подсказки при вводе.",
    skill: ["html-form-select", "Списки выбора", "Строить выпадающие списки с группами и подсказки ввода через datalist."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "textarea-and-buttons", title: "Многострочный текст и кнопки", minutes: 10,
    summary: "textarea, button и его типы: отправка, сброс и кнопки для скриптов.",
    skill: ["html-form-buttons", "Текстовые области и кнопки", "Использовать textarea и кнопки с правильным type: submit, reset и button."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "file-uploads", title: "Загрузка файлов", minutes: 9,
    summary: "input type=file, accept, multiple, capture и enctype: как принять от человека фото и документы.",
    skill: ["html-file-upload", "Загрузка файлов", "Принимать файлы через input file с ограничением типов и правильной кодировкой формы."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "form-validation", title: "Встроенная проверка форм", minutes: 13,
    summary: "required, minlength, maxlength, min, max, step, pattern и novalidate: браузер проверит форму без JavaScript.",
    skill: ["html-form-validation", "Встроенная проверка форм", "Задавать ограничения полей атрибутами проверки и понимать их пределы."],
    body: [], // текст урока — stories/*.mjs
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
    slug: "usable-forms", title: "Удобные формы", minutes: 11,
    summary: "autocomplete, inputmode, enterkeyhint, autofocus, disabled и readonly: формы, которые заполняются за секунды.",
    skill: ["html-form-ux", "Удобство форм", "Ускорять заполнение форм автозаполнением, правильной клавиатурой и состояниями полей."],
    body: [], // текст урока — stories/*.mjs
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
    body: [], // текст урока — stories/*.mjs
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
