// Chapter 10: window functions, views and JSON.
import { scene, stmt, clause, kw, op, fn, type, idea, rule, rows, holds, src, task, makeLesson } from "./kit.mjs";

const DAILY = "SELECT o.created_at::date AS day, sum(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'done' GROUP BY day";

export default function analytics(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "window-functions", title: "Оконные функции", summary: "Номер, место и доля — не сворачивая строки в группы.",
    skill: ["sql-window", "Оконные функции", "Считать по «окну» строк через OVER, PARTITION BY, row_number и rank."],
    now: "Считаем по группам, не схлопывая строки: места, номера, доли.",
    body: [
      scene("Место в категории",
        ["you", "GROUP BY схлопывает товары в одну строку на категорию. А мне нужен каждый товар и его место."],
        ["slon", "Оконная функция: считаю по группе строк, но строки не схлопываю. Окно задаёшь в OVER."]),
      clause("OVER", "Окно", "`функция() OVER (…)` — функция видит «окно» строк, но возвращает значение для каждой строки. Пустые скобки — окно из всех строк.", "Доля от общего, место, номер, сравнение с соседями.", "SELECT name, price, round(100 * price / sum(price) OVER (), 1) AS share_pct\nFROM products\nORDER BY price DESC\nLIMIT 5;"),
      kw("PARTITION BY", "Окно по группам", "`OVER (PARTITION BY category_id)` — для каждой строки окно состоит из строк её категории. Почти GROUP BY, но строки остаются.", "Сравнение внутри отдела, категории, месяца.", "SELECT name, category_id, price, round(avg(price) OVER (PARTITION BY category_id), 2) AS category_avg\nFROM products\nWHERE category_id IS NOT NULL;"),
      fn("row_number", "Номер строки", "`row_number() OVER (ORDER BY …)` — 1, 2, 3… в заданном порядке, без повторов.", "Нумерация, «первый заказ каждого покупателя» (номер = 1).", "SELECT customer_id, id AS order_id, row_number() OVER (PARTITION BY customer_id ORDER BY created_at) AS nth\nFROM orders\nWHERE customer_id IN (1, 2);"),
      fn("rank · dense_rank", "Место", "`rank()` — места с пропусками после равных (1, 1, 3), `dense_rank()` — без пропусков (1, 1, 2).", "Рейтинги, где бывают равные значения.", "SELECT name, price, rank() OVER (ORDER BY price DESC) AS rank, dense_rank() OVER (ORDER BY price DESC) AS dense\nFROM products\nWHERE category_id = 1;"),
      rule("Нужен итог по группе, но строки терять нельзя — это оконная функция, а не GROUP BY.")
    ],
    tasks: [task("Рейтинг в категории", "Для товаров с категорией выведи `name`, `category_id`, `price` и `place` — место по цене внутри категории (самый дорогой — 1) через `rank()`.", {
      checks: [rows("SELECT name, category_id, price, rank() OVER (PARTITION BY category_id ORDER BY price DESC) AS place FROM products WHERE category_id IS NOT NULL", "Место каждого товара внутри своей категории", { names: true }), src("partition by", "Окно разбито по категориям")],
      hint: "`rank() OVER (PARTITION BY category_id ORDER BY price DESC) AS place`",
      solution: "SELECT name, category_id, price,\n  rank() OVER (PARTITION BY category_id ORDER BY price DESC) AS place\nFROM products\nWHERE category_id IS NOT NULL;"
    })],
    quizzes: [
      single("sql-window-vs-group", "Отличие", "Чем оконная функция отличается от агрегата с GROUP BY?", [["keep", "Не схлопывает строки: значение считается для каждой строки"], ["fast", "Всегда быстрее"], ["only", "Работает только с числами"], ["same", "Ничем"]], "keep", "Строк столько же, сколько было."),
      single("sql-rank", "rank", "Цены 300, 300, 250. Какие места даст `rank()` по убыванию?", [["113", "1, 1, 3"], ["112", "1, 1, 2"], ["123", "1, 2, 3"], ["111", "1, 1, 1"]], "113", "rank пропускает места после равных. dense_rank дал бы 1, 1, 2.")
    ]
  });

  L({
    slug: "running-totals", title: "Накопительные итоги, LAG и LEAD", summary: "Выручка нарастающим итогом и сравнение с предыдущим днём.",
    skill: ["sql-window-frames", "Накопительные итоги", "Считать нарастающие итоги и сравнивать строку с соседними через LAG и LEAD."],
    now: "Накопительные итоги и сравнение с соседними строками.",
    body: [
      scene("Сколько уже заработали?",
        ["you", "Не просто выручка по дням, а сколько всего с первого дня. И разница со вчера."],
        ["slon", "sum() OVER (ORDER BY day) — накопительная сумма. lag() — значение из предыдущей строки."]),
      idea("Накопительный итог", "sum() OVER (ORDER BY …)", "С ORDER BY внутри OVER окно растёт: от первой строки до текущей. Сумма становится нарастающей.", "Выручка с начала месяца, накопленные баллы, баланс счёта.", "WITH daily AS (\n  " + DAILY.replace(" FROM", "\n  FROM").replace(" WHERE", "\n  WHERE").replace(" GROUP", "\n  GROUP") + "\n)\nSELECT day, revenue, sum(revenue) OVER (ORDER BY day) AS running\nFROM daily\nORDER BY day\nLIMIT 6;"),
      fn("lag · lead", "Соседние строки", "`lag(x)` — значение x из предыдущей строки окна, `lead(x)` — из следующей. У первой строки lag — NULL.", "Разница со вчера, интервал между заказами покупателя.", "SELECT id, customer_id, created_at,\n  created_at - lag(created_at) OVER (PARTITION BY customer_id ORDER BY created_at) AS since_previous\nFROM orders\nWHERE customer_id = 1;"),
      kw("ROWS BETWEEN", "Рамка окна", "`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` — окно из текущей и двух предыдущих строк.", "Скользящее среднее за 3 дня, сглаживание графика.", "SELECT id, created_at::date AS day,\n  count(*) OVER (ORDER BY created_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS last3\nFROM orders\nLIMIT 5;"),
      rule("Накопительный итог — `sum() OVER (ORDER BY …)`. Сравнить с прошлым — `lag()`.")
    ],
    tasks: [task("Выручка нарастающим итогом", "По выполненным заказам посчитай выручку по дням и выведи `day`, `revenue` и `running` — выручку нарастающим итогом, по возрастанию дня.", {
      checks: [rows("WITH daily AS (" + DAILY + ") SELECT day, revenue, sum(revenue) OVER (ORDER BY day) AS running FROM daily ORDER BY day", "День, выручка и итог с первого дня", { ordered: true, names: true }), src("over", "Нарастающий итог через `OVER`")],
      hint: "Возьми CTE `daily` из карточки и добавь `sum(revenue) OVER (ORDER BY day) AS running`.",
      solution: "WITH daily AS (\n  SELECT o.created_at::date AS day, sum(oi.quantity * oi.unit_price) AS revenue\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.id\n  WHERE o.status = 'done'\n  GROUP BY day\n)\nSELECT day, revenue, sum(revenue) OVER (ORDER BY day) AS running\nFROM daily\nORDER BY day;"
    })],
    quizzes: [
      single("sql-lag-first", "lag у первой строки", "Что вернёт `lag(x)` для первой строки окна?", [["null", "NULL"], ["zero", "0"], ["same", "Значение x этой же строки"], ["last", "Значение последней строки"]], "null", "Предыдущей строки нет."),
      single("sql-running", "Нарастающий итог", "Что даёт `sum(revenue) OVER (ORDER BY day)`?", [["running", "Сумму с первого дня по текущий"], ["total", "Общую сумму в каждой строке"], ["daily", "Выручку только этого дня"], ["err", "Ошибку: sum требует GROUP BY"]], "running", "ORDER BY в окне делает рамку «от начала до текущей строки».")
    ]
  });

  L({
    slug: "views", title: "Представления", summary: "Сохраняем запрос под именем и работаем с ним как с таблицей.",
    skill: ["sql-views", "Представления", "Создавать представления и материализованные представления."],
    now: "Сохраняем частый запрос под именем и обращаемся к нему как к таблице.",
    body: [
      scene("Один и тот же запрос",
        ["you", "Сайт, бот и касса — все пишут один и тот же длинный SELECT каталога."],
        ["slon", "Сохрани его как представление — view. Дальше `SELECT * FROM public_menu`, а запрос живёт в одном месте."]),
      stmt("CREATE VIEW", "Представление", "`CREATE VIEW имя AS SELECT …` — именованный запрос. Данных не хранит: при каждом обращении выполняет свой SELECT.", "Спрятать сложность, дать приложению простое имя, ограничить видимые столбцы.", "CREATE VIEW public_menu AS\nSELECT p.name, p.price, c.name AS category\nFROM products p\nLEFT JOIN categories c ON c.id = p.category_id\nWHERE p.is_available;\nSELECT * FROM public_menu ORDER BY price DESC LIMIT 4;"),
      stmt("CREATE MATERIALIZED VIEW", "Сохранённый результат", "Как VIEW, но результат хранится. Обновляется командой `REFRESH MATERIALIZED VIEW`.", "Тяжёлые отчёты, которые достаточно пересчитывать раз в час.", "CREATE MATERIALIZED VIEW sales_by_product AS\nSELECT product_id, sum(quantity) AS sold FROM order_items GROUP BY product_id;\nREFRESH MATERIALIZED VIEW sales_by_product;\nSELECT * FROM sales_by_product ORDER BY sold DESC LIMIT 3;"),
      rule("Повторяющийся запрос — в представление. Тяжёлый и редко меняющийся — в материализованное.")
    ],
    tasks: [task("Каталог для сайта", "Создай представление `public_menu` со столбцами `name` и `price` товаров, которые есть в наличии. Затем выведи из него все строки.", {
      checks: [holds("SELECT count(*) = 1 FROM information_schema.views WHERE table_name = 'public_menu'", "Представление `public_menu` создано"), holds("SELECT count(*) = 14 FROM public_menu", "В нём только товары в наличии"), rows("SELECT name, price FROM products WHERE is_available", "Последний запрос показывает каталог из представления")],
      solution: "CREATE VIEW public_menu AS\nSELECT name, price\nFROM products\nWHERE is_available;\n\nSELECT * FROM public_menu;"
    })],
    quizzes: [
      single("sql-view-data", "Хранит ли", "Хранит ли обычное представление (VIEW) данные?", [["no", "Нет, выполняет запрос при каждом обращении"], ["yes", "Да, копию таблицы"], ["cache", "Да, но только час"], ["first", "Только первую выборку"]], "no", "Хранит материализованное представление."),
      short("sql-view-refresh", "Обновить", "Какой командой пересчитывают материализованное представление? (первое слово)", ["REFRESH"], "`REFRESH MATERIALIZED VIEW имя;`")
    ]
  });

  L({
    slug: "json", title: "JSON в PostgreSQL", summary: "Гибкие данные в столбце jsonb и сборка JSON для приложений.",
    skill: ["sql-json", "JSON", "Хранить и читать jsonb, собирать JSON из строк."],
    now: "Храним и разбираем JSON прямо в PostgreSQL.",
    body: [
      scene("Пожелания к заказу",
        ["you", "У одного заказа «подарочная упаковка», у другого «позвонить заранее и оставить у двери». Столбец под каждое пожелание?"],
        ["slon", "Для такого есть jsonb: гибкий объект в одном столбце. А для приложения я соберу JSON прямо из строк."]),
      type("jsonb", "JSON в базе", "Тип для JSON-документов. Хранится в разобранном виде, поддерживает поиск и индексы.", "Гибкие атрибуты, настройки, ответы внешних сервисов.", "SELECT '{\"wrap\": \"подарочная\", \"notes\": [\"позвонить заранее\"], \"urgent\": true}'::jsonb AS wishes;"),
      op("-> · ->>", "Достать поле", "`->` возвращает поле как jsonb, `->>` — как текст. `wishes->'notes'->>0` — первая заметка.", "Читать значения из JSON и фильтровать по ним.", "SELECT w->>'wrap' AS wrap, w->'notes'->>0 AS first_note, (w->>'urgent')::boolean AS urgent\nFROM (SELECT '{\"wrap\": \"подарочная\", \"notes\": [\"позвонить заранее\"], \"urgent\": true}'::jsonb AS w) AS t;"),
      fn("jsonb_build_object", "Собрать объект", "`jsonb_build_object('ключ', значение, …)` — объект из пар ключ–значение.", "Отдать строку приложению в нужной форме.", "SELECT jsonb_build_object('id', id, 'name', name, 'price', price) AS item\nFROM products\nLIMIT 3;"),
      fn("json_agg · jsonb_agg", "Собрать массив", "Агрегат: склеивает значения группы в JSON-массив.", "Весь каталог одним ответом, товары по категориям.", "SELECT c.name AS category, jsonb_agg(p.name ORDER BY p.name) AS items\nFROM categories c\nJOIN products p ON p.category_id = c.id\nGROUP BY c.name;"),
      rule("JSON — для действительно гибких данных. Всё, по чему ищут, считают и связывают, — в обычные столбцы.")
    ],
    tasks: [task("Каталог для приложения", "Для каждого товара в наличии выведи столбец `item` — объект jsonb с ключами `name` и `price`.", {
      checks: [rows("SELECT jsonb_build_object('name', name, 'price', price) AS item FROM products WHERE is_available", "Объект `{name, price}` для каждого товара в наличии", { names: true }), src("jsonb_build_object", "Используется `jsonb_build_object`")],
      solution: "SELECT jsonb_build_object('name', name, 'price', price) AS item\nFROM products\nWHERE is_available;"
    })],
    quizzes: [
      single("sql-json-arrow", "-> и ->>", "Чем `->>` отличается от `->`?", [["text", "`->>` возвращает текст, `->` — jsonb"], ["deep", "`->>` ищет глубже"], ["array", "`->>` работает только с массивами"], ["same", "Ничем"]], "text", "Для сравнения со строкой нужен `->>`."),
      single("sql-json-when", "Когда JSON", "Когда уместен jsonb?", [["flex", "Для гибких атрибутов, разных у разных строк"], ["always", "Всегда вместо таблиц"], ["money", "Для денег"], ["keys", "Для внешних ключей"]], "flex", "Основные данные — в обычных столбцах.")
    ]
  });
}
