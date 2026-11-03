// Chapter 13: Objects and functions in depth — prototypes, own properties, descriptors,
// freezing, conversion to primitives, Function.prototype and the global functions.
import { scene, rule, kw, meth, obj, fnc, val, idea, run, has, task, makeLesson, on } from "./kit.mjs";

const O = (...m) => on("Object", ...m);
const OP = (...m) => on("Object.prototype", ...m);

export default function objectsDeep(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, short } = c;

  L({
    slug: "prototypes", title: "Прототипы", summary: "Цепочка прототипов, Object.create, Object.getPrototypeOf, Object.setPrototypeOf и isPrototypeOf.",
    skill: ["js-prototypes", "Прототипы", "Понимать, откуда объект берёт свойства и методы, и управлять прототипом."],
    now: "Разбираем прототипы: откуда у объектов берутся методы.",
    body: [
      scene("Чужие методы",
        ["you", "Создаю пустой массив, а у него уже есть `map`, `push`… Откуда?"],
        ["bro", "Из прототипа. Если свойства нет у объекта, я ищу его у прототипа, потом у прототипа прототипа — по цепочке."]),
      idea("Цепочка прототипов", "Где ищутся свойства", "У каждого объекта есть скрытая ссылка на прототип. Чтение свойства идёт по цепочке: объект → его прототип → … → `Object.prototype` → `null`. Классы — удобная запись этого механизма.", "Понять наследование и методы встроенных объектов.", "const arr = [];\nconsole.log(Object.getPrototypeOf(arr) === Array.prototype);\nconsole.log(Object.getPrototypeOf(Array.prototype) === Object.prototype);", { covers: ["цепочка прототипов"] }),
      meth("Object.create()", "Объект с заданным прототипом", "`Object.create(proto)` — новый объект, прототипом которого будет `proto`. `Object.create(null)` — объект совсем без прототипа.", "Наследование без классов; «чистый» словарь без лишних ключей.", "const item = { describe() { return `${this.name}, ${this.ml} мл`; } };\nconst pen = Object.create(item);\npen.name = \"Блокнот\";\npen.ml = 350;\nconsole.log(pen.describe());", { covers: O("create") }),
      meth("Object.getPrototypeOf()", "Узнать прототип", "Возвращает прототип объекта.", "Проверить, от кого объект наследует.", "class Order {}\nconsole.log(Object.getPrototypeOf(new Order()) === Order.prototype);", { covers: O("getPrototypeOf") }),
      meth("Object.setPrototypeOf()", "Сменить прототип", "Меняет прототип уже созданного объекта. Работает, но медленно — лучше задавать прототип при создании.", "Редкие случаи «подмены» поведения.", "const hot = { temp() { return \"горячий\"; } };\nconst tech = {};\nObject.setPrototypeOf(tech, hot);\nconsole.log(tech.temp());", { covers: O("setPrototypeOf") }),
      meth("isPrototypeOf()", "Есть ли в цепочке", "`proto.isPrototypeOf(obj)` — true, если `proto` встречается в цепочке прототипов `obj`.", "Проверка наследования без `instanceof`.", "console.log(Array.prototype.isPrototypeOf([]), Object.prototype.isPrototypeOf([]));", { covers: OP("isPrototypeOf") }),
      rule("Метод, которого нет у объекта, ищется в прототипе. Так все массивы делят одни и те же методы.")
    ],
    tasks: [task("Товары через прототип", "Создай объект `item` с методом `label()` (возвращает `` `${this.name} — ${this.price} ₽` ``) и объект `pen` через `Object.create(item)` с `name: \"Блокнот\"` и `price: 220`.", {
      start: "const item = {};\nconst pen = { name: \"Блокнот\", price: 220 };\n",
      checks: [run('pen.label() === "Блокнот — 220 ₽"', "Метод работает"), run("Object.getPrototypeOf(pen) === item", "Прототип pen — item"), run('!Object.hasOwn(pen, "label")', "Метод не скопирован, а унаследован")],
      solution: "const item = {\n  label() { return `${this.name} — ${this.price} ₽`; }\n};\nconst pen = Object.create(item);\npen.name = \"Блокнот\";\npen.price = 220;"
    })],
    quizzes: [
      single("js-proto-end", "Конец цепочки", "Чем заканчивается цепочка прототипов обычного объекта?", [["null", "`null` после Object.prototype"], ["undef", "undefined"], ["window", "window"], ["loop", "Она бесконечна"]], "null", "Object.prototype — последний объект в цепочке."),
      single("js-create-null", "create(null)", "Чем особенен `Object.create(null)`?", [["noproto", "У него нет прототипа и лишних свойств"], ["empty", "Это то же, что {}"], ["frozen", "Он заморожен"], ["error", "Это ошибка"]], "noproto", "Удобно как чистый словарь.")
    ]
  });

  L({
    slug: "own-properties", title: "Свои свойства", summary: "Object.hasOwn, hasOwnProperty, propertyIsEnumerable, getOwnPropertyNames, getOwnPropertySymbols, Object.assign и Object.groupBy.",
    skill: ["js-own-props", "Собственные свойства", "Отличать свои свойства от унаследованных и копировать и группировать объекты."],
    now: "Отличаем свои свойства от унаследованных, копируем и группируем объекты.",
    body: [
      scene("Чьё свойство",
        ["bug", "`\"toString\" in order` — true! Значит, у заказа есть поле toString?"],
        ["nika", "Оно унаследовано. Свои свойства проверяют через `Object.hasOwn`."]),
      meth("Object.hasOwn()", "Своё ли свойство", "`Object.hasOwn(obj, key)` — true, только если свойство принадлежит самому объекту.", "Отличить данные от унаследованного.", 'const order = { item: "Пенал" };\nconsole.log("toString" in order, Object.hasOwn(order, "toString"), Object.hasOwn(order, "item"));', { covers: O("hasOwn") }),
      meth("hasOwnProperty()", "Старый способ", "`obj.hasOwnProperty(key)` — то же, что `Object.hasOwn`, но ломается у объектов без прототипа. В новом коде — `Object.hasOwn`.", "Узнать в чужом коде.", 'console.log({ a: 1 }.hasOwnProperty("a"));', { covers: OP("hasOwnProperty") }),
      meth("propertyIsEnumerable()", "Перечисляемое ли", "true, если свойство своё и видно в `for…in` и `Object.keys`.", "Проверить, попадёт ли свойство в перебор.", 'const arr = [1];\nconsole.log(arr.propertyIsEnumerable(0), arr.propertyIsEnumerable("length"));', { covers: OP("propertyIsEnumerable") }),
      meth("Object.getOwnPropertyNames()", "Все строковые ключи", "Все свои ключи-строки, включая неперечисляемые (в отличие от `Object.keys`).", "Увидеть скрытые свойства.", 'console.log(Object.keys([1, 2]), Object.getOwnPropertyNames([1, 2]));', { covers: O("getOwnPropertyNames") }),
      meth("Object.getOwnPropertySymbols()", "Ключи-символы", "Свои ключи-символы объекта — их не показывают ни `keys`, ни `getOwnPropertyNames`.", "Найти спрятанные символьные свойства.", 'const id = Symbol("id");\nconst o = { [id]: 7, name: "Пенал" };\nconsole.log(Object.keys(o), Object.getOwnPropertySymbols(o).length);', { covers: O("getOwnPropertySymbols") }),
      meth("Object.assign()", "Скопировать свойства", "`Object.assign(target, ...sources)` копирует свои перечисляемые свойства в `target` и возвращает его. Копия неглубокая.", "Слить настройки, сделать поверхностную копию.", 'const defaults = { size: "M", sugar: 0 };\nconst order = Object.assign({}, defaults, { sugar: 2 });\nconsole.log(order);', { covers: O("assign") }),
      meth("Object.groupBy()", "Сгруппировать", "`Object.groupBy(items, fn)` — объект, где ключ — результат `fn`, а значение — массив элементов с этим ключом.", "Каталог по категориям одной строкой.", 'const catalog = [{ n: "Блокнот", c: "office" }, { n: "Стикер", c: "dessert" }, { n: "Пенал", c: "office" }];\nconsole.log(Object.groupBy(catalog, (d) => d.c));', { covers: O("groupBy") }),
      rule("Проверка своих свойств — `Object.hasOwn`. Оператор `in` смотрит ещё и в прототип.")
    ],
    tasks: [task("Каталог по категориям", "Сгруппируй `catalog` по `category` через `Object.groupBy` в `groups`, и сделай `order` — копию `defaults`, поверх которой наложен `custom`, через `Object.assign`.", {
      start: 'const catalog = [{ name: "Блокнот", category: "office" }, { name: "Стикер", category: "dessert" }, { name: "Пенал", category: "office" }];\nconst defaults = { size: "M", sugar: 0 };\nconst custom = { sugar: 2 };\nconst groups = {};\nconst order = defaults;\n',
      checks: [run("groups.office.length === 2 && groups.dessert[0].name === \"Стикер\"", "Группы собраны"), run('order.size === "M" && order.sugar === 2', "Настройки слиты"), run("order !== defaults && defaults.sugar === 0", "defaults не испорчен")],
      solution: 'const catalog = [{ name: "Блокнот", category: "office" }, { name: "Стикер", category: "dessert" }, { name: "Пенал", category: "office" }];\nconst defaults = { size: "M", sugar: 0 };\nconst custom = { sugar: 2 };\nconst groups = Object.groupBy(catalog, (d) => d.category);\nconst order = Object.assign({}, defaults, custom);'
    })],
    quizzes: [
      single("js-hasown-vs-in", "in и hasOwn", "Что вернут `\"toString\" in {}` и `Object.hasOwn({}, \"toString\")`?", [["tf", "true и false"], ["tt", "true и true"], ["ff", "false и false"], ["ft", "false и true"]], "tf", "in смотрит в прототип."),
      single("js-assign-shallow", "assign", "Глубокая ли копия у `Object.assign({}, obj)`?", [["shallow", "Нет, вложенные объекты остаются общими"], ["deep", "Да, полностью независимая"], ["none", "Это не копия"], ["frozen", "Копия замораживается"]], "shallow", "Для глубокой копии есть structuredClone.")
    ]
  });

  L({
    slug: "property-descriptors", title: "Дескрипторы свойств", summary: "Object.defineProperty, defineProperties, getOwnPropertyDescriptor и getOwnPropertyDescriptors: writable, enumerable, configurable, get и set.",
    skill: ["js-descriptors", "Дескрипторы", "Настраивать свойства: только для чтения, скрытые, вычисляемые."],
    now: "Настраиваем свойства через дескрипторы: только для чтения, скрытые, вычисляемые.",
    body: [
      scene("Только для чтения",
        ["bug", "`order.id = 1` — и все заказы перепутаны!"],
        ["nika", "У каждого свойства есть настройки — дескриптор. Скажем: `writable: false`."]),
      meth("Object.defineProperty()", "Настроить одно свойство", "`Object.defineProperty(obj, key, { value, writable, enumerable, configurable })` или с `get`/`set`. Не указанные флаги по умолчанию `false`.", "Свойства только для чтения, скрытые, вычисляемые.", '"use strict";\nconst order = {};\nObject.defineProperty(order, "id", { value: 1042, enumerable: true });\ntry { order.id = 1; } catch (e) { console.log(e.name); }\nconsole.log(order.id);', { covers: O("defineProperty") }),
      meth("Object.defineProperties()", "Настроить несколько", "То же для многих свойств сразу: `{ a: {…}, b: {…} }`.", "Описать объект целиком.", 'const cup = Object.defineProperties({}, {\n  ml: { value: 350, enumerable: true },\n  liters: { get() { return this.ml / 1000; } }\n});\nconsole.log(cup.ml, cup.liters, Object.keys(cup));', { covers: O("defineProperties") }),
      meth("Object.getOwnPropertyDescriptor()", "Прочитать настройки", "Возвращает дескриптор свойства: `value`, `writable`, `enumerable`, `configurable` (или `get`/`set`).", "Узнать, можно ли менять свойство.", 'console.log(Object.getOwnPropertyDescriptor([1], "length"));', { covers: O("getOwnPropertyDescriptor") }),
      meth("Object.getOwnPropertyDescriptors()", "Все настройки", "Дескрипторы всех своих свойств. С `Object.defineProperties` даёт точную копию вместе с геттерами.", "Копировать объект, не теряя get/set.", 'const src = { get now() { return "вычислено"; } };\nconst copy = Object.defineProperties({}, Object.getOwnPropertyDescriptors(src));\nconsole.log(copy.now, typeof Object.getOwnPropertyDescriptor(copy, "now").get);', { covers: O("getOwnPropertyDescriptors") }),
      rule("Свойство через `defineProperty` по умолчанию нельзя менять, перечислять и удалять. Флаги включай явно.")
    ],
    tasks: [task("Неизменяемый номер", "Создай `order` и задай ему через `Object.defineProperty` свойство `id = 1042`: только для чтения, но видимое в `Object.keys` (enumerable).", {
      start: "const order = { id: 1042 };\n",
      checks: [run("order.id === 1042", "Номер есть"), run('Object.getOwnPropertyDescriptor(order, "id").writable === false', "Только для чтения"), run('Object.keys(order).includes("id")', "Виден в keys"), has("defineProperty", "Через defineProperty")],
      solution: 'const order = {};\nObject.defineProperty(order, "id", { value: 1042, enumerable: true });'
    })],
    quizzes: [
      single("js-desc-default", "По умолчанию", "Чему по умолчанию равен `writable` у свойства из `defineProperty`, если его не указать?", [["false", "false"], ["true", "true"], ["undef", "undefined"], ["null", "null"]], "false", "Все флаги по умолчанию false."),
      single("js-desc-enum", "enumerable", "Что делает `enumerable: false`?", [["hide", "Свойство не видно в for…in и Object.keys"], ["ro", "Свойство только для чтения"], ["delete", "Свойство удаляется"], ["proto", "Свойство уходит в прототип"]], "hide", "Но читать его можно.")
    ]
  });

  L({
    slug: "freezing", title: "Заморозка объектов", summary: "Object.freeze и isFrozen, Object.seal и isSealed, Object.preventExtensions и isExtensible.",
    skill: ["js-freezing", "Заморозка", "Защищать объекты от изменений на нужном уровне."],
    now: "Защищаем объекты от изменений: preventExtensions, seal и freeze.",
    body: [
      scene("Под замок",
        ["bug", "Поставлю цену блокнота в 1 рубль. И добавлю «бесплатный товар» в каталог!"],
        ["nika", "Три уровня защиты: нельзя добавлять, нельзя добавлять и удалять, нельзя ничего."]),
      meth("Object.preventExtensions() · Object.isExtensible()", "Запретить новые свойства", "Существующие свойства можно менять и удалять, новые добавить нельзя. `isExtensible` проверяет.", "Зафиксировать набор полей.", 'const o = { a: 1 };\nObject.preventExtensions(o);\no.b = 2;\nconsole.log(o, Object.isExtensible(o));', { covers: O("preventExtensions", "isExtensible") }),
      meth("Object.seal() · Object.isSealed()", "Запечатать", "Нельзя добавлять и удалять свойства, но можно менять значения.", "Структура фиксирована, данные меняются.", 'const cup = { ml: 350 };\nObject.seal(cup);\ncup.ml = 450;\ndelete cup.ml;\nconsole.log(cup, Object.isSealed(cup));', { covers: O("seal", "isSealed") }),
      meth("Object.freeze() · Object.isFrozen()", "Заморозить", "Ничего нельзя: ни добавить, ни удалить, ни изменить. Заморозка неглубокая — вложенные объекты остаются изменяемыми.", "Константы, настройки, данные «только читать».", 'const prices = Object.freeze({ pen: 220 });\nprices.pen = 1;\nconsole.log(prices.pen, Object.isFrozen(prices));', { covers: O("freeze", "isFrozen") }),
      rule("`const` защищает переменную, а не объект. Сам объект защищает `Object.freeze`.")
    ],
    tasks: [task("Глубокая заморозка", "Напиши `deepFreeze(obj)`: замораживает объект и все вложенные объекты (рекурсивно) и возвращает его. Заморозь им `catalog`.", {
      start: 'function deepFreeze(obj) {\n  return obj;\n}\nconst catalog = deepFreeze({ office: { pen: 220 }, tech: { mouse: 150 } });\n',
      checks: [run("Object.isFrozen(catalog)", "Каталог заморожен"), run("Object.isFrozen(catalog.office) && Object.isFrozen(catalog.tech)", "Вложенные тоже"), run("(catalog.office.pen = 1, catalog.office.pen === 220)", "Цену не изменить")],
      solution: "function deepFreeze(obj) {\n  for (const value of Object.values(obj)) {\n    if (value && typeof value === \"object\") deepFreeze(value);\n  }\n  return Object.freeze(obj);\n}\nconst catalog = deepFreeze({ office: { pen: 220 }, tech: { mouse: 150 } });"
    })],
    quizzes: [
      single("js-freeze-shallow", "Неглубокая", "Можно ли изменить `frozen.inner.x`, если заморожен только `frozen`?", [["yes", "Да, вложенный объект не заморожен"], ["no", "Нет"], ["error", "Всегда ошибка"], ["copy", "Изменится копия"]], "yes", "freeze — только один уровень."),
      single("js-seal", "seal", "Что разрешено у запечатанного объекта?", [["change", "Менять значения существующих свойств"], ["add", "Добавлять свойства"], ["delete", "Удалять свойства"], ["nothing", "Ничего"]], "change", "Структура фиксирована.")
    ]
  });

  L({
    slug: "to-primitive", title: "Объекты в примитивы", summary: "toString, toLocaleString и valueOf у Object, обёртки Boolean, Symbol.toPrimitive и Symbol.toStringTag.",
    skill: ["js-to-primitive", "Преобразование объектов", "Управлять тем, как объект превращается в строку и число."],
    now: "Управляем тем, как объект превращается в строку и число.",
    body: [
      scene("[object Object]",
        ["you", "Вывожу заказ на страницу — а там `[object Object]`!"],
        ["bro", "Объект не знает, как стать строкой. Научи его — методами `toString`, `valueOf` или `Symbol.toPrimitive`."]),
      meth("toString()", "Объект как строка", "`Object.prototype.toString` даёт `\"[object Тип]\"`. Свой `toString()` используется в шаблонах и склейке.", "Понятный текст объекта.", 'const order = { id: 7, toString() { return `Заказ №${this.id}`; } };\nconsole.log(`${order}`, Object.prototype.toString.call([]));', { covers: OP("toString") }),
      meth("valueOf()", "Объект как число", "Используется в арифметике и сравнении. По умолчанию возвращает сам объект.", "Сравнивать и складывать объекты по смыслу.", "const bill = { total: 440, valueOf() { return this.total; } };\nconsole.log(bill + 60, bill > 400);", { covers: OP("valueOf") }),
      meth("toLocaleString()", "Объект для языка пользователя", "По умолчанию вызывает `toString()`; у чисел, дат и массивов — учитывает язык.", "Единый способ «покажи человеку».", 'console.log((1250.5).toLocaleString("ru-RU"), [1000, 2000].toLocaleString("ru-RU"));', { covers: OP("toLocaleString") }),
      val("Symbol.toPrimitive", "Полный контроль", "Метод `[Symbol.toPrimitive](hint)` получает `\"string\"`, `\"number\"` или `\"default\"` и решает, во что превратиться.", "Разное поведение в тексте и в математике.", 'const price = {\n  [Symbol.toPrimitive](hint) { return hint === "string" ? "220 ₽" : 220; }\n};\nconsole.log(`${price}`, price * 2);', { covers: ["Symbol.toPrimitive"] }),
      val("Symbol.toStringTag", "Имя типа", "Строка под этим ключом подставляется в `[object Имя]`.", "Понятный тип своих объектов при отладке.", 'class Order { get [Symbol.toStringTag]() { return "Order"; } }\nconsole.log(Object.prototype.toString.call(new Order()));', { covers: ["Symbol.toStringTag"] }),
      meth("Boolean: toString() · valueOf()", "Обёртка логического значения", "`true.toString()` → `\"true\"`. Не создавай `new Boolean(false)` — объект-обёртка всегда truthy.", "Знать ловушку обёрток.", "console.log(true.toString(), new Boolean(false) ? \"truthy!\" : \"falsy\", new Boolean(false).valueOf());", { covers: on("Boolean.prototype", "toString", "valueOf") }),
      rule("Объекту, который выводится людям, дай свой `toString()` — и `[object Object]` больше не появится.")
    ],
    tasks: [task("Понятный заказ", "Добавь классу `Order` метод `toString()` (возвращает `` `Заказ №${this.id}: ${this.total} ₽` ``) и `valueOf()` (возвращает `total`).", {
      start: "class Order {\n  constructor(id, total) {\n    this.id = id;\n    this.total = total;\n  }\n}\n",
      checks: [run('`${new Order(7, 440)}` === "Заказ №7: 440 ₽"', "Строка заказа"), run("new Order(1, 300) + new Order(2, 200) === 500", "Заказы складываются"), run("new Order(1, 500) > new Order(2, 200)", "И сравниваются")],
      solution: "class Order {\n  constructor(id, total) {\n    this.id = id;\n    this.total = total;\n  }\n  toString() { return `Заказ №${this.id}: ${this.total} ₽`; }\n  valueOf() { return this.total; }\n}"
    })],
    quizzes: [
      single("js-object-string", "По умолчанию", "Что выведет `String({})`?", [["obj", "\"[object Object]\""], ["empty", "\"\""], ["braces", "\"{}\""], ["err", "Ошибку"]], "obj", "Стандартный Object.prototype.toString."),
      single("js-boolean-wrapper", "Обёртка", "Чем опасен `new Boolean(false)`?", [["truthy", "Это объект, и в условии он truthy"], ["error", "Он бросает ошибку"], ["slow", "Он медленный"], ["nothing", "Ничем"]], "truthy", "Любой объект — truthy.")
    ]
  });

  L({
    slug: "functions-deep", title: "Функции изнутри", summary: "call, apply и bind, свойства length и name, toString у функций и потеря this.",
    skill: ["js-functions-deep", "Методы функций", "Управлять this и аргументами вызова функции."],
    now: "Управляем this и аргументами вызова: call, apply и bind.",
    body: [
      scene("Потерянный this",
        ["bug", "Передал `cart.add` в обработчик клика — и `this` стал совсем другим! Хе-хе."],
        ["nika", "У функций есть методы, чтобы явно задать `this`: `call`, `apply` и `bind`."]),
      meth("call()", "Вызвать с this", "`fn.call(thisArg, a, b)` — вызвать функцию с заданным `this` и аргументами по одному.", "Взять метод одного объекта для другого.", "function label(currency) { return `${this.name}: ${this.price} ${currency}`; }\nconsole.log(label.call({ name: \"Пенал\", price: 290 }, \"₽\"));", { covers: on("Function.prototype", "call") }),
      meth("apply()", "Вызвать с массивом аргументов", "`fn.apply(thisArg, [a, b])` — как `call`, но аргументы массивом.", "Аргументы уже лежат в массиве.", "console.log(Math.max.apply(null, [150, 290, 220]));", { covers: on("Function.prototype", "apply") }),
      meth("bind()", "Привязать навсегда", "`fn.bind(thisArg, …args)` — новая функция с закреплённым `this` (и частью аргументов).", "Методы-обработчики событий, частичное применение.", "const cart = { items: [], add(x) { this.items.push(x); return this.items.length; } };\nconst add = cart.add.bind(cart);\nadd(\"Блокнот\");\nconsole.log(add(\"Пенал\"));", { covers: on("Function.prototype", "bind") }),
      kw("fn.length · fn.name", "Свойства функции", "`length` — число объявленных параметров (до первого со значением по умолчанию и без rest), `name` — имя функции.", "Отладка, универсальные обёртки.", "function order(item, qty, size = \"M\") {}\nconsole.log(order.length, order.name, ((a, ...b) => 0).length);", { covers: on("Function.prototype", "length", "name") }),
      obj("Function", "Конструктор функций", "`new Function(\"a\", \"b\", \"return a + b\")` создаёт функцию из строк. Все функции — экземпляры `Function`. Как и `eval`, выполняет текст как код — небезопасно.", "Понимать, что функции — объекты; почти никогда не нужен.", 'const add = new Function("a", "b", "return a + b");\nconsole.log(add(2, 3), add instanceof Function, (() => 0) instanceof Function);', { covers: ["Function"] }),
      meth("fn.toString()", "Исходный код функции", "Возвращает текст функции, как он записан.", "Отладка и логирование.", "const double = (x) => x * 2;\nconsole.log(double.toString());", { covers: on("Function.prototype", "toString") }),
      rule("Передаёшь метод объекта как колбэк — привяжи его через `bind` или оберни в стрелку.")
    ],
    tasks: [task("Привязанный обработчик", "Сделай `add` — метод `cart.add`, навсегда привязанный к `cart` через `bind`, и `price` — результат `label.call(raf)`.", {
      start: 'const cart = { items: [], add(item) { this.items.push(item); } };\nconst add = cart.add;\nfunction label() { return `${this.name}: ${this.price} ₽`; }\nconst raf = { name: "Пенал", price: 290 };\nconst price = "";\n',
      checks: [run('(add("Блокнот"), cart.items.length === 1)', "Метод работает отдельно от объекта"), run('price === "Пенал: 290 ₽"', "label вызвана для raf"), has("bind", "Использован `bind`"), has(".call(", "Использован `call`")],
      solution: 'const cart = { items: [], add(item) { this.items.push(item); } };\nconst add = cart.add.bind(cart);\nfunction label() { return `${this.name}: ${this.price} ₽`; }\nconst raf = { name: "Пенал", price: 290 };\nconst price = label.call(raf);'
    })],
    quizzes: [
      single("js-call-apply", "call и apply", "Чем `apply` отличается от `call`?", [["array", "Аргументы передаются массивом"], ["this", "apply не задаёт this"], ["new", "apply создаёт объект"], ["same", "Ничем"]], "array", "call — по одному, apply — массивом."),
      short("js-fn-length", "length", "Чему равно `((a, b, c = 1) => 0).length`? Введи число.", ["2"], "Параметры до первого со значением по умолчанию.")
    ]
  });

  L({
    slug: "global-functions", title: "Глобальные значения и функции", summary: "globalThis, Infinity, isFinite, isNaN, eval и кодирование адресов encodeURI, encodeURIComponent, decodeURI, decodeURIComponent.",
    skill: ["js-globals", "Глобальные функции", "Пользоваться функциями глобального объекта и правильно кодировать адреса."],
    now: "Глобальные значения и функции и правильное кодирование адресов.",
    body: [
      scene("Сломанный адрес",
        ["you", "Ввожу в поиск «блокнот & пенал» — и сайт нашёл только «блокнот»."],
        ["bro", "`&` в адресе — разделитель параметров. Значение надо закодировать — `encodeURIComponent`."]),
      obj("globalThis", "Глобальный объект", "Один способ обратиться к глобальному объекту везде: `window` в браузере, `self` в воркере, `global` в Node.", "Писать код, который работает в любой среде.", "globalThis.appName = \"Планер\";\nconsole.log(appName, typeof globalThis);", { covers: ["globalThis"] }),
      val("Infinity", "Бесконечность", "Число больше любого другого; `1 / 0` → `Infinity`, `-1 / 0` → `-Infinity`.", "Начальное значение при поиске минимума.", "console.log(1 / 0, Math.min(), -Infinity < -1e308);", { covers: ["Infinity"] }),
      fnc("isFinite() · isNaN()", "Глобальные проверки", "Сначала превращают значение в число: `isNaN(\"абв\")` → true, `isFinite(\"12\")` → true. Строгие версии — `Number.isNaN` и `Number.isFinite`.", "Понять старый код; в новом — Number.*.", 'console.log(isNaN("абв"), Number.isNaN("абв"), isFinite("12"), isFinite(Infinity));', { covers: ["isFinite", "isNaN"] }),
      fnc("eval()", "Выполнить строку как код", "`eval(\"2 + 2\")` выполняет текст как JavaScript. Опасно (внедрение кода), медленно и почти никогда не нужно.", "Узнать и не использовать.", 'console.log(eval("2 + 2"));', { covers: ["eval"] }),
      fnc("encodeURIComponent() · decodeURIComponent()", "Кодировать часть адреса", "Кодирует всё, что имеет особый смысл в URL: `&`, `?`, `/`, пробелы, кириллицу.", "Значения параметров поиска.", 'const q = encodeURIComponent("блокнот & пенал");\nconsole.log(q);\nconsole.log(decodeURIComponent(q));', { covers: ["encodeURIComponent", "decodeURIComponent"] }),
      fnc("encodeURI() · decodeURI()", "Кодировать адрес целиком", "Оставляет служебные символы адреса (`/ ? & :`), кодирует только недопустимые (пробелы, кириллицу).", "Привести к виду ссылки целый URL.", 'console.log(encodeURI("https://app.ru/каталог?q=блокнот"));\nconsole.log(decodeURI("%D0%BC%D0%B5%D0%BD%D1%8E"));', { covers: ["encodeURI", "decodeURI"] }),
      rule("Значение параметра — `encodeURIComponent`. Целый адрес — `encodeURI`. Перепутаешь — адрес сломается.")
    ],
    tasks: [task("Ссылка на поиск", "Напиши `searchUrl(query)`, которая возвращает `/search?q=` + закодированный запрос. Для `\"блокнот & пенал\"` амперсанд не должен разрывать параметр.", {
      start: 'function searchUrl(query) {\n  return "/search?q=" + query;\n}\n',
      checks: [run('new URLSearchParams(searchUrl("блокнот & пенал").split("?")[1]).get("q") === "блокнот & пенал"', "Запрос восстанавливается целиком"), run('!searchUrl("a b").includes(" ")', "Пробелы закодированы")],
      solution: 'function searchUrl(query) {\n  return "/search?q=" + encodeURIComponent(query);\n}'
    })],
    quizzes: [
      single("js-encode-component", "Параметр", "Что использовать для значения параметра в URL?", [["comp", "`encodeURIComponent`"], ["uri", "`encodeURI`"], ["escape", "`escape`"], ["none", "Ничего"]], "comp", "Он кодирует & ? / и другие служебные символы."),
      single("js-eval", "eval", "Почему `eval` почти не используют?", [["danger", "Опасно (внедрение кода) и медленно"], ["old", "Его удалили"], ["strict", "Не работает нигде"], ["sync", "Он асинхронный"]], "danger", "Почти всегда есть безопасная альтернатива.")
    ]
  });
}
