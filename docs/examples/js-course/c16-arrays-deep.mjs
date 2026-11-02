// Chapter 16: Arrays completely, and iterator helpers.
import { scene, rule, kw, meth, obj, run, has, task, makeLesson, on } from "./kit.mjs";

const A = (...m) => on("Array.prototype", ...m);
const I = (...m) => on("Iterator.prototype", ...m);

export default function arraysDeep(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "array-create", title: "Создание массивов", summary: "Array.from, Array.of, Array.isArray, свойство length и его запись, fill и copyWithin.",
    skill: ["js-array-create", "Создание массивов", "Создавать массивы из чего угодно и заполнять их."],
    now: "Нужно создать сетку из 12 столиков, превратить список карточек на странице в массив и проверить, что данные — массив.",
    body: [
      scene("Из чего угодно",
        ["marta", "Нужен список 12 столиков с номерами. Не писать же их руками?"],
        ["bro", "`Array.from({ length: 12 }, (_, i) => i + 1)` — и готово."]),
      meth("Array.from()", "Массив из перебираемого", "Создаёт массив из строки, Set, NodeList, итератора или «массивоподобного» `{ length: n }`. Второй аргумент — функция преобразования.", "Сгенерировать или превратить коллекцию в массив.", 'console.log(Array.from({ length: 5 }, (_, i) => i + 1));\nconsole.log(Array.from("чай"), Array.from(new Set([1, 1, 2])));', { covers: on("Array", "from") }),
      meth("Array.of()", "Массив из аргументов", "`Array.of(7)` → `[7]`, а `new Array(7)` — пустой массив длины 7.", "Избежать ловушки `new Array(n)`.", "console.log(Array.of(7), new Array(7).length, Array.of(1, 2, 3));", { covers: on("Array", "of") }),
      meth("Array.isArray()", "Массив ли это", "Надёжная проверка: `typeof []` — \"object\", а `Array.isArray([])` — true.", "Проверить данные с сервера.", "console.log(typeof [], Array.isArray([]), Array.isArray({ length: 0 }));", { covers: on("Array", "isArray") }),
      kw("arr.length", "Длина и её запись", "`length` — на единицу больше последнего индекса. Запись `arr.length = 0` очищает массив, `arr.length = 2` — обрезает.", "Быстро очистить или обрезать.", 'const cart = ["Латте", "Раф", "Какао"];\ncart.length = 1;\nconsole.log(cart, cart.length);', { covers: A("length") }),
      meth("fill()", "Заполнить значением", "`arr.fill(value, start, end)` — заполняет (меняет массив).", "Начальная сетка, сброс значений.", 'console.log(new Array(4).fill("свободен"), [1, 2, 3, 4].fill(0, 2));', { covers: A("fill") }),
      meth("copyWithin()", "Скопировать внутри массива", "`arr.copyWithin(target, start, end)` копирует кусок массива в другое место того же массива.", "Сдвиги в буферах; редкая задача.", "console.log([1, 2, 3, 4, 5].copyWithin(0, 3));", { covers: A("copyWithin") }),
      rule("Нужен массив из N элементов — `Array.from({ length: N }, fn)`. `new Array(N)` даёт дырки.")
    ],
    tasks: [task("Сетка столиков", "Сделай `tables` — массив `[1, …, 12]` через `Array.from`, `seats` — массив из 12 значений `4` через `fill`, и `isList(x)` через `Array.isArray`.", {
      start: "const tables = [];\nconst seats = [];\nfunction isList(x) {\n  return typeof x === \"object\";\n}\n",
      checks: [run("tables.length === 12 && tables[0] === 1 && tables[11] === 12", "Номера 1–12"), run("seats.length === 12 && seats.every((s) => s === 4)", "По 4 места"), run("isList([]) && !isList({ length: 1 })", "Проверка массива")],
      solution: "const tables = Array.from({ length: 12 }, (_, i) => i + 1);\nconst seats = new Array(12).fill(4);\nfunction isList(x) {\n  return Array.isArray(x);\n}"
    })],
    quizzes: [
      single("js-array-of", "Ловушка", "Что создаёт `new Array(3)`?", [["holes", "Пустой массив длины 3 (дырки)"], ["three", "[3]"], ["zeros", "[0, 0, 0]"], ["err", "Ошибку"]], "holes", "Array.of(3) даст [3]."),
      single("js-length-clear", "Очистка", "Что сделает `arr.length = 0`?", [["clear", "Очистит массив"], ["nothing", "Ничего"], ["err", "Ошибку"], ["copy", "Создаст копию"]], "clear", "Длина управляет содержимым.")
    ]
  });

  L({
    slug: "array-search-deep", title: "Поиск с конца и по индексу", summary: "at, lastIndexOf, findLast, findLastIndex и reduceRight.",
    skill: ["js-array-search-deep", "Поиск в массиве", "Искать с конца и обращаться к элементам с конца."],
    now: "Ищем последний заказ гостя и считаем выражение справа налево.",
    body: [
      scene("С конца",
        ["marta", "Хочу видеть последний заказ Ани, а не первый."],
        ["bro", "Для этого — версии методов, которые идут с конца: `findLast`, `lastIndexOf`."]),
      meth("at()", "Элемент с конца", "`arr.at(-1)` — последний элемент, `arr.at(-2)` — предпоследний.", "Последний заказ без `length - 1`.", 'console.log(["Латте", "Раф", "Какао"].at(-1));', { covers: A("at") }),
      meth("lastIndexOf()", "Последнее вхождение", "Индекс последнего равного элемента или −1.", "Где гость был в последний раз.", 'console.log(["Аня", "Борис", "Аня"].lastIndexOf("Аня"));', { covers: A("lastIndexOf") }),
      meth("findLast() · findLastIndex()", "Последний подходящий", "Как `find` и `findIndex`, но поиск с конца.", "Последний заказ по условию.", 'const orders = [{ g: "Аня", d: "Латте" }, { g: "Борис", d: "Раф" }, { g: "Аня", d: "Какао" }];\nconsole.log(orders.findLast((o) => o.g === "Аня").d, orders.findLastIndex((o) => o.g === "Аня"));', { covers: A("findLast", "findLastIndex") }),
      meth("reduceRight()", "Свернуть справа налево", "Как `reduce`, но с последнего элемента.", "Композиция функций, разбор справа налево.", 'console.log(["а", "б", "в"].reduceRight((acc, x) => acc + x, ""));', { covers: A("reduceRight") }),
      rule("Ищешь «последний» — бери методы с `Last` в имени, а не переворачивай массив.")
    ],
    tasks: [task("Последний заказ", "Напиши `lastOrder(orders, guest)` — последний заказ гостя через `findLast` (или `undefined`), и `lastDrink(orders)` — напиток последнего заказа через `at(-1)`.", {
      start: "function lastOrder(orders, guest) {\n  return orders.find((o) => o.guest === guest);\n}\nfunction lastDrink(orders) {\n  return orders[0].drink;\n}\n",
      checks: [run('(() => { const o = [{ guest: "Аня", drink: "Латте" }, { guest: "Борис", drink: "Раф" }, { guest: "Аня", drink: "Какао" }]; return lastOrder(o, "Аня").drink === "Какао" && lastDrink(o) === "Какао" && lastOrder(o, "Лев") === undefined; })()', "Поиск с конца работает"), has("findLast", "Использован `findLast`")],
      solution: "function lastOrder(orders, guest) {\n  return orders.findLast((o) => o.guest === guest);\n}\nfunction lastDrink(orders) {\n  return orders.at(-1).drink;\n}"
    })],
    quizzes: [single("js-findlast", "findLast", "Что вернёт `[1, 2, 3, 4].findLast((n) => n % 2 === 1)`?", [["3", "3"], ["1", "1"], ["4", "4"], ["idx", "2"]], "3", "Последний нечётный.")]
  });

  L({
    slug: "array-transform-deep", title: "Плоские массивы и копии", summary: "flat, flatMap, toReversed, toSpliced, with, keys, values, entries, toString и toLocaleString.",
    skill: ["js-array-transform-deep", "Преобразования без изменений", "Разворачивать вложенные массивы и менять копии, не трогая оригинал."],
    now: "Заказы со столиков — массив массивов. Делаем один список и правим копии, не портя данные.",
    body: [
      scene("Массив массивов",
        ["marta", "У каждого столика свой список. Хочу один общий список заказов."],
        ["nika", "`flat()` расплющит вложенность. А методы с `to…` и `with` дают изменённую копию."]),
      meth("flat()", "Расплющить", "`[[1, 2], [3]].flat()` → `[1, 2, 3]`. Аргумент — глубина, `Infinity` — до конца.", "Объединить вложенные списки.", "console.log([[\"Латте\"], [\"Раф\", \"Какао\"]].flat(), [1, [2, [3, [4]]]].flat(Infinity));", { covers: A("flat") }),
      meth("flatMap()", "map + flat", "Преобразует каждый элемент в массив и расплющивает на один уровень.", "Один элемент → несколько.", 'console.log(["латте раф", "какао"].flatMap((s) => s.split(" ")));', { covers: A("flatMap") }),
      meth("toReversed() · toSpliced() · with()", "Копии с изменениями", "`toReversed()` — перевёрнутая копия, `toSpliced(i, n, …)` — копия с вырезанным или вставленным, `with(i, v)` — копия с заменой одного элемента. Оригинал не меняется.", "Неизменяемые данные (например, в React).", 'const cart = ["Латте", "Раф", "Какао"];\nconsole.log(cart.toReversed(), cart.toSpliced(1, 1), cart.with(0, "Флэт уайт"), cart);', { covers: A("toReversed", "toSpliced", "with") }),
      meth("keys() · values() · entries()", "Итераторы массива", "`keys()` — индексы, `values()` — значения, `entries()` — пары `[индекс, значение]`.", "Перебор с номерами в for…of.", 'for (const [i, d] of ["Латте", "Раф"].entries()) console.log(i + 1, d);\nconsole.log([...["a", "b"].keys()], [...["a", "b"].values()]);', { covers: A("keys", "values", "entries") }),
      meth("toString() · toLocaleString()", "Массив в строку", "`toString()` — через запятую, `toLocaleString(\"ru-RU\")` — каждый элемент по правилам языка.", "Быстрый вывод списка.", 'console.log([1, 2].toString(), [1250.5, 3000].toLocaleString("ru-RU"));', { covers: A("toString", "toLocaleString") }),
      rule("Не хочешь менять оригинал — бери `toSorted`, `toReversed`, `toSpliced` и `with`.")
    ],
    tasks: [task("Общий список", "Сделай `all` — один массив из `tables` через `flat`, `fixed` — копию `all` с заменой первого элемента на `\"Флэт уайт\"` через `with`, не меняя `all`.", {
      start: 'const tables = [["Латте"], ["Раф", "Какао"], []];\nconst all = tables;\nconst fixed = all;\n',
      checks: [run('all.join() === "Латте,Раф,Какао"', "Один общий список"), run('fixed[0] === "Флэт уайт" && all[0] === "Латте"', "Копия изменена, оригинал нет"), has(".with(", "Через `with`")],
      solution: 'const tables = [["Латте"], ["Раф", "Какао"], []];\nconst all = tables.flat();\nconst fixed = all.with(0, "Флэт уайт");'
    })],
    quizzes: [
      single("js-flat-depth", "flat", "Что вернёт `[1, [2, [3]]].flat()`?", [["one", "[1, 2, [3]]"], ["all", "[1, 2, 3]"], ["same", "[1, [2, [3]]]"], ["err", "Ошибку"]], "one", "По умолчанию глубина 1."),
      single("js-with", "with", "Что делает `arr.with(1, \"x\")`?", [["copy", "Возвращает копию с заменой элемента 1"], ["mut", "Меняет arr"], ["insert", "Вставляет x"], ["err", "Ошибка"]], "copy", "Оригинал не меняется.")
    ]
  });

  L({
    slug: "iterator-helpers", title: "Помощники итераторов", summary: "Iterator.from и ленивые методы map, filter, take, drop, flatMap, reduce, toArray, forEach, some, every, find у итераторов.",
    skill: ["js-iterator-helpers", "Помощники итераторов", "Обрабатывать ленивые и бесконечные последовательности как массивы."],
    now: "Номерки заказов идут бесконечным генератором. Берём первые пять чётных — не создавая бесконечный массив.",
    body: [
      scene("Бесконечный поток",
        ["bug", "Сделай `[...tickets()].filter(...)` — и браузер зависнет навсегда! Хе-хе."],
        ["nika", "У итераторов свои ленивые методы: они берут значения по одному и останавливаются, когда хватит."]),
      obj("Iterator · Iterator.from()", "Итератор с помощниками", "`Iterator` — общий прототип итераторов со встроенными методами. `Iterator.from(x)` делает такой итератор из любого перебираемого.", "Пользоваться помощниками у любого источника.", 'const it = Iterator.from(["Латте", "Раф"]);\nconsole.log(it.next().value, it.toArray());', { covers: ["Iterator", "Iterator.from"] }),
      meth("map() · filter()", "Ленивые преобразование и отбор", "Как у массивов, но ничего не считают, пока не попросишь значение.", "Обработка бесконечных потоков.", "function* nums() { let n = 1; while (true) yield n++; }\nconsole.log(nums().filter((n) => n % 2 === 0).map((n) => n * 10).take(3).toArray());", { covers: I("map", "filter") }),
      meth("take() · drop()", "Взять и пропустить", "`take(n)` — первые n значений, `drop(n)` — пропустить первые n.", "Страницы, «первые пять».", "function* nums() { let n = 1; while (true) yield n++; }\nconsole.log(nums().drop(10).take(3).toArray());", { covers: I("take", "drop") }),
      meth("flatMap()", "Каждое в несколько", "Как `flatMap` у массивов, но лениво.", "Разворачивать вложенные потоки.", 'console.log(Iterator.from(["a b", "c"]).flatMap((s) => s.split(" ")).toArray());', { covers: I("flatMap") }),
      meth("reduce() · toArray() · forEach()", "Собрать результат", "`reduce` сворачивает, `toArray` собирает в массив, `forEach` вызывает функцию для каждого.", "Получить итог из потока.", 'const it = () => Iterator.from([220, 150, 290]);\nconsole.log(it().reduce((a, b) => a + b, 0), it().toArray().length);\nit().forEach((p) => console.log(p));', { covers: I("reduce", "toArray", "forEach") }),
      meth("some() · every() · find()", "Проверки потока", "Останавливаются, как только ответ известен.", "Найти первое подходящее в бесконечном потоке.", "function* nums() { let n = 1; while (true) yield n++; }\nconsole.log(nums().find((n) => n * n > 50), nums().some((n) => n > 100));", { covers: I("some", "every", "find") }),
      rule("Перед `...` у бесконечного генератора остановись: сначала `take(n)`, потом `toArray()`.")
    ],
    tasks: [task("Пять чётных номерков", "Генератор `tickets()` бесконечный. Получи `firstEven` — первые 5 чётных номеров через `filter`, `take` и `toArray`.", {
      start: "function* tickets() {\n  let n = 101;\n  while (true) yield n++;\n}\nconst firstEven = [];\n",
      checks: [run('firstEven.join() === "102,104,106,108,110"', "Пять чётных номерков"), has("take(", "Через `take`")],
      solution: "function* tickets() {\n  let n = 101;\n  while (true) yield n++;\n}\nconst firstEven = tickets().filter((n) => n % 2 === 0).take(5).toArray();"
    })],
    quizzes: [
      single("js-iter-lazy", "Ленивость", "Почему `gen().map(f).take(3).toArray()` работает для бесконечного генератора?", [["lazy", "Помощники ленивые и берут только нужные значения"], ["limit", "Есть встроенный лимит"], ["async", "Всё асинхронно"], ["no", "Не работает"]], "lazy", "Считается только то, что попросили."),
      single("js-iter-from", "Iterator.from", "Зачем `Iterator.from(x)`?", [["helpers", "Получить итератор с помощниками из любого перебираемого"], ["array", "Сделать массив"], ["copy", "Скопировать объект"], ["sync", "Сделать асинхронный код синхронным"]], "helpers", "Например, из Set или своего итератора.")
    ]
  });
}
