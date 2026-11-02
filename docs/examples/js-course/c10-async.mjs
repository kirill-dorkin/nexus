// Chapter 10: Asynchronous JavaScript — timers, promises, async/await, fetch, errors.
// The sandbox serves an offline teaching API: /api/products, /api/users, /api/todos (+ POST /api/todos, /api/orders).
import { scene, rule, kw, meth, fnc, obj, idea, run, out, has, task, makeLesson } from "./kit.mjs";

export default function asyncChapter(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "timers", title: "Таймеры", summary: "setTimeout, setInterval, clearTimeout, clearInterval и почему код не ждёт таймер.",
    skill: ["js-timers", "Таймеры", "Откладывать и повторять действия по времени."],
    now: "Откладываем и повторяем действия: setTimeout и setInterval.",
    body: [
      scene("Через две секунды",
        ["you", "Уведомление «Сохранено» висит вечно. Хочу, чтобы оно само исчезало."],
        ["nika", "Попросим браузер: «через 2 секунды вызови функцию». Сам код при этом не останавливается и идёт дальше."]),
      fnc("setTimeout()", "Один раз позже", "`setTimeout(fn, ms)` — вызвать `fn` через `ms` миллисекунд. Возвращает номер таймера.", "Скрыть уведомление, задержка подсказки.", 'console.log("Сначала");\nsetTimeout(() => console.log("Через 300 мс"), 300);\nconsole.log("Сразу следом");'),
      fnc("setInterval()", "Повторять", "`setInterval(fn, ms)` — вызывать каждые `ms` миллисекунд.", "Обратный отсчёт, часы.", "let n = 3;\nconst id = setInterval(() => {\n  console.log(n);\n  n--;\n  if (n === 0) clearInterval(id);\n}, 200);"),
      fnc("clearTimeout() · clearInterval()", "Отменить таймер", "Передай номер, который вернул таймер.", "Отменить отложенное, остановить повтор.", undefined),
      idea("Асинхронность", "Код не ждёт", "Таймер, загрузка, клик — случаются потом. JavaScript не стоит и не ждёт, а выполняет колбэк, когда время придёт.", "Понять порядок вывода в консоли.", undefined),
      rule("Запустил `setInterval` — сразу продумай, где его остановишь.")
    ],
    tasks: [task("Уведомление исчезает", "Через 300 мс скрой `#toast` (`hidden = true`).", {
      page: '<p id="toast">Сохранено!</p>',
      start: "",
      checks: [run('!document.querySelector("#toast").hidden', "Сначала видно"), run('await wait(400) || document.querySelector("#toast").hidden', "Через 300 мс скрыто"), has("setTimeout", "Использован `setTimeout`")],
      solution: 'setTimeout(() => {\n  document.querySelector("#toast").hidden = true;\n}, 300);'
    }), task("Обратный отсчёт", "Каждые 100 мс уменьшай `left` на 1 и пиши его в `#left`. Когда дойдёт до 0 — останови интервал.", {
      page: 'До старта: <span id="left">3</span>',
      start: "let left = 3;\n",
      checks: [run('await wait(500) || left === 0', "Дошёл до нуля"), run('document.querySelector("#left").textContent === "0"', "На странице 0"), run('await wait(250) || left === 0', "Остановился, не ушёл в минус"), has("clearInterval", "Интервал остановлен")],
      solution: 'let left = 3;\nconst id = setInterval(() => {\n  left--;\n  document.querySelector("#left").textContent = String(left);\n  if (left === 0) clearInterval(id);\n}, 100);'
    })],
    quizzes: [
      single("js-timeout-order", "Порядок", "В каком порядке выведется: `console.log(1); setTimeout(() => console.log(2), 0); console.log(3);`?", [["132", "1, 3, 2"], ["123", "1, 2, 3"], ["213", "2, 1, 3"], ["13", "1, 3 — а 2 никогда"]], "132", "Колбэк таймера выполнится после текущего кода, даже с задержкой 0."),
      short("js-ms", "Миллисекунды", "Сколько миллисекунд в 2 секундах? Введи число.", ["2000"], "Таймеры принимают миллисекунды.")
    ]
  });

  L({
    slug: "promises", title: "Промисы", summary: "Promise, then, catch, finally, состояния pending/fulfilled/rejected и цепочки.",
    skill: ["js-promises", "Промисы", "Работать с результатом, который появится позже."],
    now: "Работаем с результатом, который появится позже: промисы.",
    body: [
      scene("Обещание",
        ["you", "Файл загружается несколько секунд. Как написать код, который сработает, когда он загрузится?"],
        ["bro", "Я дам тебе промис — обещание результата. Он или выполнится, или будет отклонён."]),
      obj("Promise", "Обещание результата", "Объект, который сейчас в ожидании (pending), а потом выполнен (fulfilled) со значением или отклонён (rejected) с ошибкой.", "Всё, что займёт время: загрузка, ожидание.", 'const upload = new Promise((resolve) => {\n  setTimeout(() => resolve("Файл загружен"), 200);\n});\nupload.then((text) => console.log(text));\nconsole.log("Ждём…");'),
      meth("then()", "Когда выполнится", "`promise.then(fn)` — вызвать `fn` с результатом. Возвращает новый промис — можно строить цепочки.", "Сделать что-то с результатом.", "Promise.resolve(220)\n  .then((price) => price * 2)\n  .then((total) => console.log(total));"),
      meth("catch()", "Если ошибка", "Ловит отклонение в любом месте цепочки выше.", "Показать пользователю, что что-то пошло не так.", 'Promise.reject(new Error("Сеть недоступна"))\n  .catch((e) => console.log("Увы:", e.message));'),
      meth("finally()", "В любом случае", "Выполнится и при успехе, и при ошибке.", "Скрыть индикатор загрузки.", 'Promise.resolve("ок").finally(() => console.log("Спиннер скрыт"));'),
      fnc("Promise.all()", "Дождаться всех", "Ждёт массив промисов и даёт массив результатов; падает при первой ошибке.", "Загрузить несколько файлов параллельно.", "Promise.all([Promise.resolve(1), Promise.resolve(2)]).then((r) => console.log(r));"),
      rule("У каждой цепочки промисов должен быть `catch` — иначе ошибка потеряется.")
    ],
    tasks: [task("Загрузка файла", "Напиши `upload(name)`, которая возвращает промис: через 100 мс он выполняется строкой `` `${name} загружен` ``. Затем вызови `upload(\"фото.png\").then(...)` и сохрани результат в `ready`.", {
      start: "let ready = \"\";\nfunction upload(name) {\n  return name + \" загружен\";\n}\n",
      checks: [run('upload("a.txt") instanceof Promise', "`upload` возвращает промис"), run('await upload("b.txt") === "b.txt загружен"', "Промис выполняется строкой"), run('await wait(200) || ready === "фото.png загружен"', "`ready` заполнен через then")],
      solution: "let ready = \"\";\nfunction upload(name) {\n  return new Promise((resolve) => {\n    setTimeout(() => resolve(`${name} загружен`), 100);\n  });\n}\nupload(\"фото.png\").then((text) => {\n  ready = text;\n});"
    })],
    quizzes: [
      single("js-promise-states", "Состояния", "Какие состояния бывают у промиса?", [["three", "pending, fulfilled, rejected"], ["two", "true и false"], ["start", "start, stop"], ["one", "Только done"]], "three", "Ожидание, выполнен, отклонён."),
      single("js-promise-catch", "catch", "Что поймает `.catch()` в конце цепочки?", [["any", "Ошибку на любом шаге выше"], ["last", "Только ошибку последнего then"], ["sync", "Только синтаксические ошибки"], ["none", "Ничего"]], "any", "Отклонение идёт вниз по цепочке до catch.")
    ]
  });

  L({
    slug: "async-await", title: "async и await", summary: "Асинхронные функции async, ожидание await, try/catch вокруг await и параллельное ожидание.",
    skill: ["js-async-await", "async/await", "Писать асинхронный код так же понятно, как обычный."],
    now: "Пишем асинхронный код сверху вниз: async, await и try…catch.",
    body: [
      scene("По-человечески",
        ["you", "Эти `.then().then()` читать тяжело."],
        ["nika", "`await` — «подожди результат». Код читается сверху вниз, как обычный, а браузер при этом не зависает."]),
      kw("async", "Асинхронная функция", "`async function f()` всегда возвращает промис. Внутри можно писать `await`.", "Любая функция, которая что-то ждёт.", "async function price() {\n  return 220;\n}\nprice().then((p) => console.log(p));"),
      kw("await", "Подождать промис", "`const x = await promise;` — дождаться результата. Работает внутри async-функций (и на верхнем уровне модулей).", "Писать асинхронный код сверху вниз.", 'async function save() {\n  console.log("Сохраняем…");\n  await wait(200);\n  console.log("Готово!");\n}\nsave();'),
      kw("try…catch", "Поймать ошибку", "`try { … } catch (error) { … }` — если внутри `try` ошибка (в том числе отклонённый await), выполнится `catch`.", "Обработать сбой загрузки.", 'async function load() {\n  try {\n    await Promise.reject(new Error("Нет связи"));\n  } catch (error) {\n    console.log("Ошибка:", error.message);\n  }\n}\nload();'),
      kw("throw", "Выбросить ошибку", "`throw new Error(\"текст\")` — прервать выполнение с ошибкой.", "Сообщить, что дальше нельзя.", 'try {\n  throw new Error("Пустое имя файла");\n} catch (e) {\n  console.log(e.message);\n}'),
      rule("`await` без `try…catch` — ошибка улетит в консоль, а пользователь увидит вечную загрузку.")
    ],
    tasks: [task("Сохранение с ожиданием", "Напиши `async function save(title)`: ждёт `wait(100)`, потом возвращает `` `${title} сохранён` ``. Если `title` пустой — выбрасывает `Error(\"Нет названия\")`.", {
      start: "function save(title) {\n  return title + \" сохранён\";\n}\n",
      checks: [run('save("План") instanceof Promise', "Функция асинхронная"), run('await save("План") === "План сохранён"', "Возвращает результат"), run('await save("").then(() => false, (e) => e.message === "Нет названия")', "Без названия — ошибка"), has("await", "Использован `await`")],
      solution: "async function save(title) {\n  if (!title) throw new Error(\"Нет названия\");\n  await wait(100);\n  return `${title} сохранён`;\n}"
    })],
    quizzes: [
      single("js-async-returns", "async", "Что всегда возвращает async-функция?", [["promise", "Промис"], ["value", "Значение из return"], ["undef", "undefined"], ["fn", "Функцию"]], "promise", "Даже `return 5` превращается в промис."),
      single("js-await-where", "await", "Где можно писать `await`?", [["async", "Внутри async-функции (и на верхнем уровне модулей)"], ["any", "В любой функции"], ["loop", "Только в циклах"], ["never", "Нигде, это устарело"]], "async", "В обычной функции будет синтаксическая ошибка.")
    ]
  });

  L({
    slug: "fetch", title: "fetch: данные с сервера", summary: "fetch, Response, res.ok, res.json(), отправка POST с JSON и заголовками.",
    skill: ["js-fetch", "fetch", "Загружать и отправлять данные на сервер."],
    now: "Загружаем и отправляем данные на сервер с помощью fetch.",
    body: [
      scene("Данные на сервере",
        ["you", "Список товаров лежит на сервере и меняется каждый день. Как подтянуть его на страницу?"],
        ["bro", "Для этого `fetch`: попроси данные по адресу и дождись ответа. В курсе у меня есть учебный сервер: `/api/products`, `/api/users` и `/api/todos`."]),
      fnc("fetch()", "Запрос к серверу", "`fetch(url)` возвращает промис ответа (Response).", "Загрузить данные, отправить форму.", 'const res = await fetch("/api/products");\nconsole.log(res.status, res.ok);'),
      meth("res.json()", "Разобрать ответ", "Читает тело ответа как JSON. Тоже возвращает промис.", "Получить данные из ответа.", 'const res = await fetch("/api/products");\nconst products = await res.json();\nconsole.log(products.length, products[0].title);'),
      kw("res.ok", "Успешный ли ответ", "`true` для статусов 200–299. `fetch` не падает на 404 — проверяй `ok` сам.", "Отличить «нет такого» от успеха.", 'const res = await fetch("/api/products/99");\nconsole.log(res.ok, res.status);'),
      idea("POST-запрос", "Отправить данные", "`fetch(url, { method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: JSON.stringify(data) })`.", "Создать запись на сервере.", 'const res = await fetch("/api/todos", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ title: "Выучить fetch" })\n});\nconsole.log(await res.json());'),
      rule("`fetch` считает 404 и 500 успехом доставки. Всегда проверяй `res.ok`.")
    ],
    tasks: [task("Товары с сервера", "Загрузи `/api/products`, сохрани массив в `products` и выведи названия (`title`) в `#list` пунктами `<li>`.", {
      page: '<ul id="list"><li>Загрузка…</li></ul>',
      start: "let products = [];\n",
      checks: [run('await wait(300) || products.length === 6', "Товары загружены"), run('document.querySelectorAll("#list li").length === 6 && document.querySelector("#list li").textContent.includes("Наушники")', "Пункты на странице"), has("fetch", "Использован `fetch`")],
      solution: 'let products = [];\nasync function loadProducts() {\n  const res = await fetch("/api/products");\n  products = await res.json();\n  const list = document.querySelector("#list");\n  list.replaceChildren();\n  for (const item of products) {\n    const li = document.createElement("li");\n    li.textContent = item.title;\n    list.append(li);\n  }\n}\nloadProducts();'
    }), task("Создать задачу", "Напиши `async function addTodo(title)`: POST на `/api/todos` с JSON `{ title }`; верни объект из ответа.", {
      start: "async function addTodo(title) {\n  return null;\n}\n",
      checks: [run('(await addTodo("Купить хлеб"))?.id === 101', "Сервер выдал id"), run('(await addTodo("Позвонить"))?.title === "Позвонить"', "Отправлено нужное название"), has("POST", "Метод POST")],
      solution: 'async function addTodo(title) {\n  const res = await fetch("/api/todos", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ title })\n  });\n  return res.json();\n}'
    })],
    quizzes: [
      single("js-fetch-404", "404", "Что сделает `fetch` при ответе 404?", [["resolve", "Выполнится нормально, но `res.ok` будет false"], ["reject", "Выбросит ошибку"], ["retry", "Повторит запрос"], ["null", "Вернёт null"]], "resolve", "Промис fetch отклоняется только при сбое сети."),
      single("js-fetch-json", "Тело", "Как получить данные из ответа в JSON?", [["json", "`await res.json()`"], ["body", "`res.body`"], ["parse", "`JSON.parse(res)`"], ["data", "`res.data`"]], "json", "res.json() тоже асинхронный.")
    ]
  });

  L({
    slug: "loading-states", title: "Загрузка и ошибки на странице", summary: "Состояния загрузки, ошибки и пустого результата; повтор запроса; finally для спиннера.",
    skill: ["js-loading-states", "Состояния загрузки", "Показывать пользователю загрузку, ошибку и результат."],
    now: "Показываем загрузку, результат и ошибку — честные состояния.",
    body: [
      scene("Вечная загрузка",
        ["bug", "А я сломаю сервер! Пусть смотрят на «Загрузка…» до утра."],
        ["nika", "У любой загрузки три исхода: идёт, получилось, не получилось. Показываем каждый."]),
      idea("Три состояния", "Загрузка, успех, ошибка", "Перед запросом — «Загрузка…», после — данные или понятная ошибка с кнопкой «Повторить».", "Пользователь всегда знает, что происходит.", undefined),
      idea("aria-busy", "Загрузка для скринридера", "`aria-busy=\"true\"` на обновляемой области, пока идёт загрузка.", "Скринридер не читает недогруженное.", undefined),
      rule("Не оставляй пользователя без ответа: на каждую загрузку — сообщение об ошибке и способ повторить.")
    ],
    tasks: [task("Честная загрузка", "Напиши `async function loadUser(id)`: пишет в `#status` `Загрузка…`, запрашивает `/api/users/` + id; при успехе пишет имя (`name`), при `!res.ok` — `Пользователь не найден`.", {
      page: '<p id="status"></p>',
      start: "async function loadUser(id) {\n}\n",
      checks: [run('(loadUser(2), document.querySelector("#status").textContent === "Загрузка…")', "Сначала «Загрузка…»"), run('(await loadUser(2), document.querySelector("#status").textContent === "Борис")', "Успех — имя"), run('(await loadUser(99), document.querySelector("#status").textContent === "Пользователь не найден")', "Ошибка — понятный текст")],
      solution: 'async function loadUser(id) {\n  const status = document.querySelector("#status");\n  status.textContent = "Загрузка…";\n  const res = await fetch("/api/users/" + id);\n  if (!res.ok) {\n    status.textContent = "Пользователь не найден";\n    return;\n  }\n  const user = await res.json();\n  status.textContent = user.name;\n}'
    })],
    quizzes: [single("js-states", "Состояния", "Какие состояния нужно показать при загрузке данных?", [["three", "Загрузку, результат и ошибку"], ["one", "Только результат"], ["two", "Только загрузку и результат"], ["none", "Никаких"]], "three", "Ошибка без сообщения выглядит как вечная загрузка.")]
  });

  L({
    slug: "project-menu-api", title: "Проект: каталог с сервера", summary: "Загрузка каталога товаров, фильтр по категориям и отправка заказа на сервер.",
    skill: ["js-project-api", "Каталог с сервера", "Собрать страницу, которая загружает данные и отправляет заказ."],
    now: "Проект главы: каталог с сервера, фильтр и отправка заказа.",
    body: [scene("Всё вместе", ["you", "Каталог с сервера, фильтр по категориям и кнопка заказа — вот это уже настоящая страница."], ["nika", "Загрузка, фильтр, отправка. По шагу."])],
    tasks: [
      task("Шаг 1. Загрузить", "Напиши `async function load()`, которая загружает `/api/products` в `products` и вызывает `render(products)`. Вызови `load()`.", {
        page: '<ul id="list"></ul>',
        start: 'let products = [];\nfunction render(list) {\n  const ul = document.querySelector("#list");\n  ul.replaceChildren(...list.map((p) => {\n    const li = document.createElement("li");\n    li.textContent = `${p.title} — ${p.price} ₽`;\n    return li;\n  }));\n}\n',
        checks: [run('await wait(300) || products.length === 6', "Каталог загружен"), run('document.querySelectorAll("#list li").length === 6', "Отрисовано 6 товаров")],
        solution: 'let products = [];\nfunction render(list) {\n  const ul = document.querySelector("#list");\n  ul.replaceChildren(...list.map((p) => {\n    const li = document.createElement("li");\n    li.textContent = `${p.title} — ${p.price} ₽`;\n    return li;\n  }));\n}\nasync function load() {\n  const res = await fetch("/api/products");\n  products = await res.json();\n  render(products);\n}\nload();'
      }),
      task("Шаг 2. Фильтр", "По `change` в `#filter` показывай через `render` только товары этой категории (`all` — все).", {
        page: '<select id="filter"><option value="all">Все</option><option value="audio">Звук</option><option value="input">Ввод</option></select>\n<ul id="list"></ul>',
        start: 'const products = [{ title: "Наушники", price: 3490, category: "audio" }, { title: "Мышь", price: 1290, category: "input" }];\nfunction render(list) {\n  document.querySelector("#list").replaceChildren(...list.map((p) => {\n    const li = document.createElement("li");\n    li.textContent = p.title;\n    return li;\n  }));\n}\nrender(products);\n',
        checks: [run('(() => { const f = document.querySelector("#filter"); f.value = "input"; f.dispatchEvent(new Event("change")); const items = document.querySelectorAll("#list li"); return items.length === 1 && items[0].textContent === "Мышь"; })()', "«Ввод» — только мышь"), run('(() => { const f = document.querySelector("#filter"); f.value = "all"; f.dispatchEvent(new Event("change")); return document.querySelectorAll("#list li").length === 2; })()', "«Все» — снова всё")],
        solution: 'const products = [{ title: "Наушники", price: 3490, category: "audio" }, { title: "Мышь", price: 1290, category: "input" }];\nfunction render(list) {\n  document.querySelector("#list").replaceChildren(...list.map((p) => {\n    const li = document.createElement("li");\n    li.textContent = p.title;\n    return li;\n  }));\n}\nrender(products);\nconst filter = document.querySelector("#filter");\nfilter.addEventListener("change", () => {\n  const value = filter.value;\n  render(value === "all" ? products : products.filter((p) => p.category === value));\n});'
      }),
      task("Шаг 3. Заказ", "По клику на `#order` отправь POST `/api/orders` с `{ productId: 1 }` и выведи в `#msg` `` `Заказ №${id} принят` `` из ответа.", {
        page: '<button id="order">Заказать наушники</button>\n<p id="msg"></p>',
        start: "",
        checks: [run('(document.querySelector("#order").click(), await wait(300), document.querySelector("#msg").textContent === "Заказ №1042 принят")', "Номер заказа из ответа"), has("JSON.stringify", "Тело отправлено как JSON")],
        solution: 'document.querySelector("#order").addEventListener("click", async () => {\n  const res = await fetch("/api/orders", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ productId: 1 })\n  });\n  const order = await res.json();\n  document.querySelector("#msg").textContent = `Заказ №${order.id} принят`;\n});'
      })
    ],
    quizzes: [single("js-proj-api", "Заголовок", "Зачем при отправке JSON заголовок `Content-Type: application/json`?", [["tell", "Чтобы сервер понял, что тело — JSON"], ["speed", "Чтобы ускорить запрос"], ["auth", "Для авторизации"], ["cache", "Для кэша"]], "tell", "Сервер разбирает тело по этому заголовку.")]
  });
}
