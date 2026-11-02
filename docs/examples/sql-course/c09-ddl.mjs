// Chapter 9: designing your own tables.
import { scene, stmt, kw, type, cons, idea, rule, holds, src, task, makeLesson } from "./kit.mjs";

const column = (table, name) => `information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${name}'`;

export default function ddl(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "create-table", title: "CREATE TABLE и типы", summary: "Своя таблица: имена столбцов, типы и автоматический id.",
    skill: ["sql-create-table", "CREATE TABLE", "Создавать таблицы и выбирать типы столбцов."],
    now: "«Зерно» начинает работать с поставщиками. Для них в базе пока нет таблицы.",
    body: [
      scene("Новая таблица",
        ["marta", "Нужен список поставщиков: название, телефон, с какого числа работаем."],
        ["slon", "Опиши таблицу командой CREATE TABLE: имя, столбцы, тип каждого. Типы я буду проверять при каждой вставке."]),
      stmt("CREATE TABLE", "Создать таблицу", "`CREATE TABLE имя (столбец тип, …);`. После создания таблица пустая и готова к INSERT.", "Каждая новая сущность бизнеса — поставщики, акции, смены — получает свою таблицу.", "CREATE TABLE shifts (\n  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  staff_id integer NOT NULL,\n  starts_at timestamp NOT NULL\n);\nINSERT INTO shifts (staff_id, starts_at) VALUES (3, '2025-11-12 08:00');\nSELECT * FROM shifts;"),
      type("integer · bigint · smallint", "Целые числа", "`integer` — до ±2 млрд, `bigint` — огромные, `smallint` — до ±32 тыс.", "Количество, id, оценки. Для id больших таблиц берут bigint.", "SELECT 2147483647::integer AS int_max, 9000000000::bigint AS big;"),
      type("numeric", "Точные дробные", "`numeric(7, 2)` — до 7 цифр, из них 2 после запятой. Считает без ошибок округления.", "Деньги — только numeric. Типы `real` и `double precision` для денег не годятся.", "SELECT 0.1::numeric + 0.2::numeric AS exact, 0.1::double precision + 0.2::double precision AS float;"),
      type("text · varchar", "Строки", "`text` — строка любой длины. `varchar(n)` — не длиннее n символов.", "В PostgreSQL `text` — нормальный выбор по умолчанию. Ограничение длины лучше задать через CHECK.", "SELECT pg_typeof('Зерно'::text) AS t, 'Зерно'::varchar(3) AS cut;"),
      type("boolean", "Да или нет", "`true`, `false` или NULL.", "Флажки: в наличии, активен, подписан на рассылку.", "SELECT name, is_available FROM products WHERE NOT is_available;"),
      type("date · timestamp · timestamptz", "Даты и время", "`date` — день, `timestamp` — день и время, `timestamptz` — с часовым поясом, хранит точный момент.", "Для событий в разных городах — timestamptz: Москва и Новосибирск увидят правильное время.", "SELECT date '2025-11-12' AS d, timestamp '2025-11-12 08:00' AS ts, timestamptz '2025-11-12 08:00+03' AS tz;"),
      kw("GENERATED AS IDENTITY", "Автоматический id", "`id integer GENERATED ALWAYS AS IDENTITY` — база сама выдаёт 1, 2, 3… Вариант `BY DEFAULT` разрешает указать id вручную.", "Не придумывать номера и не бояться совпадений.", "CREATE TABLE notes (id integer GENERATED ALWAYS AS IDENTITY, body text);\nINSERT INTO notes (body) VALUES ('первая'), ('вторая');\nSELECT * FROM notes;"),
      type("serial", "Старый способ", "`serial` — устаревшая запись автонумерации, её много в старом коде. Делает то же, что IDENTITY.", "Узнавать в чужих таблицах. В новых — IDENTITY.", undefined),
      rule("Деньги — numeric, моменты времени — timestamptz, текст — text, id — IDENTITY.")
    ],
    tasks: [task("Поставщики", "Создай таблицу `suppliers`: `id` — integer с `GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `name` — text, `phone` — text, `since` — date.", {
      checks: [
        holds(`SELECT is_identity = 'YES' FROM ${column("suppliers", "id")}`, "`id` генерируется сам"),
        holds(`SELECT data_type = 'text' FROM ${column("suppliers", "name")}`, "`name` — text"),
        holds(`SELECT data_type = 'text' FROM ${column("suppliers", "phone")}`, "`phone` — text"),
        holds(`SELECT data_type = 'date' FROM ${column("suppliers", "since")}`, "`since` — date")
      ],
      hint: "Посмотри на таблицу `shifts` в первой карточке.",
      solution: "CREATE TABLE suppliers (\n  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  name text,\n  phone text,\n  since date\n);"
    })],
    quizzes: [
      single("sql-type-money", "Деньги", "Какой тип выбрать для цены?", [["numeric", "`numeric(7, 2)`"], ["real", "`real`"], ["text", "`text`"], ["int", "`integer` в рублях с копейками"]], "numeric", "numeric точен. `0.1 + 0.2` в real/double — не ровно 0.3."),
      single("sql-type-identity", "IDENTITY", "Чем `GENERATED ALWAYS AS IDENTITY` отличается от `BY DEFAULT`?", [["always", "ALWAYS не даёт вставить id вручную"], ["same", "Ничем"], ["text", "ALWAYS делает id текстом"], ["null", "BY DEFAULT разрешает NULL в id"]], "always", "BY DEFAULT разрешает указать свой id.")
    ]
  });

  L({
    slug: "constraints", title: "Ограничения", summary: "PRIMARY KEY, NOT NULL, UNIQUE, CHECK и DEFAULT: правила, которые база не даст нарушить.",
    skill: ["sql-constraints", "Ограничения", "Защищать данные ограничениями PRIMARY KEY, NOT NULL, UNIQUE, CHECK и значениями по умолчанию."],
    now: "Даша заводит промокоды. Боится, что кто-то сделает скидку 500% или два одинаковых кода.",
    body: [
      scene("Скидка 500%",
        ["dasha", "А если менеджер опечатается и введёт скидку 500%?"],
        ["slon", "Запиши правило в таблицу — CHECK (discount BETWEEN 1 AND 50). Тогда я просто не пущу такую строку, кто бы её ни вставлял."],
        ["nika", "Проверки в приложении можно обойти. Ограничения в базе — нет."]),
      cons("PRIMARY KEY", "Первичный ключ", "Уникальный и непустой идентификатор строки. У таблицы он один, но может состоять из нескольких столбцов.", "По нему строку находят и на неё ссылаются.", "CREATE TABLE promo (code text PRIMARY KEY);\nINSERT INTO promo VALUES ('AUTUMN');\nSELECT * FROM promo;"),
      cons("NOT NULL", "Обязательное поле", "Столбец не может быть пустым.", "Название товара или цена не могут отсутствовать.", "SELECT column_name, is_nullable\nFROM information_schema.columns\nWHERE table_name = 'products'\nORDER BY ordinal_position;"),
      cons("UNIQUE", "Без повторов", "Значения в столбце (или сочетания столбцов) не повторяются. NULL при этом может быть много.", "Почта гостя, название товара, промокод.", "SELECT name, email FROM customers WHERE email IS NULL;"),
      cons("CHECK", "Своё правило", "`CHECK (условие)` — строка, для которой условие ложно, не будет вставлена или изменена.", "Цена больше нуля, оценка от 1 до 5, статус из списка.", "SELECT conname, pg_get_constraintdef(oid) AS rule\nFROM pg_constraint\nWHERE conrelid = 'reviews'::regclass AND contype = 'c';"),
      cons("CONSTRAINT", "Имя ограничения", "`CONSTRAINT имя CHECK (…)` — дать ограничению понятное имя. Оно появится в тексте ошибки.", "«violates check constraint discount_range» понятнее, чем автоматическое имя.", "CREATE TABLE promo_test (\n  discount integer CONSTRAINT discount_range CHECK (discount BETWEEN 1 AND 50)\n);\nSELECT conname FROM pg_constraint WHERE conrelid = 'promo_test'::regclass;"),
      idea("Значение по умолчанию", "DEFAULT в таблице", "`столбец тип DEFAULT значение` — подставляется, если при вставке столбец не указан.", "`is_active DEFAULT true`, `created_at DEFAULT now()`.", "SELECT column_name, column_default\nFROM information_schema.columns\nWHERE table_name = 'products' AND column_default IS NOT NULL;"),
      rule("Всё, что обязано быть правдой всегда, записывай ограничением в таблицу, а не только проверкой в коде.")
    ],
    tasks: [task("Промокоды", "Создай таблицу `promo_codes`: `code` — text, первичный ключ; `discount` — integer, обязательный, с CHECK от 1 до 50; `is_active` — boolean, обязательный, по умолчанию true.", {
      checks: [
        holds("SELECT count(*) = 1 FROM pg_constraint WHERE conrelid = 'promo_codes'::regclass AND contype = 'p'", "Есть первичный ключ"),
        holds(`SELECT is_nullable = 'NO' FROM ${column("promo_codes", "discount")}`, "`discount` обязателен"),
        holds("SELECT count(*) = 1 FROM pg_constraint WHERE conrelid = 'promo_codes'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%50%'", "CHECK ограничивает скидку"),
        holds(`SELECT column_default = 'true' AND is_nullable = 'NO' FROM ${column("promo_codes", "is_active")}`, "`is_active` обязателен и по умолчанию true")
      ],
      hint: "`discount integer NOT NULL CHECK (discount BETWEEN 1 AND 50)`, `is_active boolean NOT NULL DEFAULT true`.",
      solution: "CREATE TABLE promo_codes (\n  code text PRIMARY KEY,\n  discount integer NOT NULL CHECK (discount BETWEEN 1 AND 50),\n  is_active boolean NOT NULL DEFAULT true\n);"
    })],
    quizzes: [
      single("sql-cons-unique-null", "UNIQUE и NULL", "Можно ли в UNIQUE-столбце две строки с NULL?", [["yes", "Да, NULL не считаются равными"], ["no", "Нет, только одна"], ["pk", "Только если это первичный ключ"], ["err", "NULL в UNIQUE запрещён"]], "yes", "Поэтому у двух гостей может не быть почты."),
      multi("sql-cons-pk", "PRIMARY KEY", "Что включает PRIMARY KEY?", [["unique", "Уникальность"], ["notnull", "NOT NULL"], ["default", "Значение по умолчанию"], ["check", "Проверку диапазона"]], ["unique", "notnull"], "Первичный ключ = UNIQUE + NOT NULL.")
    ]
  });

  L({
    slug: "foreign-keys", title: "Внешние ключи", summary: "Связываем таблицы так, чтобы ссылки никогда не вели в пустоту.",
    skill: ["sql-foreign-keys", "FOREIGN KEY", "Создавать внешние ключи и выбирать поведение при удалении."],
    now: "Гости просят «избранное» в приложении. Нужна таблица, связывающая гостей и товары.",
    body: [
      scene("Избранное",
        ["dasha", "Гость лайкает товар. Где это хранить?"],
        ["slon", "Таблица пар: id гостя, id товара. Объяви их внешними ключами, и я не дам сослаться на несуществующего гостя."],
        ["marta", "А если гость удалит аккаунт?"],
        ["slon", "Скажи ON DELETE CASCADE — уберу и его избранное."]),
      cons("FOREIGN KEY · REFERENCES", "Внешний ключ", "`столбец integer REFERENCES таблица (id)` — значение обязано существовать в другой таблице (или быть NULL).", "Нет заказов от несуществующих гостей и позиций с удалёнными товарами.", "SELECT conname, pg_get_constraintdef(oid) AS rule\nFROM pg_constraint\nWHERE conrelid = 'orders'::regclass AND contype = 'f';"),
      kw("ON DELETE", "Что делать при удалении", "`ON DELETE CASCADE` — удалить ссылающиеся строки. `SET NULL` — обнулить ссылку. `RESTRICT` (по умолчанию) — запретить удаление.", "Позиции заказа живут и умирают с заказом. Отзыв можно оставить, обнулив товар.", "DELETE FROM orders WHERE id = 3;\nSELECT count(*) AS items_left FROM order_items WHERE order_id = 3;"),
      idea("Составной ключ", "Ключ из двух столбцов", "`PRIMARY KEY (customer_id, product_id)` — уникальна пара значений. Так устроена и `order_items`.", "Гость не лайкнет один товар дважды.", "SELECT order_id, product_id FROM order_items WHERE order_id = 1;"),
      rule("Каждый столбец `что-то_id` — внешний ключ. Без REFERENCES связь держится только на честном слове.")
    ],
    tasks: [task("Таблица избранного", "Создай таблицу `favourites` со столбцами `customer_id` (ссылка на `customers`, удаляется вместе с гостем) и `product_id` (ссылка на `products`). Первичный ключ — пара столбцов.", {
      checks: [
        holds("SELECT count(*) = 2 FROM pg_constraint WHERE conrelid = 'favourites'::regclass AND contype = 'f'", "Два внешних ключа"),
        holds("SELECT confdeltype = 'c' FROM pg_constraint WHERE conrelid = 'favourites'::regclass AND contype = 'f' AND confrelid = 'customers'::regclass", "Избранное удаляется вместе с гостем"),
        holds("SELECT array_length(conkey, 1) = 2 FROM pg_constraint WHERE conrelid = 'favourites'::regclass AND contype = 'p'", "Первичный ключ из двух столбцов")
      ],
      hint: "`customer_id integer REFERENCES customers (id) ON DELETE CASCADE`, …, `PRIMARY KEY (customer_id, product_id)`.",
      solution: "CREATE TABLE favourites (\n  customer_id integer REFERENCES customers (id) ON DELETE CASCADE,\n  product_id integer REFERENCES products (id),\n  PRIMARY KEY (customer_id, product_id)\n);"
    })],
    quizzes: [
      single("sql-fk-default", "По умолчанию", "Что происходит по умолчанию при удалении строки, на которую ссылаются?", [["restrict", "Удаление запрещено, ошибка"], ["cascade", "Удаляются ссылающиеся строки"], ["null", "Ссылки становятся NULL"], ["nothing", "Ссылки остаются битыми"]], "restrict", "По умолчанию база защищает данные."),
      single("sql-fk-null", "Пустая ссылка", "Может ли внешний ключ быть NULL?", [["yes", "Да, если нет NOT NULL"], ["no", "Никогда"], ["pk", "Только в первичном ключе"], ["cascade", "Только с CASCADE"]], "yes", "Например, `orders.customer_id` пуст у заказов без карты гостя.")
    ]
  });

  L({
    slug: "alter-drop", title: "ALTER TABLE и DROP TABLE", summary: "Меняем существующие таблицы и удаляем ненужные.",
    skill: ["sql-alter", "ALTER TABLE", "Добавлять, переименовывать и удалять столбцы и таблицы."],
    now: "Гости спрашивают про калории. В `products` такого столбца нет.",
    body: [
      scene("Калории",
        ["marta", "Нужно указывать калории. Таблицу придётся создавать заново?"],
        ["slon", "Нет. ALTER TABLE добавит столбец к живой таблице. Старые строки получат NULL или значение по умолчанию."]),
      stmt("ALTER TABLE", "Изменить таблицу", "`ALTER TABLE имя действие;` — добавить или удалить столбец, ограничение, переименовать, сменить тип.", "Таблицы живут годами, требования меняются.", "ALTER TABLE customers ADD COLUMN vip boolean NOT NULL DEFAULT false;\nSELECT name, vip FROM customers LIMIT 3;"),
      kw("ADD COLUMN · DROP COLUMN", "Добавить и удалить столбец", "`ADD COLUMN имя тип` добавляет, `DROP COLUMN имя` удаляет столбец вместе с данными.", "Новые поля и уборка старых.", "ALTER TABLE products DROP COLUMN volume_ml;\nSELECT * FROM products LIMIT 2;"),
      kw("RENAME", "Переименовать", "`RENAME COLUMN старое TO новое` или `RENAME TO новое_имя_таблицы`.", "Исправить неудачное имя.", "ALTER TABLE staff RENAME COLUMN salary TO monthly_salary;\nSELECT name, monthly_salary FROM staff LIMIT 2;"),
      stmt("DROP TABLE", "Удалить таблицу", "Удаляет таблицу целиком: структуру и данные.", "Убрать временные и устаревшие таблицы.", "CREATE TABLE tmp (x int);\nDROP TABLE tmp;\nSELECT count(*) AS tmp_tables FROM information_schema.tables WHERE table_name = 'tmp';"),
      kw("IF EXISTS · IF NOT EXISTS", "Без ошибки", "`DROP TABLE IF EXISTS` не падает, если таблицы нет. `CREATE TABLE IF NOT EXISTS` — если уже есть.", "Скрипты, которые можно запускать повторно.", "DROP TABLE IF EXISTS nothing_here;\nCREATE TABLE IF NOT EXISTS categories (id int);\nSELECT count(*) FROM categories;"),
      kw("CASCADE", "Вместе с зависимыми", "`DROP TABLE … CASCADE` удаляет и то, что от таблицы зависит: внешние ключи, представления.", "Иначе база откажется удалять таблицу, на которую ссылаются.", undefined),
      rule("В рабочей базе структура меняется миграциями — пронумерованными скриптами ALTER, которые идут только вперёд.")
    ],
    tasks: [task("Калории в меню", "Добавь в `products` столбец `calories` типа integer, а потом укажи у чизкейка (`id = 11`) 320 калорий.", {
      checks: [
        holds(`SELECT data_type = 'integer' FROM ${column("products", "calories")}`, "Столбец `calories` типа integer"),
        holds("SELECT calories = 320 FROM products WHERE id = 11", "У чизкейка 320 калорий")
      ],
      hint: "`ALTER TABLE products ADD COLUMN calories integer;` и затем UPDATE.",
      solution: "ALTER TABLE products ADD COLUMN calories integer;\nUPDATE products SET calories = 320 WHERE id = 11;"
    })],
    quizzes: [
      single("sql-alter-existing", "Старые строки", "Что окажется в новом столбце у существующих строк после `ADD COLUMN calories integer`?", [["null", "NULL"], ["zero", "0"], ["error", "Ошибка: строки уже есть"], ["random", "Случайные значения"]], "null", "Если не указан DEFAULT — NULL."),
      single("sql-drop-if", "IF EXISTS", "Зачем `DROP TABLE IF EXISTS`?", [["noerr", "Не падать, если таблицы нет"], ["safe", "Удалить только пустую таблицу"], ["ask", "Спросить подтверждение"], ["backup", "Сделать копию перед удалением"]], "noerr", "Удобно для скриптов, которые запускаются повторно.")
    ]
  });

  L({
    slug: "normalization", title: "Проектирование и нормализация", summary: "Как разложить данные по таблицам, чтобы они не противоречили сами себе.",
    skill: ["sql-normalization", "Нормализация", "Проектировать таблицы без дублирования и строить связь «многие ко многим»."],
    now: "Даша хочет метки для товаров: «веган», «без сахара», «хит». У товара может быть несколько меток.",
    body: [
      scene("Метки через запятую?",
        ["dasha", "Добавлю в products столбец tags и буду писать «веган, хит»."],
        ["nika", "А потом «Веган», «веган » и «вегн» — и поиск по меткам сломан. Метки — отдельная таблица, а связи — ещё одна."],
        ["slon", "Это связь «многие ко многим»: у товара много меток, у метки много товаров."]),
      idea("Нормализация", "Каждый факт — один раз", "Проектирование, при котором данные не дублируются: имя гостя хранится в `customers`, а не в каждом заказе. Одно значение — одна ячейка, без списков через запятую.", "Нет противоречий («в одном заказе Анна, в другом Аня») и всё легко менять.", "SELECT o.id, c.name\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE c.id = 1;"),
      idea("Многие ко многим", "Таблица-связка", "Две таблицы связывает третья, в каждой строке которой две ссылки. `order_items` — связка заказов и товаров.", "Метки, роли, участники групп, товары в заказах.", "SELECT oi.order_id, p.name\nFROM order_items oi\nJOIN products p ON p.id = oi.product_id\nWHERE oi.order_id IN (1, 3);"),
      idea("Денормализация", "Сознательный повтор", "Иногда данные копируют намеренно. `order_items.unit_price` хранит цену на момент заказа, хотя цена есть в `products`.", "Цена в меню изменится, а старые заказы должны остаться верными.", "SELECT oi.order_id, p.name, oi.unit_price, p.price\nFROM order_items oi\nJOIN products p ON p.id = oi.product_id\nWHERE oi.order_id = 19;"),
      rule("Видишь список через запятую в ячейке — нужна отдельная таблица. Дублируешь данные — объясни себе зачем.")
    ],
    tasks: [task("Метки товаров", "Создай таблицу `tags` (`id` — identity и первичный ключ, `name` — text, уникальный и обязательный) и таблицу-связку `product_tags` (`product_id` → `products`, `tag_id` → `tags`, первичный ключ из пары). Добавь метку 'веган' и привяжи её к зелёному чаю (`product_id = 9`).", {
      checks: [
        holds("SELECT count(*) = 1 FROM pg_constraint WHERE conrelid = 'tags'::regclass AND contype = 'u'", "У `tags.name` есть UNIQUE"),
        holds("SELECT count(*) = 2 FROM pg_constraint WHERE conrelid = 'product_tags'::regclass AND contype = 'f'", "В `product_tags` две ссылки"),
        holds("SELECT count(*) = 1 FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name = 'веган' AND pt.product_id = 9", "Зелёный чай помечен «веган»")
      ],
      hint: "Сначала две CREATE TABLE, затем INSERT метки и INSERT связи. id метки можно взять подзапросом: `(SELECT id FROM tags WHERE name = 'веган')`.",
      solution: "CREATE TABLE tags (\n  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  name text NOT NULL UNIQUE\n);\nCREATE TABLE product_tags (\n  product_id integer REFERENCES products (id),\n  tag_id integer REFERENCES tags (id),\n  PRIMARY KEY (product_id, tag_id)\n);\nINSERT INTO tags (name) VALUES ('веган');\nINSERT INTO product_tags (product_id, tag_id)\nVALUES (9, (SELECT id FROM tags WHERE name = 'веган'));"
    })],
    quizzes: [
      single("sql-norm-csv", "Список в ячейке", "Почему плохо хранить метки строкой `'веган, хит'`?", [["search", "Трудно искать, легко опечататься, нельзя сослаться"], ["size", "Строка слишком длинная"], ["type", "text не хранит запятые"], ["fine", "Это нормальная практика"]], "search", "Одна ячейка — одно значение."),
      single("sql-norm-m2m", "Многие ко многим", "Как в реляционной базе хранят связь «многие ко многим»?", [["junction", "Отдельной таблицей с двумя внешними ключами"], ["array", "Только массивом в одной из таблиц"], ["two", "Ссылками в обеих таблицах"], ["text", "Строкой через запятую"]], "junction", "Таблица-связка: `order_items`, `product_tags`.")
    ]
  });
}
