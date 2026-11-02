// Chapter 8: Events.
import { scene, rule, meth, ev, obj, kw, idea, run, has, task, makeLesson } from "./kit.mjs";

const click = (sel) => `document.querySelector(${JSON.stringify(sel)}).click()`;

export default function events(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "events-click", title: "События: клик", summary: "addEventListener, событие click, функция-обработчик и removeEventListener.",
    skill: ["js-events-click", "Обработка кликов", "Запускать код в ответ на нажатие."],
    now: "Запускаем код в ответ на клик: addEventListener и обработчики.",
    body: [
      scene("Кнопка оживает",
        ["you", "Ну что, теперь кнопка заработает?"],
        ["nika", "Да. Говорим браузеру: «когда по кнопке кликнут — вызови эту функцию». Это обработчик события."]),
      meth("addEventListener()", "Подписаться на событие", "`el.addEventListener(\"click\", fn)` — при каждом клике вызывается `fn`.", "Любая реакция на действия пользователя.", 'let count = 0;\nconst btn = document.querySelector("button");\nbtn.addEventListener("click", () => {\n  count++;\n  btn.textContent = `В корзине: ${count}`;\n});', { page: "<button>В корзину</button>" }),
      ev("click", "Клик", "Нажатие мышью, касание или Enter/Space на кнопке.", "Основное событие для кнопок.", undefined),
      meth("removeEventListener()", "Отписаться", "Убирает обработчик. Нужна та же функция, что передавали в addEventListener.", "Одноразовые действия.", 'const btn = document.querySelector("button");\nfunction once() {\n  console.log("Только один раз");\n  btn.removeEventListener("click", once);\n}\nbtn.addEventListener("click", once);\nbtn.click();\nbtn.click();', { page: "<button>Жми</button>" }),
      rule("Передавай в addEventListener саму функцию, без скобок: `addEventListener(\"click\", add)`.")
    ],
    tasks: [task("Счётчик корзины", "По клику на `#add` увеличивай `count` и показывай его в `#count`.", {
      page: '<button id="add">В корзину</button>\n<p>В корзине: <span id="count">0</span></p>',
      start: "let count = 0;\n",
      checks: [run(`(${click("#add")}, ${click("#add")}, document.querySelector("#count").textContent === "2")`, "Два клика — 2"), run("count === 2", "Переменная `count` растёт"), has("addEventListener", "Использован `addEventListener`")],
      solution: 'let count = 0;\nconst add = document.querySelector("#add");\nconst counter = document.querySelector("#count");\nadd.addEventListener("click", () => {\n  count++;\n  counter.textContent = count;\n});'
    })],
    quizzes: [
      single("js-listener-call", "Скобки", "Что не так в `btn.addEventListener(\"click\", add())`?", [["called", "Функция вызывается сразу, а передаётся её результат"], ["nothing", "Всё правильно"], ["name", "Неправильное имя события"], ["quotes", "Лишние кавычки"]], "called", "Нужно передать `add`, а не `add()`."),
      single("js-click-keyboard", "Клавиатура", "Сработает ли `click` у `<button>`, если нажать Enter на клавиатуре?", [["yes", "Да, кнопка сама превращает Enter и Space в click"], ["no", "Нет"], ["mouse", "Только с мышью"], ["touch", "Только на телефоне"]], "yes", "Поэтому для действий используют настоящие кнопки.")
    ]
  });

  L({
    slug: "event-object", title: "Объект события", summary: "event, target и currentTarget, preventDefault, stopPropagation, всплытие.",
    skill: ["js-event-object", "Объект события", "Получать данные о событии и управлять его поведением."],
    now: "Получаем данные о событии и управляем его поведением.",
    body: [
      scene("Перезагрузка",
        ["you", "Нажимаю ссылку «Оформить» — страница прыгает наверх."],
        ["bro", "У ссылки есть действие по умолчанию — перейти. В обработчик приходит объект события, через него можно его отменить."]),
      obj("event", "Объект события", "Первый параметр обработчика: тип события, элемент, координаты, клавиша.", "Узнать подробности о случившемся.", 'document.querySelector("button").addEventListener("click", (event) => {\n  console.log(event.type, event.target.textContent);\n});\ndocument.querySelector("button").click();', { page: "<button>Блокнот</button>" }),
      kw("event.target", "Где случилось", "Элемент, по которому реально кликнули (может быть вложенным).", "Понять, какую кнопку нажали.", undefined),
      kw("event.currentTarget", "Чей обработчик", "Элемент, на котором висит обработчик.", "Отличить контейнер от его детей.", undefined),
      meth("preventDefault()", "Отменить действие браузера", "Ссылка не перейдёт, форма не отправится, чекбокс не переключится.", "Обработать действие своим кодом.", 'const link = document.querySelector("a");\nlink.addEventListener("click", (e) => {\n  e.preventDefault();\n  console.log("Переход отменён");\n});\nlink.click();', { page: '<a href="#order">Оформить</a>' }),
      idea("Всплытие", "Событие идёт вверх", "Клик по кнопке — это ещё и клик по её родителю, и по body. Событие «всплывает» от цели к корню.", "Основа делегирования событий.", 'document.body.addEventListener("click", () => console.log("Дошло до body"));\ndocument.querySelector("button").click();', { page: "<div><button>Клик</button></div>" }),
      meth("stopPropagation()", "Остановить всплытие", "Родители не узнают о событии.", "Редко: клик внутри модалки не должен закрывать её.", undefined),
      rule("Отменяй действие по умолчанию только когда делаешь то же самое своим кодом.")
    ],
    tasks: [task("Ссылка без перехода", "По клику на `#checkout` отмени переход (`preventDefault`) и покажи в `#msg` текст `Оформляем…`.", {
      page: '<a id="checkout" href="#order">Оформить</a>\n<p id="msg"></p>',
      start: "",
      checks: [run('(() => { const e = new MouseEvent("click", { bubbles: true, cancelable: true }); document.querySelector("#checkout").dispatchEvent(e); return e.defaultPrevented; })()', "Переход отменён"), run('document.querySelector("#msg").textContent === "Оформляем…"', "Сообщение показано")],
      solution: 'document.querySelector("#checkout").addEventListener("click", (event) => {\n  event.preventDefault();\n  document.querySelector("#msg").textContent = "Оформляем…";\n});'
    })],
    quizzes: [
      single("js-target", "target", "Кликнули по `<b>` внутри `<button>` с обработчиком. Что будет в `event.target`?", [["b", "Элемент `<b>`"], ["button", "Кнопка"], ["body", "body"], ["null", "null"]], "b", "target — где кликнули, currentTarget — чей обработчик."),
      single("js-prevent", "preventDefault", "Что делает `event.preventDefault()`?", [["default", "Отменяет действие браузера по умолчанию"], ["stop", "Останавливает все обработчики"], ["remove", "Удаляет элемент"], ["bubble", "Запрещает всплытие"]], "default", "Всплытие останавливает stopPropagation.")
    ]
  });

  L({
    slug: "input-events", title: "Ввод: input и change", summary: "События input и change, живой поиск по списку, focus и blur.",
    skill: ["js-input-events", "События ввода", "Реагировать на ввод текста и изменение полей."],
    now: "Реагируем на ввод и изменение полей: живой поиск по списку.",
    body: [
      scene("Живой поиск",
        ["you", "Хочу поиск: пользователь печатает — а список фильтруется сразу."],
        ["nika", "Событие `input` срабатывает на каждую букву. Читаем `value` и прячем лишнее."]),
      ev("input", "Каждое изменение", "Срабатывает при каждом изменении значения поля.", "Живой поиск, счётчик символов.", 'const input = document.querySelector("input");\nconst out = document.querySelector("output");\ninput.addEventListener("input", () => {\n  out.textContent = input.value.length;\n});\ninput.value = "Блокнот";\ninput.dispatchEvent(new Event("input"));', { page: '<input placeholder="Пиши"> символов: <output>0</output>' }),
      ev("change", "Изменение подтверждено", "Для текста — при уходе с поля; для чекбокса и select — сразу при выборе.", "Выбор размера, флажок «с собой».", 'const select = document.querySelector("select");\nselect.addEventListener("change", () => console.log("Размер:", select.value));\nselect.value = "L";\nselect.dispatchEvent(new Event("change"));', { page: "<select><option>S</option><option>M</option><option>L</option></select>" }),
      ev("focus · blur", "Фокус пришёл и ушёл", "`focus` — поле активно, `blur` — ушли с него.", "Показать подсказку, проверить поле после ввода.", undefined),
      rule("Реакция на каждую букву — `input`. На итоговый выбор — `change`.")
    ],
    tasks: [task("Живой поиск", "При вводе в `#search` скрывай (`hidden = true`) пункты `#menu li`, текст которых не содержит введённое (без учёта регистра).", {
      page: '<input id="search" placeholder="Найти товар">\n<ul id="menu">\n  <li>Блокнот</li>\n  <li>Пенал</li>\n  <li>Ластик</li>\n</ul>',
      start: 'const search = document.querySelector("#search");\n',
      checks: [run('(() => { const s = document.querySelector("#search"); s.value = "пен"; s.dispatchEvent(new Event("input")); return [...document.querySelectorAll("#menu li")].filter((li) => !li.hidden).map((li) => li.textContent).join() === "Пенал"; })()', "По «пен» виден только Пенал"), run('(() => { const s = document.querySelector("#search"); s.value = ""; s.dispatchEvent(new Event("input")); return [...document.querySelectorAll("#menu li")].every((li) => !li.hidden); })()', "Пустой поиск показывает всё")],
      solution: 'const search = document.querySelector("#search");\nsearch.addEventListener("input", () => {\n  const query = search.value.toLowerCase();\n  for (const li of document.querySelectorAll("#menu li")) {\n    li.hidden = !li.textContent.toLowerCase().includes(query);\n  }\n});'
    })],
    quizzes: [
      single("js-input-vs-change", "input или change", "Какое событие сработает на каждую введённую букву?", [["input", "`input`"], ["change", "`change`"], ["blur", "`blur`"], ["submit", "`submit`"]], "input", "change у текстовых полей — только при уходе с поля."),
      single("js-blur", "blur", "Когда срабатывает `blur`?", [["leave", "Когда поле теряет фокус"], ["type", "При каждой букве"], ["load", "При загрузке"], ["click", "При клике по полю"]], "leave", "Удобно проверять поле после ввода.")
    ]
  });

  L({
    slug: "keyboard-events", title: "Клавиатура", summary: "keydown и keyup, event.key, сочетания с Ctrl и Shift, закрытие по Escape.",
    skill: ["js-keyboard", "События клавиатуры", "Реагировать на нажатия клавиш."],
    now: "Реагируем на нажатия клавиш: закрываем окно по Escape.",
    body: [
      scene("Escape",
        ["lev", "Я открыл окно корзины, а закрыть не могу: Escape не работает, а крестик — где-то."],
        ["nika", "Слушаем клавиатуру. Нажали Escape — закрываем."]),
      ev("keydown", "Клавиша нажата", "Срабатывает при нажатии (и повторяется при удержании). Есть `keyup` — при отпускании.", "Горячие клавиши, Escape, стрелки.", 'document.addEventListener("keydown", (e) => console.log("Нажата:", e.key));\ndocument.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));'),
      kw("event.key", "Какая клавиша", "Название клавиши: `\"Escape\"`, `\"Enter\"`, `\"a\"`, `\"ArrowUp\"`.", "Понять, что нажали.", undefined),
      kw("ctrlKey · shiftKey · metaKey", "Модификаторы", "`true`, если зажаты Ctrl, Shift или Cmd.", "Сочетания вроде Ctrl+K.", undefined),
      rule("Всё, что можно сделать мышью, должно делаться и с клавиатуры.")
    ],
    tasks: [task("Закрыть по Escape", "При нажатии Escape (`keydown` на `document`) скрывай `#cart` (`hidden = true`).", {
      page: '<div id="cart">Корзина: 2 позиции</div>',
      start: "",
      checks: [run('(document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" })), !document.querySelector("#cart").hidden)', "Другие клавиши окно не закрывают"), run('(document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })), document.querySelector("#cart").hidden)', "Escape закрывает")],
      solution: 'document.addEventListener("keydown", (event) => {\n  if (event.key === "Escape") {\n    document.querySelector("#cart").hidden = true;\n  }\n});'
    })],
    quizzes: [
      single("js-key-name", "key", "Чему равно `event.key` при нажатии Escape?", [["esc", "`\"Escape\"`"], ["27", "`27`"], ["esc2", "`\"Esc\"`"], ["e", "`\"e\"`"]], "esc", "Коды клавиш-числа устарели."),
      single("js-keydown-where", "Где слушать", "Где слушать глобальные горячие клавиши?", [["doc", "На `document`"], ["btn", "На каждой кнопке"], ["input", "Только в полях ввода"], ["head", "На `head`"]], "doc", "События клавиатуры всплывают до document.")
    ]
  });

  L({
    slug: "event-delegation", title: "Делегирование событий", summary: "Один обработчик на контейнер, event.target.closest, data-атрибуты и динамические элементы.",
    skill: ["js-delegation", "Делегирование", "Обрабатывать события многих и динамически добавленных элементов одним обработчиком."],
    now: "Обрабатываем события многих элементов одним обработчиком.",
    body: [
      scene("Тридцать кнопок",
        ["you", "У каждого товара кнопка. И новые товары добавляются потом. На каждую вешать обработчик?"],
        ["bro", "Нет: события всплывают. Повесь один обработчик на список, а в нём смотри, какая кнопка нажата."]),
      idea("Делегирование", "Один обработчик на контейнер", "Обработчик на родителе ловит всплывшие события детей; `event.target.closest(\"button\")` находит нужную кнопку.", "Меньше кода и работает для новых элементов.", 'document.querySelector("ul").addEventListener("click", (e) => {\n  const btn = e.target.closest("button");\n  if (!btn) return;\n  console.log("Добавлен:", btn.dataset.item);\n});\ndocument.querySelectorAll("button")[1].click();', { page: '<ul><li><button data-item="Блокнот">+</button></li><li><button data-item="Пенал">+</button></li></ul>' }),
      rule("Много однотипных кнопок — один обработчик на их общего родителя.")
    ],
    tasks: [task("Одна корзина на весь список", "Повесь один обработчик `click` на `#menu`: при клике по кнопке добавляй её `data-item` в массив `cart`.", {
      page: '<ul id="menu">\n  <li>Блокнот <button data-item="Блокнот">+</button></li>\n  <li>Пенал <button data-item="Пенал">+</button></li>\n</ul>',
      start: "const cart = [];\n",
      checks: [run('(document.querySelectorAll("#menu button")[1].click(), cart.join() === "Пенал")', "Клик по «Пенал» добавляет Пенал"), run('(() => { const li = document.createElement("li"); li.innerHTML = \'<button data-item="Ластик">+</button>\'; document.querySelector("#menu").append(li); li.querySelector("button").click(); return cart.includes("Ластик"); })()', "Работает и для новых позиций"), has("closest", "Кнопка найдена через `closest`")],
      solution: 'const cart = [];\ndocument.querySelector("#menu").addEventListener("click", (event) => {\n  const button = event.target.closest("button");\n  if (!button) return;\n  cart.push(button.dataset.item);\n});'
    })],
    quizzes: [
      single("js-delegation-why", "Зачем", "Главное преимущество делегирования?", [["dynamic", "Один обработчик работает и для элементов, добавленных позже"], ["fast", "События приходят быстрее"], ["style", "Меняет стили"], ["nothing", "Никакого"]], "dynamic", "Плюс меньше обработчиков."),
      single("js-delegation-bubble", "Основа", "На чём основано делегирование?", [["bubble", "На всплытии событий"], ["capture", "На отмене событий"], ["css", "На CSS-селекторах"], ["timer", "На таймерах"]], "bubble", "Событие поднимается от цели к родителям.")
    ]
  });

  L({
    slug: "project-cart", title: "Проект: живая корзина", summary: "Корзина: добавление по кнопкам, счётчик, сумма и очистка.",
    skill: ["js-project-cart", "Корзина", "Собрать интерактивную корзину из массива, DOM и событий."],
    now: "Проект главы: корзина товаров — добавление, счётчик, сумма и очистка.",
    body: [scene("Корзина", ["you", "Хочу корзину, которая работает по-настоящему."], ["nika", "Данные — в массиве, отрисовка — функцией, события — делегированием. Три шага."])],
    tasks: [
      task("Шаг 1. Данные и отрисовка", "Напиши `render()`: показывает в `#count` число позиций `cart`, а в `#sum` — сумму цен. Вызови `render()` один раз.", {
        page: '<p>Позиций: <span id="count">?</span>, сумма: <span id="sum">?</span> ₽</p>',
        start: 'const cart = [{ name: "Блокнот", price: 220 }];\n',
        checks: [run('document.querySelector("#count").textContent === "1"', "Счётчик 1"), run('document.querySelector("#sum").textContent === "220"', "Сумма 220"), run('typeof render === "function"', "Есть `render`")],
        solution: 'const cart = [{ name: "Блокнот", price: 220 }];\nfunction render() {\n  document.querySelector("#count").textContent = cart.length;\n  document.querySelector("#sum").textContent = cart.reduce((s, d) => s + d.price, 0);\n}\nrender();'
      }),
      task("Шаг 2. Кнопки добавления", "Делегированием на `#menu`: клик по кнопке добавляет в `cart` объект `{ name, price }` из `data-name` и `data-price` (число) и вызывает `render()`.", {
        page: '<ul id="menu">\n  <li><button data-name="Блокнот" data-price="220">Блокнот +</button></li>\n  <li><button data-name="Пенал" data-price="290">Пенал +</button></li>\n</ul>\n<p>Позиций: <span id="count">0</span>, сумма: <span id="sum">0</span> ₽</p>',
        start: 'const cart = [];\nfunction render() {\n  document.querySelector("#count").textContent = cart.length;\n  document.querySelector("#sum").textContent = cart.reduce((s, d) => s + d.price, 0);\n}\n',
        checks: [run('(document.querySelectorAll("#menu button").forEach((b) => b.click()), document.querySelector("#sum").textContent === "510")', "Блокнот + Пенал = 510"), run('cart.every((d) => typeof d.price === "number")', "Цены — числа")],
        solution: 'const cart = [];\nfunction render() {\n  document.querySelector("#count").textContent = cart.length;\n  document.querySelector("#sum").textContent = cart.reduce((s, d) => s + d.price, 0);\n}\ndocument.querySelector("#menu").addEventListener("click", (event) => {\n  const button = event.target.closest("button");\n  if (!button) return;\n  cart.push({ name: button.dataset.name, price: Number(button.dataset.price) });\n  render();\n});'
      }),
      task("Шаг 3. Очистка", "По клику на `#clear` очисти корзину (`cart.length = 0`) и перерисуй.", {
        page: '<button id="clear">Очистить</button>\n<p>Позиций: <span id="count">2</span>, сумма: <span id="sum">510</span> ₽</p>',
        start: 'const cart = [{ name: "Блокнот", price: 220 }, { name: "Пенал", price: 290 }];\nfunction render() {\n  document.querySelector("#count").textContent = cart.length;\n  document.querySelector("#sum").textContent = cart.reduce((s, d) => s + d.price, 0);\n}\n',
        checks: [run('(document.querySelector("#clear").click(), cart.length === 0)', "Корзина пуста"), run('(() => { const t = document.querySelector("#sum").textContent; return t !== "510" && Number(t) === 0; })()', "Сумма 0 на странице")],
        solution: 'const cart = [{ name: "Блокнот", price: 220 }, { name: "Пенал", price: 290 }];\nfunction render() {\n  document.querySelector("#count").textContent = cart.length;\n  document.querySelector("#sum").textContent = cart.reduce((s, d) => s + d.price, 0);\n}\ndocument.querySelector("#clear").addEventListener("click", () => {\n  cart.length = 0;\n  render();\n});'
      })
    ],
    quizzes: [single("js-proj-cart-render", "Отрисовка", "Почему удобно перерисовывать корзину одной функцией `render()` после каждого изменения?", [["truth", "Страница всегда соответствует данным, логика в одном месте"], ["fast", "Это быстрее всего"], ["required", "Так требует браузер"], ["css", "Чтобы работал CSS"]], "truth", "Данные → render → страница.")]
  });
}
