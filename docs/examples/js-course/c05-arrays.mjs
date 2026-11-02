// Chapter 5: Arrays.
import { scene, rule, meth, op, kw, idea, typ, run, out, has, task, makeLesson } from "./kit.mjs";

const CATALOG = 'const products = [\n  { title: "Мышь", price: 1290, category: "input" },\n  { title: "Клавиатура", price: 4990, category: "input" },\n  { title: "Наушники", price: 3490, category: "audio" },\n  { title: "Колонка", price: 2790, category: "audio" }\n];\n';

export default function arrays(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "arrays", title: "Массивы: списки", summary: "Создание массива, индексы с нуля, length, push, pop, unshift, shift, indexOf и includes.",
    skill: ["js-arrays", "Массивы", "Хранить списки значений и добавлять, удалять и искать элементы."],
    now: "Храним списки в массивах: добавляем, удаляем и ищем элементы.",
    body: [
      scene("Список",
        ["you", "В корзину кладут книгу, потом ручку, потом передумывают. Как это хранить?"],
        ["nika", "Список в коде — массив. Элементы стоят по порядку, у каждого номер — индекс, и считают его с нуля."]),
      typ("[ ]", "Массив", "`const cart = [\"Книга\", \"Ручка\"];` — упорядоченный список. `cart[0]` — первый элемент, `cart.length` — сколько их, последний — `cart[cart.length - 1]`.", "Корзина, список задач, история действий.", 'const cart = ["Книга", "Ручка"];\nconsole.log(cart[0], cart.length);'),
      meth("push() · pop()", "В конец и из конца", "`push(x)` добавляет в конец, `pop()` убирает последний и возвращает его.", "Добавить элемент, отменить последнее действие.", 'const cart = ["Книга"];\ncart.push("Ручка");\nconsole.log(cart);\ncart.pop();\nconsole.log(cart);'),
      meth("unshift() · shift()", "В начало и из начала", "`unshift(x)` — в начало, `shift()` — убрать первый.", "Очередь: первым пришёл — первым обслужен.", 'const queue = ["Аня", "Борис"];\nconsole.log(queue.shift(), queue);'),
      meth("indexOf()", "Где элемент", "Индекс элемента или `-1`, если его нет.", "Найти позицию в списке.", 'console.log(["Книга", "Ручка"].indexOf("Ручка"));'),
      meth("arr.includes()", "Есть ли элемент", "`true` или `false`.", "Проверить, есть ли элемент в списке.", 'console.log(["Книга", "Ручка"].includes("Тетрадь"));'),
      rule("Индексы с нуля: у массива из трёх элементов последний — `[2]`.")
    ],
    tasks: [task("Работа с корзиной", "В `cart` добавь в конец `\"Блокнот\"`, убери первый элемент и сохрани в `hasPen`, есть ли в корзине `\"Ручка\"`.", {
      start: 'const cart = ["Книга", "Ручка"];\nconst hasPen = false;\n',
      checks: [run('JSON.stringify(cart) === \'["Ручка","Блокнот"]\'', "В корзине Ручка и Блокнот"), run("hasPen === true", "Ручка найдена"), has("includes", "Использован `includes`")],
      solution: 'const cart = ["Книга", "Ручка"];\ncart.push("Блокнот");\ncart.shift();\nconst hasPen = cart.includes("Ручка");'
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
    now: "Преобразуем и фильтруем массивы методами map и filter, без ручных циклов.",
    body: [
      scene("Без циклов",
        ["you", "Нужно показать только товары для ввода и сделать подписи «Мышь — 1290 ₽»."],
        ["bro", "Для этого у массивов есть методы. Ты даёшь колбэк, а цикл я делаю сам."]),
      meth("forEach()", "Для каждого", "Вызывает функцию для каждого элемента. Ничего не возвращает.", "Просто сделать что-то с каждым элементом.", '["HTML", "CSS"].forEach((lang, i) => console.log(i + 1, lang));'),
      meth("map()", "Преобразовать", "Возвращает новый массив той же длины: каждый элемент пропущен через функцию.", "Цены → подписи, объекты → имена.", "const prices = [150, 220];\nconsole.log(prices.map((p) => p * 2));"),
      meth("filter()", "Отобрать", "Возвращает новый массив только из элементов, для которых функция вернула `true`.", "Только нужная категория, только дешевле 200.", "const prices = [150, 220, 290];\nconsole.log(prices.filter((p) => p < 250));"),
      rule("`map` меняет каждый, `filter` отбирает некоторые. Оба не трогают исходный массив.")
    ],
    tasks: [task("Товары для ввода", "Из `products` получи `input` — только `category === \"input\"` — и `labels` — подписи вида `Мышь — 1290 ₽` для них.", {
      start: CATALOG + "const input = products;\nconst labels = [];\n",
      checks: [run("input.length === 2 && input.every((p) => p.category === \"input\")", "Только два товара для ввода"), run('labels[1] === "Клавиатура — 4990 ₽" && labels.length === 2', "Подписи собраны"), has("filter", "Использован `filter`"), has("map", "Использован `map`")],
      solution: CATALOG + 'const input = products.filter((p) => p.category === "input");\nconst labels = input.map((p) => `${p.title} — ${p.price} ₽`);'
    })],
    quizzes: [
      single("js-map-length", "map", "Сколько элементов вернёт `map` у массива из 5 элементов?", [["5", "5"], ["less", "Меньше или столько же"], ["one", "1"], ["0", "0"]], "5", "map всегда сохраняет длину."),
      single("js-filter-return", "filter", "Что должна вернуть функция в `filter`, чтобы элемент попал в результат?", [["true", "truthy-значение, например true"], ["el", "Сам элемент изменённым"], ["index", "Индекс"], ["nothing", "Ничего"]], "true", "Функция — вопрос «оставить?».")
    ]
  });

  L({
    slug: "find-some-every", title: "find, some, every", summary: "Поиск find и findIndex, проверки some и every.",
    skill: ["js-find", "Поиск в массиве", "Находить элемент и проверять условия для всего массива."],
    now: "Находим элементы массива и проверяем условия для всех или хотя бы одного.",
    body: [
      scene("Найти и проверить",
        ["you", "Пользователь ищет «наушники» — нужно найти их в каталоге. И понять, есть ли вообще аудиотовары."],
        ["nika", "`find` вернёт первый подходящий, `some` ответит «есть ли хоть один», `every` — «все ли»."]),
      meth("find()", "Первый подходящий", "Возвращает первый элемент, для которого функция вернула true, или `undefined`.", "Найти запись по имени или id.", 'const users = [{ name: "Аня", age: 20 }, { name: "Борис", age: 31 }];\nconsole.log(users.find((u) => u.name === "Борис"));'),
      meth("findIndex()", "Индекс первого подходящего", "Как `find`, но возвращает индекс или `-1`.", "Чтобы потом удалить или заменить.", "console.log([150, 220, 290].findIndex((p) => p > 200));"),
      meth("some()", "Хотя бы один", "`true`, если условие верно хотя бы для одного.", "Есть ли невыполненные задачи.", "console.log([150, 220].some((p) => p > 200));"),
      meth("every()", "Все", "`true`, если условие верно для всех.", "Все ли поля формы заполнены.", "console.log([150, 220].every((p) => p > 100));"),
      rule("Нужно одно значение — `find`. Нужен ответ да/нет — `some` или `every`.")
    ],
    tasks: [task("Поиск в каталоге", "Найди в `products` объект `headphones` с названием `\"Наушники\"`, проверь `hasAudio` — есть ли категория `audio`, и `allCheap` — все ли дешевле 5000.", {
      start: CATALOG + "const headphones = null;\nconst hasAudio = false;\nconst allCheap = false;\n",
      checks: [run("headphones && headphones.price === 3490", "Наушники найдены"), run("hasAudio === true", "Аудиотовары есть"), run("allCheap === true", "Всё дешевле 5000"), has("find(", "Использован `find`")],
      solution: CATALOG + 'const headphones = products.find((p) => p.title === "Наушники");\nconst hasAudio = products.some((p) => p.category === "audio");\nconst allCheap = products.every((p) => p.price < 5000);'
    })],
    quizzes: [
      single("js-find-none", "Не нашёл", "Что вернёт `find`, если ничего не подошло?", [["undef", "`undefined`"], ["minus-one", "`-1`"], ["null", "`null`"], ["arr", "Пустой массив"]], "undef", "А `findIndex` вернёт -1."),
      single("js-some-every", "some и every", "Что вернёт `[1, 5, 10].every((n) => n > 3)`?", [["false", "`false`"], ["true", "`true`"], ["arr", "[5, 10]"], ["5", "5"]], "false", "1 не больше 3.")
    ]
  });

  L({
    slug: "reduce", title: "reduce: свернуть в одно", summary: "Метод reduce, аккумулятор и начальное значение; сумма и подсчёт.",
    skill: ["js-reduce", "reduce", "Сводить массив к одному значению: сумме, количеству, объекту."],
    now: "Сворачиваем массив в одно значение методом reduce.",
    body: [
      scene("Одной строкой",
        ["bro", "Сумма, максимум, подсчёт — всё это «свернуть массив в одно значение». Это делает `reduce`."]),
      meth("reduce()", "Свернуть массив", "`arr.reduce((acc, x) => acc + x, 0)` — проходит по элементам, перенося результат в `acc`. Второй аргумент — начальное значение.", "Сумма корзины, итоги, группировки.", "const scores = [12, 30, 8];\nconst total = scores.reduce((sum, s) => sum + s, 0);\nconsole.log(total);"),
      idea("Аккумулятор", "Накопитель", "Первый параметр колбэка: то, что вернул предыдущий шаг.", "Понять, как reduce работает внутри.", undefined),
      rule("Всегда указывай начальное значение `reduce` — иначе на пустом массиве будет ошибка.")
    ],
    tasks: [task("Сумма каталога", "Посчитай `total` — сумму `price` всех товаров `products` — через `reduce`.", {
      start: CATALOG + "const total = 0;\n",
      checks: [run("total === 12560", "Сумма 12560"), has("reduce", "Использован `reduce`")],
      solution: CATALOG + "const total = products.reduce((sum, p) => sum + p.price, 0);"
    })],
    quizzes: [
      single("js-reduce-init", "Начальное", "Зачем второй аргумент `reduce(fn, 0)`?", [["init", "Начальное значение аккумулятора"], ["index", "С какого индекса начать"], ["limit", "Сколько элементов взять"], ["none", "Ни зачем"]], "init", "Без него на пустом массиве будет ошибка."),
      short("js-reduce-sum", "Посчитай", "Что вернёт `[1, 2, 3].reduce((a, b) => a + b, 10)`? Введи число.", ["16"], "10 + 1 + 2 + 3.")
    ]
  });

  L({
    slug: "sort-slice-splice", title: "Сортировка и куски", summary: "sort с функцией сравнения, slice, splice, concat, join, reverse и toSorted.",
    skill: ["js-sort", "Сортировка и куски", "Сортировать массивы и брать или менять их части."],
    now: "Сортируем массивы и берём или меняем их части.",
    body: [
      scene("По цене",
        ["you", "Нужно показать каталог от дешёвого к дорогому, а на главной — три первых товара."],
        ["bug", "А я подскажу: `[10, 9, 100].sort()` — и всё перепутается!"],
        ["nika", "Потому что `sort` без функции сортирует как строки. Дадим ему правило сравнения."]),
      meth("sort()", "Сортировка", "Сортирует массив на месте. Для чисел нужна функция: `(a, b) => a - b`.", "Товары по цене, люди по имени.", "const prices = [290, 150, 1000, 220];\nconsole.log([...prices].sort());\nconsole.log(prices.sort((a, b) => a - b));"),
      meth("toSorted()", "Отсортированная копия", "Как `sort`, но не меняет исходный массив.", "Сохранить оригинальный порядок.", "const prices = [290, 150];\nconsole.log(prices.toSorted((a, b) => a - b), prices);"),
      meth("arr.slice()", "Копия куска", "`arr.slice(0, 3)` — элементы с 0 по 2, исходный не меняется.", "Первые три элемента для витрины.", 'console.log(["a", "b", "c", "d"].slice(0, 3));'),
      meth("splice()", "Вырезать или вставить", "`arr.splice(i, n)` удаляет n элементов с индекса i (меняет массив).", "Убрать элемент из списка.", 'const todo = ["Купить хлеб", "Позвонить", "Сделать зарядку"];\ntodo.splice(1, 1);\nconsole.log(todo);'),
      meth("join()", "Склеить в строку", "`[\"a\", \"b\"].join(\", \")` → `\"a, b\"`.", "Список в одну строку.", 'console.log(["HTML", "CSS", "JS"].join(", "));'),
      meth("reverse() · concat()", "Перевернуть и соединить", "`reverse()` переворачивает, `concat()` соединяет массивы.", "Последние записи сверху, объединить два списка.", "console.log([1, 2].concat([3]).reverse());"),
      rule("`sort` и `splice` меняют исходный массив, `slice` и `toSorted` — нет. Помни, что меняется.")
    ],
    tasks: [task("Витрина", "Получи `cheap` — названия трёх самых дешёвых товаров `products` (по возрастанию цены) — и строку `showcase` через `join(\", \")`.", {
      start: CATALOG + "const cheap = [];\nconst showcase = \"\";\n",
      checks: [run('JSON.stringify(cheap) === \'["Мышь","Колонка","Наушники"]\'', "Три самых дешёвых"), run('showcase === "Мышь, Колонка, Наушники"', "Строка витрины"), has("sort", "Использована сортировка")],
      solution: CATALOG + "const cheap = products.toSorted((a, b) => a.price - b.price).slice(0, 3).map((p) => p.title);\nconst showcase = cheap.join(\", \");"
    })],
    quizzes: [
      single("js-sort-numbers", "Числа", "Почему `[10, 9, 100].sort()` даёт `[10, 100, 9]`?", [["strings", "Без функции sort сравнивает как строки"], ["bug", "Это баг браузера"], ["desc", "Сортирует по убыванию"], ["random", "Случайный порядок"]], "strings", "Нужна функция `(a, b) => a - b`."),
      multi("js-mutating", "Меняют массив", "Какие методы меняют исходный массив?", [["sort", "`sort()`"], ["splice", "`splice()`"], ["slice", "`slice()`"], ["map", "`map()`"]], ["sort", "splice"], "slice и map возвращают новый массив.")
    ]
  });

  L({
    slug: "destructuring-spread", title: "Деструктуризация и spread", summary: "Распаковка массивов и объектов, оператор ... для копий и слияния.",
    skill: ["js-destructuring", "Деструктуризация", "Распаковывать значения и копировать массивы и объекты."],
    now: "Распаковываем массивы и объекты и копируем их оператором ...",
    body: [
      scene("Одной строкой",
        ["bro", "Можно сразу разложить массив по переменным. А три точки — скопировать или склеить."]),
      op("[a, b] =", "Распаковка массива", "`const [first, second] = list;` — переменные получают элементы по порядку.", "Взять первые элементы без индексов.", 'const [first, second] = ["золото", "серебро", "бронза"];\nconsole.log(first, second);'),
      op("{ a, b } =", "Распаковка объекта", "`const { name, age } = user;` — переменные получают свойства с теми же именами.", "Короткий доступ к полям.", 'const user = { name: "Аня", age: 20 };\nconst { name, age } = user;\nconsole.log(name, age);'),
      op("...", "Spread: развернуть", "`[...a, ...b]` — новый массив из элементов обоих; `{ ...obj, age: 21 }` — копия объекта с изменением.", "Копии без изменения оригинала.", 'const list = ["HTML"];\nconst bigger = [...list, "CSS"];\nconsole.log(list, bigger);'),
      rule("Хочешь изменить, не ломая оригинал, — сначала копия через `...`.")
    ],
    tasks: [task("Без порчи", "Распакуй первые два элемента `places` в `first` и `second`. Сделай `newCart` — копию `cart` с добавленным `\"Блокнот\"`, не меняя `cart`.", {
      start: 'const places = ["Аня", "Борис", "Вера"];\nconst cart = ["Книга"];\nconst first = places[0];\nconst second = "";\nconst newCart = cart;\n',
      checks: [run('first === "Аня" && second === "Борис"', "Первые два распакованы"), run('newCart.length === 2 && cart.length === 1', "Оригинал не тронут"), has("...", "Использован spread"), has("const [", "Использована деструктуризация")],
      solution: 'const places = ["Аня", "Борис", "Вера"];\nconst cart = ["Книга"];\nconst [first, second] = places;\nconst newCart = [...cart, "Блокнот"];'
    })],
    quizzes: [
      single("js-destr-arr", "Распаковка", "Чему равно `b` в `const [a, b] = [1, 2, 3]`?", [["2", "2"], ["1", "1"], ["3", "3"], ["arr", "[2, 3]"]], "2", "По порядку."),
      single("js-spread-copy", "Копия", "Как скопировать массив `a`?", [["spread", "`[...a]`"], ["assign", "`const b = a`"], ["ref", "`&a`"], ["copy", "`a.copy()`"]], "spread", "`b = a` — та же ссылка, не копия.")
    ]
  });
}
