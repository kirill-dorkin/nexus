// Chapter 6: Objects, JSON and classes.
import { scene, rule, kw, meth, obj, op, idea, typ, run, out, has, task, makeLesson } from "./kit.mjs";

export default function objects(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "objects", title: "Объекты: карточка напитка", summary: "Литерал объекта, свойства через точку и квадратные скобки, добавление, изменение и удаление, оператор in.",
    skill: ["js-objects", "Объекты", "Описывать сущности объектами и работать с их свойствами."],
    now: "У напитка есть имя, цена, объём и состав. Храним всё это одним объектом.",
    body: [
      scene("Карточка напитка",
        ["marta", "У латте есть название, цена, объём и молоко на выбор. Как это хранить вместе?"],
        ["nika", "Объект — набор свойств «ключ: значение». Как карточка в картотеке."]),
      typ("{ }", "Объект", "`const drink = { name: \"Латте\", price: 220 };` — свойства через запятую.", "Описать одну вещь со многими характеристиками.", 'const drink = { name: "Латте", price: 220, ml: 350 };\nconsole.log(drink);'),
      op("obj.key", "Свойство через точку", "`drink.price` — прочитать, `drink.price = 230` — изменить, `drink.hot = true` — добавить.", "Обычный доступ к свойствам.", 'const drink = { name: "Латте", price: 220 };\ndrink.price = 230;\ndrink.hot = true;\nconsole.log(drink.price, drink.hot);'),
      op("obj[key]", "Свойство по имени из переменной", "`drink[key]` — когда имя свойства хранится в переменной.", "Перебор, динамические поля.", 'const drink = { name: "Раф", price: 290 };\nconst key = "price";\nconsole.log(drink[key]);'),
      op("delete", "Удалить свойство", "`delete drink.hot` — свойство исчезает.", "Убрать временные данные.", 'const drink = { name: "Какао", promo: true };\ndelete drink.promo;\nconsole.log(drink);'),
      op("in", "Есть ли свойство", "`\"price\" in drink` → `true`.", "Проверить, заполнено ли поле.", 'console.log("price" in { price: 220 });'),
      rule("Одна вещь со многими характеристиками — объект. Много однотипных вещей — массив объектов.")
    ],
    tasks: [task("Карточка раф", "Создай объект `raf` с `name: \"Раф\"`, `price: 290`. Потом подними цену до `310` и добавь свойство `syrup: \"ваниль\"`.", {
      start: "const raf = {};\n",
      checks: [run('raf.name === "Раф"', "Имя Раф"), run("raf.price === 310", "Цена поднята до 310"), run('raf.syrup === "ваниль"', "Добавлен сироп")],
      solution: 'const raf = { name: "Раф", price: 290 };\nraf.price = 310;\nraf.syrup = "ваниль";'
    })],
    quizzes: [
      single("js-obj-brackets", "Скобки", "Когда нужен доступ `obj[key]`, а не `obj.key`?", [["var", "Когда имя свойства лежит в переменной"], ["always", "Всегда"], ["never", "Никогда"], ["num", "Только для чисел"]], "var", "`obj.key` ищет свойство с именем «key»."),
      single("js-obj-missing", "Нет свойства", "Что вернёт `({ a: 1 }).b`?", [["undef", "`undefined`"], ["null", "`null`"], ["error", "Ошибку"], ["0", "0"]], "undef", "Отсутствующее свойство — undefined.")
    ]
  });

  L({
    slug: "methods-this", title: "Методы и this", summary: "Функции внутри объекта, короткая запись методов, this, сокращённые свойства.",
    skill: ["js-methods", "Методы объекта", "Добавлять объекту поведение и обращаться к его данным через this."],
    now: "Пусть корзина сама умеет добавлять позицию и считать сумму.",
    body: [
      scene("Умная корзина",
        ["bro", "Объект может хранить не только данные, но и действия — методы. Внутри метода `this` — это сам объект."]),
      idea("Метод", "Функция-свойство", "`const cart = { items: [], add(item) { … } }` — вызывается как `cart.add(x)`.", "Данные и действия с ними — в одном месте.", 'const cup = {\n  size: 350,\n  describe() {\n    return `Стакан ${this.size} мл`;\n  }\n};\nconsole.log(cup.describe());'),
      kw("this", "Этот объект", "Внутри метода `this` указывает на объект, у которого метод вызван.", "Обратиться к своим свойствам.", undefined),
      idea("Короткие свойства", "{ name } вместо { name: name }", "Если переменная и свойство называются одинаково, можно писать один раз.", "Короче собирать объекты.", 'const name = "Латте", price = 220;\nconst drink = { name, price };\nconsole.log(drink);'),
      rule("У стрелочной функции нет своего `this`: методы объекта пиши обычной записью `add() {}`.")
    ],
    tasks: [task("Корзина с методами", "Допиши объект `cart`: метод `add(price)` кладёт цену в `this.items`, метод `total()` возвращает сумму.", {
      start: "const cart = {\n  items: [],\n  add(price) {},\n  total() { return 0; }\n};\n",
      checks: [run("(cart.items.length = 0, cart.add(220), cart.add(150), cart.items.length === 2)", "`add` добавляет"), run("(cart.items.length = 0, cart.add(220), cart.add(150), cart.total() === 370)", "`total` считает сумму"), has("this.items", "Использован `this`")],
      solution: "const cart = {\n  items: [],\n  add(price) {\n    this.items.push(price);\n  },\n  total() {\n    return this.items.reduce((sum, p) => sum + p, 0);\n  }\n};"
    })],
    quizzes: [
      single("js-this", "this", "На что указывает `this` в `cart.total()`?", [["cart", "На объект `cart`"], ["window", "Всегда на window"], ["fn", "На функцию total"], ["none", "Ни на что"]], "cart", "Объект слева от точки при вызове."),
      single("js-shorthand", "Короткая запись", "Что значит `{ price }`?", [["same", "`{ price: price }`"], ["arr", "Массив с price"], ["empty", "Пустой объект"], ["err", "Ошибку"]], "same", "Сокращённая запись свойства.")
    ]
  });

  L({
    slug: "object-iteration", title: "Перебор объекта", summary: "Object.keys, Object.values, Object.entries, for…in и Object.fromEntries.",
    skill: ["js-object-iteration", "Перебор объекта", "Проходить по свойствам объекта и превращать объект в массивы и обратно."],
    now: "Склад: объект «продукт → остаток». Нужно показать всё, что заканчивается.",
    body: [
      scene("Склад",
        ["marta", "У меня объект остатков: молоко 3, зерно 10, сироп 1. Что заканчивается?"],
        ["bro", "Преврати объект в список пар — и работай с ним как с массивом."]),
      meth("Object.keys()", "Ключи", "Массив имён свойств.", "Список того, что есть.", 'console.log(Object.keys({ milk: 3, beans: 10 }));'),
      meth("Object.values()", "Значения", "Массив значений.", "Сумма всех остатков.", "console.log(Object.values({ milk: 3, beans: 10 }));"),
      meth("Object.entries()", "Пары", "Массив пар `[ключ, значение]`.", "Перебор с ключами и значениями сразу.", 'for (const [item, left] of Object.entries({ milk: 3, syrup: 1 })) {\n  console.log(item, left);\n}'),
      meth("Object.fromEntries()", "Пары → объект", "Обратно из массива пар в объект.", "Отфильтровать объект через entries и собрать снова.", 'console.log(Object.fromEntries([["milk", 3]]));'),
      kw("for…in", "Перебор ключей", "`for (const key in obj)` — по именам свойств.", "Старый способ, встречается в чужом коде.", 'for (const key in { milk: 3, beans: 10 }) console.log(key);'),
      rule("Объект перебирают через `Object.entries` — дальше работают как с массивом.")
    ],
    tasks: [task("Что заканчивается", "Из `stock` получи `low` — массив названий, где остаток меньше 5.", {
      start: "const stock = { milk: 3, beans: 10, syrup: 1, cups: 40 };\nconst low = [];\n",
      checks: [run('JSON.stringify(low) === \'["milk","syrup"]\'', "Молоко и сироп"), has("Object.", "Использован Object.keys/entries")],
      solution: "const stock = { milk: 3, beans: 10, syrup: 1, cups: 40 };\nconst low = Object.entries(stock).filter(([, left]) => left < 5).map(([item]) => item);"
    })],
    quizzes: [
      single("js-entries", "entries", "Что вернёт `Object.entries({ a: 1 })`?", [["pairs", "`[[\"a\", 1]]`"], ["keys", "`[\"a\"]`"], ["values", "`[1]`"], ["obj", "`{ a: 1 }`"]], "pairs", "Массив пар."),
      single("js-keys", "keys", "Что вернёт `Object.keys({ x: 1, y: 2 }).length`?", [["2", "2"], ["1", "1"], ["3", "3"], ["undef", "undefined"]], "2", "Два ключа.")
    ]
  });

  L({
    slug: "json", title: "JSON: данные текстом", summary: "Формат JSON, JSON.stringify и JSON.parse, отличие JSON от объекта JavaScript.",
    skill: ["js-json", "JSON", "Превращать данные в текст JSON и обратно."],
    now: "Корзину надо сохранить и отправить на сервер. Объект превращаем в текст — JSON.",
    body: [
      scene("Как отправить",
        ["marta", "Корзину надо отправить на кухню. Но по сети ходит только текст!"],
        ["bro", "Для этого есть JSON — текстовый формат данных. Объект → строка, и обратно."]),
      idea("JSON", "Текстовый формат данных", "Похож на объект JS, но строже: ключи только в двойных кавычках, без функций и комментариев.", "Формат обмена данными с сервером и хранения.", undefined),
      meth("JSON.stringify()", "Объект → текст", "Превращает значение в JSON-строку.", "Отправить или сохранить.", 'const cart = { items: ["Латте"], total: 220 };\nconst text = JSON.stringify(cart);\nconsole.log(text, typeof text);'),
      meth("JSON.parse()", "Текст → объект", "Разбирает JSON-строку в значение. Неверный JSON — ошибка.", "Получили ответ сервера — разобрали.", 'const data = JSON.parse(\'{"name":"Раф","price":290}\');\nconsole.log(data.price);'),
      rule("Пришло по сети — `JSON.parse`. Отправляешь — `JSON.stringify`. Посередине всегда строка.")
    ],
    tasks: [task("Туда и обратно", "Преврати `order` в строку `text` через `JSON.stringify`, а затем разбери её обратно в `copy`.", {
      start: 'const order = { drink: "Латте", qty: 2 };\nconst text = "";\nconst copy = {};\n',
      checks: [run('typeof text === "string" && text.includes("\\"drink\\":\\"Латте\\"")', "`text` — JSON-строка"), run('copy.drink === "Латте" && copy.qty === 2 && copy !== order', "`copy` — новый объект с теми же данными")],
      solution: 'const order = { drink: "Латте", qty: 2 };\nconst text = JSON.stringify(order);\nconst copy = JSON.parse(text);'
    })],
    quizzes: [
      single("js-json-keys", "Кавычки", "Какой JSON правильный?", [["ok", "`{\"name\": \"Раф\"}`"], ["single", "`{'name': 'Раф'}`"], ["bare", "`{name: \"Раф\"}`"], ["fn", "`{\"f\": function(){}}`"]], "ok", "В JSON — только двойные кавычки у ключей и строк."),
      single("js-json-type", "Тип", "Какой тип у результата `JSON.stringify({ a: 1 })`?", [["string", "Строка"], ["object", "Объект"], ["json", "Особый тип JSON"], ["array", "Массив"]], "string", "JSON — это текст.")
    ]
  });

  L({
    slug: "classes", title: "Классы", summary: "class, constructor, методы класса, new, наследование extends и super, геттеры get.",
    skill: ["js-classes", "Классы", "Описывать шаблоны объектов классами и создавать экземпляры."],
    now: "Каждый заказ — объект с одинаковым устройством. Описываем шаблон заказа классом.",
    body: [
      scene("Шаблон заказа",
        ["marta", "Каждый заказ одинаковый: номер, позиции, сумма. Можно сделать «бланк»?"],
        ["nika", "Класс — это бланк. По нему `new` создаёт сколько угодно заказов."]),
      kw("class", "Шаблон объектов", "`class Order { … }` — описание устройства объектов: данные и методы.", "Много однотипных объектов.", 'class Cup {\n  constructor(size) {\n    this.size = size;\n  }\n  describe() {\n    return `Стакан ${this.size} мл`;\n  }\n}\nconsole.log(new Cup(350).describe());'),
      meth("constructor()", "Конструктор", "Особый метод: вызывается при `new` и заполняет свойства.", "Задать начальные данные.", undefined),
      kw("new", "Создать экземпляр", "`new Order(1)` — новый объект по шаблону класса.", "Получить конкретный заказ.", undefined),
      kw("extends · super", "Наследование", "`class Takeaway extends Order` — берёт всё у родителя; `super(...)` вызывает конструктор родителя.", "Заказ с собой — тот же заказ плюс упаковка.", 'class Order {\n  constructor(id) { this.id = id; }\n}\nclass Takeaway extends Order {\n  constructor(id) {\n    super(id);\n    this.pack = true;\n  }\n}\nconsole.log(new Takeaway(7));'),
      kw("get", "Геттер", "`get total() { … }` — вычисляемое свойство: читается как поле, считается как функция.", "Сумма всегда актуальна.", 'class Bill {\n  constructor(items) { this.items = items; }\n  get total() { return this.items.reduce((s, p) => s + p, 0); }\n}\nconsole.log(new Bill([220, 150]).total);'),
      rule("Класс нужен, когда объектов одного устройства много и у них есть поведение.")
    ],
    tasks: [task("Класс заказа", "Опиши класс `Order`: конструктор принимает `id` и создаёт пустой массив `items`; метод `add(price)` кладёт цену; геттер `total` возвращает сумму.", {
      start: "class Order {\n}\n",
      checks: [run("new Order(1).id === 1", "У заказа есть номер"), run("(() => { const o = new Order(2); o.add(220); o.add(150); return o.items.length === 2; })()", "`add` добавляет позиции"), run("(() => { const o = new Order(3); o.add(220); o.add(150); return o.total === 370; })()", "Геттер `total` считает сумму")],
      solution: "class Order {\n  constructor(id) {\n    this.id = id;\n    this.items = [];\n  }\n  add(price) {\n    this.items.push(price);\n  }\n  get total() {\n    return this.items.reduce((sum, p) => sum + p, 0);\n  }\n}"
    })],
    quizzes: [
      single("js-class-new", "new", "Что делает `new Order(5)`?", [["instance", "Создаёт новый объект по классу Order и вызывает constructor"], ["copy", "Копирует класс"], ["call", "Просто вызывает функцию"], ["delete", "Удаляет заказ 5"]], "instance", "Экземпляр класса."),
      single("js-super", "super", "Зачем `super(id)` в конструкторе наследника?", [["parent", "Вызвать конструктор родителя"], ["global", "Обратиться к глобальной переменной"], ["return", "Вернуть значение"], ["static", "Сделать метод статическим"]], "parent", "Без него `this` в наследнике использовать нельзя.")
    ]
  });
}
