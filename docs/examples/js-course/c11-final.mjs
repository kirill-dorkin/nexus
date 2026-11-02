// Chapter 11: Storage, dates, numbers, modules and the final project.
import { scene, rule, kw, meth, obj, fnc, idea, run, has, task, makeLesson } from "./kit.mjs";

export default function final(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "local-storage", title: "localStorage: запомнить гостя", summary: "localStorage setItem, getItem, removeItem, хранение объектов через JSON и sessionStorage.",
    skill: ["js-storage", "Хранение в браузере", "Сохранять данные между посещениями страницы."],
    now: "Гость собрал корзину, закрыл вкладку — и всё пропало. Запоминаем корзину в браузере.",
    body: [
      scene("Пропавшая корзина",
        ["marta", "Гость собрал корзину, случайно закрыл вкладку — и всё заново!"],
        ["bro", "У меня есть маленькое хранилище для каждого сайта — `localStorage`. Положи туда корзину, и после перезагрузки она вернётся."]),
      obj("localStorage", "Хранилище браузера", "Пары «ключ — строка», которые живут между перезагрузками, на этом сайте и в этом браузере. В песочнице курса хранилище живёт до перезапуска примера.", "Корзина, тема, черновик формы.", 'localStorage.setItem("theme", "dark");\nconsole.log(localStorage.getItem("theme"));'),
      meth("setItem() · getItem()", "Положить и взять", "`setItem(key, value)` сохраняет строку; `getItem(key)` возвращает её или `null`.", "Основные операции.", 'localStorage.setItem("visits", "3");\nconsole.log(Number(localStorage.getItem("visits")) + 1);'),
      meth("removeItem() · clear()", "Удалить", "`removeItem(key)` — одну запись, `clear()` — все записи сайта.", "Очистить корзину после заказа.", 'localStorage.setItem("cart", "[]");\nlocalStorage.removeItem("cart");\nconsole.log(localStorage.getItem("cart"));'),
      idea("Объекты в хранилище", "Через JSON", "Хранилище держит только строки: `setItem(\"cart\", JSON.stringify(cart))`, а при чтении — `JSON.parse`.", "Сохранить массив или объект.", 'const cart = ["Латте", "Раф"];\nlocalStorage.setItem("cart", JSON.stringify(cart));\nconsole.log(JSON.parse(localStorage.getItem("cart")).length);'),
      obj("sessionStorage", "Хранилище вкладки", "Как localStorage, но очищается при закрытии вкладки.", "Временные данные одного визита.", undefined),
      rule("Никогда не храни в localStorage пароли и токены: его читает любой скрипт на странице.")
    ],
    tasks: [task("Корзина переживёт перезагрузку", "Напиши `save(cart)` — кладёт корзину в `localStorage` под ключом `cart` (как JSON), и `restore()` — возвращает массив из хранилища или `[]`, если там пусто.", {
      start: "function save(cart) {}\nfunction restore() {\n  return [];\n}\n",
      checks: [run('(localStorage.clear(), Array.isArray(restore()) && restore().length === 0)', "Пустое хранилище — пустая корзина"), run('(save(["Латте", "Раф"]), JSON.parse(localStorage.getItem("cart")).length === 2)', "Корзина сохранена как JSON"), run('restore().join() === "Латте,Раф"', "Корзина восстановлена")],
      solution: 'function save(cart) {\n  localStorage.setItem("cart", JSON.stringify(cart));\n}\nfunction restore() {\n  return JSON.parse(localStorage.getItem("cart") ?? "[]");\n}'
    })],
    quizzes: [
      single("js-storage-type", "Строки", "Что вернёт `localStorage.getItem(\"n\")` после `setItem(\"n\", 5)`?", [["str", "Строку \"5\""], ["num", "Число 5"], ["null", "null"], ["obj", "Объект"]], "str", "Хранилище держит только строки."),
      single("js-storage-secret", "Безопасность", "Что нельзя хранить в localStorage?", [["secret", "Пароли и токены доступа"], ["theme", "Выбранную тему"], ["cart", "Корзину"], ["lang", "Язык сайта"]], "secret", "Его может прочитать любой скрипт страницы.")
    ]
  });

  L({
    slug: "dates-formatting", title: "Даты, время и форматирование", summary: "Date, getHours и getDay, Intl.DateTimeFormat, toLocaleString и Intl.NumberFormat для цен.",
    skill: ["js-dates", "Даты и форматирование", "Работать с датой и временем и красиво выводить числа и цены."],
    now: "Сайт должен сам понимать, открыта ли кофейня сейчас, и писать цены как «1 250 ₽».",
    body: [
      scene("Который час",
        ["marta", "Мы открыты с 8 до 22, в воскресенье — до 20. Пусть сайт сам знает."],
        ["nika", "Объект `Date` знает текущее время. А `Intl` красиво выводит даты и деньги на любом языке."]),
      obj("Date", "Дата и время", "`new Date()` — сейчас; `new Date(2026, 10, 2, 9, 30)` — конкретный момент (месяцы с нуля!).", "Часы работы, сроки акций.", "const d = new Date(2026, 10, 2, 9, 30);\nconsole.log(d.getFullYear(), d.getMonth() + 1, d.getDate());"),
      meth("getHours() · getDay()", "Час и день недели", "`getHours()` — 0…23; `getDay()` — 0 (воскресенье) … 6 (суббота).", "Открыто ли сейчас.", "const d = new Date(2026, 10, 1, 21, 0);\nconsole.log(d.getHours(), d.getDay());"),
      obj("Intl.NumberFormat", "Числа и деньги", "`new Intl.NumberFormat(\"ru-RU\", { style: \"currency\", currency: \"RUB\" }).format(1250)` → `1 250,00 ₽`.", "Цены как принято в стране гостя.", 'const rub = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });\nconsole.log(rub.format(1250));'),
      obj("Intl.DateTimeFormat", "Даты на языке гостя", "Форматирует дату: `{ weekday: \"long\", hour: \"2-digit\", minute: \"2-digit\" }`.", "«понедельник, 09:30» без ручной склейки.", 'const d = new Date(2026, 10, 2, 9, 30);\nconsole.log(new Intl.DateTimeFormat("ru-RU", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(d));'),
      rule("Месяцы в `Date` считаются с нуля: январь — 0, декабрь — 11. Классическая ловушка.")
    ],
    tasks: [task("Открыто ли сейчас", "Напиши `isOpen(date)`: в воскресенье (`getDay() === 0`) открыто с 8 до 20, в остальные дни — с 8 до 22 (час закрытия не входит).", {
      start: "function isOpen(date) {\n  return true;\n}\n",
      checks: [run("isOpen(new Date(2026, 10, 2, 9, 0)) === true", "Понедельник 9:00 — открыто"), run("isOpen(new Date(2026, 10, 2, 22, 0)) === false", "Понедельник 22:00 — закрыто"), run("isOpen(new Date(2026, 10, 1, 21, 0)) === false", "Воскресенье 21:00 — закрыто"), run("isOpen(new Date(2026, 10, 2, 7, 59)) === false", "До 8 — закрыто")],
      solution: "function isOpen(date) {\n  const hour = date.getHours();\n  const closes = date.getDay() === 0 ? 20 : 22;\n  return hour >= 8 && hour < closes;\n}"
    })],
    quizzes: [
      single("js-date-month", "Месяц", "Какой месяц у `new Date(2026, 0, 15)`?", [["jan", "Январь"], ["dec", "Декабрь"], ["feb", "Февраль"], ["none", "Ошибка"]], "jan", "Месяцы с нуля."),
      single("js-getday", "День недели", "Что вернёт `getDay()` в воскресенье?", [["0", "0"], ["7", "7"], ["1", "1"], ["sun", "\"Sunday\""]], "0", "Неделя в Date начинается с воскресенья.")
    ]
  });

  L({
    slug: "math-random", title: "Math и случайность", summary: "Math.random, Math.floor, случайный элемент массива, Math.min, Math.max и Math.abs.",
    skill: ["js-math", "Math", "Генерировать случайные значения и пользоваться математическими функциями."],
    now: "Хотим кнопку «Удиви меня» — случайный напиток дня.",
    body: [
      scene("Удиви меня",
        ["marta", "Гости не могут выбрать. Сделаем кнопку «Удиви меня» — случайный напиток!"],
        ["bro", "`Math.random()` даёт случайное число от 0 до 1. Остальное — арифметика."]),
      fnc("Math.random()", "Случайное число", "Число от 0 (включительно) до 1 (не включая).", "Случайный выбор, перемешивание.", "console.log(Math.random());"),
      idea("Случайный элемент", "Math.floor(Math.random() * n)", "Целое от 0 до n−1 — готовый случайный индекс массива.", "Напиток дня, случайная подсказка.", 'const menu = ["Латте", "Раф", "Какао"];\nconsole.log(menu[Math.floor(Math.random() * menu.length)]);'),
      fnc("Math.min() · Math.max()", "Меньшее и большее", "`Math.max(...prices)` — максимум массива через spread.", "Самая дорогая позиция, ограничение значения.", "const prices = [150, 290, 220];\nconsole.log(Math.min(...prices), Math.max(...prices));"),
      fnc("Math.abs()", "Модуль", "Число без знака: `Math.abs(-5)` → 5.", "Разница сумм без учёта знака.", "console.log(Math.abs(220 - 290));"),
      rule("`Math.random` не годится для паролей и промокодов — для них есть `crypto.getRandomValues`.")
    ],
    tasks: [task("Удиви меня", "Напиши `pick(list)`, которая возвращает случайный элемент массива, и `maxPrice(prices)` — наибольшую цену.", {
      start: "function pick(list) {\n  return list[0];\n}\nfunction maxPrice(prices) {\n  return 0;\n}\n",
      checks: [run('(() => { const seen = new Set(); for (let i = 0; i < 200; i++) seen.add(pick(["a", "b", "c"])); return seen.size === 3; })()', "Выпадают все варианты"), run('(() => { for (let i = 0; i < 200; i++) { if (!["a", "b"].includes(pick(["a", "b"]))) return false; } return true; })()', "Только из списка"), run("maxPrice([150, 290, 220]) === 290", "Максимальная цена")],
      solution: "function pick(list) {\n  return list[Math.floor(Math.random() * list.length)];\n}\nfunction maxPrice(prices) {\n  return Math.max(...prices);\n}"
    })],
    quizzes: [
      single("js-random-range", "Диапазон", "Какие числа даёт `Math.floor(Math.random() * 3)`?", [["012", "0, 1 или 2"], ["123", "1, 2 или 3"], ["0123", "От 0 до 3 включительно"], ["any", "Любые дробные"]], "012", "Готовый индекс массива из трёх элементов."),
      single("js-max-spread", "Максимум", "Как найти максимум массива `prices`?", [["spread", "`Math.max(...prices)`"], ["arr", "`Math.max(prices)`"], ["sort", "`prices.max()`"], ["top", "`prices[0]`"]], "spread", "Math.max принимает числа, а не массив.")
    ]
  });

  L({
    slug: "modules-quality", title: "Модули и чистый код", summary: "import и export, script type=module, defer, отладка через debugger и точки остановки.",
    skill: ["js-modules", "Модули и отладка", "Делить код на модули и находить ошибки отладчиком."],
    now: "Код сайта вырос до тысячи строк в одном файле. Делим его на модули и учимся отлаживать.",
    body: [
      scene("Тысяча строк",
        ["marta", "Файл app.js такой длинный, что я в нём теряюсь."],
        ["lev", "Раньше всё писали в один файл. Сейчас код делят на модули: корзина отдельно, меню отдельно."],
        ["nika", "А когда что-то сломалось, вместо десятка console.log ставим точку остановки."]),
      kw("export", "Отдать наружу", "`export function total() {}` — функцию можно импортировать в другом файле.", "Каждый модуль показывает только нужное.", undefined),
      kw("import", "Взять из модуля", "`import { total } from \"./cart.js\";` — подключить экспорт другого файла.", "Собирать программу из частей.", undefined),
      idea("type=\"module\"", "Скрипт-модуль", "`<script type=\"module\" src=\"app.js\">` — в модулях работают import/export, свои переменные не попадают в глобальную область, и скрипт ждёт загрузки страницы.", "Подключение модульного кода.", undefined),
      idea("defer", "Выполнить после разбора", "`<script src=\"app.js\" defer>` — скрипт загружается параллельно и выполняется, когда HTML разобран.", "Скрипт в `<head>` без торможения страницы.", undefined),
      kw("debugger", "Точка остановки", "Строка `debugger;` останавливает код при открытых DevTools: можно посмотреть все переменные и идти по шагам.", "Найти ошибку быстрее, чем через console.log.", undefined),
      rule("Один модуль — одна тема. Если файл не помещается на экран, подумай, что вынести.")
    ],
    tasks: [task("Чистые функции", "Перед тем как вынести в модуль, сделай функции чистыми: `addItem(cart, item)` возвращает НОВЫЙ массив, не меняя `cart`, а `cartTotal(cart)` считает сумму `price`.", {
      start: "function addItem(cart, item) {\n  cart.push(item);\n  return cart;\n}\nfunction cartTotal(cart) {\n  return 0;\n}\n",
      checks: [run('(() => { const a = []; const b = addItem(a, { price: 220 }); return a.length === 0 && b.length === 1; })()', "Исходная корзина не меняется"), run("cartTotal([{ price: 220 }, { price: 150 }]) === 370", "Сумма считается")],
      solution: "function addItem(cart, item) {\n  return [...cart, item];\n}\nfunction cartTotal(cart) {\n  return cart.reduce((sum, d) => sum + d.price, 0);\n}"
    })],
    quizzes: [
      single("js-module-scope", "Модули", "Попадают ли переменные модуля в глобальную область?", [["no", "Нет, у модуля своя область"], ["yes", "Да, как в обычном скрипте"], ["const", "Только const"], ["var", "Только var"]], "no", "Наружу — только через export."),
      single("js-debugger", "Отладка", "Что делает строка `debugger;` при открытых DevTools?", [["pause", "Останавливает выполнение в этом месте"], ["log", "Пишет в консоль"], ["fix", "Исправляет ошибки"], ["nothing", "Ничего"]], "pause", "Дальше можно идти по шагам.")
    ]
  });

  L({
    slug: "project-final-js", title: "Финальный проект: живое «Зерно»", summary: "Собираем всё: статус «открыто», меню с сервера, корзина с сохранением и отправка заказа.",
    skill: ["js-project-final", "Живой сайт", "Собрать интерактивный сайт из всего изученного."],
    now: "Финал. Сайт «Зерна» оживает целиком — и Вредный Скрипт проигрывает.",
    minutes: 15,
    body: [
      scene("Финал",
        ["bug", "Последний шанс! Я сломаю корзину, меню и форму сразу!"],
        ["marta", "А у нас всё работает: меню с сервера, корзина помнит гостя, заказы уходят на кухню."],
        ["nika", "Ты знаешь всё, что нужно. Четыре шага — и Вредный Скрипт без работы навсегда."])
    ],
    tasks: [
      task("Шаг 1. Табличка «Открыто»", "Покажи в `#open` текст `Открыто` или `Закрыто` для текущего времени через `isOpen(new Date())`.", {
        page: '<p id="open"></p>',
        start: "function isOpen(date) {\n  const hour = date.getHours();\n  const closes = date.getDay() === 0 ? 20 : 22;\n  return hour >= 8 && hour < closes;\n}\n",
        checks: [run('document.querySelector("#open").textContent === (isOpen(new Date()) ? "Открыто" : "Закрыто")', "Статус соответствует времени")],
        solution: 'function isOpen(date) {\n  const hour = date.getHours();\n  const closes = date.getDay() === 0 ? 20 : 22;\n  return hour >= 8 && hour < closes;\n}\ndocument.querySelector("#open").textContent = isOpen(new Date()) ? "Открыто" : "Закрыто";'
      }),
      task("Шаг 2. Меню с кнопками", "Загрузи `/api/menu` и для каждой позиции создай в `#menu` кнопку с текстом `Латте — 220 ₽` и `data-id` позиции.", {
        page: '<div id="menu"></div>',
        start: "let menu = [];\n",
        checks: [run('await wait(300) || document.querySelectorAll("#menu button").length === 6', "Шесть кнопок"), run('document.querySelector("#menu button").textContent === "Эспрессо — 150 ₽" && document.querySelector("#menu button").dataset.id === "1"', "Текст и data-id")],
        solution: 'let menu = [];\nasync function load() {\n  const res = await fetch("/api/menu");\n  menu = await res.json();\n  const box = document.querySelector("#menu");\n  for (const d of menu) {\n    const b = document.createElement("button");\n    b.textContent = `${d.name} — ${d.price} ₽`;\n    b.dataset.id = d.id;\n    box.append(b);\n  }\n}\nload();'
      }),
      task("Шаг 3. Корзина с памятью", "Делегированием на `#menu`: клик по кнопке добавляет `Number(data-id)` в `cart`, сохраняет корзину в `localStorage` (`cart`, JSON) и пишет число позиций в `#count`.", {
        page: '<div id="menu"><button data-id="2">Капучино</button><button data-id="3">Латте</button></div>\n<p>В корзине: <span id="count">0</span></p>',
        start: 'const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");\n',
        checks: [run('(localStorage.clear(), cart.length = 0, document.querySelectorAll("#menu button").forEach((b) => b.click()), cart.join() === "2,3")', "Позиции добавлены"), run('localStorage.getItem("cart") === "[2,3]"', "Корзина сохранена"), run('document.querySelector("#count").textContent === "2"', "Счётчик на странице")],
        solution: 'const cart = JSON.parse(localStorage.getItem("cart") ?? "[]");\ndocument.querySelector("#menu").addEventListener("click", (event) => {\n  const button = event.target.closest("button");\n  if (!button) return;\n  cart.push(Number(button.dataset.id));\n  localStorage.setItem("cart", JSON.stringify(cart));\n  document.querySelector("#count").textContent = String(cart.length);\n});'
      }),
      task("Шаг 4. Заказ на кухню", "По `submit` формы отмени перезагрузку, отправь POST `/api/orders` с `{ items: cart, guest }` и покажи `` `Спасибо, ${guest}! Заказ №${id}` ``.", {
        page: '<form><input name="guest" value="Аня"><button>Заказать</button></form>\n<p id="msg"></p>',
        start: "const cart = [2, 3];\n",
        checks: [run('(document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })), await wait(300), document.querySelector("#msg").textContent === "Спасибо, Аня! Заказ №1042")', "Заказ принят"), has("preventDefault", "Без перезагрузки"), has("POST", "Отправлен POST")],
        solution: 'const cart = [2, 3];\nconst form = document.querySelector("form");\nform.addEventListener("submit", async (event) => {\n  event.preventDefault();\n  const guest = form.elements.guest.value;\n  const res = await fetch("/api/orders", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ items: cart, guest })\n  });\n  const order = await res.json();\n  document.querySelector("#msg").textContent = `Спасибо, ${guest}! Заказ №${order.id}`;\n});'
      })
    ],
    quizzes: [
      multi("js-final-parts", "Из чего сайт", "Что ты использовал в финальном проекте?", [["fetch", "fetch и async/await"], ["events", "События и делегирование"], ["storage", "localStorage"], ["jquery", "jQuery"]], ["fetch", "events", "storage"], "Всё на чистом JavaScript."),
      single("js-final-truth", "Правда", "Где «живёт правда» о корзине в хорошо устроенном коде?", [["data", "В данных (массиве), а страница строится из них"], ["html", "В HTML-разметке"], ["css", "В CSS"], ["console", "В консоли"]], "data", "Данные → отрисовка.")
    ]
  });
}
