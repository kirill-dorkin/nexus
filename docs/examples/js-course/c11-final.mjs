// Chapter 11: Storage, dates, numbers, modules and the final project (a todo app).
import { scene, rule, kw, meth, obj, fnc, idea, run, has, task, makeLesson } from "./kit.mjs";

const RENDER = 'function render(list) {\n  document.querySelector("#list").replaceChildren(...list.map((t) => {\n    const li = document.createElement("li");\n    li.textContent = t.title;\n    li.dataset.id = t.id;\n    li.classList.toggle("done", t.done);\n    return li;\n  }));\n}\n';
const TODOS = 'let todos = [\n  { id: 1, title: "Повторить массивы", done: true },\n  { id: 2, title: "Сделать викторину", done: false },\n  { id: 3, title: "Прочитать про fetch", done: false }\n];\n';
const PAGE = '<style>.done { text-decoration: line-through; opacity: .6; }</style>\n';

export default function final(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi } = c;

  L({
    slug: "local-storage", title: "localStorage: память браузера", summary: "localStorage setItem, getItem, removeItem, хранение объектов через JSON и sessionStorage.",
    skill: ["js-storage", "Хранение в браузере", "Сохранять данные между посещениями страницы."],
    now: "Сохраняем данные в браузере между посещениями: localStorage.",
    body: [
      scene("Всё пропало",
        ["you", "Пользователь заполнил список задач, случайно закрыл вкладку — и всё заново!"],
        ["bro", "У меня есть маленькое хранилище для каждого сайта — `localStorage`. Положи туда данные, и после перезагрузки они вернутся."]),
      obj("localStorage", "Хранилище браузера", "Пары «ключ — строка», которые живут между перезагрузками, на этом сайте и в этом браузере. В песочнице курса хранилище живёт до перезапуска примера.", "Корзина, тема, черновик формы.", 'localStorage.setItem("theme", "dark");\nconsole.log(localStorage.getItem("theme"));'),
      meth("setItem() · getItem()", "Положить и взять", "`setItem(key, value)` сохраняет строку; `getItem(key)` возвращает её или `null`.", "Основные операции.", 'localStorage.setItem("visits", "3");\nconsole.log(Number(localStorage.getItem("visits")) + 1);'),
      meth("removeItem() · clear()", "Удалить", "`removeItem(key)` — одну запись, `clear()` — все записи сайта.", "Очистить данные после выхода.", 'localStorage.setItem("draft", "текст");\nlocalStorage.removeItem("draft");\nconsole.log(localStorage.getItem("draft"));'),
      idea("Объекты в хранилище", "Через JSON", "Хранилище держит только строки: `setItem(\"todos\", JSON.stringify(todos))`, а при чтении — `JSON.parse`.", "Сохранить массив или объект.", 'const todos = ["Позвонить", "Купить хлеб"];\nlocalStorage.setItem("todos", JSON.stringify(todos));\nconsole.log(JSON.parse(localStorage.getItem("todos")).length);'),
      obj("sessionStorage", "Хранилище вкладки", "Как localStorage, но очищается при закрытии вкладки.", "Временные данные одного визита.", undefined),
      rule("Никогда не храни в localStorage пароли и токены: его читает любой скрипт на странице.")
    ],
    tasks: [task("Список переживёт перезагрузку", "Напиши `save(list)` — кладёт массив в `localStorage` под ключом `todos` (как JSON), и `restore()` — возвращает массив из хранилища или `[]`, если там пусто.", {
      start: "function save(list) {}\nfunction restore() {\n  return [];\n}\n",
      checks: [run('(localStorage.clear(), Array.isArray(restore()) && restore().length === 0)', "Пустое хранилище — пустой список"), run('(save(["Позвонить", "Купить хлеб"]), JSON.parse(localStorage.getItem("todos")).length === 2)', "Список сохранён как JSON"), run('restore().join() === "Позвонить,Купить хлеб"', "Список восстановлен")],
      solution: 'function save(list) {\n  localStorage.setItem("todos", JSON.stringify(list));\n}\nfunction restore() {\n  return JSON.parse(localStorage.getItem("todos") ?? "[]");\n}'
    })],
    quizzes: [
      single("js-storage-type", "Строки", "Что вернёт `localStorage.getItem(\"n\")` после `setItem(\"n\", 5)`?", [["str", "Строку \"5\""], ["num", "Число 5"], ["null", "null"], ["obj", "Объект"]], "str", "Хранилище держит только строки."),
      single("js-storage-secret", "Безопасность", "Что нельзя хранить в localStorage?", [["secret", "Пароли и токены доступа"], ["theme", "Выбранную тему"], ["cart", "Корзину"], ["lang", "Язык сайта"]], "secret", "Его может прочитать любой скрипт страницы.")
    ]
  });

  L({
    slug: "dates-formatting", title: "Даты, время и форматирование", summary: "Date, getHours и getDay, Intl.DateTimeFormat, toLocaleString и Intl.NumberFormat для цен.",
    skill: ["js-dates", "Даты и форматирование", "Работать с датой и временем и красиво выводить числа и цены."],
    now: "Работаем с датой и временем и красиво выводим числа и цены.",
    body: [
      scene("Который час",
        ["you", "Поддержка работает с 8 до 22, в воскресенье — до 20. Хочу, чтобы страница сама это знала."],
        ["nika", "Объект `Date` знает текущее время. А `Intl` красиво выводит даты и деньги на любом языке."]),
      obj("Date", "Дата и время", "`new Date()` — сейчас; `new Date(2026, 10, 2, 9, 30)` — конкретный момент (месяцы с нуля!).", "Сроки, расписания, отметки времени.", "const d = new Date(2026, 10, 2, 9, 30);\nconsole.log(d.getFullYear(), d.getMonth() + 1, d.getDate());"),
      meth("getHours() · getDay()", "Час и день недели", "`getHours()` — 0…23; `getDay()` — 0 (воскресенье) … 6 (суббота).", "Работает ли сервис сейчас.", "const d = new Date(2026, 10, 1, 21, 0);\nconsole.log(d.getHours(), d.getDay());"),
      obj("Intl.NumberFormat", "Числа и деньги", "`new Intl.NumberFormat(\"ru-RU\", { style: \"currency\", currency: \"RUB\" }).format(1250)` → `1 250,00 ₽`.", "Цены так, как принято в стране пользователя.", 'const rub = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });\nconsole.log(rub.format(1250));'),
      obj("Intl.DateTimeFormat", "Даты на языке пользователя", "Форматирует дату: `{ weekday: \"long\", hour: \"2-digit\", minute: \"2-digit\" }`.", "«понедельник, 09:30» без ручной склейки.", 'const d = new Date(2026, 10, 2, 9, 30);\nconsole.log(new Intl.DateTimeFormat("ru-RU", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(d));'),
      rule("Месяцы в `Date` считаются с нуля: январь — 0, декабрь — 11. Классическая ловушка.")
    ],
    tasks: [task("Работает ли поддержка", "Напиши `isOnline(date)`: в воскресенье (`getDay() === 0`) с 8 до 20, в остальные дни — с 8 до 22 (час окончания не входит).", {
      start: "function isOnline(date) {\n  return true;\n}\n",
      checks: [run("isOnline(new Date(2026, 10, 2, 9, 0)) === true", "Понедельник 9:00 — онлайн"), run("isOnline(new Date(2026, 10, 2, 22, 0)) === false", "Понедельник 22:00 — офлайн"), run("isOnline(new Date(2026, 10, 1, 21, 0)) === false", "Воскресенье 21:00 — офлайн"), run("isOnline(new Date(2026, 10, 2, 7, 59)) === false", "До 8 — офлайн")],
      solution: "function isOnline(date) {\n  const hour = date.getHours();\n  const until = date.getDay() === 0 ? 20 : 22;\n  return hour >= 8 && hour < until;\n}"
    })],
    quizzes: [
      single("js-date-month", "Месяц", "Какой месяц у `new Date(2026, 0, 15)`?", [["jan", "Январь"], ["dec", "Декабрь"], ["feb", "Февраль"], ["none", "Ошибка"]], "jan", "Месяцы с нуля."),
      single("js-getday", "День недели", "Что вернёт `getDay()` в воскресенье?", [["0", "0"], ["7", "7"], ["1", "1"], ["sun", "\"Sunday\""]], "0", "Неделя в Date начинается с воскресенья.")
    ]
  });

  L({
    slug: "math-random", title: "Math и случайность", summary: "Math.random, Math.floor, случайный элемент массива, Math.min, Math.max и Math.abs.",
    skill: ["js-math", "Math", "Генерировать случайные значения и пользоваться математическими функциями."],
    now: "Генерируем случайные значения и пользуемся функциями Math.",
    body: [
      scene("Случайный вопрос",
        ["you", "В викторине вопросы всегда идут одинаково. Хочу случайный порядок."],
        ["bro", "`Math.random()` даёт случайное число от 0 до 1. Остальное — арифметика."]),
      fnc("Math.random()", "Случайное число", "Число от 0 (включительно) до 1 (не включая).", "Случайный выбор, перемешивание.", "console.log(Math.random());"),
      idea("Случайный элемент", "Math.floor(Math.random() * n)", "Целое от 0 до n−1 — готовый случайный индекс массива.", "Случайный вопрос, совет дня.", 'const tips = ["Пей воду", "Делай перерывы", "Повторяй пройденное"];\nconsole.log(tips[Math.floor(Math.random() * tips.length)]);'),
      fnc("Math.min() · Math.max()", "Меньшее и большее", "`Math.max(...scores)` — максимум массива через spread.", "Рекорд, ограничение значения.", "const scores = [150, 290, 220];\nconsole.log(Math.min(...scores), Math.max(...scores));"),
      fnc("Math.abs()", "Модуль", "Число без знака: `Math.abs(-5)` → 5.", "Разница без учёта знака.", "console.log(Math.abs(220 - 290));"),
      rule("`Math.random` не годится для паролей и промокодов — для них есть `crypto.getRandomValues`.")
    ],
    tasks: [task("Случайный вопрос", "Напиши `pick(list)`, которая возвращает случайный элемент массива, и `best(scores)` — наибольший результат.", {
      start: "function pick(list) {\n  return list[0];\n}\nfunction best(scores) {\n  return 0;\n}\n",
      checks: [run('(() => { const seen = new Set(); for (let i = 0; i < 200; i++) seen.add(pick(["a", "b", "c"])); return seen.size === 3; })()', "Выпадают все варианты"), run('(() => { for (let i = 0; i < 200; i++) { if (!["a", "b"].includes(pick(["a", "b"]))) return false; } return true; })()', "Только из списка"), run("best([150, 290, 220]) === 290", "Лучший результат")],
      solution: "function pick(list) {\n  return list[Math.floor(Math.random() * list.length)];\n}\nfunction best(scores) {\n  return Math.max(...scores);\n}"
    })],
    quizzes: [
      single("js-random-range", "Диапазон", "Какие числа даёт `Math.floor(Math.random() * 3)`?", [["012", "0, 1 или 2"], ["123", "1, 2 или 3"], ["0123", "От 0 до 3 включительно"], ["any", "Любые дробные"]], "012", "Готовый индекс массива из трёх элементов."),
      single("js-max-spread", "Максимум", "Как найти максимум массива `scores`?", [["spread", "`Math.max(...scores)`"], ["arr", "`Math.max(scores)`"], ["sort", "`scores.max()`"], ["top", "`scores[0]`"]], "spread", "Math.max принимает числа, а не массив.")
    ]
  });

  L({
    slug: "modules-quality", title: "Модули и чистый код", summary: "import и export, script type=module, defer, отладка через debugger и точки остановки.",
    skill: ["js-modules", "Модули и отладка", "Делить код на модули и находить ошибки отладчиком."],
    now: "Делим код на модули и находим ошибки отладчиком.",
    body: [
      scene("Тысяча строк",
        ["you", "Файл app.js такой длинный, что я в нём теряюсь."],
        ["nika", "Код делят на модули: данные отдельно, отрисовка отдельно. А когда что-то сломалось, вместо десятка console.log ставят точку остановки."]),
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
    slug: "project-final-js", title: "Финальный проект: список задач", summary: "Собираем всё: задачи с сервера, отметка «выполнено» с сохранением, добавление новой задачи и живой поиск.",
    skill: ["js-project-final", "Приложение целиком", "Собрать интерактивное приложение из всего изученного."],
    now: "Финальный проект первой части: список задач с сервером, памятью и поиском.",
    minutes: 15,
    body: [
      scene("Финал",
        ["bug", "Последний шанс! Я сломаю загрузку, клики и форму сразу!"],
        ["nika", "Ты знаешь всё, что нужно: fetch, события, формы и хранилище. Четыре шага — и у тебя полноценное приложение."])
    ],
    tasks: [
      task("Шаг 1. Загрузить задачи", "Напиши `async function load()`: загружает `/api/todos` в `todos` и вызывает готовую `render(todos)`. Вызови `load()`.", {
        page: PAGE + '<ul id="list"></ul>',
        start: "let todos = [];\n" + RENDER,
        checks: [run('await wait(300) || todos.length === 3', "Задачи загружены"), run('document.querySelectorAll("#list li").length === 3 && document.querySelector("#list li").classList.contains("done")', "Отрисованы, выполненная зачёркнута")],
        solution: "let todos = [];\n" + RENDER + 'async function load() {\n  const res = await fetch("/api/todos");\n  todos = await res.json();\n  render(todos);\n}\nload();'
      }),
      task("Шаг 2. Отметить выполненной", "Делегированием на `#list`: клик по задаче переключает её `done`, перерисовывает список и сохраняет `todos` в `localStorage` (ключ `todos`, JSON).", {
        page: PAGE + '<ul id="list"></ul>',
        start: TODOS + RENDER + "render(todos);\n",
        checks: [run('(localStorage.clear(), document.querySelector(\'#list li[data-id="2"]\').click(), todos.find((t) => t.id === 2).done === true)', "Задача 2 выполнена"), run('document.querySelector(\'#list li[data-id="2"]\').classList.contains("done")', "Отрисовано"), run('JSON.parse(localStorage.getItem("todos") ?? "[]").filter((t) => t.done).length === 2', "Сохранено в localStorage")],
        solution: TODOS + RENDER + 'render(todos);\ndocument.querySelector("#list").addEventListener("click", (event) => {\n  const li = event.target.closest("li");\n  if (!li) return;\n  const todo = todos.find((t) => t.id === Number(li.dataset.id));\n  todo.done = !todo.done;\n  render(todos);\n  localStorage.setItem("todos", JSON.stringify(todos));\n});'
      }),
      task("Шаг 3. Добавить задачу", "По `submit` формы отмени перезагрузку, отправь POST `/api/todos` с `{ title }` из поля `title`, добавь ответ в `todos`, перерисуй и покажи `` `Задача №${id} добавлена` `` в `#msg`.", {
        page: PAGE + '<form><input name="title" value="Выучить промисы"><button>Добавить</button></form>\n<p id="msg"></p>\n<ul id="list"></ul>',
        start: TODOS + RENDER + "render(todos);\n",
        checks: [run('(document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })), await wait(300), document.querySelector("#msg").textContent === "Задача №101 добавлена")', "Сервер выдал номер"), run('todos.length === 4 && document.querySelectorAll("#list li").length === 4 && todos.at(-1).title === "Выучить промисы"', "Задача в списке"), has("preventDefault", "Без перезагрузки")],
        solution: TODOS + RENDER + 'render(todos);\nconst form = document.querySelector("form");\nform.addEventListener("submit", async (event) => {\n  event.preventDefault();\n  const res = await fetch("/api/todos", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ title: form.elements.title.value })\n  });\n  const todo = await res.json();\n  todos.push(todo);\n  render(todos);\n  document.querySelector("#msg").textContent = `Задача №${todo.id} добавлена`;\n});'
      }),
      task("Шаг 4. Живой поиск", "При вводе в `#search` показывай через `render` только задачи, в названии которых есть введённый текст (без учёта регистра).", {
        page: PAGE + '<input id="search" placeholder="Найти задачу">\n<ul id="list"></ul>',
        start: TODOS + RENDER + "render(todos);\n",
        checks: [run('(() => { const s = document.querySelector("#search"); s.value = "ВИКТ"; s.dispatchEvent(new Event("input")); const items = document.querySelectorAll("#list li"); return items.length === 1 && items[0].textContent === "Сделать викторину"; })()', "Найдена одна задача"), run('(() => { const s = document.querySelector("#search"); s.value = ""; s.dispatchEvent(new Event("input")); return document.querySelectorAll("#list li").length === 3; })()', "Пустой поиск — все задачи")],
        solution: TODOS + RENDER + 'render(todos);\nconst search = document.querySelector("#search");\nsearch.addEventListener("input", () => {\n  const query = search.value.toLowerCase();\n  render(todos.filter((t) => t.title.toLowerCase().includes(query)));\n});'
      })
    ],
    quizzes: [
      multi("js-final-parts", "Из чего приложение", "Что ты использовал в финальном проекте?", [["fetch", "fetch и async/await"], ["events", "События и делегирование"], ["storage", "localStorage"], ["jquery", "jQuery"]], ["fetch", "events", "storage"], "Всё на чистом JavaScript."),
      single("js-final-truth", "Правда", "Где «живёт правда» о задачах в хорошо устроенном коде?", [["data", "В данных (массиве), а страница строится из них"], ["html", "В HTML-разметке"], ["css", "В CSS"], ["console", "В консоли"]], "data", "Данные → отрисовка.")
    ]
  });
}
