// Chapter 6: Objects, JSON and classes.
import { scene, rule, kw, meth, obj, op, idea, typ, run, out, has, task, makeLesson } from "./kit.mjs";

export default function objects(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "objects", title: "Объекты: карточка с данными", summary: "Литерал объекта, свойства через точку и квадратные скобки, добавление, изменение и удаление, оператор in.",
    skill: ["js-objects", "Объекты", "Описывать сущности объектами и работать с их свойствами."],
    now: "Описываем вещи объектами и работаем с их свойствами.",
    body: [
      scene("Карточка пользователя",
        ["you", "У пользователя есть имя, возраст, город и почта. Как хранить это вместе?"],
        ["nika", "Объект — набор свойств «ключ: значение». Как карточка в картотеке."]),
      typ("{ }", "Объект", "`const user = { name: \"Аня\", age: 20 };` — свойства через запятую.", "Описать одну вещь со многими характеристиками.", 'const user = { name: "Аня", age: 20, city: "Казань" };\nconsole.log(user);'),
      op("obj.key", "Свойство через точку", "`user.age` — прочитать, `user.age = 21` — изменить, `user.admin = true` — добавить.", "Обычный доступ к свойствам.", 'const user = { name: "Аня", age: 20 };\nuser.age = 21;\nuser.admin = true;\nconsole.log(user.age, user.admin);'),
      op("obj[key]", "Свойство по имени из переменной", "`user[key]` — когда имя свойства хранится в переменной.", "Перебор, динамические поля.", 'const user = { name: "Борис", city: "Пермь" };\nconst key = "city";\nconsole.log(user[key]);'),
      op("delete", "Удалить свойство", "`delete user.temp` — свойство исчезает.", "Убрать временные данные.", 'const user = { name: "Вера", temp: true };\ndelete user.temp;\nconsole.log(user);'),
      op("in", "Есть ли свойство", "`\"age\" in user` → `true`.", "Проверить, заполнено ли поле.", 'console.log("price" in { price: 220 });'),
      rule("Одна вещь со многими характеристиками — объект. Много однотипных вещей — массив объектов.")
    ],
    tasks: [task("Карточка пользователя", "Создай объект `user` с `name: \"Аня\"`, `age: 20`. Потом поменяй возраст на `21` и добавь свойство `city: \"Казань\"`.", {
      start: "const user = {};\n",
      checks: [run('user.name === "Аня"', "Имя Аня"), run("user.age === 21", "Возраст 21"), run('user.city === "Казань"', "Добавлен город")],
      solution: 'const user = { name: "Аня", age: 20 };\nuser.age = 21;\nuser.city = "Казань";'
    })],
    quizzes: [
      single("js-obj-brackets", "Скобки", "Когда нужен доступ `obj[key]`, а не `obj.key`?", [["var", "Когда имя свойства лежит в переменной"], ["always", "Всегда"], ["never", "Никогда"], ["num", "Только для чисел"]], "var", "`obj.key` ищет свойство с именем «key»."),
      single("js-obj-missing", "Нет свойства", "Что вернёт `({ a: 1 }).b`?", [["undef", "`undefined`"], ["null", "`null`"], ["error", "Ошибку"], ["0", "0"]], "undef", "Отсутствующее свойство — undefined.")
    ]
  });

  L({
    slug: "methods-this", title: "Методы и this", summary: "Функции внутри объекта, короткая запись методов, this, сокращённые свойства.",
    skill: ["js-methods", "Методы объекта", "Добавлять объекту поведение и обращаться к его данным через this."],
    now: "Добавляем объектам поведение — методы — и обращаемся к данным через this.",
    body: [
      scene("Умная корзина",
        ["bro", "Объект может хранить не только данные, но и действия — методы. Внутри метода `this` — это сам объект."]),
      idea("Метод", "Функция-свойство", "`const cart = { items: [], add(item) { … } }` — вызывается как `cart.add(x)`.", "Данные и действия с ними — в одном месте.", 'const rect = {\n  w: 3,\n  h: 4,\n  area() {\n    return this.w * this.h;\n  }\n};\nconsole.log(rect.area());'),
      kw("this", "Этот объект", "Внутри метода `this` указывает на объект, у которого метод вызван.", "Обратиться к своим свойствам.", undefined),
      idea("Короткие свойства", "{ name } вместо { name: name }", "Если переменная и свойство называются одинаково, можно писать один раз.", "Короче собирать объекты.", 'const name = "Аня", age = 20;\nconst user = { name, age };\nconsole.log(user);'),
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
    now: "Перебираем свойства объекта и превращаем объект в массивы и обратно.",
    body: [
      scene("Склад",
        ["you", "У меня объект остатков: ручек 3, тетрадей 10, блокнотов 1. Как узнать, что заканчивается?"],
        ["bro", "Преврати объект в список пар — и работай с ним как с массивом."]),
      meth("Object.keys()", "Ключи", "Массив имён свойств.", "Список того, что есть.", 'console.log(Object.keys({ pens: 3, books: 10 }));'),
      meth("Object.values()", "Значения", "Массив значений.", "Сумма всех остатков.", "console.log(Object.values({ pens: 3, books: 10 }));"),
      meth("Object.entries()", "Пары", "Массив пар `[ключ, значение]`.", "Перебор с ключами и значениями сразу.", 'for (const [item, left] of Object.entries({ pens: 3, notes: 1 })) {\n  console.log(item, left);\n}'),
      meth("Object.fromEntries()", "Пары → объект", "Обратно из массива пар в объект.", "Отфильтровать объект через entries и собрать снова.", 'console.log(Object.fromEntries([["pens", 3]]));'),
      kw("for…in", "Перебор ключей", "`for (const key in obj)` — по именам свойств.", "Старый способ, встречается в чужом коде.", 'for (const key in { pens: 3, books: 10 }) console.log(key);'),
      rule("Объект перебирают через `Object.entries` — дальше работают как с массивом.")
    ],
    tasks: [task("Что заканчивается", "Из `stock` получи `low` — массив названий, где остаток меньше 5.", {
      start: "const stock = { pens: 3, books: 10, notes: 1, folders: 40 };\nconst low = [];\n",
      checks: [run('JSON.stringify(low) === \'["pens","notes"]\'', "Ручки и блокноты"), has("Object.", "Использован Object.keys/entries")],
      solution: "const stock = { pens: 3, books: 10, notes: 1, folders: 40 };\nconst low = Object.entries(stock).filter(([, left]) => left < 5).map(([item]) => item);"
    })],
    quizzes: [
      single("js-entries", "entries", "Что вернёт `Object.entries({ a: 1 })`?", [["pairs", "`[[\"a\", 1]]`"], ["keys", "`[\"a\"]`"], ["values", "`[1]`"], ["obj", "`{ a: 1 }`"]], "pairs", "Массив пар."),
      single("js-keys", "keys", "Что вернёт `Object.keys({ x: 1, y: 2 }).length`?", [["2", "2"], ["1", "1"], ["3", "3"], ["undef", "undefined"]], "2", "Два ключа.")
    ]
  });

  L({
    slug: "json", title: "JSON: данные текстом", summary: "Формат JSON, JSON.stringify и JSON.parse, отличие JSON от объекта JavaScript.",
    skill: ["js-json", "JSON", "Превращать данные в текст JSON и обратно."],
    now: "Превращаем данные в текст JSON и обратно.",
    body: [
      scene("Как отправить",
        ["you", "Корзину надо отправить на сервер. Но по сети ходит только текст!"],
        ["bro", "Для этого есть JSON — текстовый формат данных. Объект → строка, и обратно."]),
      idea("JSON", "Текстовый формат данных", "Похож на объект JS, но строже: ключи только в двойных кавычках, без функций и комментариев.", "Формат обмена данными с сервером и хранения.", undefined),
      meth("JSON.stringify()", "Объект → текст", "Превращает значение в JSON-строку.", "Отправить или сохранить.", 'const cart = { items: ["Книга"], total: 220 };\nconst text = JSON.stringify(cart);\nconsole.log(text, typeof text);'),
      meth("JSON.parse()", "Текст → объект", "Разбирает JSON-строку в значение. Неверный JSON — ошибка.", "Получили ответ сервера — разобрали.", 'const data = JSON.parse(\'{"name":"Аня","age":20}\');\nconsole.log(data.age);'),
      rule("Пришло по сети — `JSON.parse`. Отправляешь — `JSON.stringify`. Посередине всегда строка.")
    ],
    tasks: [task("Туда и обратно", "Преврати `order` в строку `text` через `JSON.stringify`, а затем разбери её обратно в `copy`.", {
      start: 'const order = { item: "Книга", qty: 2 };\nconst text = "";\nconst copy = {};\n',
      checks: [run('typeof text === "string" && text.includes("\\"item\\":\\"Книга\\"")', "`text` — JSON-строка"), run('copy.item === "Книга" && copy.qty === 2 && copy !== order', "`copy` — новый объект с теми же данными")],
      solution: 'const order = { item: "Книга", qty: 2 };\nconst text = JSON.stringify(order);\nconst copy = JSON.parse(text);'
    })],
    quizzes: [
      single("js-json-keys", "Кавычки", "Какой JSON правильный?", [["ok", "`{\"name\": \"Аня\"}`"], ["single", "`{'name': 'Аня'}`"], ["bare", "`{name: \"Аня\"}`"], ["fn", "`{\"f\": function(){}}`"]], "ok", "В JSON — только двойные кавычки у ключей и строк."),
      single("js-json-type", "Тип", "Какой тип у результата `JSON.stringify({ a: 1 })`?", [["string", "Строка"], ["object", "Объект"], ["json", "Особый тип JSON"], ["array", "Массив"]], "string", "JSON — это текст.")
    ]
  });

  L({
    slug: "classes", title: "Классы", summary: "class, constructor, методы класса, new, наследование extends и super, геттеры get.",
    skill: ["js-classes", "Классы", "Описывать шаблоны объектов классами и создавать экземпляры."],
    now: "Описываем шаблоны объектов классами и создаём экземпляры через new.",
    body: [
      scene("Шаблон заказа",
        ["you", "Все заказы в магазине устроены одинаково: номер, позиции, сумма. Можно сделать «бланк»?"],
        ["nika", "Класс — это бланк. По нему `new` создаёт сколько угодно заказов."]),
      kw("class", "Шаблон объектов", "`class Order { … }` — описание устройства объектов: данные и методы.", "Много однотипных объектов.", 'class Rect {\n  constructor(w, h) {\n    this.w = w;\n    this.h = h;\n  }\n  area() {\n    return this.w * this.h;\n  }\n}\nconsole.log(new Rect(3, 4).area());'),
      meth("constructor()", "Конструктор", "Особый метод: вызывается при `new` и заполняет свойства.", "Задать начальные данные.", undefined),
      kw("new", "Создать экземпляр", "`new Order(1)` — новый объект по шаблону класса.", "Получить конкретный заказ.", undefined),
      kw("extends · super", "Наследование", "`class Delivery extends Order` — берёт всё у родителя; `super(...)` вызывает конструктор родителя.", "Заказ с доставкой — тот же заказ плюс адрес.", 'class Order {\n  constructor(id) { this.id = id; }\n}\nclass Delivery extends Order {\n  constructor(id, address) {\n    super(id);\n    this.address = address;\n  }\n}\nconsole.log(new Delivery(7, "Казань"));'),
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
