export default function structure(c) {
  const { lesson, single } = c;

  lesson({
    slug: "semantics", title: "Семантическая структура страницы", minutes: 11,
    summary: "header, nav, main и footer: каркас страницы, понятный людям, читалкам и поисковикам.",
    skill: ["html-semantics", "Семантическая структура", "Размечать области страницы элементами header, nav, main и footer."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("semantics-main", "Главное содержимое", "Сколько видимых элементов <main> должно быть на странице?",
        [["one", "Один"], ["many", "По одному на каждый раздел"], ["zero", "Ни одного, хватает div"], ["two", "Два: для текста и для картинок"]], "one",
        "На странице один видимый main — её основное содержимое."),
      single("semantics-nav", "Несколько меню", "На странице два блока nav: в шапке и в подвале. Что стоит сделать?",
        [["label", "Подписать их через aria-label, например «Главное меню» и «Меню в подвале»"], ["remove", "Оставить только один nav"], ["div", "Заменить второй на div"], ["nothing", "Ничего, так нельзя"]], "label",
        "Несколько ориентиров одного типа подписывают, чтобы читалка их различала."),
      single("semantics-landmarks", "Зачем семантика", "Что дают семантические элементы пользователю экранной читалки?",
        [["jump", "Возможность быстро перейти к нужной области: меню, основному содержимому, подвалу"], ["color", "Другие цвета"], ["speed", "Ускоряют загрузку"], ["nothing", "Ничего, это только для поисковиков"]], "jump",
        "Читалки строят из семантических элементов ориентиры для быстрой навигации.")
    ]
  });

  lesson({
    slug: "page-sections", title: "article, section, aside и search", minutes: 12,
    summary: "Как делить содержимое на разделы: когда article, когда section, когда aside, а когда просто div.",
    skill: ["html-sectioning", "Разделы содержимого", "Выбирать между article, section, aside, search и div по смыслу содержимого."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("sectioning-article", "Карточка товара", "Какой элемент лучше всего подходит для отдельной карточки товара в каталоге?",
        [["article", "<article>"], ["section", "<section>"], ["aside", "<aside>"], ["nav", "<nav>"]], "article",
        "Карточка товара самостоятельна и понятна вне страницы — это article."),
      single("sectioning-aside", "Врезка", "Блок «Интересный факт» внутри статьи, который можно убрать без потери смысла. Что это?",
        [["aside", "<aside>"], ["section", "<section>"], ["article", "<article>"], ["footer", "<footer>"]], "aside",
        "aside — содержимое, косвенно связанное с основным."),
      single("sectioning-section", "Нужен ли section", "Блок нужен только чтобы сгруппировать две колонки для оформления, заголовка у него нет. Что взять?",
        [["div", "<div>"], ["section", "<section>"], ["article", "<article>"], ["main", "<main>"]], "div",
        "section — тематический раздел, обычно с заголовком. Для группировки ради оформления — div.")
    ]
  });

  lesson({
    slug: "details-summary", title: "Раскрывающиеся блоки: details и summary", minutes: 9,
    summary: "Аккордеоны, FAQ и спойлеры без единой строчки JavaScript.",
    skill: ["html-details", "Раскрывающиеся блоки", "Делать доступные раскрывающиеся блоки и аккордеоны через details и summary."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("details-summary", "Заголовок блока", "Какой элемент внутри <details> всегда виден и раскрывает блок по клику?",
        [["summary", "<summary>"], ["legend", "<legend>"], ["caption", "<caption>"], ["h2", "<h2>"]], "summary",
        "summary — видимый заголовок раскрывающегося блока."),
      single("details-accordion", "Аккордеон", "Как сделать, чтобы из нескольких details одновременно был открыт только один?",
        [["name", "Дать им одинаковый атрибут name"], ["id", "Дать одинаковый id"], ["open", "Убрать у всех open"], ["js", "Это невозможно без JavaScript"]], "name",
        "details с общим name ведут себя как аккордеон — без скриптов.")
    ]
  });

  lesson({
    slug: "dialog-and-popover", title: "Диалоги и всплывающие окна", minutes: 13,
    summary: "dialog, popover и inert: модальные окна, меню и подсказки, которые браузер делает доступными сам.",
    skill: ["html-dialog-popover", "Диалоги и всплывающие окна", "Строить всплывающие элементы через popover и dialog и понимать, когда нужен модальный режим."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("popover-trigger", "Кнопка для popover", "Какой атрибут кнопки связывает её со всплывающим элементом <div id=\"tip\" popover>?",
        [["target", "popovertarget=\"tip\""], ["for", "for=\"tip\""], ["href", "href=\"#tip\""], ["aria", "aria-controls=\"tip\" — этого достаточно"]], "target",
        "popovertarget указывает id элемента с атрибутом popover — открытие и закрытие работают без скриптов."),
      single("dialog-method", "Закрыть диалог", "Как закрыть <dialog> кнопкой без JavaScript?",
        [["form", "Поместить кнопку в форму с method=\"dialog\""], ["reset", "Сделать кнопку type=\"reset\""], ["close", "Добавить кнопке атрибут close"], ["href", "Сделать ссылку href=\"#\""]], "form",
        "Отправка формы с method=\"dialog\" закрывает диалог, в котором она находится."),
      single("dialog-modal", "Подтверждение удаления", "Нужно спросить «Удалить аккаунт?» и не дать работать со страницей до ответа. Что подходит?",
        [["modal", "Модальный dialog, открытый через showModal()"], ["popover", "popover"], ["details", "details"], ["title", "Атрибут title"]], "modal",
        "Модальный диалог блокирует страницу до ответа и запирает фокус внутри.")
    ]
  });
}
