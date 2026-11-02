// Story bodies: structure, head, JavaScript bridge, components.
import { scene, card, rule } from "./kit.mjs";

export default {
  semantics: [
    scene("Каркас сайта",
      ["you", "Страниц уже много! Шапка, меню, основное, подвал. Это всё div-ы?"],
      ["lev", "Пожалуйста, не div-ы. Я жму одну клавишу — и прыгаю сразу к меню или к основному. Если вы правильно разметили."],
      ["nika", "Это ориентиры. Пять тегов — и Лев летает по сайту."]),
    card("<header>", "Шапка", "Вводная часть: логотип, меню.", "Ориентир «баннер» для читалки.", "<header>\n  <a href=\"/\">Север</a>\n</header>"),
    card("<nav>", "Навигация", "Главные ссылки по сайту. Если `nav` несколько — подпиши через `aria-label`.", "Ориентир «навигация»: «Главное меню», «Меню в подвале».", "<nav aria-label=\"Главное меню\">\n  <a href=\"/menu\">Меню</a> <a href=\"/booking\">Бронь</a>\n</nav>", { show: 50 }),
    card("<main>", "Основное", "Уникальное содержимое страницы. Один видимый `main` на страницу.", "Лев одним нажатием перепрыгивает к сути, минуя меню.", "<main>\n  <h1>Мой сайт</h1>\n  <p>Заметки о путешествиях и фото.</p>\n</main>", { show: 90 }),
    card("<footer>", "Подвал", "Контакты, копирайт, ссылки внизу.", "Ориентир «сведения о сайте».", "<footer>© 2026 Мой сайт</footer>", { show: 40 }),
    card("Ссылка «к содержимому»", "Пропустить меню", "Первая ссылка страницы ведёт к `#main`.", "С клавиатуры не нужно 20 раз жать Tab через меню.", "<a href=\"#main\">Перейти к содержимому</a>\n<main id=\"main\">…</main>")
  ],

  "page-sections": [
    scene("Блог магазина",
      ["you", "Хочу блог: статьи про путешествия, а сбоку «Интересный факт»."],
      ["nika", "Статья — `article`, её части — `section`, врезка — `aside`. И у каждого свой смысл."]),
    card("<article>", "Самостоятельный материал", "То, что можно вынести на другой сайт целиком: статья, карточка товара, отзыв.", "Каждая карточка в меню — `article`.", "<article>\n  <h2>Эфиопия Иргачефф</h2>\n  <p>Ягодный, с цветочной кислинкой.</p>\n</article>", { show: 80 }),
    card("<section>", "Тематический раздел", "Часть страницы со своим заголовком.", "Разделы «Маршруты», «Снаряжение».", "<section>\n  <h2>Снаряжение</h2>\n</section>"),
    card("<aside>", "Побочное", "Можно убрать без потери смысла: врезка, реклама, связанные ссылки.", "«Интересный факт» сбоку статьи.", "<aside>Факт: Байкал — самое глубокое озеро в мире.</aside>", { show: 50 }),
    card("<search>", "Область поиска", "Обёртка формы поиска.", "Ориентир «поиск» для читалки.", "<search>\n  <form><input type=\"search\" name=\"q\"><button>Найти</button></form>\n</search>", { show: 50 }),
    card("<hgroup>", "Заголовок с подзаголовком", "`h1` и абзац-подзаголовок вместе.", "Слоган не станет отдельным разделом.", "<hgroup>\n  <h1>Север</h1>\n  <p>Блог о путешествиях</p>\n</hgroup>", { show: 80 }),
    rule("Нет заголовка и смысла, нужно только для оформления — `div`. Это нормально.")
  ],

  "details-summary": [
    scene("Частые вопросы",
      ["you", "Нас вечно спрашивают: «Есть ли Wi-Fi?», «Можно с собакой?» Хочу раскрывающийся FAQ."],
      ["bro", "Сделаю без единой строчки JavaScript. Это я умею сам 💪"]),
    card("<details>", "Раскрывающийся блок", "Свёрнутый блок, раскрывается по клику — без JavaScript.", "FAQ, подробности, спойлеры.", "<details>\n  <summary>Можно с собакой?</summary>\n  <p>Да! Даже миска с водой есть.</p>\n</details>", { show: 80 }),
    card("<summary>", "Заголовок раскрывашки", "Первый элемент `details`: всегда виден, клик раскрывает.", "Вопрос в FAQ. Читалка называет его кнопкой.", "<details>\n  <summary>Есть Wi-Fi?</summary>\n  <p>Да, пароль на чеке.</p>\n</details>", { show: 80 }),
    card("open", "Открыто сразу", "Атрибут `open` раскрывает блок по умолчанию.", "Самый частый вопрос — сразу открыт."),
    card("name", "Аккордеон", "Одинаковый `name` у нескольких `details` — открыт только один.", "FAQ, где не всё раскрыто разом.", "<details name=\"faq\"><summary>Wi-Fi?</summary><p>Есть.</p></details>\n<details name=\"faq\"><summary>Розетки?</summary><p>У каждого стола.</p></details>", { show: 90 })
  ],

  "dialog-and-popover": [
    scene("Всплывашки",
      ["you", "Хочу: нажал «Состав» — появилась подсказка. И окно «Точно отменить запись?»"],
      ["nika", "Подсказка — `popover`. Важный вопрос, блокирующий страницу, — модальный `dialog`."]),
    card("popover", "Всплывающее окно", "Атрибут `popover` у блока и `popovertarget` у кнопки. Закрывается кликом мимо и Escape.", "Подсказки, меню — без JavaScript.", "<button popovertarget=\"info\">Состав</button>\n<div id=\"info\" popover>Карандаш, сливки, ваниль</div>", { show: 60 }),
    card("popovertarget", "Кнопка открывает popover", "У кнопки: `id` всплывающего элемента.", "Связь «кнопка → подсказка» без JavaScript.", "<button popovertarget=\"tip\">Что такое HTML?</button>\n<div id=\"tip\" popover>Язык разметки страниц</div>", { show: 70 }),
    card("popovertargetaction", "Что сделать", "`toggle` (по умолчанию), `show` или `hide`.", "Отдельная кнопка «Закрыть» внутри подсказки.", "<button popovertarget=\"tip\" popovertargetaction=\"hide\">Закрыть</button>"),
    card("<dialog>", "Диалоговое окно", "Окно поверх страницы. Модальное (`showModal()`) блокирует страницу до ответа.", "«Отменить бронь?» — нельзя кликать мимо.", "<dialog open>\n  <form method=\"dialog\">\n    <p>Отменить бронь?</p>\n    <button value=\"yes\">Да</button>\n  </form>\n</dialog>", { show: 110 }),
    card("method=\"dialog\"", "Закрыть без JS", "Кнопка в форме с `method=\"dialog\"` закрывает окно.", "Простое «ОК» без скриптов."),
    card("inert", "Сделать неактивным", "Область нельзя кликнуть, сфокусировать и прочитать.", "Фон под своим окном.")
  ],

  "project-business-card": [
    scene("Проект: визитка",
      ["you", "Хочу сделать страницу-визитку фотографа: кто она, работы, контакты и форма связи."],
      ["nika", "Первый настоящий проект. Проверь себя по чек-листу: тут всё, что ты уже знаешь."]),
    card("Чек-лист", "Корректная и доступная визитка", "Один `h1` и разделы на `h2`, осмысленный `alt` у фото, `label` у каждого поля формы, `lang` у `html`.", "Так страница понятна и людям, и поисковикам, и Льву.")
  ],

  metadata: [
    scene("Чтобы нас находили",
      ["you", "В Яндексе у нас написано «Document». Это позор 😳"],
      ["nika", "Это `title`. А под ним — `description`. Это наша витрина в поиске."]),
    card("<title>", "Заголовок в поиске", "Название вкладки и заголовок в результатах поиска.", "Первое, что видит человек.", "<title>Мой сайт — свежая обжарка в Казани</title>"),
    card("<meta name=\"description\">", "Описание", "Текст под заголовком в поиске.", "Уговорить кликнуть именно на нас.", "<meta name=\"description\" content=\"Онлайн-курс HTML с нуля: живые примеры и задания с мгновенной проверкой.\">"),
    card("viewport", "Мобильная вёрстка", "`<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">`.", "Без неё телефон рисует страницу шириной ~980 px и уменьшает. Масштабирование не запрещай: людям со слабым зрением нужно увеличивать."),
    card("robots · canonical", "Для поисковиков", "`<meta name=\"robots\" content=\"noindex\">` — не индексировать. `<link rel=\"canonical\">` — главный адрес страницы.", "Черновики не попадут в поиск, дубли не размоют выдачу."),
    card("theme-color", "Цвет браузера", "`<meta name=\"theme-color\" content=\"#6b3e26\">`.", "Строка браузера на телефоне в цвет магазина."),
    card("<meta>", "Метаданные", "Пустой элемент в `head`: информация о странице для машин.", "Кодировка, описание, viewport, цвет темы.", "<meta name=\"description\" content=\"Магазин в Казани\">"),
    card("charset", "Кодировка", "У `meta`: `utf-8`. Должна быть в первых 1024 байтах документа.", "Иначе кириллица превратится в кракозябры.", "<meta charset=\"utf-8\">"),
    card("content", "Значение meta", "Значение для `name` или `http-equiv`.", "Сам текст описания, сама настройка viewport.", "<meta name=\"theme-color\" content=\"#6b3e26\">"),
  ],

  "social-and-icons": [
    scene("Ссылка в мессенджере",
      ["you", "Отправляю другу ссылку на сайт — приходит голое «example.com» без картинки. А у других красивые карточки!"],
      ["nika", "Это Open Graph. Пять строчек — и красивое превью."]),
    card("og:*", "Превью ссылки", "Мета-теги с атрибутом `property`: `og:title`, `og:description`, `og:image` (абсолютный адрес!), `og:url`.", "Красивая карточка в Telegram и соцсетях.", "<meta property=\"og:title\" content=\"Мой сайт\">\n<meta property=\"og:image\" content=\"https://example.com/og.jpg\">"),
    card("<link rel=\"icon\">", "Иконка вкладки", "Favicon. Лучше SVG, плюс `apple-touch-icon` для iPhone.", "Сайт узнаётся среди 30 вкладок.", "<link rel=\"icon\" href=\"/favicon.svg\" type=\"image/svg+xml\">\n<link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\">"),
    card("manifest", "Как приложение", "`<link rel=\"manifest\">` — файл с названием, иконками и цветами.", "Сайт можно «установить» на телефон."),
    card("color", "Цвет иконки", "Атрибут `link rel=\"mask-icon\"`: цвет одноцветной иконки в Safari.", "Иконка магазина в фирменном коричневом.", "<link rel=\"mask-icon\" href=\"/icon.svg\" color=\"#6b3e26\">"),
  ],

  "linking-resources": [
    scene("Стили и шрифты",
      ["you", "Дизайнер прислал CSS-файл и фирменный шрифт. Куда это?"],
      ["bro", "Стили — в `head`, чтобы я рисовал сразу красиво. Скрипты — с `defer`, чтобы не тормозили меня."]),
    card("<link rel=\"stylesheet\">", "Подключить CSS", "В `head`, файл общий для всех страниц.", "Один файл — весь сайт в фирменном стиле.", "<link rel=\"stylesheet\" href=\"/style.css\">"),
    card("defer · async", "Скрипты без тормозов", "`defer` — по порядку после разбора HTML; `async` — сразу как скачался, порядок не важен.", "Аналитика — `async`, основной скрипт — `defer`."),
    card("preload · preconnect · prefetch", "Подсказки браузеру", "`preload` — грузи сейчас, `preconnect` — заранее соединись с сервером, `prefetch`/`modulepreload` — на потом, `dns-prefetch` — узнай адрес заранее.", "Шрифт появляется сразу, без мигания.", "<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>"),
    card("as", "Что именно предзагрузить", "Обязателен у `preload`: `font`, `image`, `style`, `script`.", "Браузер поставит правильный приоритет.", "<link rel=\"preload\" href=\"/fonts/brand.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>"),
    card("imagesrcset", "srcset для предзагрузки", "Атрибут `link rel=\"preload\" as=\"image\"`: варианты картинки, как `srcset`.", "Предзагрузить именно ту версию фото, которая подойдёт экрану.", "<link rel=\"preload\" as=\"image\" imagesrcset=\"hero-400.jpg 400w, hero-800.jpg 800w\" imagesizes=\"100vw\">"),
    card("imagesizes", "sizes для предзагрузки", "Пара к `imagesrcset` — как `sizes` у `img`.", "Без него браузер не поймёт, какой файл брать.", "<link rel=\"preload\" as=\"image\" imagesrcset=\"a.jpg 400w, b.jpg 800w\" imagesizes=\"50vw\">"),
    card("blocking", "Не рисовать до загрузки", "`blocking=\"render\"` у `link`, `script`, `style`.", "Избежать мигания, пока не загрузился критичный CSS.", "<link rel=\"stylesheet\" href=\"/critical.css\" blocking=\"render\">"),
  ],

  "style-base-meta": [
    scene("Три способа стилей",
      ["you", "Можно же стили прямо в тег писать?"],
      ["nika", "Можно. Но общие для сайта — только внешним файлом. Иначе меняешь цвет на 40 страницах руками."]),
    card("<link>", "Внешний файл", "`<link rel=\"stylesheet\" href=\"…\">` в `head` подключает CSS-файл.", "Правильный способ для стилей, общих для всех страниц: поменял цвет в одном файле — поменялся весь сайт.", "<link rel=\"stylesheet\" href=\"/style.css\">"),
    card("<style>", "Стили в документе", "CSS внутри `head` этой страницы.", "Стили одной страницы, критичный CSS.", "<style>\n  h1 { color: #6b3e26; }\n</style>\n<h1>Север</h1>", { show: 60 }),
    card("style", "Атрибут", "CSS прямо на элементе.", "Разово. Для системы — плохо.", "<p style=\"color: crimson\">Скидка!</p>", { show: 40 }),
    card("<base>", "Точка отсчёта адресов", "`<base href>` меняет базу для всех относительных адресов страницы, `target` — цель ссылок по умолчанию.", "Редко нужен и легко всё ломает. Знай, что он есть.", "<base href=\"https://example.com/\">\n<!-- теперь menu.html = https://example.com/menu.html -->"),
    card("http-equiv", "Служебные meta", "`<meta http-equiv=\"refresh\">`, `content-security-policy`.", "Подменяют HTTP-заголовки. Используй осторожно.")
  ],

  security: [
    scene("Атака",
      ["bug", "Я оставил отзыв: `<script>украсть_всё()</script>`. Если сайт покажет его как HTML — я победил 😈"],
      ["nika", "Не победил. Чужой текст мы выводим как текст, не как код."],
      ["you", "Звучит страшно."],
      ["nika", "Сейчас разберём пять правил — и не будет страшно."]),
    card("XSS", "Чужой код на странице", "Главная угроза: ввод пользователя выполняется как HTML/JS.", "Комментарии и отзывы выводим как текст, без интерпретации HTML."),
    card("CSP", "Список разрешённых источников", "Content Security Policy: заголовок или `<meta http-equiv=\"Content-Security-Policy\">`. Скриптам — `nonce`.", "Даже если Скрипт пролезет — браузер его не выполнит."),
    card("integrity", "Файл не подменили", "Хеш файла у `script` и `link`. Не совпал — файл не выполнится.", "Взломанный CDN не подсунет вредный код.", "<script src=\"https://cdn.example/lib.js\" integrity=\"sha384-…\" crossorigin=\"anonymous\"></script>"),
    card("crossorigin", "Запрос с другого сайта", "`anonymous` — без кук, `use-credentials` — с ними. У `script`, `link`, `img`, `audio`, `video`.", "Нужен для `integrity` и шрифтов с CDN.", "<img src=\"https://cdn.example/raf.jpg\" crossorigin=\"anonymous\" alt=\"Пенал\">"),
    card("nonce", "Пропуск для скрипта", "Глобальный: одноразовый токен, который разрешает этот `script` или `style` по правилам CSP.", "Свой встроенный скрипт работает, внедрённый Вредным Скриптом — нет.", "<script nonce=\"r4nd0m\">init()</script>"),
    card("noopener · sandbox", "Изоляция", "`rel=\"noopener\"` для новых вкладок, `sandbox` для `iframe`.", "Чужая страница не дотянется до твоей."),
    card("Секреты", "Нигде в HTML", "Ключи API, пароли в комментариях — видны любому. Пароль — только `method=\"post\"`.", "Исходный код читает кто угодно.")
  ],

  "structured-data": [
    scene("Звёздочки в поиске",
      ["you", "У конкурентов в поиске видно рейтинг, часы работы и адрес. Как?"],
      ["nika", "Структурированные данные. Ты описываешь магазин на языке, который понимают поисковики."]),
    card("JSON-LD", "Рекомендуемый способ", "`<script type=\"application/ld+json\">` с описанием по словарю schema.org.", "Поисковики любят его больше всего.", "<script type=\"application/ld+json\">\n{\"@context\": \"https://schema.org\", \"@type\": \"CafeOrCoffeeShop\", \"name\": \"Север\"}\n</script>"),
    card("itemscope", "Здесь сущность", "Глобальный: элемент описывает отдельную сущность.", "Начало описания магазина.", "<div itemscope itemtype=\"https://schema.org/CafeOrCoffeeShop\">…</div>"),
    card("itemtype", "Тип сущности", "Адрес словаря schema.org.", "Поисковик поймёт, что это именно магазин.", "<div itemscope itemtype=\"https://schema.org/CafeOrCoffeeShop\">…</div>"),
    card("itemprop", "Свойство", "Глобальный: какое свойство хранит элемент.", "Название, адрес, телефон.", "<h1 itemprop=\"name\">Север</h1>\n<span itemprop=\"telephone\">+7 843 123-45-67</span>"),
    card("itemid", "Уникальный идентификатор", "Глобальный адрес сущности.", "Связать одну магазин на разных страницах.", "<div itemscope itemtype=\"https://schema.org/Book\" itemid=\"urn:isbn:9785000000000\">…</div>"),
    card("itemref", "Свойства из других мест", "Список `id` элементов вне `itemscope`, которые тоже относятся к сущности.", "Адрес в подвале — часть описания магазина.", "<div itemscope itemtype=\"https://schema.org/CafeOrCoffeeShop\" itemref=\"addr\">…</div>\n<p id=\"addr\" itemprop=\"address\">ул. Баумана, 12</p>"),
  ],

  "project-landing": [
    scene("Проект: лендинг мастер-класса",
      ["you", "Запускаем онлайн-курс «HTML за один вечер»! Нужна страница с записью."],
      ["nika", "Head, структура, форма — всё вместе. Это уже почти настоящий заказ."]),
    card("Форма записи", "Чек-лист", "`label` у каждого поля, подходящие `type` (`email`, `tel`), `autocomplete` для имени, почты и телефона.", "Записаться за 10 секунд с телефона.")
  ],

  "html-and-javascript": [
    scene("Кнопка «Нравится»",
      ["you", "Хочу сердечко под каждым товаром и счётчик лайков!"],
      ["nika", "Логика — на JavaScript. Твоя задача — разметка, с которой скрипту удобно."]),
    card("addEventListener", "Подписка на события", "Скрипт находит элемент и слушает событие: `button.addEventListener(\"click\", …)`.", "Современный способ. Атрибуты вроде `onclick` — устаревший стиль.", "<button id=\"like\" type=\"button\">♥ 12</button>"),
    card("on* атрибуты", "События в HTML", "`onclick`, `oninput`, `onsubmit`, `onload`… — обработчик прямо в атрибуте.", "Встретишь в старом коде; в новом лучше `addEventListener`."),
    card("data-* → dataset", "Данные для скрипта", "Атрибут `data-price` читается как `el.dataset.price`.", "Скрипт знает цену, не парся текст.", "<li data-price=\"290\">Пенал</li>"),
    card("id · class", "Крючки", "По ним скрипт находит элементы.", "Понятные имена — понятный скрипт.")
  ],

  "editing-and-drag-and-drop": [
    scene("Доска заказов",
      ["you", "Хочу доску задач: карточки перетаскивать «в работе → готово», а заметку править прямо на экране."],
      ["lev", "А можно, чтобы и без мыши? Перетаскивать я не могу."]),
    card("contenteditable", "Редактируемый текст", "Любой элемент становится редактируемым.", "Заметка администратор прямо на странице.", "<p contenteditable>Кликни и напиши</p>", { show: 50 }),
    card("draggable", "Перетаскивание", "`draggable=\"true\"` + скрипт с событиями drag.", "Карточки заказов. Обязательно дай альтернативу: кнопки «Вверх»/«Вниз» с клавиатуры."),
    card("hidden=\"until-found\"", "Найдётся поиском", "Скрыто, но Ctrl+F найдёт и раскроет.", "Длинные ответы в FAQ."),
    card("inputmode · enterkeyhint · spellcheck", "Удобный ввод", "Клавиатура телефона, подпись Enter, проверка орфографии — и в редактируемых блоках тоже.", "Удобно печатать с телефона.")
  ],

  "custom-elements": [
    scene("Свои теги",
      ["you", "Карточка товара повторяется 30 раз. Можно сделать свой тег `<product-card>`?"],
      ["bro", "Можно! Только с дефисом в имени — так я пойму, что он твой, а не мой."]),
    card("Свой элемент", "Имя с дефисом", "`user-card`, `product-card` — регистрируются скриптом.", "Своя библиотека компонентов.", "<product-card>Пенал</product-card>"),
    card("shadowrootmode", "Декларативный Shadow DOM", "У `template`: `open` или `closed` — превращает шаблон в изолированное содержимое элемента.", "Стили компонента не протекают наружу, без JavaScript.", "<product-card>\n  <template shadowrootmode=\"open\">\n    <p>Изолированная карточка</p>\n  </template>\n</product-card>", { show: 40 }),
    card("shadowrootdelegatesfocus", "Передать фокус внутрь", "Клик по компоненту ставит фокус в первое поле внутри.", "Свой компонент-поле ведёт себя как настоящее поле.", "<template shadowrootmode=\"open\" shadowrootdelegatesfocus>…</template>"),
    card("shadowrootclonable", "Можно клонировать", "Shadow DOM копируется вместе с элементом через `cloneNode`.", "Шаблоны карточек размножаются правильно.", "<template shadowrootmode=\"open\" shadowrootclonable>…</template>"),
    card("shadowrootserializable", "Можно сериализовать", "Shadow DOM попадёт в `getHTML()`.", "Сохранить или отправить разметку компонента целиком.", "<template shadowrootmode=\"open\" shadowrootserializable>…</template>"),
    card("shadowrootslotassignment", "Как раскладывать по слотам", "`named` — по атрибуту `slot` (по умолчанию), `manual` — скриптом.", "Тонкое управление содержимым компонента.", "<template shadowrootmode=\"open\" shadowrootslotassignment=\"manual\">…</template>"),
    card("shadowrootcustomelementregistry", "Свой реестр элементов", "Shadow DOM получает отдельный реестр пользовательских элементов.", "Два компонента с одинаковыми именами внутри не конфликтуют.", "<template shadowrootmode=\"open\" shadowrootcustomelementregistry>…</template>"),
    card("<slot>", "Дырка для содержимого", "Показывает внутри компонента то, что передали снаружи. Именованный слот — `name`, снаружи — атрибут `slot`.", "Один шаблон — разные названия товаров.", "<product-card>\n  <template shadowrootmode=\"open\">\n    <p>Товар: <slot name=\"title\"></slot></p>\n  </template>\n  <span slot=\"title\">Пенал</span>\n</product-card>", { show: 50 }),
    card("is", "Расширить встроенный", "`<button is=\"like-button\">` — встроенная кнопка с поведением.", "Сохраняется вся доступность настоящей кнопки.")
  ]
};
