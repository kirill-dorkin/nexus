// Chapter 8: changing data.
import { scene, stmt, clause, kw, idea, rule, rows, holds, src, task, makeLesson } from "./kit.mjs";

export default function dml(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi } = c;

  L({
    slug: "insert", title: "INSERT", summary: "Добавляем новые строки: одну, несколько, из другого запроса.",
    skill: ["sql-insert", "INSERT", "Добавлять строки командой INSERT INTO … VALUES и INSERT … SELECT."],
    now: "До сих пор мы только читали данные. Учимся добавлять новые строки.",
    body: [
      scene("Новинка",
        ["you", "Степлер: канцтовары, 300 ₽, 300 г. Добавь в каталог!"],
        ["slon", "INSERT INTO: в какую таблицу, в какие столбцы и какие значения. id я выдам сам — он генерируется."],
        ["nika", "Не бойся экспериментов: здесь каждый запуск начинается с чистой базы. В настоящей базе так не будет."]),
      stmt("INSERT", "Добавить строки", "`INSERT INTO таблица (столбцы) VALUES (значения);`. Не указанные столбцы получают значение по умолчанию или NULL.", "Новые товары, покупатели, заказы — всё появляется в базе через INSERT.", "INSERT INTO categories (name) VALUES ('Игрушки');\nSELECT * FROM categories;"),
      kw("VALUES", "Строки значений", "Список строк в скобках через запятую — можно добавить несколько сразу. Порядок значений — как в списке столбцов.", "Добавить пачку записей одной командой.", "INSERT INTO categories (name) VALUES ('Игрушки'), ('Спорт');\nSELECT * FROM categories ORDER BY id;"),
      kw("DEFAULT", "Значение по умолчанию", "Слово `DEFAULT` вместо значения просит базу подставить значение по умолчанию столбца. Пропущенный столбец получает его же.", "Не указывать то, что база знает сама: id, дату добавления, `is_available = true`.", "INSERT INTO products (name, category_id, price, is_available) VALUES ('Лавандовый пенал', 1, 320, DEFAULT);\nSELECT id, name, is_available, added_on = current_date AS added_today FROM products WHERE name = 'Лавандовый пенал';"),
      idea("INSERT … SELECT", "Вставить результат запроса", "Вместо VALUES — SELECT: в таблицу вставляются его строки.", "Перенос и копирование данных, архивы.", "CREATE TABLE archive_orders AS SELECT * FROM orders WHERE false;\nINSERT INTO archive_orders SELECT * FROM orders WHERE status = 'cancelled';\nSELECT id, status FROM archive_orders;"),
      rule("Всегда перечисляй столбцы в INSERT. Порядок столбцов в таблице может поменяться, а твой запрос — нет.")
    ],
    tasks: [task("Степлер в каталог", "Добавь товар «Степлер»: категория 1 (канцтовары), цена 300, вес 300 г. id не указывай.", {
      checks: [holds("SELECT count(*) = 1 FROM products WHERE name = 'Степлер' AND category_id = 1 AND price = 300 AND weight_g = 300", "«Степлер» в каталоге с нужными данными"), holds("SELECT count(*) = 17 FROM products", "Остальные товары на месте")],
      hint: "`INSERT INTO products (name, category_id, price, weight_g) VALUES ('Степлер', 1, 300, 300);`",
      solution: "INSERT INTO products (name, category_id, price, weight_g)\nVALUES ('Степлер', 1, 300, 300);"
    })],
    quizzes: [
      single("sql-insert-skip", "Пропущенный столбец", "Что окажется в столбце, которого нет в списке INSERT?", [["default", "Значение по умолчанию или NULL"], ["zero", "Всегда 0"], ["error", "Всегда ошибка"], ["prev", "Значение из предыдущей строки"]], "default", "Если у столбца NOT NULL без DEFAULT — тогда будет ошибка."),
      single("sql-insert-many", "Несколько строк", "Как добавить две строки одной командой?", [["values", "`VALUES (…), (…)`"], ["two", "Только двумя INSERT"], ["and", "`VALUES (…) AND (…)`"], ["union", "`INSERT … UNION INSERT …`"]], "values", "Строки VALUES перечисляются через запятую.")
    ]
  });

  L({
    slug: "update", title: "UPDATE", summary: "Меняем существующие строки — и не забываем WHERE.",
    skill: ["sql-update", "UPDATE", "Изменять данные командой UPDATE … SET … WHERE."],
    now: "Меняем значения в уже существующих строках.",
    body: [
      scene("Дорожает только бумага",
        ["you", "Бумага дорожает на 10%. Только бумага!"],
        ["slon", "UPDATE products SET price = price * 1.1 WHERE category_id = 2. Без WHERE подорожает ВЕСЬ каталог."],
        ["nika", "Перед UPDATE запусти SELECT с тем же WHERE и посмотри, какие строки изменятся."]),
      stmt("UPDATE", "Изменить строки", "`UPDATE таблица SET столбец = значение WHERE условие;`. Меняет все строки, подходящие под WHERE.", "Цены, статусы заказов, контакты покупателей.", "UPDATE orders SET status = 'done' WHERE status = 'new';\nSELECT status, count(*) FROM orders GROUP BY status;"),
      kw("SET", "Что поменять", "После SET — пары `столбец = выражение` через запятую. В выражении можно использовать старое значение: `price = price * 1.1`.", "Пересчитать значение, поменять несколько столбцов за раз.", "UPDATE products SET price = price + 10, is_available = true WHERE id = 7;\nSELECT name, price, is_available FROM products WHERE id = 7;"),
      rule("UPDATE без WHERE меняет всю таблицу. Сначала SELECT с тем же WHERE, потом UPDATE.")
    ],
    tasks: [task("Бумага дорожает", "Подними цены всех товаров категории 2 (бумага) на 10%.", {
      checks: [holds("SELECT count(*) = 3 FROM products WHERE category_id = 2 AND price IN (154, 165, 308)", "Бумага подорожала на 10%"), holds("SELECT sum(price) = 2870 FROM products WHERE category_id IS DISTINCT FROM 2", "Цены остального каталога не тронуты")],
      hint: "`UPDATE products SET price = price * 1.1 WHERE category_id = 2;`",
      solution: "UPDATE products\nSET price = price * 1.1\nWHERE category_id = 2;"
    })],
    quizzes: [
      single("sql-update-nowhere", "Без WHERE", "Что сделает `UPDATE products SET price = 100`?", [["all", "Поставит цену 100 всем товарам"], ["first", "Изменит первую строку"], ["error", "Выдаст ошибку без WHERE"], ["none", "Ничего"]], "all", "Без WHERE — все строки таблицы."),
      single("sql-update-two", "Два столбца", "Как поменять два столбца сразу?", [["comma", "`SET a = 1, b = 2`"], ["and", "`SET a = 1 AND b = 2`"], ["two", "Только двумя UPDATE"], ["set", "`SET a = 1 SET b = 2`"]], "comma", "Через запятую. `a = 1 AND b = 2` — это логическое выражение!")
    ]
  });

  L({
    slug: "delete", title: "DELETE и TRUNCATE", summary: "Удаляем строки — точечно или все разом.",
    skill: ["sql-delete", "DELETE", "Удалять строки командами DELETE и TRUNCATE и понимать каскадное удаление."],
    now: "Удаляем строки — аккуратно и только нужные.",
    body: [
      scene("Навсегда",
        ["you", "Удали отменённые заказы. Их всего два."],
        ["slon", "DELETE FROM orders WHERE status = 'cancelled'. Их позиции в `order_items` удалятся сами: там стоит ON DELETE CASCADE."]),
      stmt("DELETE", "Удалить строки", "`DELETE FROM таблица WHERE условие;`. Без WHERE удаляет все строки.", "Убрать ошибочные, тестовые и устаревшие записи.", "DELETE FROM reviews WHERE rating < 3;\nSELECT count(*) AS remaining FROM reviews;"),
      stmt("TRUNCATE", "Очистить таблицу", "`TRUNCATE таблица;` мгновенно удаляет все строки. Быстрее DELETE на больших таблицах.", "Очистить временные и тестовые таблицы.", "TRUNCATE reviews;\nSELECT count(*) FROM reviews;"),
      idea("Каскадное удаление", "Удалить вместе со ссылками", "Если на строку ссылаются другие, база не даст её удалить — или удалит и ссылающиеся строки, если так настроен внешний ключ (`ON DELETE CASCADE`).", "Целостность: не бывает позиций заказа без заказа.", "DELETE FROM orders WHERE id = 1;\nSELECT count(*) AS items_of_order_1 FROM order_items WHERE order_id = 1;"),
      rule("Перед DELETE — SELECT с тем же WHERE. В реальной базе удалённое не вернуть.")
    ],
    tasks: [task("Без отменённых", "Удали все заказы со статусом `cancelled`.", {
      checks: [holds("SELECT count(*) = 0 FROM orders WHERE status = 'cancelled'", "Отменённых заказов не осталось"), holds("SELECT count(*) = 20 FROM orders", "Остальные 20 заказов на месте"), holds("SELECT count(*) = 31 FROM order_items", "Позиции отменённых заказов удалились каскадом")],
      solution: "DELETE FROM orders\nWHERE status = 'cancelled';"
    })],
    quizzes: [
      single("sql-delete-fk", "Внешний ключ", "Что будет при удалении покупателя, на которого ссылаются заказы (без CASCADE)?", [["error", "Ошибка: на строку ссылаются"], ["null", "В заказах станет NULL"], ["both", "Удалятся и заказы"], ["ok", "Покупатель удалится, заказы останутся с битой ссылкой"]], "error", "Внешний ключ защищает от висячих ссылок."),
      single("sql-truncate", "TRUNCATE", "Чем TRUNCATE отличается от DELETE без WHERE?", [["fast", "Удаляет все строки быстрее, без условий"], ["drop", "Удаляет саму таблицу"], ["where", "Принимает WHERE"], ["undo", "Его можно отменить, а DELETE нельзя"]], "fast", "TRUNCATE очищает таблицу целиком. Таблица остаётся.")
    ]
  });

  L({
    slug: "returning", title: "RETURNING", summary: "Сразу видим, что изменилось: новые id и значения.",
    skill: ["sql-returning", "RETURNING", "Получать изменённые строки из INSERT, UPDATE и DELETE через RETURNING."],
    now: "Получаем изменённые строки сразу, без второго запроса.",
    body: [
      scene("Какой номер?",
        ["you", "Добавили строку — а какой у неё id? Делать ещё один SELECT?"],
        ["slon", "Допиши RETURNING. Я верну изменённые строки прямо из INSERT, UPDATE или DELETE. Это особенность PostgreSQL."]),
      clause("RETURNING", "Вернуть изменённое", "`… RETURNING столбцы` в конце INSERT, UPDATE или DELETE возвращает затронутые строки — уже с новыми значениями.", "Номер нового заказа, новая цена после пересчёта, список удалённого.", "INSERT INTO customers (name, city) VALUES ('Нина Руднева', 'Казань')\nRETURNING id, name, registered_on = current_date AS today;"),
      rule("Нужен результат изменения — RETURNING, а не второй запрос. Второй запрос может увидеть уже чужие изменения.")
    ],
    tasks: [task("Новая цена пенала", "Подними цену пенала (`id = 5`) на 20 и одной командой верни `name` и новую `price`.", {
      checks: [rows("UPDATE products SET price = price + 20 WHERE id = 5 RETURNING name, price", "Вернулись название и новая цена"), holds("SELECT price = 310 FROM products WHERE id = 5", "Цена пенала — 310"), src("returning", "Используется `RETURNING`")],
      solution: "UPDATE products\nSET price = price + 20\nWHERE id = 5\nRETURNING name, price;"
    })],
    quizzes: [
      multi("sql-returning-where", "Где работает", "К каким командам можно дописать RETURNING?", [["insert", "INSERT"], ["update", "UPDATE"], ["delete", "DELETE"], ["select", "SELECT"]], ["insert", "update", "delete"], "SELECT и так возвращает строки."),
      single("sql-returning-values", "Какие значения", "Что вернёт `UPDATE … SET price = price + 20 RETURNING price`?", [["new", "Новые цены"], ["old", "Старые цены"], ["both", "Обе"], ["count", "Число строк"]], "new", "RETURNING видит строки после изменения.")
    ]
  });

  L({
    slug: "upsert", title: "ON CONFLICT", summary: "Вставить или обновить: upsert в одну команду.",
    skill: ["sql-upsert", "ON CONFLICT", "Обрабатывать конфликты уникальности через ON CONFLICT DO NOTHING и DO UPDATE."],
    now: "Вставить новую строку или обновить существующую — одной командой.",
    body: [
      scene("Уже есть",
        ["you", "Загружаю прайс — и падаю на первом же товаре: «duplicate key value violates unique constraint»."],
        ["slon", "Название товара уникально. Скажи, что делать при конфликте: пропустить (DO NOTHING) или обновить (DO UPDATE)."]),
      clause("ON CONFLICT", "Если уже есть", "`INSERT … ON CONFLICT (столбец) …` — что делать, если вставка нарушает уникальность. Столбец должен быть уникальным.", "Импорт и синхронизация: повторный запуск не ломается и не плодит дубли.", "INSERT INTO categories (name) VALUES ('Бумага'), ('Игрушки')\nON CONFLICT (name) DO NOTHING;\nSELECT * FROM categories ORDER BY id;"),
      kw("DO NOTHING · DO UPDATE", "Пропустить или обновить", "`DO NOTHING` молча пропускает конфликтную строку. `DO UPDATE SET …` обновляет уже существующую.", "Upsert: «добавь, а если есть — обнови».", "INSERT INTO products (name, category_id, price) VALUES ('Пенал', 1, 300)\nON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price\nRETURNING id, name, price;"),
      kw("EXCLUDED", "Строка, которую не вставили", "В `DO UPDATE` псевдотаблица `EXCLUDED` — это значения, которые пытались вставить.", "Взять новую цену из прайса: `SET price = EXCLUDED.price`.", undefined),
      rule("Повторяемые загрузки делай через ON CONFLICT: второй запуск должен давать тот же результат, а не ошибку.")
    ],
    tasks: [task("Прайс поставщика", "Одной командой загрузи прайс: «Пенал» (категория 1) за 300 и новый «Степлер» (категория 1) за 320. Если товар с таким названием уже есть — обнови его цену.", {
      checks: [holds("SELECT price = 300 FROM products WHERE name = 'Пенал'", "Цена пенала обновилась до 300"), holds("SELECT count(*) = 1 FROM products WHERE name = 'Степлер' AND price = 320", "«Степлер» добавлен за 320"), holds("SELECT count(*) = 17 FROM products", "Дублей нет"), src("on conflict", "Используется `ON CONFLICT`")],
      hint: "`INSERT … VALUES (…), (…) ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;`",
      solution: "INSERT INTO products (name, category_id, price)\nVALUES ('Пенал', 1, 300), ('Степлер', 1, 320)\nON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;"
    })],
    quizzes: [
      single("sql-upsert-excluded", "EXCLUDED", "Что такое `EXCLUDED.price` в DO UPDATE?", [["new", "Цена, которую пытались вставить"], ["old", "Старая цена в таблице"], ["deleted", "Цена удалённого товара"], ["avg", "Средняя цена"]], "new", "Старая доступна просто как `price` (или `products.price`)."),
      single("sql-upsert-need", "Что нужно", "Что нужно столбцу в `ON CONFLICT (name)`?", [["unique", "Ограничение уникальности или первичный ключ"], ["index", "Любой индекс"], ["notnull", "Только NOT NULL"], ["text", "Тип text"]], "unique", "Конфликт бывает только с уникальностью.")
    ]
  });

  L({
    slug: "transactions", title: "Транзакции", summary: "Всё или ничего: BEGIN, COMMIT, ROLLBACK и точки сохранения.",
    skill: ["sql-transactions", "Транзакции", "Объединять изменения в транзакцию и откатывать их."],
    now: "Несколько изменений должны пройти вместе или не пройти вовсе.",
    body: [
      scene("Наполовину",
        ["you", "Вчера сайт завис, и в базе остался пустой заказ без позиций. Как так?"],
        ["slon", "Две команды выполнились по отдельности. Оберни их в транзакцию: либо обе, либо ни одной."]),
      stmt("BEGIN · COMMIT", "Начать и зафиксировать", "`BEGIN` начинает транзакцию, `COMMIT` фиксирует все её изменения разом. До COMMIT другие подключения изменений не видят.", "Связанные изменения: заказ и его позиции, перевод денег, перенос товара.", "BEGIN;\nINSERT INTO orders (id, customer_id, staff_id, created_at) VALUES (23, 10, 3, '2025-11-12 09:00');\nINSERT INTO order_items VALUES (23, 4, 1, 220);\nCOMMIT;\nSELECT o.id, oi.product_id FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.id = 23;"),
      stmt("ROLLBACK", "Отменить", "Отменяет все изменения транзакции, как будто их не было. После ошибки внутри транзакции остаётся только ROLLBACK.", "Передумал, нашёл ошибку, что-то пошло не так — данные целы.", "BEGIN;\nDELETE FROM reviews;\nROLLBACK;\nSELECT count(*) AS reviews_still_here FROM reviews;"),
      stmt("SAVEPOINT", "Точка сохранения", "`SAVEPOINT имя` внутри транзакции и `ROLLBACK TO имя` — откатить только часть, до этой точки.", "Длинные операции, где часть шагов можно повторить.", "BEGIN;\nUPDATE products SET price = 155 WHERE id = 1;\nSAVEPOINT before_delete;\nDELETE FROM products WHERE id = 16;\nROLLBACK TO before_delete;\nCOMMIT;\nSELECT name, price FROM products WHERE id IN (1, 16);"),
      idea("ACID", "Обещания базы", "Атомарность (всё или ничего), согласованность (правила не нарушены), изоляция (транзакции не мешают друг другу), долговечность (после COMMIT данные не пропадут).", "Поэтому деньги и заказы хранят в реляционных базах.", undefined),
      rule("Всё, что должно случиться вместе, — в одну транзакцию. Ошибка внутри — ROLLBACK.")
    ],
    tasks: [task("Заказ целиком", "В транзакции оформи заказ номер 23: покупатель 10, продавец 3, время `'2025-11-12 09:00'`, и одна позиция — блокнот (товар 4), 1 шт. по 220. Зафиксируй транзакцию.", {
      checks: [holds("SELECT count(*) = 1 FROM orders WHERE id = 23 AND customer_id = 10 AND staff_id = 3", "Заказ 23 есть"), holds("SELECT count(*) = 1 FROM order_items WHERE order_id = 23 AND product_id = 4 AND quantity = 1 AND unit_price = 220", "В нём блокнот"), src("begin", "Транзакция начата `BEGIN`"), src("commit", "И зафиксирована `COMMIT`")],
      hint: "BEGIN; два INSERT; COMMIT;",
      solution: "BEGIN;\nINSERT INTO orders (id, customer_id, staff_id, created_at)\nVALUES (23, 10, 3, '2025-11-12 09:00');\nINSERT INTO order_items (order_id, product_id, quantity, unit_price)\nVALUES (23, 4, 1, 220);\nCOMMIT;"
    })],
    quizzes: [
      single("sql-tx-rollback", "ROLLBACK", "Что делает ROLLBACK?", [["undo", "Отменяет все изменения текущей транзакции"], ["last", "Отменяет последнюю команду в базе вообще"], ["restart", "Перезапускает базу"], ["commit", "Фиксирует изменения"]], "undo", "Всё с момента BEGIN исчезает."),
      single("sql-tx-atomic", "Атомарность", "Что значит «атомарность» транзакции?", [["all", "Выполнится всё или ничего"], ["fast", "Выполнится быстро"], ["one", "Можно только одну команду"], ["log", "Всё попадёт в журнал"]], "all", "Половины транзакции не бывает.")
    ]
  });
}
