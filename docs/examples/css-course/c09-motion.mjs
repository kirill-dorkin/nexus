// Chapter 9: Transitions, transforms, keyframe animations and scrolling.
import { scene, prop, at, fn, rule, page, css, task, makeLesson } from "./kit.mjs";

const btn = "background: #c8763a; color: white; border: 0; padding: 8px 14px; border-radius: 8px;";

export default function motion(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "transitions", title: "transition: плавные изменения", summary: "transition-property, duration, timing-function, delay, сокращение transition и cubic-bezier().",
    skill: ["css-transition", "Переходы", "Делать изменения стилей плавными."],
    now: "Делаем изменения стилей плавными: transition.",
    body: [
      scene("Рывком",
        ["you", "Кнопка при наведении резко меняет цвет. Как будто моргнула."],
        ["bro", "Скажи браузеру: «меняй цвет за 0.2 секунды» — `transition`."]),
      prop("transition-property", "Что анимировать", "Какие свойства меняются плавно: `background-color`, `transform`, `all`.", "Анимировать только нужное.", undefined),
      prop("transition-duration", "Сколько длится", "`200ms`, `0.3s`.", "Быстро, но заметно: 150–300ms для интерфейса.", undefined),
      prop("transition-timing-function", "Характер движения", "`ease`, `linear`, `ease-in`, `ease-out`, `ease-in-out`.", "Естественное замедление в конце.", undefined),
      prop("transition-delay", "Задержка", "Пауза перед началом.", "Подсказка появляется не сразу.", undefined),
      prop("transition", "Всё одной строкой", "`transition: background-color 0.2s ease-out`.", "Короче и привычнее.", page(`button { ${btn} transition: background-color 0.3s ease; } button:hover { background-color: #7c3f1d; }`, "<button>Наведи на меня</button>")),
      fn("cubic-bezier()", "Своя кривая", "`cubic-bezier(.34, 1.56, .64, 1)` — с лёгким «пружинящим» перелётом.", "Живое, фирменное движение.", page(`.dot { width: 20px; height: 20px; border-radius: 50%; background: #c8763a; transition: transform .6s cubic-bezier(.34,1.56,.64,1); } .row:hover .dot { transform: translateX(120px); } .row { padding: 6px; background: #fdf6ec; }`, "<div class=\"row\"><div class=\"dot\"></div>Наведи</div>")),
      rule("transition пишут на обычном состоянии, а не на `:hover` — тогда плавно и туда, и обратно.")
    ],
    tasks: [task("Плавная кнопка", "Добавь кнопке `.order` `transition: background-color 0.2s ease` — цвет на `:hover` будет меняться плавно.", {
      start: page(`.order { ${btn} }\n.order:hover { background-color: #7c3f1d; }`, "<button class=\"order\">Заказать</button>"),
      checks: [css(".order", "transition", "Плавная смена фона", { value: ["background-color 0.2s ease", "background-color .2s ease", "background-color 200ms ease"] })],
      solution: page(`.order { ${btn} transition: background-color 0.2s ease; }\n.order:hover { background-color: #7c3f1d; }`, "<button class=\"order\">Заказать</button>")
    })],
    quizzes: [
      single("css-trans-where", "Где писать", "Куда лучше поставить `transition`, чтобы плавно было и при наведении, и при уходе мыши?", [["base", "На обычное состояние элемента"], ["hover", "Только в `:hover`"], ["parent", "На родителя"], ["body", "На body"]], "base", "Тогда переход работает в обе стороны."),
      short("css-trans-ms", "Длительность", "Сколько миллисекунд в `0.25s`? Введи число.", ["250"], "0.25 × 1000 = 250ms.")
    ]
  });

  L({
    slug: "transforms", title: "transform: сдвиг, поворот, масштаб", summary: "transform, translate, rotate, scale, transform-origin и perspective.",
    skill: ["css-transform", "Трансформации", "Двигать, вращать и масштабировать элементы без перестройки страницы."],
    now: "Двигаем, вращаем и масштабируем элементы: transform.",
    body: [
      scene("Приподнять",
        ["you", "При наведении карточка чуть подпрыгивает и подрастает — как будто тянется к тебе."],
        ["bro", "`transform` не двигает соседей и анимируется очень плавно. Идеально."]),
      prop("transform", "Преобразование", "`transform: translateY(-4px) scale(1.03)` — функции через пробел.", "Ховер-эффекты, иконки, переворот карточки.", page(`.card { padding: 10px; background: #fdf6ec; transition: transform .2s; } .card:hover { transform: translateY(-6px) scale(1.04); }`, "<div class=\"card\">Наведи на карточку</div>")),
      fn("translate()", "Сдвиг", "`translateX(10px)`, `translate(10px, -4px)`. Есть и отдельное свойство `translate`.", "Подвинуть, не трогая соседей.", undefined),
      fn("rotate()", "Поворот", "`rotate(45deg)`, `rotate(0.5turn)`.", "Стрелка раскрывающегося списка.", page(".arrow { display: inline-block; transform: rotate(90deg); color: #c8763a; font-size: 24px; }", "<span class=\"arrow\">➜</span> повернул на 90°")),
      fn("scale()", "Масштаб", "`scale(1.1)` — на 10% больше; `scale(-1, 1)` — зеркально.", "Увеличение при наведении.", undefined),
      prop("transform-origin", "Точка опоры", "Вокруг какой точки вращать и масштабировать: `center`, `top left`, `50% 100%`.", "Дверца открывается от петли, а не от центра.", page(".door { width: 60px; height: 40px; background: #c8763a; transform-origin: left; transform: rotate(-20deg); margin: 10px; }", "<div class=\"door\"></div>")),
      prop("perspective", "Глубина 3D", "`perspective: 600px` у родителя — дети вращаются в 3D объёмно.", "Карточка переворачивается как настоящая.", page(".scene { perspective: 300px; padding: 8px; } .c { background: #c8763a; color: white; padding: 8px; transform: rotateY(35deg); }", "<div class=\"scene\"><div class=\"c\">3D-поворот</div></div>")),
      rule("Двигай через `transform`, а не `top`/`left`: так плавнее и соседи не прыгают.")
    ],
    tasks: [task("Карточка тянется к тебе", "На `.card:hover` задай `transform: translateY(-4px)`, а самой `.card` — `transition: transform 0.2s`.", {
      start: page(".card { padding: 16px; background: #fffaf3; }", "<article class=\"card\">Ручка</article>"),
      checks: [css(".card:hover", "transform", "Приподнимается", { value: "translatey(-4px)" }), css(".card", "transition", "Плавно", { value: ["transform 0.2s", "transform .2s", "transform 200ms"] })],
      solution: page(".card { padding: 16px; background: #fffaf3; transition: transform 0.2s; }\n.card:hover { transform: translateY(-4px); }", "<article class=\"card\">Ручка</article>")
    })],
    quizzes: [
      single("css-transform-why", "Почему transform", "Почему анимировать сдвиг лучше через `transform`, а не через `top`?", [["smooth", "Не перестраивает страницу и плавнее"], ["short", "Короче писать"], ["only", "top нельзя анимировать"], ["color", "Меняет цвет"]], "smooth", "Браузеру не нужно пересчитывать раскладку."),
      single("css-transform-origin", "Опора", "Какое свойство задаёт точку, вокруг которой поворачивается элемент?", [["origin", "`transform-origin`"], ["pivot", "`transform-pivot`"], ["center", "`rotate-center`"], ["persp", "`perspective`"]], "origin", "По умолчанию — центр.")
    ]
  });

  L({
    slug: "keyframes", title: "@keyframes: анимации", summary: "@keyframes, animation-name, duration, iteration-count, direction, fill-mode, play-state и сокращение animation.",
    skill: ["css-keyframes", "Анимации по кадрам", "Описывать многошаговые анимации и управлять их проигрыванием."],
    now: "Создаём многошаговые анимации: @keyframes.",
    body: [
      scene("Пульс индикатора",
        ["you", "Индикатор «в сети» мягко пульсирует. Бесконечно."],
        ["bro", "transition — реакция на изменение. А сама по себе, по кадрам, — `@keyframes`."]),
      at("@keyframes", "Кадры анимации", "`@keyframes rise { from { … } to { … } }` или проценты `0%`, `50%`, `100%`.", "Описать движение по шагам.", page("@keyframes rise { from { transform: translateY(10px); opacity: 0; } 50% { opacity: 1; } to { transform: translateY(-14px); opacity: 0; } } .pulse { animation: rise 2s ease-in-out infinite; font-size: 24px; color: #c8763a; }", "<div class=\"pulse\">〰</div>☕")),
      prop("animation-name", "Какая анимация", "Имя из `@keyframes`.", "Подключить описанные кадры.", undefined),
      prop("animation-duration", "Длительность", "Время одного цикла.", "Пар поднимается за 2 секунды.", undefined),
      prop("animation-iteration-count", "Сколько раз", "Число или `infinite`.", "Бесконечный пар, однократное появление.", undefined),
      prop("animation-direction", "Направление", "`normal`, `reverse`, `alternate` — туда-обратно.", "Покачивание без рывка.", page("@keyframes sway { to { transform: rotate(12deg); } } .leaf { display: inline-block; animation: sway 1s ease-in-out infinite alternate; font-size: 24px; }", "<span class=\"leaf\">🍃</span>")),
      prop("animation-fill-mode", "До и после", "`forwards` — оставить последний кадр после конца.", "Появившийся элемент не исчезает обратно.", undefined),
      prop("animation-delay", "Задержка", "Пауза перед стартом.", "Карточки появляются по очереди.", undefined),
      prop("animation-play-state", "Пауза", "`paused` / `running`.", "Остановить анимацию при наведении.", undefined),
      prop("animation", "Всё одной строкой", "`animation: rise 2s ease-in-out infinite`.", "Обычная запись.", undefined),
      rule("Реакция на действие — `transition`. Своё движение по кадрам — `@keyframes` + `animation`.")
    ],
    tasks: [task("Пульс индикатора", "Опиши `@keyframes rise` с кадром `to { opacity: 0; }` и запусти её у `.pulse`: `animation: rise 2s infinite`.", {
      start: page(".pulse { font-size: 24px; }", "<div class=\"pulse\">〰</div>☕"),
      checks: [css("to", "opacity", "Кадр: пар тает", { value: "0", within: "@keyframes rise" }), css(".pulse", "animation", "Анимация запущена", { value: "rise 2s infinite" })],
      solution: page("@keyframes rise {\n  to { opacity: 0; }\n}\n.pulse { font-size: 24px; animation: rise 2s infinite; }", "<div class=\"pulse\">〰</div>☕")
    })],
    quizzes: [
      single("css-anim-infinite", "Бесконечно", "Какое значение `animation-iteration-count` повторяет анимацию бесконечно?", [["inf", "`infinite`"], ["loop", "`loop`"], ["always", "`always`"], ["neg", "`-1`"]], "inf", "`infinite`."),
      single("css-anim-forwards", "Остаться", "Как оставить элемент в последнем кадре после окончания анимации?", [["fwd", "`animation-fill-mode: forwards`"], ["stop", "`animation-stop: end`"], ["paused", "`animation-play-state: paused`"], ["rev", "`animation-direction: reverse`"]], "fwd", "`forwards` сохраняет конечный кадр."),
      multi("css-anim-vs-trans", "Что выбрать", "Где нужен именно `@keyframes`, а не transition?", [["loop", "Бесконечно пульсирующий индикатор"], ["steps", "Анимация из нескольких шагов"], ["hover", "Плавная смена цвета при наведении"], ["auto", "Анимация при загрузке без действий"]], ["loop", "steps", "auto"], "Наведение — классический случай transition.")
    ]
  });

  L({
    slug: "scrolling", title: "Прокрутка: плавная и с примагничиванием", summary: "scroll-behavior, scroll-snap-type, scroll-snap-align, scroll-margin, scroll-padding и overscroll-behavior.",
    skill: ["css-scroll", "Прокрутка", "Делать плавную прокрутку, якоря под липкой шапкой и карусели с примагничиванием."],
    now: "Настраиваем плавную прокрутку и примагничивание.",
    body: [
      scene("Рывком и под шапку",
        ["you", "Жму «Контакты» — страница прыгает, а заголовок уезжает под шапку."],
        ["nika", "Три строки CSS: плавная прокрутка, отступ под шапку — и карусель с примагничиванием в придачу."]),
      prop("scroll-behavior", "Плавная прокрутка", "`html { scroll-behavior: smooth; }` — переходы по якорям плавные.", "Навигация по одной странице.", undefined),
      prop("scroll-margin-top", "Отступ при прокрутке к элементу", "`scroll-margin-top: 80px` у раздела — он остановится ниже липкой шапки. Есть и общее `scroll-margin`.", "Заголовок не прячется под шапку.", undefined),
      prop("scroll-padding", "Отступ у прокручиваемой области", "Отступ задаётся контейнеру прокрутки, а не каждому разделу.", "Одна строка на весь сайт.", undefined),
      prop("scroll-snap-type", "Примагничивание", "`scroll-snap-type: x mandatory` у контейнера — прокрутка останавливается на элементах.", "Карусель без JavaScript.", page(".row { display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory; } .row > div { flex: 0 0 70%; scroll-snap-align: start; background: #fdf6ec; padding: 16px; }", "<div class=\"row\"><div>Стикеры</div><div>Тирамису</div><div>Эклер</div></div>")),
      prop("scroll-snap-align", "К чему прилипать", "`start`, `center`, `end` — у элементов карусели.", "Карточка встаёт ровно к краю.", undefined),
      prop("overscroll-behavior", "Не прокручивать страницу", "`overscroll-behavior: contain` — прокрутка внутри окна не уводит страницу.", "Модалка и чат не тянут за собой фон.", undefined),
      rule("Карусель — это `overflow-x` + `scroll-snap`. JavaScript не нужен.")
    ],
    tasks: [task("Карусель аксессуаров", "Сделай `.desserts` каруселью: `scroll-snap-type: x mandatory`, а `.desserts article` — `scroll-snap-align: start`.", {
      start: page(".desserts { display: flex; gap: 12px; overflow-x: auto; }\n.desserts article { flex: 0 0 80%; }", "<div class=\"desserts\"><article>Стикеры</article><article>Тирамису</article><article>Эклер</article></div>"),
      checks: [css(".desserts", "scroll-snap-type", "Примагничивание", { value: "x mandatory" }), css(".desserts article", "scroll-snap-align", "Прилипают к началу", { value: "start" })],
      solution: page(".desserts { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; }\n.desserts article { flex: 0 0 80%; scroll-snap-align: start; }", "<div class=\"desserts\"><article>Стикеры</article><article>Тирамису</article><article>Эклер</article></div>")
    }), task("Плавно и не под шапку", "Включи `html { scroll-behavior: smooth; }` и дай `section` `scroll-margin-top: 80px`.", {
      start: page("header { position: sticky; top: 0; height: 64px; }", "<header>Логотип</header><section id=\"menu\">Меню</section>"),
      checks: [css("html", "scroll-behavior", "Плавная прокрутка", { value: "smooth" }), css("section", "scroll-margin-top", "Ниже шапки", { value: "80px" })],
      solution: page("html { scroll-behavior: smooth; }\nheader { position: sticky; top: 0; height: 64px; }\nsection { scroll-margin-top: 80px; }", "<header>Логотип</header><section id=\"menu\">Меню</section>")
    })],
    quizzes: [
      single("css-scroll-snap", "Карусель", "Что нужно контейнеру карусели, чтобы прокрутка останавливалась на карточках?", [["snap", "`scroll-snap-type: x mandatory`"], ["smooth", "`scroll-behavior: smooth`"], ["flex", "`flex-wrap: wrap`"], ["js", "Обязательно JavaScript"]], "snap", "Плюс `scroll-snap-align` у карточек."),
      single("css-scroll-margin", "Под шапку", "Как сделать, чтобы раздел при переходе по якорю не прятался под липкой шапкой?", [["sm", "`scroll-margin-top` у раздела"], ["mt", "`margin-top` у шапки"], ["z", "`z-index` у раздела"], ["pos", "`position: fixed` у раздела"]], "sm", "Раздел остановится ниже шапки.")
    ]
  });
}
