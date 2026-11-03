// Chapter 19: Metaprogramming — Symbol, well-known symbols, Proxy and Reflect.
import { scene, rule, meth, obj, fnc, val, typ, run, has, task, makeLesson, on } from "./kit.mjs";

const RF = (...m) => on("Reflect", ...m);

export default function meta(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single } = c;

  L({
    slug: "symbols", title: "Symbol: уникальные ключи", summary: "Symbol(), description, toString, valueOf, глобальный реестр Symbol.for и Symbol.keyFor.",
    skill: ["js-symbols", "Символы", "Создавать уникальные ключи, которые не пересекаются с чужими."],
    now: "Создаём уникальные ключи, которые не пересекаются с чужими: Symbol.",
    body: [
      scene("Чужое поле",
        ["bug", "Мой плагин тоже пишет `order.id`. Ваш номер заказа — всё! Хе-хе."],
        ["nika", "Символ — уникальный ключ. Два символа с одинаковым описанием всё равно разные, и чужой код его случайно не затрёт."]),
      typ("Symbol()", "Уникальное значение", "`Symbol(\"описание\")` — каждый вызов даёт новое уникальное значение. Описание — только для отладки.", "Ключи, которые не столкнутся с чужими.", 'const a = Symbol("id"), b = Symbol("id");\nconst order = { id: 1, [a]: "наш" };\nconsole.log(a === b, order[a], Object.keys(order));', { covers: ["Symbol"] }),
      meth("description · toString() · valueOf()", "Описание символа", "`sym.description` — текст описания, `toString()` → `\"Symbol(id)\"`, `valueOf()` — сам символ.", "Отладка и логи.", 'const s = Symbol("заказ");\nconsole.log(s.description, s.toString(), s.valueOf() === s);', { covers: on("Symbol.prototype", "description", "toString", "valueOf") }),
      meth("Symbol.for() · Symbol.keyFor()", "Глобальный реестр", "`Symbol.for(\"key\")` возвращает один и тот же символ для одного ключа во всей программе (даже между iframe); `Symbol.keyFor(sym)` — его ключ.", "Общий символ для разных модулей.", 'const a = Symbol.for("app.order"), b = Symbol.for("app.order");\nconsole.log(a === b, Symbol.keyFor(a), Symbol.keyFor(Symbol("x")));', { covers: on("Symbol", "for", "keyFor") }),
      rule("Добавляешь своё свойство в чужой объект — делай ключ символом.")
    ],
    tasks: [task("Своя метка", "Создай символ `TAG` с описанием `\"app\"` и функцию `mark(obj)`, которая ставит `obj[TAG] = true` и возвращает объект. Метка не должна появляться в `Object.keys` и `JSON.stringify`.", {
      start: 'const TAG = "app";\nfunction mark(obj) {\n  obj[TAG] = true;\n  return obj;\n}\n',
      checks: [run('typeof TAG === "symbol" && TAG.description === "app"', "TAG — символ"), run('(() => { const o = mark({ id: 1 }); return o[TAG] === true && Object.keys(o).join() === "id" && JSON.stringify(o) === \'{"id":1}\'; })()', "Метка скрыта от keys и JSON")],
      solution: 'const TAG = Symbol("app");\nfunction mark(obj) {\n  obj[TAG] = true;\n  return obj;\n}'
    })],
    quizzes: [
      single("js-symbol-unique", "Уникальность", "Что вернёт `Symbol(\"a\") === Symbol(\"a\")`?", [["false", "false"], ["true", "true"], ["err", "Ошибку"], ["undef", "undefined"]], "false", "Каждый символ уникален."),
      single("js-symbol-for", "Реестр", "Что вернёт `Symbol.for(\"a\") === Symbol.for(\"a\")`?", [["true", "true"], ["false", "false"], ["err", "Ошибку"], ["null", "null"]], "true", "Глобальный реестр отдаёт один и тот же символ.")
    ]
  });

  L({
    slug: "well-known-symbols", title: "Встроенные символы", summary: "Symbol.hasInstance, Symbol.isConcatSpreadable, Symbol.species и Symbol.unscopables: как настроить поведение встроенных операций.",
    skill: ["js-well-known-symbols", "Встроенные символы", "Менять поведение instanceof, concat и наследования встроенных классов."],
    now: "Учим свои объекты вести себя как встроенные через встроенные символы.",
    body: [
      scene("Под капотом",
        ["bro", "Я сам вызываю особые методы-символы, когда ты пишешь `instanceof` или `concat`. Переопредели их — и я буду слушаться тебя."]),
      val("Symbol.hasInstance", "Своё instanceof", "Статический метод `[Symbol.hasInstance](x)` решает, что вернёт `x instanceof Класс`.", "Проверка «по форме», а не по прототипу.", 'class HasPrice {\n  static [Symbol.hasInstance](x) { return typeof x?.price === "number"; }\n}\nconsole.log({ price: 220 } instanceof HasPrice, {} instanceof HasPrice);', { covers: ["Symbol.hasInstance"] }),
      val("Symbol.isConcatSpreadable", "Раскрывать ли в concat", "Если `true`, объект-«массив» раскрывается в `concat`; если `false` у массива — вставляется целиком.", "Управлять склейкой коллекций.", 'const pair = { length: 2, 0: "Блокнот", 1: "Пенал", [Symbol.isConcatSpreadable]: true };\nconst box = ["Ластик"];\nbox[Symbol.isConcatSpreadable] = false;\nconsole.log(["Чай"].concat(pair), ["Чай"].concat(box).length);', { covers: ["Symbol.isConcatSpreadable"] }),
      val("Symbol.species", "Какой класс создавать", "Встроенные методы (`map`, `filter`, `then`) создают результат через `constructor[Symbol.species]`. Переопредели — и наследник вернёт обычный Array.", "Наследование от Array и Promise.", "class Menu extends Array {\n  static get [Symbol.species]() { return Array; }\n}\nconst m = Menu.from([1, 2]);\nconsole.log(m instanceof Menu, m.map((x) => x) instanceof Menu);", { covers: ["Symbol.species"] }),
      val("Symbol.unscopables", "Скрыть от with", "Объект с именами свойств, которые не становятся переменными внутри `with`.", "Защищает старый код от новых методов массивов.", 'console.log(Object.keys(Array.prototype[Symbol.unscopables]).slice(0, 4));', { covers: ["Symbol.unscopables"] }),
      rule("Встроенные символы — это крючки, за которые цепляется сам язык. Трогай их, когда делаешь свою «встроенную» коллекцию.")
    ],
    tasks: [task("Проверка формы", "Сделай класс `Drink` со статическим `[Symbol.hasInstance](x)`: true для объектов, у которых есть строка `name` и число `price`.", {
      start: "class Drink {}\n",
      checks: [run('({ name: "Блокнот", price: 220 }) instanceof Drink', "Подходящий объект — Drink"), run('!(({ name: "Блокнот" }) instanceof Drink) && !(null instanceof Drink)', "Неполный — нет")],
      solution: 'class Drink {\n  static [Symbol.hasInstance](x) {\n    return typeof x?.name === "string" && typeof x?.price === "number";\n  }\n}'
    })],
    quizzes: [single("js-species", "species", "Зачем `Symbol.species`?", [["ctor", "Задать, какой класс создают методы вроде map у наследника"], ["kind", "Узнать вид объекта"], ["clone", "Клонировать объект"], ["type", "Проверить тип"]], "ctor", "Например, чтобы map вернул обычный Array.")]
  });

  L({
    slug: "proxy", title: "Proxy: перехват операций", summary: "new Proxy с ловушками get, set, has, deleteProperty, apply, construct и Proxy.revocable.",
    skill: ["js-proxy", "Proxy", "Перехватывать чтение, запись и вызовы у объектов."],
    now: "Перехватываем операции с объектами: Proxy.",
    body: [
      scene("Стражник",
        ["bug", "`prices.pen = -100` — и вы ещё и доплачиваете покупателю! Хе-хе."],
        ["nika", "Proxy — обёртка, которая видит каждую операцию с объектом и может её остановить."]),
      obj("Proxy", "Обёртка с ловушками", "`new Proxy(target, handler)` — каждая операция (чтение `get`, запись `set`, `in` — `has`, `delete` — `deleteProperty`, вызов `apply`, `new` — `construct`…) проходит через метод-ловушку `handler`.", "Валидация, логирование, значения по умолчанию, реактивность.", 'const menu = new Proxy({ latte: 220 }, {\n  get: (t, key) => key in t ? t[key] : "нет в меню",\n  set(t, key, value) {\n    if (value < 0) throw new RangeError("Цена не может быть отрицательной");\n    t[key] = value;\n    return true;\n  }\n});\nconsole.log(menu.latte, menu.raf);\ntry { menu.latte = -1; } catch (e) { console.log(e.message); }', { covers: ["Proxy"] }),
      meth("Proxy.revocable()", "Отзываемый доступ", "Возвращает `{ proxy, revoke }`; после `revoke()` любая операция с proxy — TypeError.", "Временный доступ к объекту для чужого кода.", 'const { proxy, revoke } = Proxy.revocable({ secret: 42 }, {});\nconsole.log(proxy.secret);\nrevoke();\ntry { proxy.secret; } catch (e) { console.log(e.name); }', { covers: on("Proxy", "revocable") }),
      rule("Proxy — для сквозных правил (валидация, логи). Для обычной логики достаточно классов и геттеров.")
    ],
    tasks: [task("Защищённые цены", "Сделай `guarded(obj)`: Proxy, где `set` бросает `RangeError` на отрицательную или не числовую цену, а `get` для отсутствующего ключа возвращает `0`.", {
      start: "function guarded(obj) {\n  return obj;\n}\n",
      checks: [run("(() => { const m = guarded({ latte: 220 }); m.raf = 290; return m.raf === 290 && m.cocoa === 0; })()", "Запись и значение по умолчанию"), run('(() => { const m = guarded({}); try { m.x = -1; return false; } catch (e) { return e instanceof RangeError; } })()', "Отрицательная цена — RangeError"), run('(() => { const m = guarded({}); try { m.x = "дорого"; return false; } catch (e) { return e instanceof RangeError; } })()', "Не число — RangeError")],
      solution: 'function guarded(obj) {\n  return new Proxy(obj, {\n    get: (t, key) => (key in t ? t[key] : 0),\n    set(t, key, value) {\n      if (typeof value !== "number" || value < 0) throw new RangeError("Неверная цена");\n      t[key] = value;\n      return true;\n    }\n  });\n}'
    })],
    quizzes: [single("js-proxy-set", "Ловушка set", "Что должна вернуть ловушка `set` при успешной записи?", [["true", "true"], ["value", "Записанное значение"], ["undef", "Ничего"], ["target", "Объект target"]], "true", "false в строгом режиме даст TypeError.")]
  });

  L({
    slug: "reflect", title: "Reflect: операции как функции", summary: "Reflect.get, set, has, deleteProperty, ownKeys, defineProperty, getOwnPropertyDescriptor, getPrototypeOf, setPrototypeOf, isExtensible, preventExtensions, apply и construct.",
    skill: ["js-reflect", "Reflect", "Выполнять операции над объектами функциями — особенно внутри ловушек Proxy."],
    now: "Выполняем операции над объектами функциями: Reflect.",
    body: [
      scene("Обычная операция",
        ["bro", "Каждой ловушке Proxy соответствует функция Reflect с теми же аргументами. Внутри ловушки вызываешь Reflect — и операция идёт как обычно."]),
      obj("Reflect · get() · set()", "Чтение и запись", "`Reflect.get(obj, key, receiver)` и `Reflect.set(obj, key, value, receiver)` — как `obj[key]`, но функцией; `set` возвращает true или false вместо ошибки.", "Прокинуть операцию дальше из Proxy.", 'const log = [];\nconst p = new Proxy({ latte: 220 }, {\n  get(t, k, r) { log.push(k); return Reflect.get(t, k, r); }\n});\np.latte;\nconsole.log(log, Reflect.set(Object.freeze({}), "x", 1));', { covers: ["Reflect", ...RF("get", "set")] }),
      meth("Reflect.has() · Reflect.deleteProperty() · Reflect.ownKeys()", "in, delete и все ключи", "`has` — как `in`, `deleteProperty` — как `delete` (возвращает успех), `ownKeys` — все свои ключи, включая символы и неперечисляемые.", "Полная картина свойств.", 'const o = { a: 1, [Symbol("s")]: 2 };\nconsole.log(Reflect.has(o, "a"), Reflect.ownKeys(o).length, Reflect.deleteProperty(o, "a"), o);', { covers: RF("has", "deleteProperty", "ownKeys") }),
      meth("Reflect.defineProperty() · Reflect.getOwnPropertyDescriptor()", "Дескрипторы", "Как одноимённые методы Object, но `defineProperty` возвращает true/false вместо исключения.", "Проверяемое определение свойств.", 'const o = Object.freeze({});\nconsole.log(Reflect.defineProperty(o, "x", { value: 1 }), Reflect.getOwnPropertyDescriptor({ a: 1 }, "a").writable);', { covers: RF("defineProperty", "getOwnPropertyDescriptor") }),
      meth("Reflect.getPrototypeOf() · Reflect.setPrototypeOf()", "Прототип", "Как у Object; `setPrototypeOf` возвращает успех.", "Управление прототипом в ловушках.", "const proto = { hi() { return \"привет\"; } };\nconst o = {};\nconsole.log(Reflect.setPrototypeOf(o, proto), Reflect.getPrototypeOf(o) === proto, o.hi());", { covers: RF("getPrototypeOf", "setPrototypeOf") }),
      meth("Reflect.isExtensible() · Reflect.preventExtensions()", "Расширяемость", "Как у Object, `preventExtensions` возвращает успех.", "Проверки в ловушках.", "const o = {};\nconsole.log(Reflect.isExtensible(o), Reflect.preventExtensions(o), Reflect.isExtensible(o));", { covers: RF("isExtensible", "preventExtensions") }),
      fnc("Reflect.apply() · Reflect.construct()", "Вызов и создание", "`apply(fn, this, args)` — вызвать функцию; `construct(Class, args)` — как `new Class(...args)`.", "Ловушки apply и construct.", "class Order { constructor(id) { this.id = id; } }\nconsole.log(Reflect.apply(Math.max, null, [150, 290]), Reflect.construct(Order, [7]).id);", { covers: RF("apply", "construct") }),
      rule("В ловушке Proxy делай «как обычно» через Reflect с теми же аргументами — так не потеряется `receiver`.")
    ],
    tasks: [task("Журнал чтений", "Сделай `logged(obj, log)`: Proxy, который в ловушке `get` добавляет имя ключа в массив `log` и возвращает значение через `Reflect.get`.", {
      start: "function logged(obj, log) {\n  return obj;\n}\n",
      checks: [run('(() => { const log = []; const p = logged({ latte: 220, raf: 290 }, log); return p.latte === 220 && p.raf === 290 && log.join() === "latte,raf"; })()', "Чтения записаны"), has("Reflect.get", "Через `Reflect.get`")],
      solution: "function logged(obj, log) {\n  return new Proxy(obj, {\n    get(target, key, receiver) {\n      log.push(key);\n      return Reflect.get(target, key, receiver);\n    }\n  });\n}"
    })],
    quizzes: [single("js-reflect-why", "Зачем Reflect", "Чем `Reflect.set` удобнее присваивания внутри ловушки?", [["bool", "Возвращает успех и передаёт receiver, не бросая ошибок"], ["fast", "Быстрее"], ["async", "Асинхронный"], ["none", "Ничем"]], "bool", "И совпадает по аргументам с ловушкой.")]
  });
}
