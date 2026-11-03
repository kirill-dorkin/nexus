// Chapter 5: aggregates and groups.
import { scene, clause, fn, kw, idea, rule, diagram, rows, src, task, makeLesson } from "./kit.mjs";

export default function aggregates(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, short } = c;

  L({
    slug: "aggregates", title: "COUNT, SUM, AVG, MIN, MAX", summary: "Сворачиваем много строк в одно число.",
    skill: ["sql-aggregates", "Агрегатные функции", "Считать количество, сумму, среднее, минимум и максимум."],
    now: "Переходим от строк к итогам: количество, сумма, среднее, минимум и максимум.",
    body: [
      scene("Одно число",
        ["you", "Сколько у нас позиций? И какая средняя цена по каталогу?"],
        ["slon", "Агрегатные функции сворачивают все строки в одну. count — сколько, avg — среднее."]),
      fn("count", "Сколько строк", "`count(*)` считает строки. `count(столбец)` — только строки, где столбец не NULL.", "Сколько покупателей, сколько заказов, у скольких есть телефон.", "SELECT count(*) AS customers, count(phone) AS with_phone\nFROM customers;"),
      fn("sum", "Сумма", "Складывает значения столбца, NULL пропускает.", "Выручка, количество проданного.", "SELECT sum(quantity) AS items_sold, sum(quantity * unit_price) AS revenue\nFROM order_items;"),
      fn("avg", "Среднее", "Среднее арифметическое без учёта NULL.", "Средняя цена, средняя оценка в отзывах.", "SELECT round(avg(rating), 2) AS avg_rating, count(*) AS reviews\nFROM reviews;"),
      fn("min · max", "Минимум и максимум", "Наименьшее и наибольшее значение. Работают с числами, датами и текстом.", "Самый дешёвый товар, первый и последний заказ.", "SELECT min(created_at) AS first_order, max(created_at) AS last_order\nFROM orders;"),
      rule("Агрегат без GROUP BY превращает всю таблицу в одну строку. Обычные столбцы рядом с ним без GROUP BY писать нельзя.")
    ],
    tasks: [task("Каталог в цифрах", "Одной строкой выведи: количество товаров `items`, минимальную цену `min_price`, максимальную `max_price` и среднюю, округлённую до 2 знаков, `avg_price`.", {
      checks: [rows("SELECT count(*) AS items, min(price) AS min_price, max(price) AS max_price, round(avg(price), 2) AS avg_price FROM products", "Четыре числа о каталоге", { names: true })],
      hint: "`SELECT count(*) AS items, min(price) AS min_price, …`",
      solution: "SELECT count(*) AS items,\n  min(price) AS min_price,\n  max(price) AS max_price,\n  round(avg(price), 2) AS avg_price\nFROM products;"
    })],
    quizzes: [
      single("sql-agg-count", "count(столбец)", "Что считает `count(phone)`?", [["notnull", "Строки, где phone не NULL"], ["all", "Все строки"], ["distinct", "Разные телефоны"], ["null", "Строки без телефона"]], "notnull", "count(*) — все строки, count(столбец) — только заполненные."),
      single("sql-agg-avg-null", "avg и NULL", "Как avg относится к NULL?", [["skip", "Пропускает их"], ["zero", "Считает как 0"], ["null", "Возвращает NULL, если есть хоть один"], ["err", "Выдаёт ошибку"]], "skip", "Агрегаты (кроме count(*)) игнорируют NULL.")
    ]
  });

  L({
    slug: "group-by", title: "GROUP BY", summary: "Итоги по группам: сколько товаров в каждой категории.",
    skill: ["sql-group-by", "GROUP BY", "Группировать строки и считать агрегаты для каждой группы."],
    now: "Общий итог — это мало. Считаем итоги для каждой группы строк.",
    body: [
      scene("По полочкам",
        ["you", "Сколько позиций в каждой категории? Не всего, а по каждой."],
        ["slon", "Скажи GROUP BY category_id. Я разложу строки по стопкам и посчитаю каждую стопку."]),
      clause("GROUP BY", "Группировка", "Собирает строки с одинаковыми значениями в группы. Агрегаты считаются для каждой группы, получается одна строка на группу.", "Продажи по дням, покупатели по городам, товары по категориям.", "SELECT category_id, count(*) AS items, round(avg(price), 2) AS avg_price\nFROM products\nGROUP BY category_id\nORDER BY category_id;"),
      diagram({ kind: "flow", title: "Как работает GROUP BY", steps: [
        { title: "FROM", text: "Берём все строки таблицы" },
        { title: "GROUP BY", text: "Раскладываем по стопкам с одинаковым значением" },
        { title: "Агрегаты", text: "Считаем count, sum, avg в каждой стопке" },
        { title: "Результат", text: "Одна строка на каждую стопку" }
      ] }),
      idea("Правило GROUP BY", "Что можно в SELECT", "В SELECT с GROUP BY можно писать только столбцы группировки и агрегаты. Иначе база не знает, какое из многих значений показать.", "Ошибка «must appear in the GROUP BY clause» — самая частая у новичков. Теперь ты знаешь её причину.", "SELECT city, count(*) AS guests\nFROM customers\nGROUP BY city\nORDER BY guests DESC;"),
      rule("Всё в SELECT — либо в GROUP BY, либо внутри агрегата.")
    ],
    tasks: [task("Покупатели по городам", "Выведи для каждого города (`city`) число покупателей под именем `guests`.", {
      checks: [rows("SELECT city, count(*) AS guests FROM customers GROUP BY city", "Один город — одна строка с числом покупателей", { names: true }), src("group by", "Есть `GROUP BY`")],
      solution: "SELECT city, count(*) AS guests\nFROM customers\nGROUP BY city;"
    }), task("Сколько продано", "По таблице `order_items` выведи для каждого `product_id` сумму проданных штук `sold`, от самых продаваемых. При равенстве — по `product_id`.", {
      checks: [rows("SELECT product_id, sum(quantity) AS sold FROM order_items GROUP BY product_id ORDER BY sold DESC, product_id", "Продажи по товарам, по убыванию", { ordered: true, names: true })],
      solution: "SELECT product_id, sum(quantity) AS sold\nFROM order_items\nGROUP BY product_id\nORDER BY sold DESC, product_id;"
    })],
    quizzes: [
      single("sql-group-error", "Ошибка", "Почему `SELECT city, name, count(*) FROM customers GROUP BY city` падает?", [["name", "`name` не в GROUP BY и не в агрегате"], ["count", "count нельзя с GROUP BY"], ["city", "city нужно писать после count"], ["fine", "Запрос верный"]], "name", "В группе много имён — какое показать, база не знает."),
      short("sql-group-word", "Группы", "Какая часть запроса раскладывает строки по группам? (два слова)", ["GROUP BY"], "GROUP BY")
    ]
  });

  L({
    slug: "having", title: "HAVING и порядок выполнения", summary: "Фильтр по группам и то, в каком порядке база на самом деле читает запрос.",
    skill: ["sql-having", "HAVING", "Фильтровать группы по агрегатам и знать порядок выполнения запроса."],
    now: "Фильтруем уже посчитанные группы и разбираемся, в каком порядке выполняется запрос.",
    body: [
      scene("WHERE не работает",
        ["you", "Пишу `WHERE avg(price) > 200` — ошибка!"],
        ["slon", "WHERE я проверяю ДО группировки, для каждой строки. Средней ещё нет. Условия на группы — в HAVING."]),
      clause("HAVING", "Фильтр групп", "Условие после GROUP BY. Проверяется для каждой группы и может использовать агрегаты.", "Города, где больше трёх покупателей, товары, проданные больше пяти раз.", "SELECT category_id, round(avg(price), 2) AS avg_price\nFROM products\nGROUP BY category_id\nHAVING avg(price) > 200;"),
      idea("Порядок выполнения", "Как читает база", "Пишем SELECT первым, но выполняется он почти последним: FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT.", "Отсюда правила: в WHERE нет агрегатов и псевдонимов из SELECT, а в ORDER BY псевдонимы уже есть.", "SELECT city, count(*) AS guests\nFROM customers\nWHERE registered_on >= '2024-06-01'\nGROUP BY city\nHAVING count(*) >= 2\nORDER BY guests DESC;"),
      rule("Условие на строку — WHERE. Условие на группу (с агрегатом) — HAVING.")
    ],
    tasks: [task("Дорогие категории", "Выведи `category_id` и среднюю цену `avg_price` (округли до 2 знаков) только для категорий со средней ценой больше 200.", {
      checks: [rows("SELECT category_id, round(avg(price), 2) AS avg_price FROM products GROUP BY category_id HAVING avg(price) > 200", "Только категории со средней ценой > 200", { names: true }), src("having", "Фильтр групп через `HAVING`")],
      solution: "SELECT category_id, round(avg(price), 2) AS avg_price\nFROM products\nGROUP BY category_id\nHAVING avg(price) > 200;"
    })],
    quizzes: [
      single("sql-having-vs", "WHERE или HAVING", "Где писать условие `count(*) > 3`?", [["having", "В HAVING"], ["where", "В WHERE"], ["select", "В SELECT"], ["order", "В ORDER BY"]], "having", "Агрегаты фильтруются после группировки — в HAVING."),
      single("sql-having-order", "Порядок", "Что выполняется раньше?", [["where", "WHERE"], ["select", "SELECT"], ["order", "ORDER BY"], ["having", "HAVING"]], "where", "FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.")
    ]
  });

  L({
    slug: "aggregate-extras", title: "FILTER, DISTINCT и string_agg", summary: "Несколько счётчиков в одном запросе и списки через запятую.",
    skill: ["sql-agg-extras", "Продвинутые агрегаты", "Считать с FILTER, count(DISTINCT) и собирать строки через string_agg."],
    now: "Несколько итогов с разными условиями в одной таблице и склейка значений в строку.",
    body: [
      scene("Всё в одной строке",
        ["you", "Хочу по каждому городу: всего покупателей, с телефоном и список имён через запятую."],
        ["slon", "FILTER посчитает только нужные строки внутри группы, а string_agg склеит имена."]),
      kw("FILTER", "Агрегат по условию", "`count(*) FILTER (WHERE условие)` — агрегат считает только строки, где условие истинно. Особенность PostgreSQL.", "Несколько разных счётчиков в одном запросе: выполненные и отменённые заказы рядом.", "SELECT staff_id,\n  count(*) AS orders,\n  count(*) FILTER (WHERE status = 'cancelled') AS cancelled\nFROM orders\nGROUP BY staff_id\nORDER BY staff_id;"),
      idea("count(DISTINCT)", "Сколько разных", "`count(DISTINCT customer_id)` считает разные значения, без повторов.", "Сколько разных покупателей сделали заказы, а не сколько было заказов.", "SELECT count(*) AS orders, count(DISTINCT customer_id) AS unique_guests\nFROM orders;"),
      fn("string_agg", "Склеить группу", "`string_agg(name, ', ')` склеивает значения группы в одну строку через разделитель. Порядок можно задать: `string_agg(name, ', ' ORDER BY name)`.", "Списки в отчётах: состав заказа, покупатели города.", "SELECT city, string_agg(name, ', ' ORDER BY name) AS guests\nFROM customers\nGROUP BY city;"),
      rule("Нужно несколько счётчиков с разными условиями — не делай несколько запросов, используй FILTER.")
    ],
    tasks: [task("Сводка по городам", "Для каждого города выведи `city`, число покупателей `total` и число покупателей с телефоном `with_phone` через `FILTER`.", {
      checks: [rows("SELECT city, count(*) AS total, count(*) FILTER (WHERE phone IS NOT NULL) AS with_phone FROM customers GROUP BY city", "Город, всего и с телефоном", { names: true }), src("filter", "Используется `FILTER`")],
      hint: "`count(*) FILTER (WHERE phone IS NOT NULL) AS with_phone`",
      solution: "SELECT city,\n  count(*) AS total,\n  count(*) FILTER (WHERE phone IS NOT NULL) AS with_phone\nFROM customers\nGROUP BY city;"
    })],
    quizzes: [
      single("sql-agg-distinct", "Разные покупатели", "Как посчитать, сколько разных покупателей делали заказы?", [["distinct", "`count(DISTINCT customer_id)`"], ["count", "`count(customer_id)`"], ["sum", "`sum(customer_id)`"], ["max", "`max(customer_id)`"]], "distinct", "DISTINCT внутри count убирает повторы."),
      short("sql-agg-concat", "Склейка", "Какая функция склеивает значения группы в одну строку через разделитель?", ["string_agg"], "`string_agg(name, ', ')`")
    ]
  });
}
