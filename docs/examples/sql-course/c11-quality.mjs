// Chapter 11: speed, safety and the final report.
import { scene, stmt, idea, rule, still, rows, holds, src, task, makeLesson } from "./kit.mjs";

const SPENDING = "SELECT c.city, c.name, sum(oi.quantity * oi.unit_price) AS spent FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'done' GROUP BY c.city, c.name";

export default function quality(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi } = c;

  L({
    slug: "indexes", title: "Индексы и EXPLAIN", summary: "Почему запрос тормозит и как база ищет быстро.",
    skill: ["sql-indexes", "Индексы", "Создавать индексы и читать план запроса через EXPLAIN."],
    now: "Таблицы растут, запросы замедляются. Разбираемся с индексами и планом запроса.",
    body: [
      scene("Сто тысяч заказов",
        ["you", "«Мои заказы» грузятся пять секунд. Что случилось?"],
        ["slon", "Чтобы найти заказы покупателя, я читаю ВСЮ таблицу, строку за строкой. Дай мне индекс по `customer_id` — буду находить сразу, как по алфавитному указателю в книге."]),
      idea("Индекс", "Указатель для поиска", "Отдельная структура (обычно B-дерево), где значения столбца упорядочены и ведут к строкам. Поиск по индексу — логарифм, а не перебор.", "Быстрые WHERE, JOIN и ORDER BY на больших таблицах. Первичные ключи и UNIQUE получают индекс автоматически.", "SELECT indexname, indexdef\nFROM pg_indexes\nWHERE tablename = 'orders';"),
      stmt("CREATE INDEX", "Создать индекс", "`CREATE INDEX имя ON таблица (столбцы);`. Можно по нескольким столбцам и по выражению: `ON customers (lower(email))`.", "Ускорить частые поиски и соединения по внешним ключам.", "CREATE INDEX orders_customer_idx ON orders (customer_id);\nSELECT indexname FROM pg_indexes WHERE tablename = 'orders';"),
      stmt("EXPLAIN", "План запроса", "`EXPLAIN запрос` показывает, как база будет его выполнять: `Seq Scan` — перебор всей таблицы, `Index Scan` — по индексу. `EXPLAIN ANALYZE` ещё и выполняет запрос и показывает реальное время.", "Понять, почему запрос медленный, а не гадать.", "EXPLAIN SELECT * FROM orders WHERE id = 5;"),
      idea("Цена индекса", "Не бесплатно", "Каждый индекс занимает место и замедляет INSERT, UPDATE и DELETE: его тоже нужно обновлять.", "Индексы создают под реальные медленные запросы, а не «на всякий случай» на каждый столбец.", undefined),
      rule("Медленный запрос — сначала EXPLAIN ANALYZE, потом индекс. Внешние ключи, по которым часто ищут, почти всегда стоит индексировать.")
    ],
    tasks: [task("Быстрые «мои заказы»", "Создай индекс `orders_customer_idx` на таблице `orders` по столбцу `customer_id`.", {
      checks: [holds("SELECT count(*) = 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'orders_customer_idx' AND indexdef ILIKE '%(customer_id)%'", "Индекс по `customer_id` создан")],
      hint: "`CREATE INDEX orders_customer_idx ON orders (customer_id);`",
      solution: "CREATE INDEX orders_customer_idx ON orders (customer_id);"
    })],
    quizzes: [
      single("sql-index-cost", "Цена", "Чем платим за индекс?", [["writes", "Местом и более медленной записью"], ["reads", "Более медленным чтением"], ["nothing", "Ничем"], ["ram", "Индекс удаляет старые данные"]], "writes", "Индекс ускоряет чтение, но его надо поддерживать при каждом изменении."),
      single("sql-explain-seq", "Seq Scan", "Что значит `Seq Scan` в плане?", [["full", "Перебор всей таблицы"], ["index", "Поиск по индексу"], ["sort", "Сортировка"], ["join", "Соединение"]], "full", "На маленьких таблицах это нормально, на больших — повод задуматься.")
    ]
  });

  L({
    slug: "sql-injection", title: "SQL-инъекции и права", summary: "Как Вредный Скрипт пытается украсть базу и почему параметры его останавливают.",
    skill: ["sql-security", "Безопасность запросов", "Защищаться от SQL-инъекций параметрами и ограничивать права."],
    now: "Защищаем базу: опасные запросы из пользовательского ввода и права доступа.",
    body: [
      scene("Странный поиск",
        ["bug", "Ввожу в поиск по почте: `' OR '1'='1`. Опа, все покупатели с телефонами! Спасибо за склейку строк."],
        ["slon", "Код сайта склеил мой запрос из кусков текста: `WHERE email = '` + ввод + `'`. Ввод стал частью SQL, а не значением."],
        ["nika", "Никогда не склеивай SQL с вводом пользователя. Только параметры."]),
      idea("SQL-инъекция", "Ввод становится кодом", "Атака, при которой пользовательский ввод, вклеенный в текст запроса, меняет сам запрос: условие `OR '1'='1'` пропускает все строки, `; DROP TABLE` удаляет таблицу.", "Одна из самых частых и опасных уязвимостей веба. Через неё утекают базы целиком.", "-- Так собрал запрос уязвимый код сайта:\nSELECT name, phone FROM customers\nWHERE email = '' OR '1'='1';"),
      idea("Параметры запроса", "Значение отдельно от кода", "Запрос отправляют с заглушками `$1`, `$2`, а значения — отдельно. База никогда не разбирает значение как SQL.", "Единственная надёжная защита. Любой драйвер PostgreSQL умеет параметры: `query('… WHERE email = $1', [email])`.", "SELECT name FROM customers WHERE email = $1;", still),
      stmt("PREPARE · EXECUTE", "Подготовленный запрос", "`PREPARE имя(типы) AS запрос с $1` — сохранить запрос с параметрами, `EXECUTE имя(значения)` — выполнить.", "Так работают параметры внутри базы: значение подставляется после разбора запроса.", "PREPARE find_guest(text) AS\n  SELECT name, city FROM customers WHERE email = $1;\nEXECUTE find_guest(''' OR ''1''=''1');"),
      stmt("GRANT · REVOKE", "Права доступа", "`GRANT SELECT ON products TO site;` — выдать роли право читать таблицу, `REVOKE` — забрать.", "Сайту хватает чтения каталога. Даже успешная инъекция не удалит то, на что нет прав.", "CREATE ROLE site LOGIN;\nGRANT SELECT ON products, categories TO site;\nREVOKE ALL ON customers FROM site;", still),
      rule("Ввод пользователя — только параметром. У приложения — минимум прав, который ему нужен.")
    ],
    tasks: [task("Поиск без дыр", "Подготовь запрос `find_guest` с параметром типа text, который ищет `name` и `city` покупателя по `email = $1`. Затем выполни его для `'anna@mail.ru'`.", {
      checks: [rows("SELECT name, city FROM customers WHERE email = 'anna@mail.ru'", "Нашлась Анна"), src("prepare", "Запрос подготовлен `PREPARE`"), src("$1", "Значение передаётся параметром `$1`"), src("execute", "Выполнен через `EXECUTE`")],
      hint: "Посмотри на карточку PREPARE · EXECUTE и поменяй значение.",
      solution: "PREPARE find_guest(text) AS\n  SELECT name, city FROM customers WHERE email = $1;\nEXECUTE find_guest('anna@mail.ru');"
    })],
    quizzes: [
      single("sql-inject-fix", "Защита", "Как надёжно защититься от SQL-инъекций?", [["params", "Передавать ввод параметрами (`$1`)"], ["escape", "Удалять из ввода кавычки"], ["upper", "Писать ключевые слова заглавными"], ["hide", "Скрывать ошибки базы"]], "params", "Фильтры кавычек обходят. Параметры — нет."),
      single("sql-least", "Права", "Какие права дать сайту, который только показывает каталог?", [["select", "SELECT на таблицы каталога"], ["all", "Все права, так проще"], ["owner", "Сделать владельцем базы"], ["none", "Никаких, пусть читает файлы"]], "select", "Принцип наименьших привилегий.")
    ]
  });

  L({
    slug: "final-report", title: "Итоговый проект: годовой отчёт", summary: "Собираем всё вместе: помесячная выручка, средний чек и лучшие покупатели.",
    skill: ["sql-final", "Итоговый отчёт", "Строить аналитический отчёт из нескольких таблиц с группировкой, окнами и CTE."],
    now: "Итоговый проект: собираем большой отчёт, используя всё изученное.",
    body: [
      scene("Главный отчёт",
        ["you", "Хочу видеть по месяцам: сколько выполненных заказов, сколько денег и какой средний чек."],
        ["you", "И ещё — лучшего покупателя в каждом городе. Подарим им сертификат."],
        ["slon", "Всё, что нужно, ты уже знаешь: JOIN, GROUP BY, date_trunc, WITH и оконные функции. Я готов."],
        ["nika", "Собирай по шагам и проверяй каждый шаг глазами. Так работают аналитики."]),
      idea("Средний чек", "Выручка ÷ заказы", "Средняя сумма одного заказа: выручка, делённая на число заказов. Не путать со средней ценой позиции.", "Главная метрика магазина рядом с выручкой и числом покупателей.", "SELECT round(sum(oi.quantity * oi.unit_price) / count(DISTINCT o.id), 2) AS avg_check\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.status = 'done';"),
      rule("Хороший отчёт: понятные имена столбцов, округлённые деньги, порядок строк и комментарий, что считается.")
    ],
    tasks: [task("Отчёт по месяцам", "По выполненным заказам выведи для каждого месяца: `month` (текст вида `2025-09` через `to_char`), `orders` — число заказов, `revenue` — выручку и `avg_check` — средний чек, округлённый до 2 знаков. По возрастанию месяца.", {
      checks: [
        rows("SELECT to_char(o.created_at, 'YYYY-MM') AS month, count(DISTINCT o.id) AS orders, sum(oi.quantity * oi.unit_price) AS revenue, round(sum(oi.quantity * oi.unit_price) / count(DISTINCT o.id), 2) AS avg_check FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'done' GROUP BY month ORDER BY month", "Месяц, заказы, выручка и средний чек по порядку", { ordered: true, names: true })
      ],
      hint: "Заказ встречается в JOIN столько раз, сколько в нём позиций, поэтому заказы считай как `count(DISTINCT o.id)`.",
      solution: "-- Помесячный отчёт по выполненным заказам\nSELECT to_char(o.created_at, 'YYYY-MM') AS month,\n  count(DISTINCT o.id) AS orders,\n  sum(oi.quantity * oi.unit_price) AS revenue,\n  round(sum(oi.quantity * oi.unit_price) / count(DISTINCT o.id), 2) AS avg_check\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.id\nWHERE o.status = 'done'\nGROUP BY month\nORDER BY month;"
    }), task("Лучший покупатель города", "Для каждого города выведи `city`, `name` и `spent` покупателя, который потратил больше всех на выполненные заказы. Используй `WITH` и оконную функцию.", {
      checks: [
        rows("WITH spending AS (" + SPENDING + "), ranked AS (SELECT city, name, spent, rank() OVER (PARTITION BY city ORDER BY spent DESC) AS place FROM spending) SELECT city, name, spent FROM ranked WHERE place = 1", "Лучший покупатель каждого города", { names: true }),
        src("with", "Шаги вынесены в `WITH`"), src("over", "Место считается оконной функцией")
      ],
      hint: "Шаг 1: траты покупателей по городам (GROUP BY city, name). Шаг 2: `rank() OVER (PARTITION BY city ORDER BY spent DESC)`. Шаг 3: место = 1.",
      solution: "WITH spending AS (\n  SELECT c.city, c.name, sum(oi.quantity * oi.unit_price) AS spent\n  FROM customers c\n  JOIN orders o ON o.customer_id = c.id\n  JOIN order_items oi ON oi.order_id = o.id\n  WHERE o.status = 'done'\n  GROUP BY c.city, c.name\n),\nranked AS (\n  SELECT city, name, spent,\n    rank() OVER (PARTITION BY city ORDER BY spent DESC) AS place\n  FROM spending\n)\nSELECT city, name, spent\nFROM ranked\nWHERE place = 1;"
    })],
    quizzes: [
      single("sql-final-distinct", "Число заказов", "Почему после JOIN с `order_items` заказы считают как `count(DISTINCT o.id)`?", [["dup", "Заказ повторяется столько раз, сколько в нём позиций"], ["null", "Чтобы не считать NULL"], ["fast", "Так быстрее"], ["rule", "count без DISTINCT запрещён с JOIN"]], "dup", "Иначе посчитаем позиции, а не заказы."),
      multi("sql-final-tools", "Инструменты", "Что из курса пригодилось для «лучшего покупателя города»?", [["cte", "WITH"], ["window", "Оконная функция rank()"], ["join", "JOIN"], ["upsert", "ON CONFLICT"]], ["cte", "window", "join"], "ON CONFLICT — про вставку, а не про отчёты.")
    ]
  });
}
