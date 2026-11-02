// Chapter 5: Arrays.
import { scene, rule, meth, op, kw, idea, typ, run, out, has, task, makeLesson } from "./kit.mjs";

const MENU = 'const menu = [\n  { name: "Эспрессо", price: 150, category: "coffee" },\n  { name: "Латте", price: 220, category: "coffee" },\n  { name: "Раф", price: 290, category: "coffee" },\n  { name: "Чизкейк", price: 260, category: "dessert" }\n];\n';

export default function arrays(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "arrays", title: "Массивы: списки", summary: "Создание массива, индексы с нуля, length, push, pop, unshift, shift, indexOf и includes.",
    skill: ["js-arrays", "Массивы", "Хранить списки значений и добавлять, удалять и искать элементы."],
    now: "Корзина — это список напитков. Храним его массивом.",
    body: [
      scene("Корзина",
        ["marta", "Гость кладёт в корзину латте, потом раф, потом передумывает. Как это хранить?"],
        ["nika", "Список в коде — массив. Элементы стоят по порядку, у каждого номер — индекс, и считают его с нуля."]),
      typ("[ ]", "Массив", "`const cart = [\"Латте\", \"Раф\"];` — упорядоченный список. `cart[0]` — первый элемент, `cart.length` — сколько их, последний — `cart[cart.length - 1]`.", "Корзина, меню, история заказов.", 'const cart = ["Латте", "Раф"];\nconsole.log(cart[0], cart.length);'),
      meth("push() · pop()", "В конец и из конца", "`push(x)` добавляет в конец, `pop()` убирает последний и возвращает его.", "Добавить в корзину, отменить последнее.", 'const cart = ["Латте"];\ncart.push("Раф");\nconsole.log(cart);\ncart.pop();\nconsole.log(cart);'),
      meth("unshift() · shift()", "В начало и из начала", "`unshift(x)` — в начало, `shift()` — убрать первый.", "Очередь заказов: первым пришёл — первым обслужен.", 'const queue = ["Аня", "Борис"];\nconsole.log(queue.shift(), queue);'),
      meth("indexOf()", "Где элемент", "Индекс элемента или `-1`, если его нет.", "Найти позицию в списке.", 'console.log(["Латте", "Раф"].indexOf("Раф"));'),
      meth("arr.includes()", "Есть ли элемент", "`true` или `false`.", "Проверить, есть ли напиток в корзине.", 'console.log(["Латте", "Раф"].includes("Какао"));'),
      rule("Индексы с нуля: у массива из трёх элементов последний — `[2]`.")
    ],
    tasks: [task("Работа с корзиной", "В `cart` добавь в конец `\"Какао\"`, убери первый элемент и сохрани в `hasRaf`, есть ли в корзине `\"Раф\"`.", {
      start: 'const cart = ["Латте", "Раф"];\nconst hasRaf = false;\n',
      checks: [run('JSON.stringify(cart) === \'["Раф","Какао"]\'', "В корзине Раф и Какао"), run("hasRaf === true", "Раф найден"), has("includes", "Использован `includes`")],
      solution: 'const cart = ["Латте", "Раф"];\ncart.push("Какао");\ncart.shift();\nconst hasRaf = cart.includes("Раф");'
    })],
    quizzes: [
      single("js-arr-index", "Индекс", "Что вернёт `[\"a\", \"b\", \"c\"][1]`?", [["b", "\"b\""], ["a", "\"a\""], ["c", "\"c\""], ["undef", "undefined"]], "b", "Индексы с нуля."),
      single("js-arr-pop", "pop", "Что делает `pop()`?", [["last", "Убирает и возвращает последний элемент"], ["first", "Убирает первый"], ["add", "Добавляет в конец"], ["all", "Очищает массив"]], "last", "push/pop работают с концом."),
      short("js-arr-indexof", "Нет элемента", "Что вернёт `indexOf`, если элемента нет? Введи число.", ["-1"], "-1 — «не найдено».")
    ]
  });

  L({
    slug: "map-filter", title: "map и filter", summary: "Перебор forEach, преобразование map и отбор filter — без ручных циклов.",
    skill: ["js-map-filter", "map и filter", "Преобразовывать и фильтровать массивы методами."],
    now: "Нужно показать только кофе и сделать список подписей с ценами. Без циклов.",
    body: [
      scene("Без циклов",
        ["marta", "Покажи только кофе. И сделай подписи «Латте — 220 ₽»."],
        ["bro", "Для этого у массивов есть методы. Ты даёшь колбэк, а цикл я делаю сам."]),
      meth("forEach()", "Для каждого", "Вызывает функцию для каждого элемента. Ничего не возвращает.", "Просто сделать что-то с каждым элементом.", '["Латте", "Раф"].forEach((d, i) => console.log(i + 1, d));'),
      meth("map()", "Преобразовать", "Возвращает новый массив той же длины: каждый элемент пропущен через функцию.", "Цены → подписи, объекты → имена.", "const prices = [150, 220];\nconsole.log(prices.map((p) => p * 2));"),
      meth("filter()", "Отобрать", "Возвращает новый массив только из элементов, для которых функция вернула `true`.", "Только кофе, только дешевле 200.", "const prices = [150, 220, 290];\nconsole.log(prices.filter((p) => p < 250));"),
      rule("`map` меняет каждый, `filter` отбирает некоторые. Оба не трогают исходный массив.")
    ],
    tasks: [task("Только кофе с подписями", "Из `menu` получи `coffee` — только `category === \"coffee\"` — и `labels` — подписи вида `Латте — 220 ₽` для кофе.", {
      start: MENU + "const coffee = menu;\nconst labels = [];\n",
      checks: [run("coffee.length === 3 && coffee.every((d) => d.category === \"coffee\")", "Только три кофе"), run('labels[1] === "Латте — 220 ₽" && labels.length === 3', "Подписи собраны"), has("filter", "Использован `filter`"), has("map", "Использован `map`")],
      solution: MENU + 'const coffee = menu.filter((d) => d.category === "coffee");\nconst labels = coffee.map((d) => `${d.name} — ${d.price} ₽`);'
    })],
    quizzes: [
      single("js-map-length", "map", "Сколько элементов вернёт `map` у массива из 5 элементов?", [["5", "5"], ["less", "Меньше или столько же"], ["one", "1"], ["0", "0"]], "5", "map всегда сохраняет длину."),
      single("js-filter-return", "filter", "Что должна вернуть функция в `filter`, чтобы элемент попал в результат?", [["true", "truthy-значение, например true"], ["el", "Сам элемент изменённым"], ["index", "Индекс"], ["nothing", "Ничего"]], "true", "Функция — вопрос «оставить?».")
    ]
  });

  L({
    slug: "find-some-every", title: "find, some, every", summary: "Поиск find и findIndex, проверки some и every.",
    skill: ["js-find", "Поиск в массиве", "Находить элемент и проверять условия для всего массива."],
    now: "Ищем напиток по названию и проверяем, есть ли в корзине что-то дороже 250.",
    body: [
      scene("Найти и проверить",
        ["marta", "Гость пишет «раф» — найди его в меню. И скажи, есть ли в заказе десерт."],
        ["nika", "`find` вернёт первый подходящий, `some` ответит «есть ли хоть один», `every` — «все ли»."]),
      meth("find()", "Первый подходящий", "Возвращает первый элемент, для которого функция вернула true, или `undefined`.", "Найти напиток по имени.", 'const menu = [{ name: "Латте", price: 220 }, { name: "Раф", price: 290 }];\nconsole.log(menu.find((d) => d.name === "Раф"));'),
      meth("findIndex()", "Индекс первого подходящего", "Как `find`, но возвращает индекс или `-1`.", "Чтобы потом удалить или заменить.", "console.log([150, 220, 290].findIndex((p) => p > 200));"),
      meth("some()", "Хотя бы один", "`true`, если условие верно хотя бы для одного.", "Есть ли десерт в заказе.", "console.log([150, 220].some((p) => p > 200));"),
      meth("every()", "Все", "`true`, если условие верно для всех.", "Все ли позиции в наличии.", "console.log([150, 220].every((p) => p > 100));"),
      rule("Нужно одно значение — `find`. Нужен ответ да/нет — `some` или `every`.")
    ],
    tasks: [task("Поиск в меню", "Найди в `menu` объект `raf` с именем `\"Раф\"`, проверь `hasDessert` — есть ли категория `dessert`, и `allCheap` — все ли дешевле 300.", {
      start: MENU + "const raf = null;\nconst hasDessert = false;\nconst allCheap = false;\n",
      checks: [run("raf && raf.price === 290", "Раф найден"), run("hasDessert === true", "Десерт есть"), run("allCheap === true", "Всё дешевле 300"), has("find(", "Использован `find`")],
      solution: MENU + 'const raf = menu.find((d) => d.name === "Раф");\nconst hasDessert = menu.some((d) => d.category === "dessert");\nconst allCheap = menu.every((d) => d.price < 300);'
    })],
    quizzes: [
      single("js-find-none", "Не нашёл", "Что вернёт `find`, если ничего не подошло?", [["undef", "`undefined`"], ["minus-one", "`-1`"], ["null", "`null`"], ["arr", "Пустой массив"]], "undef", "А `findIndex` вернёт -1."),
      single("js-some-every", "some и every", "Что вернёт `[1, 5, 10].every((n) => n > 3)`?", [["false", "`false`"], ["true", "`true`"], ["arr", "[5, 10]"], ["5", "5"]], "false", "1 не больше 3.")
    ]
  });

  L({
    slug: "reduce", title: "reduce: свернуть в одно", summary: "Метод reduce, аккумулятор и начальное значение; сумма корзины и подсчёт.",
    skill: ["js-reduce", "reduce", "Сводить массив к одному значению: сумме, количеству, объекту."],
    now: "Сумма корзины одной строкой — без цикла.",
    body: [
      scene("Одной строкой",
        ["bro", "Сумма, максимум, подсчёт — всё это «свернуть массив в одно значение». Это делает `reduce`."]),
      meth("reduce()", "Свернуть массив", "`arr.reduce((acc, x) => acc + x, 0)` — проходит по элементам, перенося результат в `acc`. Второй аргумент — начальное значение.", "Сумма корзины, итоги, группировки.", "const prices = [220, 290, 150];\nconst total = prices.reduce((sum, p) => sum + p, 0);\nconsole.log(total);"),
      idea("Аккумулятор", "Накопитель", "Первый параметр колбэка: то, что вернул предыдущий шаг.", "Понять, как reduce работает внутри.", undefined),
      rule("Всегда указывай начальное значение `reduce` — иначе на пустом массиве будет ошибка.")
    ],
    tasks: [task("Сумма корзины", "Посчитай `total` — сумму `price` всех позиций `menu` — через `reduce`.", {
      start: MENU + "const total = 0;\n",
      checks: [run("total === 920", "Сумма 920"), has("reduce", "Использован `reduce`")],
      solution: MENU + "const total = menu.reduce((sum, d) => sum + d.price, 0);"
    })],
    quizzes: [
      single("js-reduce-init", "Начальное", "Зачем второй аргумент `reduce(fn, 0)`?", [["init", "Начальное значение аккумулятора"], ["index", "С какого индекса начать"], ["limit", "Сколько элементов взять"], ["none", "Ни зачем"]], "init", "Без него на пустом массиве будет ошибка."),
      short("js-reduce-sum", "Посчитай", "Что вернёт `[1, 2, 3].reduce((a, b) => a + b, 10)`? Введи число.", ["16"], "10 + 1 + 2 + 3.")
    ]
  });

  L({
    slug: "sort-slice-splice", title: "Сортировка и куски", summary: "sort с функцией сравнения, slice, splice, concat, join, reverse и toSorted.",
    skill: ["js-sort", "Сортировка и куски", "Сортировать массивы и брать или менять их части."],
    now: "Меню нужно отсортировать по цене, а в витрину взять три самых дешёвых.",
    body: [
      scene("По цене",
        ["marta", "Покажи меню от дешёвого к дорогому, а на главной — три первых."],
        ["bug", "А я подскажу: `[10, 9, 100].sort()` — и всё перепутается!"],
        ["nika", "Потому что `sort` без функции сортирует как строки. Дадим ему правило сравнения."]),
      meth("sort()", "Сортировка", "Сортирует массив на месте. Для чисел нужна функция: `(a, b) => a - b`.", "Меню по цене, гости по имени.", "const prices = [290, 150, 1000, 220];\nconsole.log([...prices].sort());\nconsole.log(prices.sort((a, b) => a - b));"),
      meth("toSorted()", "Отсортированная копия", "Как `sort`, но не меняет исходный массив.", "Сохранить оригинальный порядок.", "const prices = [290, 150];\nconsole.log(prices.toSorted((a, b) => a - b), prices);"),
      meth("arr.slice()", "Копия куска", "`arr.slice(0, 3)` — элементы с 0 по 2, исходный не меняется.", "Первые три позиции для витрины.", 'console.log(["a", "b", "c", "d"].slice(0, 3));'),
      meth("splice()", "Вырезать или вставить", "`arr.splice(i, n)` удаляет n элементов с индекса i (меняет массив).", "Убрать позицию из корзины.", 'const cart = ["Латте", "Раф", "Какао"];\ncart.splice(1, 1);\nconsole.log(cart);'),
      meth("join()", "Склеить в строку", "`[\"a\", \"b\"].join(\", \")` → `\"a, b\"`.", "Список напитков в чеке.", 'console.log(["Латте", "Раф"].join(", "));'),
      meth("reverse() · concat()", "Перевернуть и соединить", "`reverse()` переворачивает, `concat()` соединяет массивы.", "Последние заказы сверху, объединить две корзины.", "console.log([1, 2].concat([3]).reverse());"),
      rule("`sort` и `splice` меняют исходный массив, `slice` и `toSorted` — нет. Помни, что меняется.")
    ],
    tasks: [task("Витрина", "Получи `cheap` — названия трёх самых дешёвых позиций `menu` (по возрастанию цены) — и строку `showcase` через `join(\", \")`.", {
      start: MENU + "const cheap = [];\nconst showcase = \"\";\n",
      checks: [run('JSON.stringify(cheap) === \'["Эспрессо","Латте","Чизкейк"]\'', "Три самых дешёвых"), run('showcase === "Эспрессо, Латте, Чизкейк"', "Строка витрины"), has("sort", "Использована сортировка")],
      solution: MENU + "const cheap = menu.toSorted((a, b) => a.price - b.price).slice(0, 3).map((d) => d.name);\nconst showcase = cheap.join(\", \");"
    })],
    quizzes: [
      single("js-sort-numbers", "Числа", "Почему `[10, 9, 100].sort()` даёт `[10, 100, 9]`?", [["strings", "Без функции sort сравнивает как строки"], ["bug", "Это баг браузера"], ["desc", "Сортирует по убыванию"], ["random", "Случайный порядок"]], "strings", "Нужна функция `(a, b) => a - b`."),
      multi("js-mutating", "Меняют массив", "Какие методы меняют исходный массив?", [["sort", "`sort()`"], ["splice", "`splice()`"], ["slice", "`slice()`"], ["map", "`map()`"]], ["sort", "splice"], "slice и map возвращают новый массив.")
    ]
  });

  L({
    slug: "destructuring-spread", title: "Деструктуризация и spread", summary: "Распаковка массивов и объектов, оператор ... для копий и слияния.",
    skill: ["js-destructuring", "Деструктуризация", "Распаковывать значения и копировать массивы и объекты."],
    now: "Берём первый и второй заказ одной строкой и копируем корзину, не ломая оригинал.",
    body: [
      scene("Одной строкой",
        ["bro", "Можно сразу разложить массив по переменным. А три точки — скопировать или склеить."]),
      op("[a, b] =", "Распаковка массива", "`const [first, second] = orders;` — переменные получают элементы по порядку.", "Взять первые элементы без индексов.", 'const [first, second] = ["Латте", "Раф", "Какао"];\nconsole.log(first, second);'),
      op("{ a, b } =", "Распаковка объекта", "`const { name, price } = drink;` — переменные получают свойства с теми же именами.", "Короткий доступ к полям.", 'const drink = { name: "Раф", price: 290 };\nconst { name, price } = drink;\nconsole.log(name, price);'),
      op("...", "Spread: развернуть", "`[...a, ...b]` — новый массив из элементов обоих; `{ ...obj, price: 230 }` — копия объекта с изменением.", "Копии без изменения оригинала.", 'const cart = ["Латте"];\nconst bigger = [...cart, "Раф"];\nconsole.log(cart, bigger);'),
      rule("Хочешь изменить, не ломая оригинал, — сначала копия через `...`.")
    ],
    tasks: [task("Без порчи", "Распакуй первые два заказа в `first` и `second`. Сделай `newCart` — копию `cart` с добавленным `\"Какао\"`, не меняя `cart`.", {
      start: 'const orders = ["Латте", "Раф", "Чай"];\nconst cart = ["Латте"];\nconst first = orders[0];\nconst second = "";\nconst newCart = cart;\n',
      checks: [run('first === "Латте" && second === "Раф"', "Первые два распакованы"), run('newCart.length === 2 && cart.length === 1', "Оригинал не тронут"), has("...", "Использован spread"), has("const [", "Использована деструктуризация")],
      solution: 'const orders = ["Латте", "Раф", "Чай"];\nconst cart = ["Латте"];\nconst [first, second] = orders;\nconst newCart = [...cart, "Какао"];'
    })],
    quizzes: [
      single("js-destr-arr", "Распаковка", "Чему равно `b` в `const [a, b] = [1, 2, 3]`?", [["2", "2"], ["1", "1"], ["3", "3"], ["arr", "[2, 3]"]], "2", "По порядку."),
      single("js-spread-copy", "Копия", "Как скопировать массив `a`?", [["spread", "`[...a]`"], ["assign", "`const b = a`"], ["ref", "`&a`"], ["copy", "`a.copy()`"]], "spread", "`b = a` — та же ссылка, не копия.")
    ]
  });
}
