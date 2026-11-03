// Chapter 4: functions and expressions.
import { scene, op, fn, kw, idea, rule, rows, src, task, makeLesson } from "./kit.mjs";

export default function functions(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "math", title: "Числа и округление", summary: "Округляем цены, считаем остатки и проценты.",
    skill: ["sql-math", "Математические функции", "Округлять и считать числа функциями round, ceil, floor, abs и оператором %."],
    now: "Считаем в запросах: арифметика, деление и округление.",
    body: [
      scene("Слишком точно",
        ["you", "Цена за 100 г у пенала — 82.857142857142… Мне бы до копеек."],
        ["slon", "Функция round: скажи, сколько знаков оставить."]),
      fn("round", "Округлить", "`round(x)` — до целого, `round(x, 2)` — до двух знаков после запятой.", "Деньги, проценты, средние — всё, что видит человек, стоит округлять.", "SELECT name, price / weight_g * 100 AS raw, round(price / weight_g * 100, 2) AS per_100g\nFROM products\nWHERE weight_g IS NOT NULL\nLIMIT 4;"),
      fn("ceil · floor", "Вверх и вниз", "`ceil` — до целого вверх, `floor` — вниз. `ceil(2.1)` = 3, `floor(2.9)` = 2.", "Сколько коробок нужно (вверх) или сколько полных порций выйдет (вниз).", "SELECT ceil(2.1) AS up, floor(2.9) AS down, round(2.5) AS nearest;"),
      fn("abs", "Модуль", "`abs(x)` — число без знака.", "Разница между ценами в обе стороны: насколько товар дороже или дешевле среднего.", "SELECT name, abs(price - 200) AS diff_from_200\nFROM products\nLIMIT 4;"),
      op("%", "Остаток от деления", "`7 % 3` = 1. Остаток после целочисленного деления.", "Каждый 5-й заказ — подарок: `id % 5 = 0`. Чётные и нечётные строки.", "SELECT id, created_at\nFROM orders\nWHERE id % 5 = 0;"),
      rule("Считай с полной точностью, округляй в самом конце — в SELECT, перед показом.")
    ],
    tasks: [task("Цена за 100 г", "Для товаров с указанным весом выведи `name` и цену за 100 г, округлённую до 2 знаков, под именем `per_100g`.", {
      checks: [rows("SELECT name, round(price / weight_g * 100, 2) AS per_100g FROM products WHERE weight_g IS NOT NULL", "Цена за 100 г с точностью до копеек", { names: true }), src("round", "Используется `round`")],
      hint: "`round(price / weight_g * 100, 2) AS per_100g` и `WHERE weight_g IS NOT NULL`.",
      solution: "SELECT name, round(price / weight_g * 100, 2) AS per_100g\nFROM products\nWHERE weight_g IS NOT NULL;"
    })],
    quizzes: [
      single("sql-math-round", "round", "Сколько будет `round(3.14159, 2)`?", [["314", "3.14"], ["3", "3"], ["315", "3.15"], ["31", "3.1"]], "314", "Два знака после запятой."),
      single("sql-math-mod", "Остаток", "Что вернёт `10 % 4`?", [["2", "2"], ["25", "2.5"], ["4", "4"], ["0", "0"]], "2", "10 = 4·2 + 2.")
    ]
  });

  L({
    slug: "strings", title: "Работа с текстом", summary: "Склеить, обрезать, заменить, поменять регистр.",
    skill: ["sql-strings", "Строковые функции", "Обрабатывать текст: ||, upper, lower, length, substring, trim, replace, concat."],
    now: "Склеиваем, режем и чистим текст функциями PostgreSQL.",
    body: [
      scene("Ценники",
        ["you", "Хочу строку для ценника: «Пенал — 290 ₽». Можно это прямо из базы?"],
        ["slon", "Склею. Оператор `||` соединяет строки."]),
      op("||", "Склейка строк", "`'a' || 'b'` = `'ab'`. Числа приклеиваются как текст. Если хоть одна часть NULL — результат NULL.", "Собрать ФИО, ценник, адрес из нескольких столбцов.", "SELECT name || ' — ' || price || ' ₽' AS tag\nFROM products\nLIMIT 3;"),
      fn("concat", "Склейка без NULL", "`concat(a, b, c)` склеивает, пропуская NULL.", "Когда часть полей может быть пустой — например, телефон.", "SELECT concat(name, ', тел. ', phone) AS contact\nFROM customers\nLIMIT 3;"),
      fn("upper · lower", "Регистр", "`upper` — ВСЕ ЗАГЛАВНЫЕ, `lower` — все строчные.", "Привести почты к одному виду, сравнивать без учёта регистра.", "SELECT upper(name) AS loud, lower(email) AS email\nFROM customers\nLIMIT 3;"),
      fn("length", "Длина", "Количество символов в строке.", "Проверить, влезет ли название на ценник.", "SELECT name, length(name) AS chars\nFROM products\nORDER BY chars DESC\nLIMIT 3;"),
      fn("substring · left", "Часть строки", "`substring(s from 1 for 3)` — 3 символа с первого. `left(s, n)` — первые n символов, `right(s, n)` — последние.", "Инициалы, коды, сокращения.", "SELECT name, left(name, 1) AS initial, substring(email from position('@' in email) + 1) AS domain\nFROM customers\nWHERE email IS NOT NULL\nLIMIT 4;"),
      fn("position", "Где подстрока", "`position('@' in email)` — номер символа, с которого начинается подстрока, или 0.", "Разрезать строку по разделителю.", "SELECT email, position('@' in email) AS at\nFROM customers\nWHERE email IS NOT NULL\nLIMIT 3;"),
      fn("trim", "Убрать пробелы", "`trim(s)` убирает пробелы в начале и конце.", "Данные из форм часто приходят с лишними пробелами.", "SELECT '[' || trim('   Пенал   ') || ']' AS cleaned;"),
      fn("replace", "Заменить", "`replace(s, 'что', 'на что')` заменяет все вхождения.", "Поправить опечатки, убрать символы из телефона.", "SELECT phone, replace(replace(phone, ' ', ''), '-', '') AS digits\nFROM customers\nWHERE phone IS NOT NULL;"),
      rule("`||` теряет всё при NULL. Если поле может быть пустым — `concat`.")
    ],
    tasks: [task("Ценники", "Для каждого товара выведи строку вида `Пенал — 290.00 ₽` под именем `tag`: название, пробел, длинное тире, пробел, цена, пробел и ₽.", {
      checks: [rows("SELECT name || ' — ' || price || ' ₽' AS tag FROM products", "Строки ценников для всех товаров", { names: true })],
      hint: "`name || ' — ' || price || ' ₽' AS tag`",
      solution: "SELECT name || ' — ' || price || ' ₽' AS tag\nFROM products;"
    }), task("Почты в порядок", "Выведи `name` и почту покупателя заглавными буквами под именем `email_upper` — только для покупателей, у кого почта есть.", {
      checks: [rows("SELECT name, upper(email) AS email_upper FROM customers WHERE email IS NOT NULL", "Почты заглавными, без пустых", { names: true })],
      solution: "SELECT name, upper(email) AS email_upper\nFROM customers\nWHERE email IS NOT NULL;"
    })],
    quizzes: [
      single("sql-str-null", "Склейка с NULL", "Что вернёт `'Тел: ' || NULL`?", [["null", "NULL"], ["tel", "`'Тел: '`"], ["str", "`'Тел: NULL'`"], ["err", "Ошибку"]], "null", "Любая операция с NULL даёт NULL. Используй concat."),
      multi("sql-str-funcs", "Функции", "Какие функции меняют регистр?", [["upper", "`upper`"], ["lower", "`lower`"], ["trim", "`trim`"], ["length", "`length`"]], ["upper", "lower"], "trim убирает пробелы, length считает символы.")
    ]
  });

  L({
    slug: "case", title: "CASE: условия в запросе", summary: "Если… то… иначе — прямо в SELECT.",
    skill: ["sql-case", "CASE", "Вычислять значения по условиям с CASE WHEN."],
    now: "Нужны значения «по условию». Учимся ветвлению прямо внутри запроса.",
    body: [
      scene("Сегменты",
        ["you", "Дешевле 200 — «бюджетно», до 260 — «средне», дороже — «премиум». Это в Excel формула на полэкрана."],
        ["slon", "У меня — CASE. Условия проверяются сверху вниз, срабатывает первое истинное."]),
      kw("CASE", "Если — то — иначе", "`CASE WHEN условие THEN значение … ELSE значение END`. Первое истинное условие выигрывает. Без ELSE и без совпадений — NULL.", "Категории, подписи, флажки, перевод кодов в слова.", "SELECT name, price,\n  CASE\n    WHEN price < 200 THEN 'бюджетно'\n    WHEN price <= 260 THEN 'средне'\n    ELSE 'премиум'\n  END AS segment\nFROM products;"),
      idea("Простой CASE", "Сравнение с одним значением", "`CASE status WHEN 'new' THEN 'новый' WHEN 'done' THEN 'выполнен' END` — короткая форма, когда сравниваем один столбец.", "Перевести коды в человеческие слова.", "SELECT id,\n  CASE status WHEN 'new' THEN 'новый' WHEN 'done' THEN 'выполнен' ELSE 'отменён' END AS status_ru\nFROM orders\nLIMIT 5;"),
      rule("Пиши условия CASE от узкого к широкому и всегда добавляй ELSE — так NULL не появится внезапно.")
    ],
    tasks: [task("Ценовые сегменты", "Выведи `name`, `price` и столбец `segment`: дешевле 200 — 'бюджетно', от 200 до 260 включительно — 'средне', дороже — 'премиум'.", {
      checks: [rows("SELECT name, price, CASE WHEN price < 200 THEN 'бюджетно' WHEN price <= 260 THEN 'средне' ELSE 'премиум' END AS segment FROM products", "Сегмент у каждого товара", { names: true }), src("case", "Используется `CASE`")],
      solution: "SELECT name, price,\n  CASE\n    WHEN price < 200 THEN 'бюджетно'\n    WHEN price <= 260 THEN 'средне'\n    ELSE 'премиум'\n  END AS segment\nFROM products;"
    })],
    quizzes: [
      single("sql-case-first", "Порядок условий", "Цена 150. Что вернёт `CASE WHEN price < 300 THEN 'A' WHEN price < 200 THEN 'B' END`?", [["a", "'A'"], ["b", "'B'"], ["both", "'AB'"], ["null", "NULL"]], "a", "Срабатывает первое истинное условие."),
      single("sql-case-else", "Без ELSE", "Что вернёт CASE без ELSE, если ни одно условие не подошло?", [["null", "NULL"], ["zero", "0"], ["err", "Ошибку"], ["empty", "Пустую строку"]], "null", "Без ELSE — NULL.")
    ]
  });

  L({
    slug: "coalesce", title: "COALESCE и NULLIF", summary: "Подставляем значение вместо пустоты и прячем «ненастоящие» значения.",
    skill: ["sql-coalesce", "COALESCE и NULLIF", "Заменять NULL значением по умолчанию и превращать значения в NULL."],
    now: "Подставляем запасные значения вместо NULL и обратно.",
    body: [
      scene("Вместо пустоты",
        ["you", "Пустые клетки пугают менеджеров. Пусть будет написано «нет телефона»."],
        ["slon", "COALESCE: дай мне несколько вариантов, я верну первый непустой."]),
      fn("coalesce", "Первое непустое", "`coalesce(a, b, c)` возвращает первый аргумент, который не NULL.", "Значение по умолчанию: «нет телефона», 0 вместо пустой суммы, запасной контакт.", "SELECT name, coalesce(phone, email, 'нет контактов') AS contact\nFROM customers;"),
      fn("nullif", "Сделать NULL", "`nullif(a, b)` возвращает NULL, если a = b, иначе a.", "Защита от деления на ноль: `x / nullif(y, 0)` вместо ошибки даст NULL.", "SELECT 10 / nullif(0, 0) AS safe, nullif('', '') AS empty_to_null;"),
      rule("NULL в отчёте — подставь понятное слово через COALESCE. Делишь на столбец — оберни делитель в nullif(…, 0).")
    ],
    tasks: [task("Список обзвона", "Выведи `name` и `phone` всех покупателей, но вместо пустого телефона пиши 'нет телефона'. Столбец назови `phone`.", {
      checks: [rows("SELECT name, coalesce(phone, 'нет телефона') AS phone FROM customers", "У каждого покупателя телефон или «нет телефона»", { names: true }), src("coalesce", "Используется `coalesce`")],
      solution: "SELECT name, coalesce(phone, 'нет телефона') AS phone\nFROM customers;"
    })],
    quizzes: [
      single("sql-coalesce-what", "coalesce", "Что вернёт `coalesce(NULL, NULL, 5, 7)`?", [["5", "5"], ["7", "7"], ["null", "NULL"], ["12", "12"]], "5", "Первый не-NULL аргумент."),
      single("sql-nullif-what", "nullif", "Что вернёт `nullif(0, 0)`?", [["null", "NULL"], ["0", "0"], ["err", "Ошибку"], ["1", "1"]], "null", "Аргументы равны — NULL.")
    ]
  });

  L({
    slug: "dates", title: "Даты и время", summary: "Сегодня, интервалы, части даты и группировка по месяцам.",
    skill: ["sql-dates", "Даты и время", "Работать с датами: current_date, now, interval, extract, date_trunc, age, to_char."],
    now: "Работаем с датами и временем: части дат, интервалы, разница.",
    body: [
      scene("Который час?",
        ["you", "Мне нужны часы заказов: утро или вечер. А у нас `created_at` — дата и время вместе."],
        ["slon", "Выну час через extract. А могу округлить время до дня или месяца — date_trunc."]),
      fn("current_date · now", "Сегодня и сейчас", "`current_date` — сегодняшняя дата, `now()` — текущие дата и время.", "Заказы за сегодня, возраст записи, «сколько дней назад».", "SELECT current_date AS today, current_date - date '2025-09-01' AS days_since_opening;"),
      kw("interval", "Промежуток времени", "`interval '7 days'`, `interval '1 month'`. Прибавляется к датам и вычитается из них.", "«За последние 30 дней», «через неделю», сроки доставки.", "SELECT date '2025-10-31' + interval '1 month' AS next_month, timestamp '2025-09-01 08:15' + interval '90 minutes' AS later;"),
      fn("extract", "Часть даты", "`extract(hour from created_at)` — час. Бывают `year`, `month`, `day`, `dow` (день недели, 0 — воскресенье).", "Анализ по часам и дням недели.", "SELECT id, created_at, extract(hour from created_at) AS hour\nFROM orders\nLIMIT 5;"),
      fn("date_trunc", "Обрезать до периода", "`date_trunc('month', created_at)` — начало месяца для этой даты.", "Группировка по дням, неделям, месяцам в отчётах.", "SELECT DISTINCT date_trunc('month', created_at) AS month\nFROM orders\nORDER BY month;"),
      fn("age", "Сколько прошло", "`age(дата)` — промежуток от даты до сегодня в годах, месяцах и днях. `age(a, b)` — между двумя датами.", "Возраст покупателя, стаж сотрудника.", "SELECT name, age(date '2025-11-01', hired_on) AS tenure\nFROM staff;"),
      fn("to_char", "Дата как текст", "`to_char(дата, 'DD.MM.YYYY')` — превращает дату в строку нужного формата.", "Красивые даты в отчёте и письмах.", "SELECT to_char(created_at, 'DD.MM.YYYY HH24:MI') AS pretty\nFROM orders\nLIMIT 3;"),
      rule("Считай и сравнивай даты как даты. В текст превращай только для показа, через to_char.")
    ],
    tasks: [task("Утренние заказы", "Выведи `id` и `created_at` заказов, сделанных до 10 утра (час меньше 10).", {
      checks: [rows("SELECT id, created_at FROM orders WHERE extract(hour from created_at) < 10", "Заказы с 0:00 до 9:59"), src("extract", "Час вынут через `extract`")],
      hint: "`WHERE extract(hour from created_at) < 10`",
      solution: "SELECT id, created_at\nFROM orders\nWHERE extract(hour from created_at) < 10;"
    }), task("Месяцы работы", "Выведи без повторов начала месяцев, в которые были заказы, под именем `month`, по возрастанию.", {
      checks: [rows("SELECT DISTINCT date_trunc('month', created_at) AS month FROM orders ORDER BY month", "Каждый месяц один раз, по порядку", { ordered: true, names: true }), src("date_trunc", "Используется `date_trunc`")],
      solution: "SELECT DISTINCT date_trunc('month', created_at) AS month\nFROM orders\nORDER BY month;"
    })],
    quizzes: [
      single("sql-dates-trunc", "date_trunc", "Что вернёт `date_trunc('month', timestamp '2025-10-17 14:30')`?", [["first", "2025-10-01 00:00:00"], ["oct", "10"], ["end", "2025-10-31 00:00:00"], ["day", "17"]], "first", "Дата обрезается до начала месяца."),
      single("sql-dates-interval", "Неделя назад", "Как получить дату неделю назад?", [["minus", "`current_date - interval '7 days'`"], ["seven", "`current_date - '7'`"], ["week", "`week(current_date) - 1`"], ["ago", "`ago(7)`"]], "minus", "Интервалы вычитаются из дат.")
    ]
  });

  L({
    slug: "types-cast", title: "Типы данных и приведение", summary: "Числа, текст, даты, логика — и как превратить одно в другое.",
    skill: ["sql-cast", "Типы и приведение", "Понимать основные типы PostgreSQL и приводить значения через :: и CAST."],
    now: "У каждого значения есть тип. Учимся превращать один тип в другой.",
    body: [
      scene("Без копеек",
        ["you", "Рекламе нужно 290, а не 290.00."],
        ["slon", "У каждого значения есть тип. `price` — numeric с двумя знаками. Скажи `price::integer` — получишь целое."]),
      idea("Тип данных", "Что за значение", "Каждый столбец и каждое выражение имеет тип: `integer`, `numeric`, `text`, `boolean`, `date`, `timestamp`. Тип решает, что можно делать: даты вычитать, текст склеивать.", "Строгость типов защищает от «290 рублей» в столбце цены и от сравнения яблок с датами.", "SELECT pg_typeof(price) AS price_type, pg_typeof(name) AS name_type, pg_typeof(added_on) AS date_type\nFROM products\nLIMIT 1;"),
      op("::", "Приведение типа", "`значение::тип` превращает значение в другой тип: `'42'::integer`, `created_at::date`. Особенность PostgreSQL, очень удобная.", "Убрать время у даты, превратить текст в число, число в текст.", "SELECT price::integer AS whole, created::date AS day\nFROM (SELECT 289.6 AS price, timestamp '2025-09-01 08:15' AS created) AS t;"),
      kw("CAST", "Приведение по стандарту", "`CAST(значение AS тип)` — то же, что `::`, но работает во всех SQL-базах.", "Переносимый код и чужие запросы.", "SELECT CAST('2025-12-31' AS date) - CAST('2025-12-01' AS date) AS days;"),
      rule("Видишь «function does not exist» или «operator does not exist» — проверь типы. Часто спасает `::`.")
    ],
    tasks: [task("Цены без копеек", "Для каждого товара выведи `name` и цену целым числом под именем `price_int`.", {
      checks: [rows("SELECT name, price::integer AS price_int FROM products", "Цены целыми числами", { names: true })],
      hint: "`price::integer AS price_int`",
      solution: "SELECT name, price::integer AS price_int\nFROM products;"
    }), task("Дни заказов", "Выведи `id` и дату заказа без времени под именем `day` для всех заказов.", {
      checks: [rows("SELECT id, created_at::date AS day FROM orders", "Только дата, без времени", { names: true })],
      solution: "SELECT id, created_at::date AS day\nFROM orders;"
    })],
    quizzes: [
      single("sql-cast-op", "Приведение", "Какая запись приводит текст `'42'` к целому числу в PostgreSQL?", [["colon", "`'42'::integer`"], ["paren", "`integer('42')` — единственный способ"], ["as", "`'42' AS integer`"], ["to", "`'42' TO integer`"]], "colon", "`::` или стандартный `CAST('42' AS integer)`."),
      single("sql-cast-type", "Тип", "Какой тип подходит для денег с копейками?", [["numeric", "`numeric(7, 2)`"], ["text", "`text`"], ["float", "`real` — он точнее"], ["date", "`date`"]], "numeric", "numeric хранит точные десятичные числа. real и double округляют.")
    ]
  });
}
