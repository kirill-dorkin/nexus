// Chapter 3: the box model.
import { scene, prop, fn, val, idea, rule, page, css, task, makeLesson, diagram } from "./kit.mjs";

export default function box(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "box-model", title: "Блочная модель", summary: "Каждый элемент — коробка: содержимое, padding, border, margin, ширина и высота.",
    skill: ["css-box", "Блочная модель", "Управлять размерами и отступами элемента через блочную модель."],
    now: "Разбираем блочную модель: содержимое, padding, border, margin.",
    body: [
      scene("Всё — коробки",
        ["you", "Карточка: внутри отступ 16px, рамка 1px, между карточками 24px."],
        ["bro", "Для меня каждый элемент — прямоугольник из четырёх слоёв. Скажи размеры слоёв — нарисую точно."]),
      diagram({ kind: "flow", title: "Слои коробки изнутри наружу", steps: [
        { title: "content", text: "Текст и картинки" },
        { title: "padding", text: "Внутренний отступ" },
        { title: "border", text: "Рамка" },
        { title: "margin", text: "Внешний отступ до соседей" }
      ] }),
      prop("width", "Ширина", "Ширина содержимого (или всей коробки при `box-sizing: border-box`).", "Карточка фиксированной ширины.", page(".card { width: 200px; background: #fdf6ec; }", "<div class=\"card\">200px</div>")),
      prop("height", "Высота", "Высота коробки. Обычно её не задают — она растёт по содержимому.", "Баннер фиксированной высоты.", page(".banner { height: 60px; background: #6b3e26; color: white; }", "<div class=\"banner\">60px</div>")),
      prop("min-width", "Не уже чем", "Минимальная ширина.", "Кнопка не сжимается в точку.", page("button { min-width: 140px; }", "<button>OK</button>")),
      prop("max-width", "Не шире чем", "Максимальная ширина.", "Контейнер текста не растягивается на весь монитор.", page(".text { max-width: 220px; background: #fdf6ec; }", "<p class=\"text\">Текст не шире 220px, даже на большом экране.</p>")),
      prop("min-height", "Не ниже чем", "Минимальная высота, при большем содержимом блок растёт.", "Первый экран на всю высоту, но с длинным текстом — выше.", page(".hero { min-height: 80px; background: #fdf6ec; }", "<div class=\"hero\">Минимум 80px</div>")),
      prop("max-height", "Не выше чем", "Максимальная высота.", "Блок с прокруткой внутри.", page(".log { max-height: 50px; overflow: auto; background: #fdf6ec; }", "<div class=\"log\">1<br>2<br>3<br>4<br>5</div>")),
      prop("padding", "Внутренний отступ", "Между содержимым и рамкой. 1–4 значения: `16px`, `8px 16px`.", "Текст не прилипает к краям карточки.", page(".card { padding: 16px; background: #fdf6ec; }", "<div class=\"card\">Отступ внутри</div>")),
      prop("margin", "Внешний отступ", "Снаружи рамки, до соседних элементов. `auto` по бокам центрирует блок.", "Расстояние между карточками; центрирование контейнера.", page(".box { width: 150px; margin: 12px auto; background: #fdf6ec; }", "<div class=\"box\">По центру</div>")),
      prop("border", "Рамка", "`border: 1px solid #c8763a` — толщина, стиль, цвет.", "Контур карточки.", page(".card { border: 1px solid #c8763a; padding: 8px; }", "<div class=\"card\">С рамкой</div>")),
      rule("Порядок 4 значений — по часовой стрелке: верх, право, низ, лево. `margin: 0 auto` центрирует блок.")
    ],
    tasks: [task("Карточка по макету", "Задай `.card` ширину `240px`, внутренний отступ `16px`, рамку `1px solid #c8763a` и внешний отступ `24px`.", {
      start: page("", "<div class=\"card\">Пенал — 290 ₽</div>"),
      checks: [css(".card", "width", "Ширина 240px", { value: "240px" }), css(".card", "padding", "Отступ 16px", { value: "16px" }), css(".card", "border", "Рамка", { value: "1px solid #c8763a" }), css(".card", "margin", "Внешний отступ 24px", { value: "24px" })],
      solution: page(".card { width: 240px; padding: 16px; border: 1px solid #c8763a; margin: 24px; }", "<div class=\"card\">Пенал — 290 ₽</div>")
    })],
    quizzes: [
      single("css-box-order", "Слои", "Какой слой коробки находится между рамкой и содержимым?", [["padding", "`padding`"], ["margin", "`margin`"], ["outline", "`outline`"], ["width", "`width`"]], "padding", "padding — внутренний отступ, margin — внешний."),
      single("css-box-center", "Центр", "Как отцентровать блок фиксированной ширины по горизонтали?", [["auto", "`margin: 0 auto`"], ["center", "`text-align: center`"], ["pad", "`padding: auto`"], ["float", "`float: center`"]], "auto", "Автоматические боковые отступы делят свободное место поровну.")
    ]
  });

  L({
    slug: "box-sizing-margins", title: "box-sizing и схлопывание отступов", summary: "Почему карточка шире, чем задано, и куда пропадают вертикальные отступы.",
    skill: ["css-box-sizing", "box-sizing", "Считать размеры с border-box и понимать схлопывание отступов."],
    now: "Настраиваем box-sizing и разбираемся со схлопыванием отступов.",
    body: [
      scene("Лишние пиксели",
        ["you", "Задал ширину 240px, а карточка 274px!"],
        ["bro", "По умолчанию ширина — только содержимое. Отступы и рамка прибавляются сверху. Скажи `border-box` — буду считать всё вместе."]),
      prop("box-sizing", "Как считать ширину", "`content-box` (по умолчанию) — без отступов и рамки; `border-box` — вместе с ними.", "С `border-box` ширина из макета совпадает с реальной.", page(".a { width: 150px; padding: 20px; border: 2px solid #c8763a; } .b { box-sizing: border-box; width: 150px; padding: 20px; border: 2px solid #6b3e26; }", "<div class=\"a\">content-box</div><div class=\"b\">border-box</div>")),
      idea("Схлопывание отступов", "Вертикальные margin сливаются", "Верхний и нижний `margin` соседних блоков не складываются, побеждает больший.", "Между абзацами 16px и 24px будет 24px, а не 40px.", page("p { margin: 16px 0; background: #fdf6ec; } .big { margin-top: 24px; }", "<p>Первый</p><p class=\"big\">Между нами 24px, а не 40</p>")),
      rule("В начале любого проекта: `*, *::before, *::after { box-sizing: border-box; }`.")
    ],
    tasks: [task("Ширина как в макете", "Сделай всем элементам `box-sizing: border-box` через универсальный селектор `*`.", {
      start: page(".card { width: 240px; padding: 16px; border: 1px solid #c8763a; }", "<div class=\"card\">Пенал</div>"),
      checks: [css("*", "box-sizing", "Все элементы считают ширину вместе с отступами", { value: "border-box" })],
      solution: page("* { box-sizing: border-box; }\n.card { width: 240px; padding: 16px; border: 1px solid #c8763a; }", "<div class=\"card\">Пенал</div>")
    })],
    quizzes: [
      single("css-bs-width", "Реальная ширина", "При `box-sizing: content-box` элемент с `width: 200px; padding: 10px; border: 1px` имеет ширину:", [["222", "222px"], ["200", "200px"], ["210", "210px"], ["220", "220px"]], "222", "200 + 10 + 10 + 1 + 1."),
      single("css-bs-collapse", "Схлопывание", "Блоки идут друг под другом: у первого `margin-bottom: 20px`, у второго `margin-top: 30px`. Расстояние между ними:", [["30", "30px"], ["50", "50px"], ["20", "20px"], ["0", "0"]], "30", "Вертикальные отступы схлопываются: побеждает больший.")
    ]
  });

  L({
    slug: "borders-outline", title: "Рамки, скругления и обводка", summary: "border-width, border-style, border-color, border-radius, outline и outline-offset.",
    skill: ["css-borders", "Рамки и скругления", "Настраивать рамки по частям, скруглять углы и делать обводку фокуса."],
    now: "Делаем рамки, скругления и обводку.",
    body: [
      scene("Мягкие углы",
        ["you", "Углы карточек скругли на 16px, кнопки — полностью круглые."],
        ["lev", "И обводка фокуса пусть будет заметной, но не ломает вёрстку."]),
      prop("border-width", "Толщина рамки", "Толщина: `1px`, `thin`, по сторонам — `border-top-width`.", "Тонкая разделительная линия.", page(".box { border-style: solid; border-width: 0 0 3px; border-color: #c8763a; }", "<div class=\"box\">Линия снизу</div>")),
      prop("border-style", "Стиль рамки", "`solid`, `dashed`, `dotted`, `double`, `none`.", "Пунктир для «места под фото».", page(".drop { border: 2px dashed #c8763a; padding: 12px; }", "<div class=\"drop\">Перетащите фото</div>")),
      prop("border-color", "Цвет рамки", "Цвет рамки, по умолчанию `currentColor`.", "Красная рамка у поля с ошибкой.", page("input { border: 2px solid; border-color: crimson; }", "<input value=\"Ошибка\">")),
      prop("border-radius", "Скругление", "`16px` — углы, `50%` — круг, `999px` — «пилюля».", "Мягкие карточки, круглые аватарки и кнопки.", page(".card { border-radius: 16px; background: #fdf6ec; padding: 12px; } .pill { border-radius: 999px; padding: 6px 16px; }", "<div class=\"card\">Карточка</div><button class=\"pill\">Кнопка</button>")),
      prop("outline", "Обводка", "Как рамка, но не занимает места и не сдвигает соседей.", "Видимый фокус клавиатуры.", page("button:focus-visible { outline: 3px solid #c8763a; }", "<button>Нажми Tab</button>")),
      prop("outline-offset", "Отступ обводки", "Расстояние между элементом и обводкой.", "Фокус-кольцо не прилипает к кнопке.", page("button { outline: 3px solid #c8763a; outline-offset: 4px; }", "<button>С отступом</button>")),
      rule("Никогда не пиши `outline: none` без замены — Лев перестанет видеть фокус.")
    ],
    tasks: [task("Мягкая карточка", "Скругли `.card` на `16px`, кнопке `.btn` сделай `border-radius: 999px`, а при `:focus-visible` — `outline: 3px solid #c8763a` с `outline-offset: 3px`.", {
      start: page(".card { padding: 16px; background: #fdf6ec; }", "<div class=\"card\"><button class=\"btn\">Заказать</button></div>"),
      checks: [css(".card", "border-radius", "Скругление карточки", { value: "16px" }), css(".btn", "border-radius", "Круглая кнопка", { value: "999px" }), css(".btn:focus-visible", "outline", "Видимый фокус", { value: "3px solid #c8763a" }), css(".btn:focus-visible", "outline-offset", "Отступ фокуса", { value: "3px" })],
      solution: page(".card { padding: 16px; background: #fdf6ec; border-radius: 16px; }\n.btn { border-radius: 999px; }\n.btn:focus-visible { outline: 3px solid #c8763a; outline-offset: 3px; }", "<div class=\"card\"><button class=\"btn\">Заказать</button></div>")
    })],
    quizzes: [
      single("css-border-outline", "Обводка", "Чем `outline` отличается от `border`?", [["space", "Не занимает места и не сдвигает соседей"], ["color", "Бывает только чёрной"], ["round", "Не умеет скругляться"], ["same", "Ничем"]], "space", "Обводка рисуется поверх, не меняя размеров."),
      short("css-border-circle", "Круг", "Какое значение `border-radius` превращает квадрат в круг? Введи значение.", ["50%"], "`border-radius: 50%` у квадрата даёт круг.")
    ]
  });

  L({
    slug: "backgrounds", title: "Фоны и градиенты", summary: "Фоновые картинки, размер, позиция, повтор, градиенты и несколько фонов сразу.",
    skill: ["css-backgrounds", "Фоны", "Ставить фоновые изображения и градиенты и управлять их размером и позицией."],
    now: "Делаем фоны: цвета, картинки и градиенты.",
    body: [
      scene("Фото на фоне",
        ["you", "На первом экране — большое фото на всю ширину и тёмный градиент поверх, чтобы белый текст читался."],
        ["bro", "Фонов можно несколько, через запятую. Первый — сверху."]),
      prop("background-image", "Фоновая картинка", "`url(...)` или градиент.", "Фото первого экрана.", page(".hero { background-image: url(https://picsum.photos/id/431/400/160); height: 100px; }", "<div class=\"hero\"></div>")),
      prop("background-size", "Размер фона", "`cover` — заполнить, обрезав лишнее; `contain` — целиком.", "Фото на весь блок без искажений.", page(".hero { background: url(https://picsum.photos/id/431/400/300) center/cover; height: 100px; }", "<div class=\"hero\"></div>")),
      prop("background-position", "Позиция фона", "`center`, `top right`, `50% 20%`.", "Лицо на фото не обрезается.", page(".hero { background: url(https://picsum.photos/id/431/400/300) no-repeat; background-size: cover; background-position: center top; height: 100px; }", "<div class=\"hero\"></div>")),
      prop("background-repeat", "Повтор", "`no-repeat`, `repeat-x`, `repeat`.", "Узор плиткой или одна картинка.", page(".dots { background-image: radial-gradient(#c8763a 2px, transparent 2px); background-size: 16px 16px; background-repeat: repeat; height: 60px; }", "<div class=\"dots\"></div>")),
      prop("background-attachment", "Фиксированный фон", "`fixed` — фон стоит на месте при прокрутке.", "Эффект «окна» в лендинге. На телефонах часто не работает.", undefined),
      prop("background-clip", "Докуда фон", "`padding-box`, `content-box`, `text` — фон только под текстом.", "Градиентный текст.", page("h1 { background: linear-gradient(90deg, #6b3e26, #c8763a); background-clip: text; color: transparent; }", "<h1>Градиентный текст</h1>")),
      prop("background", "Короткая запись", "Всё сразу: `background: url(x.jpg) center/cover no-repeat, #6b3e26;`.", "Компактно; несколько слоёв через запятую.", page(".hero { background: linear-gradient(rgb(0 0 0 / 60%), transparent), url(https://picsum.photos/id/431/400/300) center/cover; color: white; height: 100px; padding: 12px; }", "<div class=\"hero\">Затемнение поверх фото</div>")),
      fn("linear-gradient()", "Линейный градиент", "`linear-gradient(направление, цвет1, цвет2)`.", "Плавные переходы и затемнение фото.", page(".g { background: linear-gradient(135deg, #6b3e26, #c8763a); height: 60px; }", "<div class=\"g\"></div>")),
      fn("radial-gradient()", "Круговой градиент", "Из центра наружу: `radial-gradient(circle, ...)`.", "Мягкое свечение, точки-узоры.", page(".g { background: radial-gradient(circle at 30% 50%, #c8763a, #fdf6ec 60%); height: 60px; }", "<div class=\"g\"></div>")),
      fn("conic-gradient()", "Конический градиент", "Вокруг центра, как циферблат.", "Круговые диаграммы и индикаторы.", page(".pie { width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(#6b3e26 0 70%, #fdf6ec 0); }", "<div class=\"pie\"></div>")),
      fn("url()", "Ссылка на файл", "Путь к картинке или шрифту внутри CSS.", "Фоны, шрифты, курсоры.", undefined),
      rule("Текст поверх фото — всегда с затемнением градиентом. Контраст важнее красоты.")
    ],
    tasks: [task("Первый экран", "Задай `.hero` фон: сверху градиент `linear-gradient(rgb(0 0 0 / 60%), transparent)`, под ним фото — и `background-size: cover`.", {
      start: page(".hero { color: white; padding: 24px; min-height: 120px; }", "<section class=\"hero\"><h1>Мой сайт</h1></section>"),
      checks: [css(".hero", "background-image", "Градиент и фото через запятую", { includes: "linear-gradient(" }), css(".hero", "background-size", "Фото заполняет блок", { value: "cover" })],
      hint: "`background-image: linear-gradient(...), url(https://picsum.photos/id/431/800/400);`",
      solution: page(".hero { color: white; padding: 24px; min-height: 120px; background-image: linear-gradient(rgb(0 0 0 / 60%), transparent), url(https://picsum.photos/id/431/800/400); background-size: cover; }", "<section class=\"hero\"><h1>Мой сайт</h1></section>")
    })],
    quizzes: [
      single("css-bg-cover", "cover", "Что делает `background-size: cover`?", [["fill", "Заполняет блок целиком, обрезая лишнее"], ["whole", "Показывает картинку целиком, оставляя поля"], ["tile", "Повторяет плиткой"], ["stretch", "Растягивает с искажением"]], "fill", "`cover` заполняет без искажений, `contain` показывает целиком."),
      single("css-bg-layers", "Слои", "В `background: A, B` какой слой сверху?", [["first", "A — первый"], ["second", "B — последний"], ["mix", "Смешиваются"], ["error", "Так нельзя"]], "first", "Первый в списке рисуется поверх остальных.")
    ]
  });

  L({
    slug: "shadows-effects", title: "Тени и фильтры", summary: "box-shadow, filter, backdrop-filter и mix-blend-mode.",
    skill: ["css-effects", "Тени и эффекты", "Добавлять тени и визуальные эффекты без картинок."],
    now: "Добавляем тени, прозрачность и фильтры.",
    body: [
      scene("Глубина",
        ["you", "Карточкам — мягкую тень, шапке — эффект матового стекла."],
        ["bro", "Всё это я рисую сам, без картинок. Только не переборщи — тени тоже стоят мне работы."]),
      prop("box-shadow", "Тень блока", "`смещение-x смещение-y размытие растяжение цвет`, `inset` — внутрь, несколько через запятую.", "Карточка «приподнята» над фоном.", page(".card { box-shadow: 0 8px 24px rgb(107 62 38 / 18%); padding: 16px; border-radius: 12px; }", "<div class=\"card\">Мягкая тень</div>")),
      prop("filter", "Фильтр", "`blur()`, `grayscale()`, `brightness()`, `drop-shadow()`.", "Серое фото у закончившейся позиции.", page("img { filter: grayscale(1); }", "<img src=\"https://picsum.photos/id/431/160/90\" alt=\"Пенал\" width=\"160\" height=\"90\">")),
      prop("backdrop-filter", "Фильтр под элементом", "Размывает то, что под полупрозрачным элементом.", "Шапка «матовое стекло».", page(".wrap { background: url(https://picsum.photos/id/431/300/120) center/cover; padding: 20px; } .glass { backdrop-filter: blur(6px); background: rgb(255 255 255 / 40%); padding: 8px; }", "<div class=\"wrap\"><div class=\"glass\">Матовое стекло</div></div>")),
      prop("mix-blend-mode", "Режим наложения", "Как элемент смешивается с фоном: `multiply`, `screen`…", "Логотип красиво ложится на фото.", page(".wrap { background: #c8763a; padding: 12px; } img { mix-blend-mode: multiply; }", "<div class=\"wrap\"><img src=\"https://picsum.photos/id/431/160/90\" alt=\"\" width=\"160\" height=\"90\"></div>")),
      rule("Тень — мягкая и полупрозрачная. Резкая чёрная тень выглядит дёшево.")
    ],
    tasks: [task("Глубина карточки", "Дай `.card` тень `0 8px 24px rgb(107 62 38 / 18%)`, а фото закончившегося товара `.sold img` — `filter: grayscale(1)`.", {
      start: page(".card { padding: 16px; border-radius: 12px; }", "<div class=\"card\">Пенал</div>\n<div class=\"sold\"><img src=\"https://picsum.photos/id/431/160/90\" alt=\"Пенал закончился\" width=\"160\" height=\"90\"></div>"),
      checks: [css(".card", "box-shadow", "Мягкая тень", { value: "0 8px 24px rgb(107 62 38/18%)" }), css(".sold img", "filter", "Серое фото", { value: "grayscale(1)" })],
      solution: page(".card { padding: 16px; border-radius: 12px; box-shadow: 0 8px 24px rgb(107 62 38 / 18%); }\n.sold img { filter: grayscale(1); }", "<div class=\"card\">Пенал</div>\n<div class=\"sold\"><img src=\"https://picsum.photos/id/431/160/90\" alt=\"Пенал закончился\" width=\"160\" height=\"90\"></div>")
    })],
    quizzes: [
      single("css-fx-backdrop", "Стекло", "Какое свойство размывает фон ПОД элементом?", [["backdrop", "`backdrop-filter`"], ["filter", "`filter`"], ["blur", "`blur`"], ["opacity", "`opacity`"]], "backdrop", "`filter` размывает сам элемент, `backdrop-filter` — то, что под ним."),
      single("css-fx-inset", "Внутренняя тень", "Как сделать тень внутри блока?", [["inset", "Добавить `inset` в `box-shadow`"], ["neg", "Отрицательное размытие"], ["in", "`shadow: inside`"], ["filter", "`filter: inner-shadow()`"]], "inset", "`box-shadow: inset ...`.")
    ]
  });

  L({
    slug: "display-overflow", title: "display, видимость и переполнение", summary: "block, inline, inline-block, none; visibility; overflow; object-fit; aspect-ratio.",
    skill: ["css-display", "Отображение и переполнение", "Переключать тип отображения, скрывать элементы и управлять переполнением и пропорциями."],
    now: "Управляем display, видимостью и переполнением.",
    body: [
      scene("Разные фото",
        ["you", "Одни фото квадратные, другие вытянутые. Карточки скачут."],
        ["nika", "`aspect-ratio` задаст одну форму, `object-fit: cover` впишет фото без искажений."]),
      prop("display", "Тип отображения", "`block`, `inline`, `inline-block`, `none`, а ещё `flex` и `grid` — их разберём отдельно.", "Ссылку сделать блоком, элемент спрятать.", page("a { display: inline-block; padding: 8px 12px; background: #fdf6ec; }", "<a href=\"#\">Меню</a> <a href=\"#\">Бронь</a>")),
      prop("visibility", "Видимость", "`hidden` — невидим, но место занимает (в отличие от `display: none`).", "Спрятать, не сдвигая соседей.", page(".ghost { visibility: hidden; }", "<p>Раз</p><p class=\"ghost\">Два</p><p>Три — место второго осталось</p>")),
      prop("overflow", "Переполнение", "`visible`, `hidden`, `auto` (прокрутка при необходимости), `clip`.", "Таблица с прокруткой на телефоне.", page(".scroll { overflow: auto; width: 160px; white-space: nowrap; background: #fdf6ec; }", "<div class=\"scroll\">Длинная строка, которую можно прокрутить вбок</div>")),
      prop("overflow-x · overflow-y", "По осям", "Переполнение отдельно по горизонтали и вертикали.", "Горизонтальная прокрутка ленты карточек.", undefined),
      prop("object-fit", "Вписать картинку", "`cover` — заполнить, обрезав; `contain` — целиком.", "Одинаковые карточки из разных фото.", page("img { width: 120px; height: 120px; object-fit: cover; }", "<img src=\"https://picsum.photos/id/431/300/120\" alt=\"Пенал\">")),
      prop("object-position", "Позиция внутри", "Какую часть фото оставить при обрезке.", "Не отрезать главное.", page("img { width: 120px; height: 120px; object-fit: cover; object-position: left; }", "<img src=\"https://picsum.photos/id/431/300/120\" alt=\"Пенал\">")),
      prop("aspect-ratio", "Пропорции", "`16 / 9`, `1` — высота считается от ширины.", "Фото и видео одной формы, без прыжков страницы.", page(".ph { width: 140px; aspect-ratio: 4 / 3; background: #c8763a; }", "<div class=\"ph\"></div>")),
      rule("Для одинаковых карточек: `aspect-ratio` у фото + `object-fit: cover`.")
    ],
    tasks: [task("Одинаковые фото", "Сделай фото `.card img` шириной `100%`, с `aspect-ratio: 4 / 3` и `object-fit: cover`.", {
      start: page(".card { width: 200px; }", "<div class=\"card\"><img src=\"https://picsum.photos/id/431/300/120\" alt=\"Пенал\"></div>"),
      checks: [css(".card img", "width", "На всю ширину", { value: "100%" }), css(".card img", "aspect-ratio", "Пропорции 4/3", { value: "4/3" }), css(".card img", "object-fit", "Вписано без искажений", { value: "cover" })],
      solution: page(".card { width: 200px; }\n.card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }", "<div class=\"card\"><img src=\"https://picsum.photos/id/431/300/120\" alt=\"Пенал\"></div>")
    })],
    quizzes: [
      single("css-display-none", "Скрыть", "Чем `display: none` отличается от `visibility: hidden`?", [["space", "`display: none` убирает место, `visibility: hidden` оставляет"], ["same", "Ничем"], ["anim", "Только `display: none` анимируется"], ["reader", "Только `visibility` скрывает от читалок"]], "space", "Невидимый элемент с `visibility: hidden` продолжает занимать место."),
      single("css-display-fit", "Фото", "Какое свойство вписывает картинку в рамку без искажений, обрезая лишнее?", [["of", "`object-fit: cover`"], ["bs", "`background-size: cover`"], ["ar", "`aspect-ratio: cover`"], ["fit", "`fit: crop`"]], "of", "`object-fit` для `img`/`video`; `background-size` — для фонов.")
    ]
  });

  L({
    slug: "project-card", title: "Проект: карточка товара", summary: "Собираем карточку из блочной модели, фона, теней и пропорций.",
    skill: ["css-project-card", "Карточка товара", "Собрать аккуратную карточку товара из блочной модели и эффектов."],
    now: "Проект: карточка товара.",
    body: [scene("Карточка по макету", ["you", "Вот макет карточки: фото, название, цена, кнопка. Собирай по шагам."], ["nika", "Собираем по шагам: каркас, оформление, детали."])],
    tasks: [
      task("Шаг 1. Коробка", "`.card`: `box-sizing: border-box`, ширина `260px`, `padding: 16px`, фон `#fffaf3`, скругление `16px`.", {
        start: page("", "<article class=\"card\"><img src=\"https://picsum.photos/id/431/300/200\" alt=\"Пенал\"><h3>Пенал</h3><p class=\"price\">290 ₽</p></article>"),
        checks: [css(".card", "box-sizing", "border-box", { value: "border-box" }), css(".card", "width", "260px", { value: "260px" }), css(".card", "padding", "Отступ", { value: "16px" }), css(".card", "background-color", "Фон", { value: "#fffaf3" }), css(".card", "border-radius", "Скругление", { value: "16px" })],
        solution: page(".card { box-sizing: border-box; width: 260px; padding: 16px; background-color: #fffaf3; border-radius: 16px; }", "<article class=\"card\"><img src=\"https://picsum.photos/id/431/300/200\" alt=\"Пенал\"><h3>Пенал</h3><p class=\"price\">290 ₽</p></article>")
      }),
      task("Шаг 2. Фото", "Фото `.card img`: ширина `100%`, `aspect-ratio: 4 / 3`, `object-fit: cover`, скругление `12px`.", {
        start: page(".card { box-sizing: border-box; width: 260px; padding: 16px; background-color: #fffaf3; border-radius: 16px; }", "<article class=\"card\"><img src=\"https://picsum.photos/id/431/300/200\" alt=\"Пенал\"><h3>Пенал</h3></article>"),
        checks: [css(".card img", "width", "100%", { value: "100%" }), css(".card img", "aspect-ratio", "4/3", { value: "4/3" }), css(".card img", "object-fit", "cover", { value: "cover" }), css(".card img", "border-radius", "12px", { value: "12px" })],
        solution: page(".card { box-sizing: border-box; width: 260px; padding: 16px; background-color: #fffaf3; border-radius: 16px; }\n.card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 12px; }", "<article class=\"card\"><img src=\"https://picsum.photos/id/431/300/200\" alt=\"Пенал\"><h3>Пенал</h3></article>")
      }),
      task("Шаг 3. Глубина и кнопка", "`.card` — тень `0 8px 24px rgb(107 62 38 / 18%)`; кнопка `.card button` — фон `#6b3e26`, белый текст, `border: none`, `border-radius: 999px`.", {
        start: page(".card { padding: 16px; border-radius: 16px; }", "<article class=\"card\"><h3>Пенал</h3><button>Заказать</button></article>"),
        checks: [css(".card", "box-shadow", "Тень", { includes: "24px" }), css(".card button", "background-color", "Фирменная кнопка", { value: "#6b3e26" }), css(".card button", "color", "Белый текст", { value: ["white", "#fff", "#ffffff"] }), css(".card button", "border", "Без рамки", { value: ["none", "0"] }), css(".card button", "border-radius", "Пилюля", { value: "999px" })],
        solution: page(".card { padding: 16px; border-radius: 16px; box-shadow: 0 8px 24px rgb(107 62 38 / 18%); }\n.card button { background-color: #6b3e26; color: white; border: none; border-radius: 999px; }", "<article class=\"card\"><h3>Пенал</h3><button>Заказать</button></article>")
      })
    ],
    quizzes: [single("css-proj-card-sizing", "Ширина", "Зачем в карточке `box-sizing: border-box`?", [["exact", "Чтобы заданная ширина включала отступы и рамку"], ["round", "Чтобы скруглить углы"], ["shadow", "Чтобы появилась тень"], ["center", "Чтобы отцентровать"]], "exact", "Ширина из макета совпадает с реальной.")]
  });
}
