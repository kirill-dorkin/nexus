// Chapter 17: Collections — Map, Set with set algebra, WeakMap, WeakSet, WeakRef, FinalizationRegistry.
import { scene, rule, meth, obj, kw, run, task, makeLesson, on } from "./kit.mjs";

const MP = (...m) => on("Map.prototype", ...m);
const SP = (...m) => on("Set.prototype", ...m);

export default function collections(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single } = c;

  L({
    slug: "map", title: "Map: словарь с любыми ключами", summary: "new Map, set, get, has, delete, clear, size, keys, values, entries, forEach и Map.groupBy.",
    skill: ["js-map", "Map", "Хранить пары ключ — значение с ключами любого типа."],
    now: "Храним пары «ключ — значение» с ключами любого типа: Map.",
    body: [
      scene("Ключ — объект",
        ["bug", "Положи объект пользователя ключом в обычный объект — и все пользователи станут \"[object Object]\"! Хе-хе."],
        ["bro", "Ключи обычного объекта — только строки. У `Map` ключом может быть что угодно, и порядок сохраняется."]),
      obj("Map", "Словарь", "`new Map([[ключ, значение], …])` — пары с ключами любого типа, порядок вставки сохраняется.", "Кэши, счётчики, связь объектов с данными.", 'const visits = new Map([["Аня", 3]]);\nconsole.log(visits, visits instanceof Map);', { covers: ["Map"] }),
      meth("set() · get() · has() · delete()", "Основные операции", "`set(k, v)` — записать (возвращает Map, можно цепочкой), `get(k)` — прочитать, `has(k)` — есть ли, `delete(k)` — удалить.", "Работа со словарём.", 'const m = new Map();\nconst anya = { name: "Аня" };\nm.set(anya, 1).set("Борис", 2);\nconsole.log(m.get(anya), m.has("Борис"), m.delete("Борис"), m.has("Борис"));', { covers: MP("set", "get", "has", "delete") }),
      kw("size · clear()", "Размер и очистка", "`size` — число пар (свойство, не метод), `clear()` удаляет всё.", "Сколько записей, сброс кэша.", "const m = new Map([[1, \"a\"], [2, \"b\"]]);\nconsole.log(m.size);\nm.clear();\nconsole.log(m.size);", { covers: MP("size", "clear") }),
      meth("keys() · values() · entries() · forEach()", "Перебор Map", "Итераторы ключей, значений и пар; `for…of` по Map сразу даёт пары `[k, v]`.", "Вывести словарь.", 'const prices = new Map([["Блокнот", 220], ["Пенал", 290]]);\nfor (const [item, price] of prices) console.log(item, price);\nconsole.log([...prices.keys()], [...prices.values()], [...prices.entries()].length);\nprices.forEach((p, d) => console.log(d, "→", p));', { covers: MP("keys", "values", "entries", "forEach") }),
      meth("Map.groupBy()", "Группировка в Map", "Как `Object.groupBy`, но ключи — любые значения (объекты, числа), результат — Map.", "Группы по объекту или числу.", "const prices = [150, 220, 290, 450];\nconst groups = Map.groupBy(prices, (p) => p >= 250);\nconsole.log(groups.get(true), groups.get(false));", { covers: on("Map", "groupBy") }),
      rule("Ключи — не строки или важен порядок и частые добавления/удаления — бери `Map`, а не объект.")
    ],
    tasks: [task("Счётчик визитов", "Напиши `countVisits(users)`: возвращает Map «имя → число визитов» через `get`/`set`.", {
      start: "function countVisits(users) {\n  return {};\n}\n",
      checks: [run('(() => { const m = countVisits(["Аня", "Борис", "Аня"]); return m instanceof Map && m.get("Аня") === 2 && m.get("Борис") === 1 && m.size === 2; })()', "Визиты посчитаны")],
      solution: "function countVisits(users) {\n  const m = new Map();\n  for (const g of users) m.set(g, (m.get(g) ?? 0) + 1);\n  return m;\n}"
    })],
    quizzes: [
      single("js-map-size", "Размер", "Как узнать число пар в Map?", [["size", "`map.size`"], ["length", "`map.length`"], ["count", "`map.count()`"], ["keys", "`Object.keys(map).length`"]], "size", "size — свойство."),
      single("js-map-vs-object", "Map или объект", "Когда Map лучше объекта?", [["keys", "Когда ключи — не строки или нужен порядок и частые изменения"], ["json", "Когда нужен JSON"], ["always", "Всегда"], ["never", "Никогда"]], "keys", "Объект — для записей с известными полями.")
    ]
  });

  L({
    slug: "set", title: "Set: уникальные значения", summary: "new Set, add, has, delete, clear, size, keys, values, entries и forEach.",
    skill: ["js-set", "Set", "Хранить уникальные значения и быстро проверять наличие."],
    now: "Храним уникальные значения и быстро проверяем наличие: Set.",
    body: [
      scene("Без повторов",
        ["you", "Список пользователей за неделю: Аня пришла пять раз, а мне нужен список без повторов."],
        ["bro", "`new Set(users)` — и повторы исчезнут сами. А `has` проверяет мгновенно."]),
      obj("Set", "Множество", "`new Set(iterable)` — коллекция уникальных значений (сравнение по SameValueZero), порядок добавления сохраняется.", "Убрать дубликаты, быстрые проверки.", 'const users = new Set(["Аня", "Борис", "Аня"]);\nconsole.log([...users], users.size);', { covers: ["Set"] }),
      meth("add() · has() · delete()", "Добавить, проверить, удалить", "`add` возвращает Set (цепочкой), повтор не добавится; `has` — быстрая проверка; `delete` — удалить.", "Отметки «уже видели».", 'const seen = new Set();\nseen.add("Аня").add("Аня").add("Лев");\nconsole.log(seen.has("Лев"), seen.delete("Лев"), seen.size);', { covers: SP("add", "has", "delete") }),
      kw("size · clear()", "Размер и очистка", "`size` — сколько значений, `clear()` — удалить всё.", "Счётчик уникальных.", 'const s = new Set([1, 2, 3]);\ns.clear();\nconsole.log(s.size);', { covers: SP("size", "clear") }),
      meth("keys() · values() · entries() · forEach()", "Перебор Set", "`values()` и `keys()` одинаковы; `entries()` даёт пары `[v, v]` для совместимости с Map.", "Пройтись по уникальным.", 'const s = new Set(["Блокнот", "Пенал"]);\nconsole.log([...s.values()], [...s.keys()], [...s.entries()][0]);\ns.forEach((v) => console.log(v));', { covers: SP("keys", "values", "entries", "forEach") }),
      rule("Убрать повторы из массива — `[...new Set(arr)]`.")
    ],
    tasks: [task("Уникальные пользователи", "Напиши `unique(list)` — массив без повторов через Set, и `firstVisit(seen, name)`: возвращает true, если пользователя ещё нет в Set `seen`, и добавляет его.", {
      start: "function unique(list) {\n  return list;\n}\nfunction firstVisit(seen, name) {\n  return true;\n}\n",
      checks: [run('unique(["Аня", "Борис", "Аня"]).join() === "Аня,Борис"', "Повторы убраны"), run('(() => { const s = new Set(); return firstVisit(s, "Аня") === true && firstVisit(s, "Аня") === false && s.size === 1; })()', "Первый визит отмечается")],
      solution: "function unique(list) {\n  return [...new Set(list)];\n}\nfunction firstVisit(seen, name) {\n  if (seen.has(name)) return false;\n  seen.add(name);\n  return true;\n}"
    })],
    quizzes: [single("js-set-dedupe", "Дубликаты", "Как убрать повторы из массива?", [["set", "`[...new Set(arr)]`"], ["sort", "`arr.sort()`"], ["filter", "`arr.filter(Boolean)`"], ["flat", "`arr.flat()`"]], "set", "Set хранит только уникальные значения.")]
  });

  L({
    slug: "set-algebra", title: "Операции над множествами", summary: "union, intersection, difference, symmetricDifference, isSubsetOf, isSupersetOf и isDisjointFrom.",
    skill: ["js-set-algebra", "Алгебра множеств", "Объединять, пересекать и сравнивать множества."],
    now: "Объединяем, пересекаем и сравниваем множества.",
    body: [
      scene("Выходные",
        ["you", "Хочу знать постоянных пользователей: кто был в оба выходных дня."],
        ["nika", "Это пересечение множеств. У Set есть все операции — объединение, разность и проверки."]),
      meth("union() · intersection()", "Объединение и пересечение", "`a.union(b)` — все из обоих; `a.intersection(b)` — только общие. Возвращают новый Set.", "Все пользователи и постоянные пользователи.", 'const sat = new Set(["Аня", "Борис"]), sun = new Set(["Аня", "Лев"]);\nconsole.log([...sat.union(sun)], [...sat.intersection(sun)]);', { covers: SP("union", "intersection") }),
      meth("difference() · symmetricDifference()", "Разность", "`a.difference(b)` — есть в a, нет в b; `symmetricDifference` — есть ровно в одном.", "Кто был только в субботу; кто был один день.", 'const sat = new Set(["Аня", "Борис"]), sun = new Set(["Аня", "Лев"]);\nconsole.log([...sat.difference(sun)], [...sat.symmetricDifference(sun)]);', { covers: SP("difference", "symmetricDifference") }),
      meth("isSubsetOf() · isSupersetOf() · isDisjointFrom()", "Сравнение множеств", "Подмножество ли, надмножество ли, нет ли общих элементов.", "Все ли ингредиенты есть на складе; нет ли аллергенов.", 'const stock = new Set(["хлеб", "сыр", "масло"]), sandwich = new Set(["хлеб", "сыр"]);\nconsole.log(sandwich.isSubsetOf(stock), stock.isSupersetOf(sandwich), sandwich.isDisjointFrom(new Set(["орехи"])));', { covers: SP("isSubsetOf", "isSupersetOf", "isDisjointFrom") }),
      rule("Вопросы «общие», «все», «ни одного» про списки — это операции над множествами.")
    ],
    tasks: [task("Можно ли приготовить", "Напиши `canMake(recipe, stock)` — true, если все ингредиенты рецепта есть на складе (`isSubsetOf`), и `missing(recipe, stock)` — массив недостающих (`difference`).", {
      start: "function canMake(recipe, stock) {\n  return true;\n}\nfunction missing(recipe, stock) {\n  return [];\n}\n",
      checks: [run('canMake(new Set(["сыр", "хлеб"]), new Set(["сыр", "хлеб", "масло"]))', "Бутерброд можно"), run('!canMake(new Set(["ветчина"]), new Set(["сыр"]))', "Без ветчины не выйдет"), run('missing(new Set(["сыр", "соль"]), new Set(["сыр"])).join() === "соль"', "Не хватает соли")],
      solution: "function canMake(recipe, stock) {\n  return recipe.isSubsetOf(stock);\n}\nfunction missing(recipe, stock) {\n  return [...recipe.difference(stock)];\n}"
    })],
    quizzes: [single("js-set-intersection", "Пересечение", "Что вернёт `new Set([1, 2]).intersection(new Set([2, 3]))`?", [["2", "Set {2}"], ["all", "Set {1, 2, 3}"], ["13", "Set {1, 3}"], ["1", "Set {1}"]], "2", "Только общие элементы.")]
  });

  L({
    slug: "weak-collections", title: "Слабые ссылки", summary: "WeakMap, WeakSet, WeakRef и FinalizationRegistry: коллекции, которые не мешают сборщику мусора.",
    skill: ["js-weak", "Слабые коллекции", "Привязывать данные к объектам, не создавая утечек памяти."],
    now: "Привязываем данные к объектам без утечек памяти: слабые коллекции.",
    body: [
      scene("Утечка",
        ["bug", "Каждая удалённая карточка остаётся в вашем кэше навсегда. Память тает! Хе-хе."],
        ["nika", "Слабые коллекции не держат объект в памяти: как только на него больше никто не ссылается, запись исчезает сама."]),
      obj("WeakMap", "Словарь со слабыми ключами", "Ключи — только объекты; запись не мешает сборке мусора ключа. Нет перебора и `size`.", "Приватные данные и кэш для объектов (DOM-элементов).", "const meta = new WeakMap();\nconst card = {};\nmeta.set(card, { clicks: 1 });\nconsole.log(meta.get(card).clicks, meta.has({}));", { covers: ["WeakMap"] }),
      meth("set() · get() · has() · delete()", "Операции WeakMap", "Как у Map, но без перебора, `size` и `clear`.", "Работать с привязанными данными.", "const wm = new WeakMap();\nconst k = {};\nwm.set(k, 1);\nconsole.log(wm.get(k), wm.has(k), wm.delete(k), wm.has(k));", { covers: on("WeakMap.prototype", "set", "get", "has", "delete") }),
      obj("WeakSet", "Множество объектов со слабыми ссылками", "Хранит только объекты, не мешает сборке мусора. Методы `add`, `has`, `delete`.", "Отметки «уже обработан» для объектов.", "const handled = new WeakSet();\nconst order = {};\nhandled.add(order);\nconsole.log(handled.has(order), handled.delete(order), handled.has(order));", { covers: ["WeakSet", ...on("WeakSet.prototype", "add", "has", "delete")] }),
      obj("WeakRef · deref()", "Слабая ссылка", "`new WeakRef(obj)` не мешает удалить объект; `ref.deref()` вернёт объект или `undefined`, если его уже собрали.", "Необязательный кэш больших объектов.", "const big = { data: new Array(1000).fill(0) };\nconst ref = new WeakRef(big);\nconsole.log(ref.deref() === big);", { covers: ["WeakRef", "WeakRef.prototype.deref"] }),
      obj("FinalizationRegistry", "Уведомление об удалении", "`registry.register(obj, info)` — после сборки `obj` вызовется колбэк с `info`; `unregister(token)` отменяет. Момент вызова не гарантирован.", "Освободить внешние ресурсы. Не для логики программы.", 'const registry = new FinalizationRegistry((info) => console.log("Собран", info));\nconst token = {};\nregistry.register({}, "карточка", token);\nconsole.log(registry.unregister(token));', { covers: ["FinalizationRegistry", ...on("FinalizationRegistry.prototype", "register", "unregister")] }),
      rule("Данные «при объекте», которые должны исчезать вместе с ним, — в `WeakMap`.")
    ],
    tasks: [task("Кэш без утечек", "Напиши `cached(obj, compute)`: хранит результат `compute(obj)` в `WeakMap` и при повторном вызове с тем же объектом не вызывает `compute` снова.", {
      start: "const cache = new Map();\nfunction cached(obj, compute) {\n  return compute(obj);\n}\n",
      checks: [run("(() => { let n = 0; const o = {}; const f = () => ++n; cached(o, f); cached(o, f); return n === 1; })()", "Повторно не считает"), run("cache instanceof WeakMap", "Кэш — WeakMap")],
      solution: "const cache = new WeakMap();\nfunction cached(obj, compute) {\n  if (!cache.has(obj)) cache.set(obj, compute(obj));\n  return cache.get(obj);\n}"
    })],
    quizzes: [
      single("js-weakmap-keys", "Ключи", "Какие ключи допускает WeakMap?", [["obj", "Только объекты (и незарегистрированные символы)"], ["any", "Любые"], ["str", "Только строки"], ["num", "Только числа"]], "obj", "Примитивы не собираются сборщиком."),
      single("js-weakmap-iter", "Перебор", "Можно ли перебрать WeakMap через for…of?", [["no", "Нет, перебора и size нет"], ["yes", "Да"], ["keys", "Только ключи"], ["values", "Только значения"]], "no", "Содержимое может исчезнуть в любой момент.")
    ]
  });
}
