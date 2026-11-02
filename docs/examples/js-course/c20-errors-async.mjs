// Chapter 20: Errors, resource management and promises completely.
import { scene, rule, kw, meth, obj, fnc, val, idea, run, has, task, makeLesson, on } from "./kit.mjs";

const DS = (...m) => on("DisposableStack.prototype", ...m);
const ADS = (...m) => on("AsyncDisposableStack.prototype", ...m);

export default function errorsAsync(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "errors-full", title: "Ошибки полностью", summary: "Error, message, name, cause, toString, Error.isError и все встроенные виды: RangeError, URIError, EvalError, AggregateError, свои классы ошибок.",
    skill: ["js-errors-full", "Ошибки", "Создавать, различать и связывать ошибки."],
    now: "Создаём, различаем и связываем ошибки.",
    body: [
      scene("Какая ошибка",
        ["you", "Программа пишет просто «Ошибка». А мне надо понимать: товар кончился или сеть пропала?"],
        ["nika", "Ошибка — это объект. У неё есть имя, текст, причина. И можно делать свои виды ошибок."]),
      obj("Error · message · name", "Объект ошибки", "`new Error(\"текст\")` — `message` хранит текст, `name` — вид (\"Error\"). Обычно ещё есть `stack` — где случилась.", "Бросать и ловить понятные ошибки.", 'const e = new Error("Файл не найден");\nconsole.log(e.name, e.message, e instanceof Error);', { covers: ["Error", "Error.prototype.message", "Error.prototype.name"] }),
      kw("cause · toString()", "Причина и текст", "`new Error(\"…\", { cause: err })` — связать ошибку с исходной. `toString()` → `\"Имя: текст\"`.", "Не терять исходную причину при повторном выбросе.", 'try {\n  try { JSON.parse("{"); } catch (err) { throw new Error("Меню не загрузилось", { cause: err }); }\n} catch (e) {\n  console.log(e.toString(), "←", e.cause.name);\n}', { covers: on("Error.prototype", "cause", "toString") }),
      meth("Error.isError()", "Настоящая ли ошибка", "Надёжная проверка, что значение — объект ошибки (работает и между iframe, где `instanceof` ломается).", "Обработчики, которые получают что угодно.", 'console.log(Error.isError(new TypeError("x")), Error.isError({ message: "подделка" }));', { covers: on("Error", "isError") }),
      obj("RangeError · URIError · EvalError", "Другие встроенные виды", "`RangeError` — значение вне допустимого диапазона (`new Array(-1)`), `URIError` — испорченный адрес (`decodeURI(\"%\")`), `EvalError` — исторический, сейчас не бросается.", "Понимать текст ошибки в консоли.", 'try { new Array(-1); } catch (e) { console.log(e.name); }\ntry { decodeURI("%"); } catch (e) { console.log(e.name); }\nconsole.log(new EvalError("x").name);', { covers: ["RangeError", "URIError", "EvalError"] }),
      obj("AggregateError", "Много ошибок сразу", "`new AggregateError([e1, e2], \"текст\")` — массив ошибок в `errors`. Её бросает `Promise.any`, когда все промисы упали.", "Сообщить обо всех сбоях сразу.", 'const e = new AggregateError([new Error("нет сети"), new Error("нет места на диске")], "Не сохранить");\nconsole.log(e.message, e.errors.map((x) => x.message));', { covers: ["AggregateError"] }),
      idea("Свои ошибки", "class extends Error", "`class OutOfStock extends Error` — свой вид ошибки со своим `name` и полями. Ловить по `instanceof`.", "Различать причины сбоев.", 'class OutOfStock extends Error {\n  constructor(item) {\n    super(`Нет на складе: ${item}`);\n    this.name = "OutOfStock";\n    this.item = item;\n  }\n}\ntry { throw new OutOfStock("наушники"); } catch (e) { console.log(e instanceof OutOfStock, e.name, e.item); }', { covers: [] }),
      rule("Перебрасываешь ошибку — передай исходную в `cause`, иначе причина потеряется.")
    ],
    tasks: [task("Ошибка склада", "Сделай класс `OutOfStock extends Error` с `name = \"OutOfStock\"` и полем `item`, и функцию `brew(stock, item)`: если `stock[item]` нет или 0 — бросает `OutOfStock`, иначе уменьшает остаток.", {
      start: 'function brew(stock, item) {\n  if (!stock[item]) throw new Error("нет");\n  stock[item]--;\n}\n',
      checks: [run('(() => { try { brew({ milk: 0 }, "milk"); return false; } catch (e) { return e instanceof OutOfStock && e.name === "OutOfStock" && e.item === "milk" && e instanceof Error; } })()', "Своя ошибка с полем item"), run('(() => { const s = { milk: 2 }; brew(s, "milk"); return s.milk === 1; })()', "Есть на складе — варим")],
      solution: 'class OutOfStock extends Error {\n  constructor(item) {\n    super(`Нет на складе: ${item}`);\n    this.name = "OutOfStock";\n    this.item = item;\n  }\n}\nfunction brew(stock, item) {\n  if (!stock[item]) throw new OutOfStock(item);\n  stock[item]--;\n}'
    })],
    quizzes: [
      single("js-error-cause", "cause", "Зачем `new Error(\"…\", { cause })`?", [["chain", "Сохранить исходную ошибку как причину"], ["code", "Задать код ошибки"], ["silent", "Не показывать ошибку"], ["retry", "Повторить операцию"]], "chain", "Причина доступна в e.cause."),
      single("js-rangeerror", "RangeError", "Что бросит `(1).toFixed(200)`?", [["range", "RangeError"], ["type", "TypeError"], ["syntax", "SyntaxError"], ["none", "Ничего"]], "range", "Число знаков вне допустимого диапазона.")
    ]
  });

  L({
    slug: "resources", title: "Управление ресурсами: using", summary: "Объявления using и await using, Symbol.dispose и Symbol.asyncDispose, DisposableStack, AsyncDisposableStack и SuppressedError.",
    skill: ["js-resources", "Управление ресурсами", "Гарантированно освобождать ресурсы при выходе из блока."],
    now: "Гарантированно освобождаем ресурсы: using и DisposableStack.",
    body: [
      scene("Забытое соединение",
        ["bug", "Открыл принтер, а закрыть забыл. Через час принтер занят навсегда! Хе-хе."],
        ["nika", "`using` закрывает ресурс сам при выходе из блока — даже если внутри случилась ошибка."]),
      val("Symbol.dispose · Symbol.asyncDispose", "Метод освобождения", "Объект-ресурс объявляет метод `[Symbol.dispose]()` (или асинхронный `[Symbol.asyncDispose]()`), который его закрывает.", "Сделать свой ресурс совместимым с using.", 'const printer = { [Symbol.dispose]() { console.log("Принтер закрыт"); } };\nprinter[Symbol.dispose]();', { covers: ["Symbol.dispose", "Symbol.asyncDispose"] }),
      kw("using", "Освободить при выходе", "`using r = open();` — в конце блока автоматически вызывается `r[Symbol.dispose]()`, в обратном порядке объявления.", "Файлы, соединения, блокировки.", 'function open(name) {\n  console.log("Открыт", name);\n  return { [Symbol.dispose]() { console.log("Закрыт", name); } };\n}\n{\n  using a = open("принтер");\n  using b = open("касса");\n  console.log("Печатаем чек");\n}', { covers: ["using"] }),
      kw("await using", "Асинхронное освобождение", "`await using r = …` — в конце блока ждёт `await r[Symbol.asyncDispose]()`.", "Соединения, которые закрываются асинхронно.", 'async function main() {\n  {\n    await using conn = { async [Symbol.asyncDispose]() { await wait(50); console.log("Соединение закрыто"); } };\n    console.log("Работаем");\n  }\n  console.log("После блока");\n}\nawait main();', { covers: ["await using"] }),
      obj("DisposableStack", "Стопка ресурсов", "`stack.use(r)` — добавить ресурс, `defer(fn)` — добавить действие уборки, `adopt(value, fn)` — значение со своей функцией освобождения, `move()` — передать стопку, `dispose()` — освободить всё; `disposed` — освобождена ли.", "Много ресурсов, созданных по условию.", 'const stack = new DisposableStack();\nstack.defer(() => console.log("уборка 1"));\nstack.adopt("файл", (f) => console.log("закрыт", f));\nconst moved = stack.move();\nconsole.log(stack.disposed);\nmoved.dispose();\nconsole.log(moved.disposed);', { covers: ["DisposableStack", ...DS("defer", "adopt", "move")] }),
      meth("use() · dispose() · disposed · [Symbol.dispose]", "Методы DisposableStack", "`use(resource)` регистрирует объект с `Symbol.dispose`; `dispose()` и `[Symbol.dispose]()` освобождают в обратном порядке; `disposed` — флаг.", "Стопку можно саму объявить через `using`.", 'const stack = new DisposableStack();\nstack.use({ [Symbol.dispose]() { console.log("ресурс освобождён"); } });\nstack[Symbol.dispose]();\nconsole.log(stack.disposed);', { covers: DS("use", "dispose", "disposed") }),
      obj("AsyncDisposableStack", "Асинхронная стопка", "То же для асинхронных ресурсов: `use`, `defer`, `adopt`, `move` и `disposeAsync()`; флаг `disposed`.", "Несколько асинхронных соединений.", 'const s = new AsyncDisposableStack();\ns.defer(async () => { await wait(20); console.log("асинхронная уборка"); });\nawait s.disposeAsync();\nconsole.log(s.disposed);', { covers: ["AsyncDisposableStack", ...ADS("defer", "disposeAsync", "disposed")] }),
      meth("use() · adopt() · move()", "Методы асинхронной стопки", "Как у DisposableStack, но ресурсы и функции могут быть асинхронными.", "Собрать асинхронные ресурсы.", 'const s = new AsyncDisposableStack();\ns.use({ async [Symbol.asyncDispose]() { console.log("закрыто"); } });\ns.adopt(1, async () => console.log("adopt"));\nawait s.move().disposeAsync();', { covers: ADS("use", "adopt", "move") }),
      obj("SuppressedError", "Ошибка при уборке", "Если упала и работа, и освобождение ресурса, бросается `SuppressedError`: `error` — ошибка уборки, `suppressed` — исходная.", "Не потерять ни одну из ошибок.", 'try {\n  using r = { [Symbol.dispose]() { throw new Error("не закрылся"); } };\n  throw new Error("сбой работы");\n} catch (e) {\n  console.log(e.name, e.error.message, "/", e.suppressed.message);\n}', { covers: ["SuppressedError"] }),
      rule("Открыл — объяви через `using`. Тогда «забыл закрыть» становится невозможным.")
    ],
    tasks: [task("Принтер сам закрывается", "Напиши `openPrinter(log)`: возвращает объект с методом `print(text)` (пишет в `log`) и `[Symbol.dispose]()` (пишет `\"closed\"`). Функция `printReceipt(log)` должна открыть принтер через `using`, напечатать `\"чек\"` и закрыться сама.", {
      start: 'function openPrinter(log) {\n  return { print(text) { log.push(text); } };\n}\nfunction printReceipt(log) {\n  const p = openPrinter(log);\n  p.print("чек");\n}\n',
      checks: [run('(() => { const log = []; printReceipt(log); return log.join() === "чек,closed"; })()', "Печать, потом закрытие"), run('(() => { const log = []; try { (() => { using p = openPrinter(log); throw new Error("x"); })(); } catch {} return log.join() === "closed"; })()', "Закрывается и при ошибке"), has("using ", "Через `using`")],
      solution: 'function openPrinter(log) {\n  return {\n    print(text) { log.push(text); },\n    [Symbol.dispose]() { log.push("closed"); }\n  };\n}\nfunction printReceipt(log) {\n  using p = openPrinter(log);\n  p.print("чек");\n}'
    })],
    quizzes: [
      single("js-using-when", "Когда", "Когда вызывается `[Symbol.dispose]()` у `using`-переменной?", [["exit", "При выходе из блока, даже при ошибке"], ["gc", "При сборке мусора"], ["now", "Сразу после объявления"], ["never", "Никогда сам"]], "exit", "Детерминированное освобождение."),
      single("js-using-order", "Порядок", "В каком порядке освобождаются `using a` и потом `using b`?", [["reverse", "Сначала b, потом a"], ["same", "Сначала a, потом b"], ["parallel", "Одновременно"], ["random", "Как повезёт"]], "reverse", "Как стопка: последний открытый закрывается первым.")
    ]
  });

  L({
    slug: "promises-full", title: "Промисы полностью", summary: "Promise.resolve, Promise.reject, Promise.allSettled, Promise.any, Promise.race, Promise.try и Promise.withResolvers.",
    skill: ["js-promises-full", "Комбинаторы промисов", "Запускать асинхронные операции параллельно и выбирать нужную стратегию ожидания."],
    now: "Выбираем стратегию ожидания: все комбинаторы промисов.",
    body: [
      scene("Три сервера",
        ["you", "У нас три зеркала с данными. Какое использовать?"],
        ["nika", "Зависит от задачи: все результаты — `allSettled`, самый быстрый успешный — `any`, кто первый — `race`."]),
      meth("Promise.resolve() · Promise.reject()", "Готовые промисы", "`resolve(v)` — уже выполненный промис (или тот же, если v — промис), `reject(e)` — уже отклонённый.", "Вернуть промис из функции, где результат готов.", 'Promise.resolve(220).then((p) => console.log("цена", p));\nPromise.reject(new Error("нет")).catch((e) => console.log("ошибка", e.message));', { covers: on("Promise", "resolve", "reject") }),
      meth("Promise.allSettled()", "Дождаться всех исходов", "Ждёт все промисы и даёт массив `{ status: \"fulfilled\", value }` или `{ status: \"rejected\", reason }`. Никогда не падает.", "Отчёт: что получилось, что нет.", 'const res = await Promise.allSettled([Promise.resolve("меню"), Promise.reject(new Error("акции"))]);\nconsole.log(res.map((r) => r.status));', { covers: on("Promise", "allSettled") }),
      meth("Promise.any()", "Первый успешный", "Выполняется значением первого успешного промиса; если упали все — `AggregateError`.", "Самое быстрое из рабочих зеркал.", 'const fast = await Promise.any([Promise.reject(new Error("зеркало 1 лежит")), wait(50).then(() => "зеркало 2")]);\nconsole.log(fast);', { covers: on("Promise", "any") }),
      meth("Promise.race()", "Кто первый", "Принимает исход первого завершившегося — успех или ошибку.", "Тайм-аут для запроса.", 'const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("тайм-аут")), ms));\ntry { await Promise.race([wait(500), timeout(50)]); } catch (e) { console.log(e.message); }', { covers: on("Promise", "race") }),
      meth("Promise.try()", "Промис из любой функции", "`Promise.try(fn)` вызывает `fn` и всегда возвращает промис: синхронная ошибка тоже становится отклонением.", "Единая обработка ошибок у синхронного и асинхронного кода.", 'Promise.try(() => JSON.parse("{")).catch((e) => console.log("поймали", e.name));', { covers: on("Promise", "try") }),
      meth("Promise.withResolvers()", "Промис и его рычаги", "Возвращает `{ promise, resolve, reject }` — можно выполнить промис снаружи, например из обработчика события.", "Превратить событие в промис.", 'const { promise, resolve } = Promise.withResolvers();\nsetTimeout(() => resolve("данные готовы"), 50);\nconsole.log(await promise);', { covers: on("Promise", "withResolvers") }),
      rule("Все нужны — `all`. Все, но без падения — `allSettled`. Любой успешный — `any`. Самый быстрый — `race`.")
    ],
    tasks: [task("Тайм-аут запроса", "Напиши `withTimeout(promise, ms)`: возвращает результат `promise`, а если он не успел за `ms` — отклоняется ошибкой с текстом `\"Тайм-аут\"`. Используй `Promise.race`.", {
      start: "function withTimeout(promise, ms) {\n  return promise;\n}\n",
      checks: [run('await withTimeout(wait(10).then(() => "ok"), 200) === "ok"', "Успел — результат"), run('await withTimeout(wait(300), 30).then(() => false, (e) => e.message === "Тайм-аут")', "Не успел — тайм-аут"), has("race", "Через `Promise.race`")],
      solution: 'function withTimeout(promise, ms) {\n  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Тайм-аут")), ms));\n  return Promise.race([promise, timeout]);\n}'
    })],
    quizzes: [
      single("js-allsettled", "allSettled", "Когда `Promise.allSettled` отклоняется?", [["never", "Никогда — он всегда даёт массив исходов"], ["any", "Если любой отклонён"], ["all", "Если все отклонены"], ["first", "Если первый отклонён"]], "never", "Подходит для отчётов."),
      single("js-any-all-fail", "any", "Что бросит `Promise.any`, если все промисы упали?", [["agg", "AggregateError"], ["first", "Первую ошибку"], ["last", "Последнюю ошибку"], ["none", "Ничего, вернёт undefined"]], "agg", "Все ошибки — в errors.")
    ]
  });

  L({
    slug: "json-full", title: "JSON полностью", summary: "Функции replacer и reviver, отступы space, метод toJSON, JSON.rawJSON и JSON.isRawJSON.",
    skill: ["js-json-full", "JSON целиком", "Точно управлять тем, как данные превращаются в JSON и обратно."],
    now: "Точно управляем превращением данных в JSON и обратно.",
    body: [
      scene("Точный JSON",
        ["bug", "Номер заказа 12345678901234567890 после JSON превратится в …7000. Хе-хе."],
        ["nika", "У JSON есть тонкие настройки: что брать, как отступать, как читать даты и как вставить число «как есть»."]),
      idea("replacer и space", "Что и как сериализовать", "`JSON.stringify(v, replacer, space)`: `replacer` — массив разрешённых ключей или функция `(key, value) => …`; `space` — отступ для читаемости.", "Убрать служебные поля, красиво вывести.", 'const order = { id: 7, item: "Пенал", _secret: "x" };\nconsole.log(JSON.stringify(order, ["id", "item"]));\nconsole.log(JSON.stringify(order, (k, v) => (k.startsWith("_") ? undefined : v), 2));', { covers: [] }),
      idea("reviver и toJSON", "Как читать и как писать", "`JSON.parse(text, reviver)` — функция может превратить строки обратно в даты. Метод объекта `toJSON()` решает, что попадёт в JSON (так работает `Date`).", "Даты туда и обратно.", 'const text = JSON.stringify({ at: new Date(Date.UTC(2026, 10, 2)) });\nconst back = JSON.parse(text, (k, v) => (k === "at" ? new Date(v) : v));\nconsole.log(text, back.at instanceof Date);', { covers: [] }),
      meth("JSON.rawJSON() · JSON.isRawJSON()", "Вставить JSON как есть", "`JSON.rawJSON(\"12345678901234567890\")` — значение, которое `stringify` вставит без изменений (большие числа без потери точности). `isRawJSON` — проверка.", "Отправить точный BigInt как число JSON.", 'const id = 12345678901234567890n;\nconsole.log(JSON.stringify({ id: JSON.rawJSON(id.toString()) }), JSON.isRawJSON(JSON.rawJSON("1")));', { covers: on("JSON", "rawJSON", "isRawJSON") }),
      rule("BigInt в JSON — через `JSON.rawJSON(String(big))`, иначе `stringify` бросит ошибку.")
    ],
    tasks: [task("Заказ для сервера", "Напиши `toServer(order)`: JSON без полей, начинающихся с `_` (через replacer-функцию), а BigInt-поле `id` вставь точным числом через `JSON.rawJSON`.", {
      start: "function toServer(order) {\n  return JSON.stringify(order);\n}\n",
      checks: [run('toServer({ id: 12345678901234567890n, item: "Пенал", _note: "x" }) === \'{"id":12345678901234567890,"item":"Пенал"}\'', "Точный номер, без служебных полей"), has("rawJSON", "Через `JSON.rawJSON`")],
      solution: 'function toServer(order) {\n  return JSON.stringify(order, (key, value) => {\n    if (key.startsWith("_")) return undefined;\n    if (typeof value === "bigint") return JSON.rawJSON(value.toString());\n    return value;\n  });\n}'
    })],
    quizzes: [
      single("js-json-replacer", "replacer", "Что сделает replacer, вернувший `undefined` для ключа?", [["skip", "Ключ не попадёт в JSON"], ["null", "Запишет null"], ["err", "Бросит ошибку"], ["empty", "Запишет пустую строку"]], "skip", "Так убирают поля."),
      single("js-json-bigint", "BigInt", "Что сделает `JSON.stringify({ n: 1n })`?", [["err", "TypeError"], ["num", "{\"n\":1}"], ["str", "{\"n\":\"1n\"}"], ["null", "{\"n\":null}"]], "err", "Нужен rawJSON или преобразование.")
    ]
  });
}
