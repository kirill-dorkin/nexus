// Chapter 6: joining tables.
import { scene, clause, kw, idea, rule, diagram, rows, src, task, makeLesson } from "./kit.mjs";

export default function joins(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "keys-relations", title: "Ключи и связи", summary: "Почему данные лежат в разных таблицах и как строки ссылаются друг на друга.",
    skill: ["sql-keys", "Ключи и связи", "Понимать первичные и внешние ключи и связь «один ко многим»."],
    now: "В заказах вместо имён гостей стоят какие-то числа. Марта не понимает, кто есть кто.",
    body: [
      scene("Что за 7?",
        ["marta", "Открыла заказы, а там `customer_id = 7`. Кто такой седьмой?"],
        ["slon", "Это ссылка. Гость номер 7 живёт в таблице `customers`. Имя хранится один раз — там. В заказе только номер."],
        ["nika", "Поменяет Жанна телефон — правим одну строку, а не сто заказов. В этом весь смысл."]),
      idea("Ключ", "Уникальный номер строки", "Первичный ключ (`id`) однозначно определяет строку: двух гостей с одинаковым id не бывает.", "По ключу строку находят из других таблиц, даже если имя или почта поменялись.", "SELECT id, name\nFROM customers\nWHERE id = 7;"),
      idea("Внешний ключ", "Ссылка на строку другой таблицы", "Столбец вроде `orders.customer_id` хранит id строки из `customers`. База следит, чтобы ссылка вела на существующую строку.", "Связи между таблицами без дублирования данных.", "SELECT id, customer_id, created_at\nFROM orders\nWHERE customer_id = 7;"),
      diagram({ kind: "flow", title: "Один ко многим", steps: [
        { title: "customers", text: "Гость №7 — Жанна, одна строка" },
        { title: "orders.customer_id = 7", text: "Сколько угодно заказов ссылаются на неё" },
        { title: "order_items.order_id", text: "В каждом заказе — свои позиции" }
      ] }),
      idea("Один ко многим", "Самая частая связь", "У одного гостя много заказов, у одной категории много товаров. «Многие» хранят ссылку на «одного».", "По такой схеме устроены почти все базы: магазины, соцсети, банки.", undefined),
      rule("Каждый факт хранится в одном месте. Остальные таблицы на него ссылаются по ключу.")
    ],
    tasks: [task("Заказы Анны", "Анна Смирнова — гость с `id = 1`. Выведи `id`, `created_at` и `status` всех её заказов.", {
      checks: [rows("SELECT id, created_at, status FROM orders WHERE customer_id = 1", "Все заказы гостя №1")],
      hint: "`WHERE customer_id = 1`",
      solution: "SELECT id, created_at, status\nFROM orders\nWHERE customer_id = 1;"
    })],
    quizzes: [
      single("sql-keys-pk", "Первичный ключ", "Что гарантирует первичный ключ?", [["unique", "Значение уникально и не пустое"], ["sorted", "Строки отсортированы"], ["fast", "Таблица маленькая"], ["text", "Значение — текст"]], "unique", "PRIMARY KEY = UNIQUE + NOT NULL."),
      single("sql-keys-where", "Где ссылка", "Связь «один гость — много заказов». Где хранится ссылка?", [["orders", "В `orders.customer_id`"], ["customers", "В `customers.order_id`"], ["both", "В обеих таблицах"], ["third", "Только в отдельной таблице"]], "orders", "«Многие» ссылаются на «одного».")
    ]
  });

  L({
    slug: "inner-join", title: "JOIN", summary: "Склеиваем строки двух таблиц по ключу.",
    skill: ["sql-join", "INNER JOIN", "Соединять таблицы через JOIN … ON и использовать псевдонимы таблиц."],
    now: "Даше нужно меню с названиями категорий, а в `products` только `category_id`.",
    body: [
      scene("Название вместо номера",
        ["dasha", "В меню вместо «Кофе» стоит 1. Как получить слово?"],
        ["slon", "Соедини `products` с `categories`: для каждого товара я найду категорию с таким же id и поставлю строки рядом."]),
      clause("JOIN · INNER JOIN", "Соединение", "`FROM a JOIN b ON условие` — для каждой пары строк, где условие истинно, получается одна строка со столбцами обеих таблиц. Строки без пары пропадают.", "Имена вместо номеров, данные из нескольких таблиц в одном отчёте.", "SELECT products.name, categories.name AS category\nFROM products\nJOIN categories ON products.category_id = categories.id;"),
      kw("ON", "Условие соединения", "Говорит, какие строки подходят друг другу. Обычно «внешний ключ = первичный ключ».", "Без правильного ON получится каждая строка с каждой — тысячи лишних строк.", "SELECT o.id, s.name AS barista\nFROM orders AS o\nJOIN staff AS s ON o.staff_id = s.id\nLIMIT 5;"),
      idea("Псевдоним таблицы", "Короткое имя", "`FROM products AS p` — дальше пишем `p.name`. AS можно опустить: `FROM products p`.", "Короче запрос и нет путаницы, когда в двух таблицах есть `name` и `id`.", "SELECT p.name, p.price, c.name AS category\nFROM products p\nJOIN categories c ON p.category_id = c.id\nWHERE c.name = 'Десерты';"),
      rule("В запросе с JOIN пиши у каждого столбца таблицу: `p.name`, `c.name`. Иначе база (и коллега) запутается.")
    ],
    tasks: [task("Меню с категориями", "Выведи название товара `product` и название его категории `category` для всех товаров, у которых категория есть.", {
      checks: [rows("SELECT p.name AS product, c.name AS category FROM products p JOIN categories c ON p.category_id = c.id", "Товар и его категория", { names: true }), src("join", "Используется `JOIN`")],
      hint: "`FROM products p JOIN categories c ON p.category_id = c.id`",
      solution: "SELECT p.name AS product, c.name AS category\nFROM products p\nJOIN categories c ON p.category_id = c.id;"
    })],
    quizzes: [
      single("sql-join-lost", "Без пары", "Что INNER JOIN делает со строками без пары?", [["drop", "Не включает в результат"], ["null", "Оставляет с NULL"], ["error", "Выдаёт ошибку"], ["dup", "Дублирует"]], "drop", "INNER JOIN оставляет только совпавшие пары. Какао без категории пропадёт."),
      single("sql-join-ambiguous", "Неоднозначность", "Почему `SELECT name FROM products JOIN categories ON …` падает?", [["both", "`name` есть в обеих таблицах"], ["join", "JOIN без INNER нельзя"], ["on", "ON должен идти до JOIN"], ["fine", "Не падает"]], "both", "Укажи таблицу: `products.name`.")
    ]
  });

  L({
    slug: "left-join", title: "LEFT JOIN", summary: "Сохраняем все строки левой таблицы и ищем тех, у кого нет пары.",
    skill: ["sql-left-join", "LEFT JOIN", "Соединять с сохранением всех строк левой таблицы и находить строки без пары."],
    now: "Даша хочет вернуть гостей, которые завели карту, но ни разу ничего не заказали.",
    body: [
      scene("Те, кого нет",
        ["dasha", "Мне нужны гости без заказов. Но JOIN их как раз и выбрасывает!"],
        ["slon", "LEFT JOIN сохранит всех гостей. У кого заказов нет, в столбцах заказа будет NULL. По этому NULL их и найдёшь."]),
      clause("LEFT JOIN", "Все слева", "Все строки левой таблицы попадают в результат. Если пары справа нет — правые столбцы заполняются NULL.", "Списки «все гости и их заказы, если есть», категории вместе с пустыми.", "SELECT c.name AS category, p.name AS product\nFROM categories c\nLEFT JOIN products p ON p.category_id = c.id\nORDER BY c.id;"),
      idea("Поиск строк без пары", "LEFT JOIN + IS NULL", "`LEFT JOIN … WHERE правая.id IS NULL` оставляет только строки, которым не нашлось пары.", "Гости без заказов, товары без продаж, категории без товаров.", "SELECT c.name\nFROM categories c\nLEFT JOIN products p ON p.category_id = c.id\nWHERE p.id IS NULL;"),
      rule("Условие на столбцы правой таблицы в WHERE (кроме `IS NULL`) выбрасывает строки без пары, и LEFT JOIN превращается в обычный JOIN. Фильтр правой таблицы пиши в ON.")
    ],
    tasks: [task("Гости без заказов", "Выведи имена (`name`) гостей, у которых нет ни одного заказа.", {
      checks: [rows("SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL", "Только гости без заказов"), src("left join", "Используется `LEFT JOIN`")],
      hint: "`customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL`",
      solution: "SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;"
    })],
    quizzes: [
      single("sql-left-what", "LEFT JOIN", "Что гарантирует `a LEFT JOIN b`?", [["a", "Все строки `a` будут в результате"], ["b", "Все строки `b` будут в результате"], ["both", "Все строки обеих таблиц"], ["none", "Только строки с парой"]], "a", "Левая таблица сохраняется целиком."),
      single("sql-left-null", "Без пары", "Что будет в столбцах правой таблицы для строки без пары?", [["null", "NULL"], ["zero", "0"], ["empty", "Пустые строки"], ["prev", "Значения предыдущей строки"]], "null", "Пары нет — значения неизвестны.")
    ]
  });

  L({
    slug: "other-joins", title: "RIGHT, FULL и CROSS JOIN", summary: "Остальные виды соединений и сокращение USING.",
    skill: ["sql-other-joins", "Виды соединений", "Различать RIGHT, FULL и CROSS JOIN и использовать USING."],
    now: "Марта проверяет порядок в меню: нет ли категорий без товаров и товаров без категории.",
    body: [
      scene("Сироты с обеих сторон",
        ["marta", "Покажи сразу и пустые категории, и товары без категории. Одним списком."],
        ["slon", "FULL JOIN: сохраню всех с обеих сторон, где пары нет — поставлю NULL."]),
      clause("RIGHT JOIN", "Все справа", "Зеркало LEFT JOIN: сохраняются все строки правой таблицы.", "Встречается в чужом коде. Обычно его переписывают в LEFT JOIN, поменяв таблицы местами — так читать проще.", "SELECT p.name AS product, c.name AS category\nFROM products p\nRIGHT JOIN categories c ON p.category_id = c.id\nWHERE p.id IS NULL;"),
      clause("FULL JOIN", "Все с обеих сторон", "Сохраняет строки обеих таблиц. Совпавшие склеивает, остальные дополняет NULL.", "Сверка двух списков: что есть только тут, что только там.", "SELECT p.name AS product, c.name AS category\nFROM products p\nFULL JOIN categories c ON p.category_id = c.id\nWHERE p.id IS NULL OR c.id IS NULL;"),
      clause("CROSS JOIN", "Каждый с каждым", "Декартово произведение: каждая строка слева с каждой справа. 5 категорий × 7 сотрудников = 35 строк.", "Все комбинации: размеры × напитки, дни × смены.", "SELECT s.name AS barista, d.day\nFROM staff s\nCROSS JOIN (VALUES ('пн'), ('вт')) AS d(day)\nWHERE s.role = 'бариста';"),
      kw("USING", "Короткое ON", "`JOIN b USING (id)` — когда столбцы связи называются одинаково в обеих таблицах. Общий столбец в результате один.", "Короче для таблиц вида `order_items.order_id` ↔ подзапрос с `order_id`.", "SELECT order_id, count(*) AS positions\nFROM order_items\nJOIN (SELECT id AS order_id FROM orders WHERE status = 'done') AS d USING (order_id)\nGROUP BY order_id\nORDER BY order_id\nLIMIT 5;"),
      rule("В 95% случаев хватает JOIN и LEFT JOIN. FULL — для сверок, CROSS — для комбинаций.")
    ],
    tasks: [task("Сверка меню", "Через `FULL JOIN` таблиц `products` и `categories` выведи `product` (название товара) и `category` (название категории) только для строк, где не нашлось пары.", {
      checks: [rows("SELECT p.name AS product, c.name AS category FROM products p FULL JOIN categories c ON p.category_id = c.id WHERE p.id IS NULL OR c.id IS NULL", "Какао без категории и пустая категория «Сезонное»", { names: true }), src("full", "Используется `FULL JOIN`")],
      hint: "Условие «нет пары»: `WHERE p.id IS NULL OR c.id IS NULL`.",
      solution: "SELECT p.name AS product, c.name AS category\nFROM products p\nFULL JOIN categories c ON p.category_id = c.id\nWHERE p.id IS NULL OR c.id IS NULL;"
    })],
    quizzes: [
      single("sql-cross-count", "CROSS JOIN", "Сколько строк даст CROSS JOIN таблиц из 4 и 5 строк?", [["20", "20"], ["9", "9"], ["5", "5"], ["4", "4"]], "20", "Каждая с каждой: 4 × 5."),
      single("sql-full-what", "FULL JOIN", "Какие строки сохраняет FULL JOIN?", [["all", "Все строки обеих таблиц"], ["left", "Только левой"], ["match", "Только совпавшие"], ["right", "Только правой"]], "all", "FULL = LEFT + RIGHT.")
    ]
  });

  L({
    slug: "self-join", title: "Таблица сама с собой", summary: "Кто чей руководитель: соединяем staff со staff.",
    skill: ["sql-self-join", "Self join", "Соединять таблицу саму с собой через псевдонимы."],
    now: "Новому сотруднику нужна схема: кто кому подчиняется. В `staff` есть `manager_id`.",
    body: [
      scene("Начальник — тоже сотрудник",
        ["marta", "У каждого есть `manager_id`. Но это же номер из той же таблицы!"],
        ["slon", "Да. Возьми `staff` дважды под разными именами: `s` — сотрудник, `m` — его руководитель."]),
      idea("Self join", "Таблица дважды", "Одну таблицу подключают два раза с разными псевдонимами и соединяют по ссылке внутри неё.", "Иерархии (руководители), пары (гости из одного города), сравнение строк между собой.", "SELECT s.name AS employee, m.name AS manager\nFROM staff s\nLEFT JOIN staff m ON s.manager_id = m.id;"),
      rule("В self join псевдонимы обязательны. Называй их по смыслу: `s` и `m`, а не `a` и `b`.")
    ],
    tasks: [task("Кто кому подчиняется", "Выведи `employee` (имя сотрудника) и `manager` (имя руководителя) для всех сотрудников. У владельца руководителя нет — он тоже должен быть в списке.", {
      checks: [rows("SELECT s.name AS employee, m.name AS manager FROM staff s LEFT JOIN staff m ON s.manager_id = m.id", "Все сотрудники, включая Марту без руководителя", { names: true })],
      hint: "LEFT JOIN, чтобы не потерять Марту.",
      solution: "SELECT s.name AS employee, m.name AS manager\nFROM staff s\nLEFT JOIN staff m ON s.manager_id = m.id;"
    })],
    quizzes: [
      single("sql-self-alias", "Псевдонимы", "Зачем в self join два разных псевдонима?", [["two", "Чтобы различать две роли одной таблицы"], ["speed", "Для скорости"], ["rule", "Так требует только PostgreSQL"], ["none", "Они не нужны"]], "two", "Иначе непонятно, чей `name` — сотрудника или руководителя."),
      single("sql-self-left", "Владелец", "Почему с INNER JOIN Марта пропадёт из списка?", [["null", "У неё `manager_id` NULL, пары нет"], ["name", "Из-за имени"], ["first", "Она первая строка"], ["wont", "Не пропадёт"]], "null", "Нет пары — INNER JOIN строку выбрасывает.")
    ]
  });

  L({
    slug: "multi-join", title: "Три таблицы и больше", summary: "Цепочка соединений и итоги по ней: выручка по товарам.",
    skill: ["sql-multi-join", "Цепочка JOIN", "Соединять несколько таблиц и группировать результат."],
    now: "Даша хочет главный отчёт: сколько денег принёс каждый товар в выполненных заказах.",
    body: [
      scene("Выручка по товарам",
        ["dasha", "Название товара в `products`, количество и цена — в `order_items`, статус — в `orders`. Три таблицы!"],
        ["slon", "Соединяй цепочкой: позиции → заказы → товары. Потом группируй по товару."]),
      idea("Цепочка соединений", "JOIN за JOIN", "Каждый следующий JOIN присоединяет таблицу к уже собранному результату. Условия ON связывают по ключам.", "Почти любой бизнес-отчёт — это 3–5 таблиц.", "SELECT o.id, c.name AS guest, p.name AS product, oi.quantity\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nJOIN order_items oi ON oi.order_id = o.id\nJOIN products p ON p.id = oi.product_id\nORDER BY o.id\nLIMIT 6;"),
      rule("Строй большой запрос по шагам: сначала JOIN и SELECT *, посмотри строки, потом добавляй WHERE, GROUP BY и агрегаты.")
    ],
    tasks: [task("Выручка по товарам", "Для выполненных заказов (`status = 'done'`) выведи название товара `product` и выручку `revenue` — сумму `quantity * unit_price`. Сортировка по выручке по убыванию, при равенстве — по названию.", {
      checks: [rows("SELECT p.name AS product, sum(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id WHERE o.status = 'done' GROUP BY p.name ORDER BY revenue DESC, product", "Товар и выручка, от большей к меньшей", { ordered: true, names: true })],
      hint: "order_items → orders (статус) → products (название), затем `GROUP BY p.name`.",
      solution: "SELECT p.name AS product, sum(oi.quantity * oi.unit_price) AS revenue\nFROM order_items oi\nJOIN orders o ON o.id = oi.order_id\nJOIN products p ON p.id = oi.product_id\nWHERE o.status = 'done'\nGROUP BY p.name\nORDER BY revenue DESC, product;"
    })],
    quizzes: [
      single("sql-multi-how", "Сколько JOIN", "Нужно соединить 4 таблицы. Сколько JOIN понадобится?", [["3", "3"], ["4", "4"], ["2", "2"], ["1", "1"]], "3", "Первая таблица в FROM, остальные три — через JOIN."),
      single("sql-multi-step", "Как строить", "Как удобнее всего писать большой запрос с соединениями?", [["steps", "По шагам: JOIN, посмотреть строки, потом фильтры и группы"], ["once", "Сразу целиком"], ["end", "С ORDER BY"], ["sub", "Только через подзапросы"]], "steps", "Каждый шаг проверяешь глазами.")
    ]
  });
}
