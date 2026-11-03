export function imageMaps(c) {
  const { lesson, single } = c;
  lesson({
    slug: "image-maps", title: "Карты-изображения и object", minutes: 9,
    summary: "map и area: кликабельные области на картинке. object: встраивание PDF и других документов.",
    skill: ["html-image-maps", "Карты-изображения и object", "Делать кликабельные области на картинке через map и area и встраивать документы через object с запасным содержимым."],
    body: [], // текст урока — stories/*.mjs
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
  const { lesson, multi } = c;
  lesson({
    slug: "project-gallery", title: "Мини-проект: фотогалерея", minutes: 25,
    summary: "Галерея путешествия: адаптивные картинки с подписями, ленивая загрузка, видео с субтитрами и иконки SVG.",
    skill: ["html-project-gallery", "Мини-проект: галерея", "Собрать медиастраницу с адаптивными изображениями, подписями, видео и доступными иконками."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      multi("gallery-check", "Проверка галереи", "Что правильно для галереи?",
        [["alt", "Осмысленный alt у каждого фото"], ["lazy", "loading=\"lazy\" у фото ниже первого экрана"], ["size", "width и height у каждой картинки"], ["autoplay", "Видео с автозапуском и звуком"], ["lazyfirst", "loading=\"lazy\" у самой первой картинки"]], ["alt", "lazy", "size"],
        "alt, размеры и ленивая загрузка ниже первого экрана — правильно. Автозапуск со звуком и lazy у первой картинки вредят.")
    ]
  });
}

export function advancedForms(c) {
  const { lesson, single } = c;
  lesson({
    slug: "advanced-forms", title: "Продвинутые возможности форм", minutes: 11,
    summary: "Атрибут form, formtarget, fieldset disabled, input image, dirname и несколько форм на странице.",
    skill: ["html-form-advanced", "Продвинутые формы", "Связывать поля с формой на расстоянии, переопределять поведение кнопок и блокировать группы полей."],
    body: [], // текст урока — stories/*.mjs
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
  const { lesson, multi } = c;
  lesson({
    slug: "project-signup", title: "Мини-проект: форма регистрации", minutes: 25,
    summary: "Регистрация на онлайн-мероприятие: все типы полей, группы, проверка, автозаполнение и понятные подсказки.",
    skill: ["html-project-signup", "Мини-проект: регистрация", "Собрать доступную форму регистрации с подходящими типами полей, проверкой и автозаполнением."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      multi("signup-check", "Проверка регистрации", "Что обязательно для доступной формы регистрации?",
        [["label", "label у каждого поля"], ["legend", "fieldset и legend у групп переключателей"], ["autocomplete", "autocomplete у имени, почты и пароля"], ["placeholder", "placeholder вместо подписей ради минимализма"], ["reset", "Кнопка «Сбросить» рядом с отправкой"]], ["label", "legend", "autocomplete"],
        "Подписи, группы с legend и автозаполнение — основа удобной формы. placeholder вместо label и кнопка сброса вредят.")
    ]
  });
}
