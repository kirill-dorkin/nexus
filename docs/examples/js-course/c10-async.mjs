// Chapter 10: Asynchronous JavaScript — timers, promises, async/await, fetch, errors.
import { scene, rule, kw, meth, fnc, obj, idea, run, out, has, task, makeLesson } from "./kit.mjs";

export default function asyncChapter(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "timers", title: "Таймеры", summary: "setTimeout, setInterval, clearTimeout, clearInterval и почему код не ждёт таймер.",
    skill: ["js-timers", "Таймеры", "Откладывать и повторять действия по времени."],
    now: "Плашка «Заказ принят» должна исчезать через 2 секунды, а таймер акции — тикать каждую секунду.",
    body: [
      scene("Через две секунды",
        ["marta", "Плашка «Заказ принят» висит вечно. Пусть сама исчезает."],
        ["nika", "Попросим браузер: «через 2 секунды вызови функцию». Сам код при этом не останавливается и идёт дальше."]),
      fnc("setTimeout()", "Один раз позже", "`setTimeout(fn, ms)` — вызвать `fn` через `ms` миллисекунд. Возвращает номер таймера.", "Скрыть уведомление, задержка подсказки.", 'console.log("Сначала");\nsetTimeout(() => console.log("Через 300 мс"), 300);\nconsole.log("Сразу следом");'),
      fnc("setInterval()", "Повторять", "`setInterval(fn, ms)` — вызывать каждые `ms` миллисекунд.", "Обратный отсчёт, часы.", "let n = 3;\nconst id = setInterval(() => {\n  console.log(n);\n  n--;\n  if (n === 0) clearInterval(id);\n}, 200);"),
      fnc("clearTimeout() · clearInterval()", "Отменить таймер", "Передай номер, который вернул таймер.", "Отменить отложенное, остановить повтор.", undefined),
      idea("Асинхронность", "Код не ждёт", "Таймер, загрузка, клик — случаются потом. JavaScript не стоит и не ждёт, а выполняет колбэк, когда время придёт.", "Понять порядок вывода в консоли.", undefined),
      rule("Запустил `setInterval` — сразу продумай, где его остановишь.")
    ],
    tasks: [task("Плашка исчезает", "Через 300 мс скрой `#toast` (`hidden = true`).", {
      page: '<p id="toast">Заказ принят!</p>',
      start: "",
      checks: [run('!document.querySelector("#toast").hidden', "Сначала видна"), run('await wait(400) || document.querySelector("#toast").hidden', "Через 300 мс скрыта"), has("setTimeout", "Использован `setTimeout`")],
      solution: 'setTimeout(() => {\n  document.querySelector("#toast").hidden = true;\n}, 300);'
    }), task("Обратный отсчёт", "Каждые 100 мс уменьшай `left` на 1 и пиши его в `#left`. Когда дойдёт до 0 — останови интервал.", {
      page: 'До конца акции: <span id="left">3</span>',
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
    now: "Кухня готовит заказ не мгновенно. Описываем «обещание результата» — промис.",
    body: [
      scene("Чек-обещание",
        ["marta", "Гость оплатил и получил номерок. Кофе будет потом — или кончится молоко."],
        ["bro", "Номерок — это промис: обещание результата. Он или выполнится, или будет отклонён."]),
      obj("Promise", "Обещание результата", "Объект, который сейчас в ожидании (pending), а потом выполнен (fulfilled) со значением или отклонён (rejected) с ошибкой.", "Всё, что займёт время: загрузка, ожидание.", 'const coffee = new Promise((resolve) => {\n  setTimeout(() => resolve("Латте готов"), 200);\n});\ncoffee.then((text) => console.log(text));\nconsole.log("Ждём…");'),
      meth("then()", "Когда выполнится", "`promise.then(fn)` — вызвать `fn` с результатом. Возвращает новый промис — можно строить цепочки.", "Сделать что-то с результатом.", "Promise.resolve(220)\n  .then((price) => price * 2)\n  .then((total) => console.log(total));"),
      meth("catch()", "Если ошибка", "Ловит отклонение в любом месте цепочки выше.", "Показать гостю, что что-то пошло не так.", 'Promise.reject(new Error("Молоко кончилось"))\n  .catch((e) => console.log("Увы:", e.message));'),
      meth("finally()", "В любом случае", "Выполнится и при успехе, и при ошибке.", "Скрыть индикатор загрузки.", 'Promise.resolve("ок").finally(() => console.log("Спиннер скрыт"));'),
      fnc("Promise.all()", "Дождаться всех", "Ждёт массив промисов и даёт массив результатов; падает при первой ошибке.", "Загрузить меню и акции параллельно.", "Promise.all([Promise.resolve(1), Promise.resolve(2)]).then((r) => console.log(r));"),
      rule("У каждой цепочки промисов должен быть `catch` — иначе ошибка потеряется.")
    ],
    tasks: [task("Приготовить заказ", "Напиши `brew(drink)`, которая возвращает промис: через 100 мс он выполняется строкой `` `${drink} готов` ``. Затем вызови `brew(\"Раф\").then(...)` и сохрани результат в `ready`.", {
      start: "let ready = \"\";\nfunction brew(drink) {\n  return drink + \" готов\";\n}\n",
      checks: [run('brew("Латте") instanceof Promise', "`brew` возвращает промис"), run('await brew("Какао") === "Какао готов"', "Промис выполняется строкой"), run('await wait(200) || ready === "Раф готов"', "`ready` заполнен через then")],
      solution: "let ready = \"\";\nfunction brew(drink) {\n  return new Promise((resolve) => {\n    setTimeout(() => resolve(`${drink} готов`), 100);\n  });\n}\nbrew(\"Раф\").then((text) => {\n  ready = text;\n});"
    })],
    quizzes: [
      single("js-promise-states", "Состояния", "Какие состояния бывают у промиса?", [["three", "pending, fulfilled, rejected"], ["two", "true и false"], ["start", "start, stop"], ["one", "Только done"]], "three", "Ожидание, выполнен, отклонён."),
      single("js-promise-catch", "catch", "Что поймает `.catch()` в конце цепочки?", [["any", "Ошибку на любом шаге выше"], ["last", "Только ошибку последнего then"], ["sync", "Только синтаксические ошибки"], ["none", "Ничего"]], "any", "Отклонение идёт вниз по цепочке до catch.")
    ]
  });

  L({
    slug: "async-await", title: "async и await", summary: "Асинхронные функции async, ожидание await, try/catch вокруг await и параллельное ожидание.",
    skill: ["js-async-await", "async/await", "Писать асинхронный код так же понятно, как обычный."],
    now: "Цепочки then становятся длинными. Пишем то же самое по-человечески — с await.",
    body: [
      scene("По-человечески",
        ["marta", "Эти `.then().then()` читать тяжело."],
        ["nika", "`await` — «подожди результат». Код читается сверху вниз, как обычный, а браузер при этом не зависает."]),
      kw("async", "Асинхронная функция", "`async function f()` всегда возвращает промис. Внутри можно писать `await`.", "Любая функция, которая что-то ждёт.", "async function price() {\n  return 220;\n}\nprice().then((p) => console.log(p));"),
      kw("await", "Подождать промис", "`const x = await promise;` — дождаться результата. Работает внутри async-функций (и на верхнем уровне модулей).", "Писать асинхронный код сверху вниз.", 'async function order() {\n  console.log("Готовим…");\n  await wait(200);\n  console.log("Готово!");\n}\norder();'),
      kw("try…catch", "Поймать ошибку", "`try { … } catch (error) { … }` — если внутри `try` ошибка (в том числе отклонённый await), выполнится `catch`.", "Обработать сбой загрузки.", 'async function load() {\n  try {\n    await Promise.reject(new Error("Нет связи"));\n  } catch (error) {\n    console.log("Ошибка:", error.message);\n  }\n}\nload();'),
      kw("throw", "Выбросить ошибку", "`throw new Error(\"текст\")` — прервать выполнение с ошибкой.", "Сообщить, что дальше нельзя.", 'try {\n  throw new Error("Нет молока");\n} catch (e) {\n  console.log(e.message);\n}'),
      rule("`await` без `try…catch` — ошибка улетит в консоль, а гость увидит вечную загрузку.")
    ],
    tasks: [task("Заказ с ожиданием", "Напиши `async function makeOrder(drink)`: ждёт `wait(100)`, потом возвращает `` `${drink} готов` ``. Если `drink` пустой — выбрасывает `Error(\"Не выбран напиток\")`.", {
      start: "function makeOrder(drink) {\n  return drink + \" готов\";\n}\n",
      checks: [run('makeOrder("Латте") instanceof Promise', "Функция асинхронная"), run('await makeOrder("Латте") === "Латте готов"', "Возвращает результат"), run('await makeOrder("").then(() => false, (e) => e.message === "Не выбран напиток")', "Без напитка — ошибка"), has("await", "Использован `await`")],
      solution: "async function makeOrder(drink) {\n  if (!drink) throw new Error(\"Не выбран напиток\");\n  await wait(100);\n  return `${drink} готов`;\n}"
    })],
    quizzes: [
      single("js-async-returns", "async", "Что всегда возвращает async-функция?", [["promise", "Промис"], ["value", "Значение из return"], ["undef", "undefined"], ["fn", "Функцию"]], "promise", "Даже `return 5` превращается в промис."),
      single("js-await-where", "await", "Где можно писать `await`?", [["async", "Внутри async-функции (и на верхнем уровне модулей)"], ["any", "В любой функции"], ["loop", "Только в циклах"], ["never", "Нигде, это устарело"]], "async", "В обычной функции будет синтаксическая ошибка.")
    ]
  });

  L({
    slug: "fetch", title: "fetch: данные с сервера", summary: "fetch, Response, res.ok, res.json(), отправка POST с JSON и заголовками.",
    skill: ["js-fetch", "fetch", "Загружать и отправлять данные на сервер."],
    now: "Меню теперь лежит на сервере по адресу /api/menu. Загружаем его на страницу.",
    body: [
      scene("Меню на сервере",
        ["marta", "Меню будет меняться каждый день. Я буду править его в админке, а сайт — сам подтягивать."],
        ["bro", "Для этого `fetch`: попроси данные по адресу и дождись ответа. В курсе у меня есть учебный сервер: `/api/menu` и `/api/orders`."]),
      fnc("fetch()", "Запрос к серверу", "`fetch(url)` возвращает промис ответа (Response).", "Загрузить меню, отправить заказ.", 'const res = await fetch("/api/menu");\nconsole.log(res.status, res.ok);'),
      meth("res.json()", "Разобрать ответ", "Читает тело ответа как JSON. Тоже возвращает промис.", "Получить данные из ответа.", 'const res = await fetch("/api/menu");\nconst menu = await res.json();\nconsole.log(menu.length, menu[0].name);'),
      kw("res.ok", "Успешный ли ответ", "`true` для статусов 200–299. `fetch` не падает на 404 — проверяй `ok` сам.", "Отличить «нет такого» от успеха.", 'const res = await fetch("/api/menu/99");\nconsole.log(res.ok, res.status);'),
      idea("POST-запрос", "Отправить данные", "`fetch(url, { method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: JSON.stringify(data) })`.", "Отправить заказ.", 'const res = await fetch("/api/orders", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ drink: "Раф" })\n});\nconsole.log(await res.json());'),
      rule("`fetch` считает 404 и 500 успехом доставки. Всегда проверяй `res.ok`.")
    ],
    tasks: [task("Меню с сервера", "Загрузи `/api/menu`, сохрани массив в `menu` и выведи названия в `#menu` пунктами `<li>`.", {
      page: '<ul id="menu"><li>Загрузка…</li></ul>',
      start: "let menu = [];\n",
      checks: [run('await wait(300) || menu.length === 6', "Меню загружено"), run('document.querySelectorAll("#menu li").length === 6 && document.querySelector("#menu li").textContent.includes("Эспрессо")', "Пункты на странице"), has("fetch", "Использован `fetch`")],
      solution: 'let menu = [];\nasync function loadMenu() {\n  const res = await fetch("/api/menu");\n  menu = await res.json();\n  const list = document.querySelector("#menu");\n  list.replaceChildren();\n  for (const item of menu) {\n    const li = document.createElement("li");\n    li.textContent = item.name;\n    list.append(li);\n  }\n}\nloadMenu();'
    }), task("Отправить заказ", "Напиши `async function sendOrder(drink)`: POST на `/api/orders` с JSON `{ drink }`; верни объект из ответа.", {
      start: "async function sendOrder(drink) {\n  return null;\n}\n",
      checks: [run('(await sendOrder("Раф"))?.status === "accepted"', "Заказ принят сервером"), run('(await sendOrder("Какао"))?.drink === "Какао"', "Отправлен нужный напиток"), has("POST", "Метод POST")],
      solution: 'async function sendOrder(drink) {\n  const res = await fetch("/api/orders", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ drink })\n  });\n  return res.json();\n}'
    })],
    quizzes: [
      single("js-fetch-404", "404", "Что сделает `fetch` при ответе 404?", [["resolve", "Выполнится нормально, но `res.ok` будет false"], ["reject", "Выбросит ошибку"], ["retry", "Повторит запрос"], ["null", "Вернёт null"]], "resolve", "Промис fetch отклоняется только при сбое сети."),
      single("js-fetch-json", "Тело", "Как получить данные из ответа в JSON?", [["json", "`await res.json()`"], ["body", "`res.body`"], ["parse", "`JSON.parse(res)`"], ["data", "`res.data`"]], "json", "res.json() тоже асинхронный.")
    ]
  });

  L({
    slug: "loading-states", title: "Загрузка и ошибки на странице", summary: "Состояния загрузки, ошибки и пустого результата; повтор запроса; finally для спиннера.",
    skill: ["js-loading-states", "Состояния загрузки", "Показывать гостю загрузку, ошибку и результат."],
    now: "Если сервер не ответил, гость видит вечное «Загрузка…». Показываем честные состояния.",
    body: [
      scene("Вечная загрузка",
        ["bug", "А я сломаю сервер! Пусть ваши гости смотрят на «Загрузка…» до утра."],
        ["nika", "У любой загрузки три исхода: идёт, получилось, не получилось. Показываем каждый."]),
      idea("Три состояния", "Загрузка, успех, ошибка", "Перед запросом — «Загрузка…», после — данные или понятная ошибка с кнопкой «Повторить».", "Гость всегда знает, что происходит.", undefined),
      idea("aria-busy", "Загрузка для скринридера", "`aria-busy=\"true\"` на обновляемой области, пока идёт загрузка.", "Скринридер не читает недогруженное.", undefined),
      rule("Не оставляй гостя без ответа: на каждую загрузку — сообщение об ошибке и способ повторить.")
    ],
    tasks: [task("Честная загрузка", "Напиши `async function loadDrink(id)`: пишет в `#status` `Загрузка…`, запрашивает `/api/menu/` + id; при успехе пишет название, при `!res.ok` — `Не нашли напиток`.", {
      page: '<p id="status"></p>',
      start: "async function loadDrink(id) {\n}\n",
      checks: [run('(loadDrink(3), document.querySelector("#status").textContent === "Загрузка…")', "Сначала «Загрузка…»"), run('(await loadDrink(3), document.querySelector("#status").textContent === "Латте")', "Успех — название"), run('(await loadDrink(99), document.querySelector("#status").textContent === "Не нашли напиток")', "Ошибка — понятный текст")],
      solution: 'async function loadDrink(id) {\n  const status = document.querySelector("#status");\n  status.textContent = "Загрузка…";\n  const res = await fetch("/api/menu/" + id);\n  if (!res.ok) {\n    status.textContent = "Не нашли напиток";\n    return;\n  }\n  const drink = await res.json();\n  status.textContent = drink.name;\n}'
    })],
    quizzes: [single("js-states", "Состояния", "Какие состояния нужно показать при загрузке данных?", [["three", "Загрузку, результат и ошибку"], ["one", "Только результат"], ["two", "Только загрузку и результат"], ["none", "Никаких"]], "three", "Ошибка без сообщения выглядит как вечная загрузка.")]
  });

  L({
    slug: "project-menu-api", title: "Проект: меню с сервера", summary: "Загрузка меню, фильтр по категориям и отправка заказа на сервер.",
    skill: ["js-project-api", "Меню с сервера", "Собрать страницу, которая загружает данные и отправляет заказ."],
    now: "Проект главы: меню загружается с сервера, фильтруется и заказ уходит на кухню.",
    body: [scene("Всё вместе", ["marta", "Меню из админки, фильтр «кофе / десерты» и заказ на кухню — вот это сайт!"], ["nika", "Загрузка, фильтр, отправка. По шагу."])],
    tasks: [
      task("Шаг 1. Загрузить", "Напиши `async function load()`, которая загружает `/api/menu` в `menu` и вызывает `render(menu)`. Вызови `load()`.", {
        page: '<ul id="menu"></ul>',
        start: 'let menu = [];\nfunction render(list) {\n  const ul = document.querySelector("#menu");\n  ul.replaceChildren(...list.map((d) => {\n    const li = document.createElement("li");\n    li.textContent = `${d.name} — ${d.price} ₽`;\n    return li;\n  }));\n}\n',
        checks: [run('await wait(300) || menu.length === 6', "Меню загружено"), run('document.querySelectorAll("#menu li").length === 6', "Отрисовано 6 позиций")],
        solution: 'let menu = [];\nfunction render(list) {\n  const ul = document.querySelector("#menu");\n  ul.replaceChildren(...list.map((d) => {\n    const li = document.createElement("li");\n    li.textContent = `${d.name} — ${d.price} ₽`;\n    return li;\n  }));\n}\nasync function load() {\n  const res = await fetch("/api/menu");\n  menu = await res.json();\n  render(menu);\n}\nload();'
      }),
      task("Шаг 2. Фильтр", "По `change` в `#filter` показывай `render` только позиции с этой категорией (`all` — все).", {
        page: '<select id="filter"><option value="all">Все</option><option value="coffee">Кофе</option><option value="dessert">Десерты</option></select>\n<ul id="menu"></ul>',
        start: 'const menu = [{ name: "Латте", price: 220, category: "coffee" }, { name: "Чизкейк", price: 260, category: "dessert" }];\nfunction render(list) {\n  document.querySelector("#menu").replaceChildren(...list.map((d) => {\n    const li = document.createElement("li");\n    li.textContent = d.name;\n    return li;\n  }));\n}\nrender(menu);\n',
        checks: [run('(() => { const f = document.querySelector("#filter"); f.value = "dessert"; f.dispatchEvent(new Event("change")); const items = document.querySelectorAll("#menu li"); return items.length === 1 && items[0].textContent === "Чизкейк"; })()', "Десерты — только чизкейк"), run('(() => { const f = document.querySelector("#filter"); f.value = "all"; f.dispatchEvent(new Event("change")); return document.querySelectorAll("#menu li").length === 2; })()', "«Все» — снова всё")],
        solution: 'const menu = [{ name: "Латте", price: 220, category: "coffee" }, { name: "Чизкейк", price: 260, category: "dessert" }];\nfunction render(list) {\n  document.querySelector("#menu").replaceChildren(...list.map((d) => {\n    const li = document.createElement("li");\n    li.textContent = d.name;\n    return li;\n  }));\n}\nrender(menu);\nconst filter = document.querySelector("#filter");\nfilter.addEventListener("change", () => {\n  const value = filter.value;\n  render(value === "all" ? menu : menu.filter((d) => d.category === value));\n});'
      }),
      task("Шаг 3. Заказ на кухню", "По клику на `#order` отправь POST `/api/orders` с `{ drink: \"Латте\" }` и выведи в `#msg` `` `Заказ №${id} принят` `` из ответа.", {
        page: '<button id="order">Заказать латте</button>\n<p id="msg"></p>',
        start: "",
        checks: [run('(document.querySelector("#order").click(), await wait(300), document.querySelector("#msg").textContent === "Заказ №1042 принят")', "Номер заказа из ответа"), has("JSON.stringify", "Тело отправлено как JSON")],
        solution: 'document.querySelector("#order").addEventListener("click", async () => {\n  const res = await fetch("/api/orders", {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ drink: "Латте" })\n  });\n  const order = await res.json();\n  document.querySelector("#msg").textContent = `Заказ №${order.id} принят`;\n});'
      })
    ],
    quizzes: [single("js-proj-api", "Заголовок", "Зачем при отправке JSON заголовок `Content-Type: application/json`?", [["tell", "Чтобы сервер понял, что тело — JSON"], ["speed", "Чтобы ускорить запрос"], ["auth", "Для авторизации"], ["cache", "Для кэша"]], "tell", "Сервер разбирает тело по этому заголовку.")]
  });
}
