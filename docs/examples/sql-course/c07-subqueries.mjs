// Chapter 7: subqueries, CTEs and set operations.
import { scene, clause, op, fn, idea, rule, rows, src, task, makeLesson } from "./kit.mjs";

export default function subqueries(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "subqueries", title: "Подзапросы", summary: "Запрос внутри запроса: дороже среднего, из списка, который ещё надо найти.",
    skill: ["sql-subquery", "Подзапросы", "Использовать результат одного запроса внутри другого."],
    now: "Даша хочет поднять в меню «премиальные» позиции — дороже средней цены.",
    body: [
      scene("Дороже среднего",
        ["dasha", "Я сначала считаю среднюю, потом копирую число в WHERE. А если цены поменяются?"],
        ["slon", "Вставь запрос средней прямо в условие, в скобках. Я посчитаю его первым."]),
      idea("Скалярный подзапрос", "Одно значение", "Подзапрос в скобках, который возвращает одну строку и один столбец. Его можно писать везде, где нужно значение.", "Сравнить со средним, с максимумом, с ценой другого товара — без ручного копирования чисел.", "SELECT name, price\nFROM products\nWHERE price > (SELECT avg(price) FROM products)\nORDER BY price DESC;"),
      idea("Подзапрос со списком", "IN (SELECT …)", "Подзапрос, который возвращает один столбец из многих строк, подставляется в `IN`.", "«Гости, которые заказывали тирамису» — сначала найдём заказы, потом гостей.", "SELECT name\nFROM customers\nWHERE id IN (\n  SELECT o.customer_id\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.id\n  WHERE oi.product_id = 12\n);"),
      rule("Подзапрос пиши отдельно и проверь, что он возвращает то, что нужно. Только потом вставляй его в скобки.")
    ],
    tasks: [task("Премиальное меню", "Выведи `name` и `price` товаров дороже средней цены всех товаров. Среднюю посчитай подзапросом.", {
      checks: [rows("SELECT name, price FROM products WHERE price > (SELECT avg(price) FROM products)", "Только товары дороже среднего"), src("(select", "Средняя посчитана подзапросом")],
      hint: "`WHERE price > (SELECT avg(price) FROM products)`",
      solution: "SELECT name, price\nFROM products\nWHERE price > (SELECT avg(price) FROM products);"
    })],
    quizzes: [
      single("sql-sub-scalar", "Скалярный", "Что должен вернуть подзапрос в `WHERE price > (…)`?", [["one", "Одну строку с одним значением"], ["many", "Сколько угодно строк"], ["table", "Целую таблицу"], ["bool", "Только true или false"]], "one", "Иначе — ошибка «more than one row returned by a subquery»."),
      single("sql-sub-in", "Список", "Какой оператор принимает подзапрос с многими строками?", [["in", "`IN`"], ["eq", "`=`"], ["gt", "`>`"], ["like", "`LIKE`"]], "in", "`x IN (SELECT …)`")
    ]
  });

  L({
    slug: "exists", title: "EXISTS, ANY и ALL", summary: "Есть ли хоть одна строка, и сравнение со всеми значениями сразу.",
    skill: ["sql-exists", "EXISTS", "Проверять существование строк через EXISTS и NOT EXISTS, сравнивать с ANY и ALL."],
    now: "Марта думает убрать из меню то, что ни разу не заказывали.",
    body: [
      scene("Что никто не берёт?",
        ["marta", "Есть позиции, которые не заказали ни разу? Хочу их убрать."],
        ["slon", "Для каждого товара проверю: существует ли позиция заказа с ним. NOT EXISTS — нет ни одной."],
        ["nika", "Осторожно с `NOT IN (подзапрос)`: если в подзапросе окажется NULL, он вернёт пустоту. NOT EXISTS такой ловушки не имеет."]),
      op("EXISTS · NOT EXISTS", "Есть ли строки", "`EXISTS (подзапрос)` истинно, если подзапрос вернул хотя бы одну строку. Сами значения не важны, поэтому пишут `SELECT 1`.", "Гости с заказами, товары без продаж, категории без товаров.", "SELECT name\nFROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE oi.product_id = p.id\n);"),
      op("ANY · ALL", "Сравнить со многими", "`x > ALL (подзапрос)` — больше каждого значения. `x = ANY (подзапрос)` — равно хоть одному (как IN).", "Дороже всех десертов, дешевле любого кофе.", "SELECT name, price\nFROM products\nWHERE price > ALL (SELECT price FROM products WHERE category_id = 1);"),
      rule("«Нет ни одного» — пиши NOT EXISTS. Это надёжнее NOT IN, когда в данных бывают NULL.")
    ],
    tasks: [task("Невостребованные позиции", "Выведи `name` товаров, которые ни разу не встречались в `order_items`. Используй `NOT EXISTS`.", {
      checks: [rows("SELECT name FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)", "Только товары без продаж"), src("not exists", "Используется `NOT EXISTS`")],
      hint: "Подзапрос ссылается на внешний товар: `WHERE oi.product_id = p.id`.",
      solution: "SELECT name\nFROM products p\nWHERE NOT EXISTS (\n  SELECT 1\n  FROM order_items oi\n  WHERE oi.product_id = p.id\n);"
    })],
    quizzes: [
      single("sql-exists-value", "Что важно", "Что проверяет EXISTS?", [["rows", "Вернул ли подзапрос хотя бы одну строку"], ["true", "Что подзапрос вернул true"], ["notnull", "Что значения не NULL"], ["count", "Сколько строк вернул подзапрос"]], "rows", "Значения не важны, важно наличие строк."),
      single("sql-all", "ALL", "`price > ALL (SELECT price FROM … WHERE category_id = 1)` — это…", [["max", "дороже самого дорогого кофе"], ["min", "дороже самого дешёвого кофе"], ["avg", "дороже среднего кофе"], ["any", "дороже любого одного кофе"]], "max", "Больше всех значений = больше максимума.")
    ]
  });

  L({
    slug: "derived-correlated", title: "Подзапрос в FROM и коррелированный", summary: "Подзапрос как временная таблица и подзапрос для каждой строки.",
    skill: ["sql-derived", "Производные и коррелированные подзапросы", "Использовать подзапрос как таблицу и подзапрос, зависящий от внешней строки."],
    now: "Даша хочет рядом с каждым товаром видеть, сколько раз его заказывали.",
    body: [
      scene("Для каждой строки",
        ["dasha", "Хочу список товаров, а рядом число заказов. Без GROUP BY по всему меню."],
        ["slon", "Подзапрос в SELECT, который смотрит на текущий товар. Я выполню его для каждой строки."]),
      idea("Подзапрос в FROM", "Временная таблица", "`FROM (SELECT …) AS t` — результат подзапроса становится таблицей, с которой можно работать дальше. Псевдоним обязателен.", "Сначала посчитать итоги, потом отфильтровать или соединить их.", "SELECT t.customer_id, t.orders\nFROM (\n  SELECT customer_id, count(*) AS orders\n  FROM orders\n  WHERE customer_id IS NOT NULL\n  GROUP BY customer_id\n) AS t\nWHERE t.orders >= 3;"),
      idea("Коррелированный подзапрос", "Зависит от внешней строки", "Подзапрос ссылается на столбец внешнего запроса (`p.id`) и вычисляется заново для каждой строки.", "Число отзывов, последний заказ, сумма продаж — рядом с каждой строкой.", "SELECT p.name,\n  (SELECT count(*) FROM reviews r WHERE r.product_id = p.id) AS reviews\nFROM products p\nORDER BY reviews DESC, p.name\nLIMIT 5;"),
      rule("Коррелированный подзапрос выполняется для каждой строки. На больших таблицах JOIN с GROUP BY обычно быстрее.")
    ],
    tasks: [task("Популярность товаров", "Для каждого товара выведи `name` и `times_ordered` — в скольких позициях заказов (`order_items`) он встречается. Посчитай коррелированным подзапросом.", {
      checks: [rows("SELECT p.name, (SELECT count(*) FROM order_items oi WHERE oi.product_id = p.id) AS times_ordered FROM products p", "Все товары, включая с нулём заказов", { names: true }), src("(select", "Есть подзапрос")],
      hint: "`(SELECT count(*) FROM order_items oi WHERE oi.product_id = p.id) AS times_ordered`",
      solution: "SELECT p.name,\n  (SELECT count(*)\n   FROM order_items oi\n   WHERE oi.product_id = p.id) AS times_ordered\nFROM products p;"
    })],
    quizzes: [
      single("sql-derived-alias", "Псевдоним", "Что обязательно для подзапроса в FROM?", [["alias", "Псевдоним: `(…) AS t`"], ["order", "ORDER BY"], ["limit", "LIMIT"], ["where", "WHERE"]], "alias", "У таблицы должно быть имя."),
      single("sql-correlated", "Коррелированный", "Чем коррелированный подзапрос отличается от обычного?", [["outer", "Ссылается на столбцы внешнего запроса"], ["fast", "Он всегда быстрее"], ["from", "Стоит только во FROM"], ["once", "Выполняется ровно один раз"]], "outer", "Поэтому он вычисляется для каждой строки.")
    ]
  });

  L({
    slug: "cte", title: "WITH: общие табличные выражения", summary: "Даём подзапросу имя и пишем сложный запрос по шагам.",
    skill: ["sql-cte", "WITH", "Разбивать сложный запрос на именованные шаги через WITH."],
    now: "Даша собирает список постоянных гостей: тех, кто потратил больше 500 ₽ на выполненные заказы.",
    body: [
      scene("Подзапрос в подзапросе в подзапросе",
        ["dasha", "Мой запрос похож на матрёшку. Через день я сама его не понимаю."],
        ["slon", "Вынеси шаги наверх через WITH и дай им имена. Читается сверху вниз, как рецепт."]),
      clause("WITH", "Именованный шаг", "`WITH имя AS (SELECT …)` перед основным запросом. Дальше `имя` используется как таблица. Шагов может быть несколько, через запятую.", "Сложные отчёты становятся читаемыми: «посчитали траты → отобрали постоянных → добавили имена».", "WITH spending AS (\n  SELECT o.customer_id, sum(oi.quantity * oi.unit_price) AS spent\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.id\n  WHERE o.status = 'done'\n  GROUP BY o.customer_id\n)\nSELECT customer_id, spent\nFROM spending\nORDER BY spent DESC\nLIMIT 5;"),
      rule("Больше одного уровня вложенности — переписывай на WITH. Имена шагов — существительные: `spending`, `regulars`.")
    ],
    tasks: [task("Постоянные гости", "Через `WITH` посчитай траты гостей на выполненные заказы и выведи `name` гостя и `spent` — только тех, кто потратил больше 500.", {
      checks: [rows("WITH spending AS (SELECT o.customer_id, sum(oi.quantity * oi.unit_price) AS spent FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'done' GROUP BY o.customer_id) SELECT c.name, s.spent FROM spending s JOIN customers c ON c.id = s.customer_id WHERE s.spent > 500", "Имена гостей с тратами больше 500"), src("with", "Используется `WITH`")],
      hint: "Шаг `spending` из карточки, потом JOIN с `customers` и `WHERE spent > 500`.",
      solution: "WITH spending AS (\n  SELECT o.customer_id, sum(oi.quantity * oi.unit_price) AS spent\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.id\n  WHERE o.status = 'done'\n  GROUP BY o.customer_id\n)\nSELECT c.name, s.spent\nFROM spending s\nJOIN customers c ON c.id = s.customer_id\nWHERE s.spent > 500;"
    })],
    quizzes: [
      single("sql-cte-why", "Зачем WITH", "Главная польза WITH?", [["read", "Запрос читается по шагам, у шагов есть имена"], ["store", "Сохраняет таблицу в базе навсегда"], ["fast", "Всегда ускоряет запрос"], ["only", "Без него нельзя соединять таблицы"]], "read", "WITH живёт только внутри одного запроса."),
      short("sql-cte-word", "Слово", "С какого слова начинается запрос с общим табличным выражением?", ["WITH"], "`WITH имя AS (…) SELECT …`")
    ]
  });

  L({
    slug: "set-operations", title: "UNION, INTERSECT, EXCEPT", summary: "Складываем и вычитаем результаты запросов.",
    skill: ["sql-sets", "Операции над множествами", "Объединять, пересекать и вычитать результаты запросов."],
    now: "К Новому году Марта хочет поздравить всех: и гостей, и сотрудников — одним списком.",
    body: [
      scene("Один список из двух таблиц",
        ["marta", "Нужен общий список имён: гости и сотрудники. И пометка, кто есть кто."],
        ["slon", "Два SELECT с одинаковым числом столбцов, между ними UNION. Я сложу результаты."]),
      op("UNION · UNION ALL", "Объединить", "Ставит строки второго запроса под строки первого. `UNION` убирает повторы, `UNION ALL` — нет (и работает быстрее). Число и типы столбцов должны совпадать.", "Общие списки из разных таблиц, отчёты «итого» под деталями.", "SELECT name, 'гость' AS kind FROM customers WHERE city = 'Казань'\nUNION ALL\nSELECT name, 'сотрудник' FROM staff WHERE role = 'бариста';"),
      op("INTERSECT", "Пересечение", "Только строки, которые есть в обоих результатах.", "Товары, которые и заказывали, и хвалили в отзывах.", "SELECT product_id FROM order_items\nINTERSECT\nSELECT product_id FROM reviews WHERE rating = 5;"),
      op("EXCEPT", "Разность", "Строки первого результата, которых нет во втором.", "Кто есть в одном списке, но не в другом.", "SELECT id FROM products\nEXCEPT\nSELECT product_id FROM order_items;"),
      rule("Не нужно убирать повторы — пиши UNION ALL. Имена столбцов берутся из первого запроса.")
    ],
    tasks: [task("Поздравительный список", "Выведи `name` и `kind` для всех гостей (`kind` = 'гость') и всех сотрудников (`kind` = 'сотрудник') одним результатом.", {
      checks: [rows("SELECT name, 'гость' AS kind FROM customers UNION ALL SELECT name, 'сотрудник' FROM staff", "Все гости и все сотрудники с пометкой", { names: true }), src("union", "Используется `UNION`")],
      solution: "SELECT name, 'гость' AS kind FROM customers\nUNION ALL\nSELECT name, 'сотрудник' FROM staff;"
    })],
    quizzes: [
      single("sql-union-all", "UNION ALL", "Чем UNION ALL отличается от UNION?", [["dups", "Не убирает повторы"], ["sort", "Сортирует результат"], ["cols", "Разрешает разное число столбцов"], ["join", "Соединяет по ключу"]], "dups", "UNION убирает одинаковые строки, UNION ALL оставляет всё."),
      single("sql-except", "EXCEPT", "Что вернёт `A EXCEPT B`?", [["a", "Строки A, которых нет в B"], ["b", "Строки B, которых нет в A"], ["both", "Общие строки"], ["all", "Все строки обоих"]], "a", "Разность множеств.")
    ]
  });

  L({
    slug: "recursive", title: "WITH RECURSIVE", summary: "Иерархии и последовательности: вся цепочка подчинения и календарь дней.",
    skill: ["sql-recursive", "Рекурсивные запросы", "Обходить иерархии и строить последовательности через WITH RECURSIVE и generate_series."],
    now: "Для оргсхемы нужна вся цепочка подчинения, а для отчёта по дням — все даты, даже без заказов.",
    body: [
      scene("Сколько уровней?",
        ["marta", "Self join показал непосредственных руководителей. А мне нужна вся лестница: кто на каком уровне от меня."],
        ["slon", "Рекурсивный запрос: начну с тебя, потом добавлю твоих подчинённых, потом их подчинённых — пока есть кого добавлять."]),
      clause("WITH RECURSIVE", "Запрос, который ссылается на себя", "Состоит из стартовой части и рекурсивной, соединённых `UNION ALL`. Рекурсивная часть присоединяет к уже найденным строкам следующие. Останавливается, когда новых строк нет.", "Оргструктуры, категории с подкатегориями, цепочки ссылок.", "WITH RECURSIVE chain AS (\n  SELECT id, name, 1 AS level\n  FROM staff\n  WHERE manager_id IS NULL\n  UNION ALL\n  SELECT s.id, s.name, chain.level + 1\n  FROM staff s\n  JOIN chain ON s.manager_id = chain.id\n)\nSELECT name, level FROM chain ORDER BY level, name;"),
      fn("generate_series", "Ряд значений", "`generate_series(1, 5)` — числа от 1 до 5. С датами и интервалом — все дни периода.", "Календарь без пропусков: соединить с заказами LEFT JOIN, чтобы дни без продаж показали 0.", "SELECT d::date AS day\nFROM generate_series(date '2025-11-01', date '2025-11-05', interval '1 day') AS d;"),
      rule("У рекурсии должен быть конец: условие, при котором новые строки перестают находиться. Иначе запрос не остановится (здесь его остановит таймер через 5 секунд).")
    ],
    tasks: [task("Оргсхема", "Через `WITH RECURSIVE` выведи `name` и `level` всех сотрудников: у владельца (без руководителя) уровень 1, у его подчинённых 2 и так далее.", {
      checks: [rows("WITH RECURSIVE chain AS (SELECT id, name, 1 AS level FROM staff WHERE manager_id IS NULL UNION ALL SELECT s.id, s.name, chain.level + 1 FROM staff s JOIN chain ON s.manager_id = chain.id) SELECT name, level FROM chain", "Все сотрудники со своим уровнем", { names: true }), src("recursive", "Используется `WITH RECURSIVE`")],
      hint: "Возьми запрос из карточки и выведи `name, level`.",
      solution: "WITH RECURSIVE chain AS (\n  SELECT id, name, 1 AS level\n  FROM staff\n  WHERE manager_id IS NULL\n  UNION ALL\n  SELECT s.id, s.name, chain.level + 1\n  FROM staff s\n  JOIN chain ON s.manager_id = chain.id\n)\nSELECT name, level\nFROM chain;"
    })],
    quizzes: [
      single("sql-rec-parts", "Части", "Из чего состоит рекурсивный CTE?", [["two", "Стартовая часть, UNION ALL и рекурсивная часть"], ["one", "Один SELECT"], ["loop", "Цикл FOR"], ["join", "Только JOIN"]], "two", "Старт + шаг рекурсии."),
      single("sql-series", "generate_series", "Что вернёт `generate_series(1, 3)`?", [["rows", "Три строки: 1, 2, 3"], ["one", "Одну строку `1,2,3`"], ["arr", "Массив `{1,2,3}`"], ["sum", "Число 6"]], "rows", "Функция возвращает набор строк.")
    ]
  });
}
