// Chapter 2: filtering rows with WHERE.
import { scene, clause, op, idea, rule, rows, src, task, makeLesson } from "./kit.mjs";

export default function where(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "where", title: "WHERE и сравнение", summary: "Отбираем только нужные строки: дешевле, дороже, равно, не равно.",
    skill: ["sql-where", "WHERE", "Фильтровать строки условием со сравнением."],
    now: "Пока мы получаем все строки таблицы. Учимся оставлять только нужные.",
    body: [
      scene("Подборка для студентов",
        ["you", "Мне не весь каталог, а только то, что дешевле 200."],
        ["slon", "Добавь WHERE и условие. Я проверю его для каждой строки и оставлю те, где оно истинно."]),
      clause("WHERE", "Фильтр строк", "Условие после `FROM`. В результат попадают только строки, для которых оно истинно.", "Из тысяч заказов — только сегодняшние, из всех покупателей — только из Казани.", "SELECT name, price\nFROM products\nWHERE price < 200;"),
      op("= <> < > <= >=", "Сравнение", "`=` равно, `<>` (или `!=`) не равно, а также больше, меньше и «или равно». Работает с числами, строками и датами.", "Почти любое условие начинается со сравнения.", "SELECT name, role, salary\nFROM staff\nWHERE role <> 'продавец';"),
      idea("Сравнение дат и строк", "Не только числа", "Даты сравниваются по времени: `added_on >= '2025-01-01'` — добавлено с 2025 года. Строки — по алфавиту.", "Новинки сезона, заказы за период, покупатели на букву «А» и дальше.", "SELECT name, added_on\nFROM products\nWHERE added_on >= '2025-01-01';"),
      rule("WHERE идёт после FROM. Текст и даты — в одинарных кавычках, числа — без кавычек.")
    ],
    tasks: [task("Товары до 200 ₽", "Выведи `name` и `price` товаров дешевле 200 рублей.", {
      checks: [rows("SELECT name, price FROM products WHERE price < 200", "Только товары дешевле 200"), src("where", "Есть условие `WHERE`")],
      hint: "`WHERE price < 200`",
      solution: "SELECT name, price\nFROM products\nWHERE price < 200;"
    })],
    quizzes: [
      single("sql-where-ne", "Не равно", "Как в SQL записать «не равно»?", [["ltgt", "`<>` или `!=`"], ["neq", "`=/=`"], ["not", "`not=`"], ["tilde", "`~=`"]], "ltgt", "Стандарт — `<>`, PostgreSQL понимает и `!=`."),
      single("sql-where-order", "Порядок", "Где в запросе стоит WHERE?", [["after", "После FROM"], ["before", "Перед SELECT"], ["between", "Между SELECT и FROM"], ["end", "Где угодно"]], "after", "SELECT … FROM … WHERE …")
    ]
  });

  L({
    slug: "and-or-not", title: "AND, OR, NOT", summary: "Несколько условий сразу и скобки, без которых легко ошибиться.",
    skill: ["sql-logic", "Логические операторы", "Объединять условия через AND, OR, NOT и расставлять скобки."],
    now: "Одного условия часто мало. Соединяем условия в одно.",
    body: [
      scene("Три условия",
        ["you", "Канцтовары. Дешевле 250. И чтобы были в наличии — ежедневники у нас кончились."],
        ["slon", "Три условия, и все обязательны — соедини их через AND."],
        ["nika", "А когда смешиваешь AND и OR, ставь скобки. AND сильнее OR, как умножение сильнее сложения."]),
      op("AND", "И", "Строка проходит, только если истинны оба условия.", "Сузить выборку: канцтовары И дешёвые И в наличии.", "SELECT name, price\nFROM products\nWHERE category_id = 1 AND price < 250;"),
      op("OR", "ИЛИ", "Строка проходит, если истинно хотя бы одно условие.", "Расширить выборку: бумага ИЛИ подарки.", "SELECT name, category_id\nFROM products\nWHERE category_id = 2 OR category_id = 3;"),
      op("NOT", "НЕ", "Переворачивает условие: `NOT is_available` — то, чего нет в наличии.", "Исключить лишнее, не переписывая условие.", "SELECT name\nFROM products\nWHERE NOT is_available;"),
      idea("Скобки в условиях", "AND раньше OR", "`a OR b AND c` читается как `a OR (b AND c)`. Скобки задают порядок явно.", "Без скобок запрос «канцтовары или бумага дешевле 200» вернёт всю бумагу, даже дорогую.", "SELECT name, price\nFROM products\nWHERE (category_id = 1 OR category_id = 2) AND price < 200;"),
      rule("Смешал AND и OR — поставь скобки. Даже если и без них верно, читателю будет проще.")
    ],
    tasks: [task("Витрина канцтоваров", "Выведи `name` и `price` канцтоваров (`category_id = 1`) дешевле 250, которые есть в наличии (`is_available`).", {
      checks: [rows("SELECT name, price FROM products WHERE category_id = 1 AND price < 250 AND is_available", "Канцтовары дешевле 250 и в наличии"), src("and", "Условия соединены через `AND`")],
      hint: "Три условия через AND: категория, цена, `is_available`.",
      solution: "SELECT name, price\nFROM products\nWHERE category_id = 1\n  AND price < 250\n  AND is_available;"
    })],
    quizzes: [
      single("sql-logic-prec", "Приоритет", "Как PostgreSQL читает `a OR b AND c`?", [["and", "`a OR (b AND c)`"], ["or", "`(a OR b) AND c`"], ["left", "Слева направо"], ["err", "Это ошибка"]], "and", "AND выполняется раньше OR."),
      single("sql-logic-or", "ИЛИ", "Строка проходит фильтр `WHERE x OR y`, когда…", [["any", "истинно хотя бы одно условие"], ["both", "истинны оба"], ["none", "ни одно не истинно"], ["one", "истинно ровно одно"]], "any", "OR — хотя бы одно.")
    ]
  });

  L({
    slug: "in-between", title: "IN и BETWEEN", summary: "Список значений и диапазон — короче, чем цепочка OR и пара сравнений.",
    skill: ["sql-in-between", "IN и BETWEEN", "Проверять значение по списку и по диапазону."],
    now: "Длинные цепочки OR неудобны. Знакомимся с короткими записями для списков и диапазонов.",
    body: [
      scene("Короче, пожалуйста",
        ["you", "Я написала `city = 'Москва' OR city = 'Казань' OR …` — а городов будет пять."],
        ["slon", "Дай мне список: `city IN ('Москва', 'Казань')`. Сколько угодно значений."]),
      op("IN", "Одно из списка", "`значение IN (a, b, c)` истинно, если значение равно любому элементу списка. `NOT IN` — ни одному.", "Короче и понятнее длинной цепочки OR.", "SELECT name, city\nFROM customers\nWHERE city IN ('Казань', 'Санкт-Петербург');"),
      op("BETWEEN", "Диапазон", "`x BETWEEN a AND b` — то же, что `x >= a AND x <= b`. Границы входят.", "Цены от и до, заказы за период.", "SELECT name, price\nFROM products\nWHERE price BETWEEN 200 AND 260;"),
      idea("BETWEEN и время", "Ловушка последнего дня", "`created_at BETWEEN '2025-10-01' AND '2025-10-31'` не возьмёт заказы 31 октября после полуночи: это `2025-10-31 00:00`.", "Для времени надёжнее полуоткрытый интервал: `>= '2025-10-01' AND < '2025-11-01'`.", "SELECT id, created_at\nFROM orders\nWHERE created_at >= '2025-10-01' AND created_at < '2025-11-01';"),
      rule("Список значений — IN. Числа и даты — BETWEEN. Для времени с часами — `>=` и `<` следующего дня.")
    ],
    tasks: [task("Рассылка по городам", "Выведи `name` и `email` покупателей из Москвы и Казани с помощью `IN`.", {
      checks: [rows("SELECT name, email FROM customers WHERE city IN ('Москва', 'Казань')", "Покупатели из Москвы и Казани"), src(" in ", "Используется `IN`")],
      solution: "SELECT name, email\nFROM customers\nWHERE city IN ('Москва', 'Казань');"
    }), task("Средний ценник", "Выведи `name` и `price` товаров с ценой от 200 до 260 включительно через `BETWEEN`.", {
      checks: [rows("SELECT name, price FROM products WHERE price BETWEEN 200 AND 260", "Цены от 200 до 260"), src("between", "Используется `BETWEEN`")],
      solution: "SELECT name, price\nFROM products\nWHERE price BETWEEN 200 AND 260;"
    })],
    quizzes: [
      single("sql-between-edges", "Границы", "Попадёт ли товар за 260 ₽ в `price BETWEEN 200 AND 260`?", [["yes", "Да, границы включены"], ["no", "Нет, граница не включена"], ["half", "Только если цена целая"], ["err", "Будет ошибка"]], "yes", "BETWEEN включает обе границы."),
      short("sql-in-word", "Список", "Какой оператор проверяет, что значение есть в списке `('a', 'b')`?", ["IN"], "`x IN ('a', 'b')`")
    ]
  });

  L({
    slug: "like", title: "LIKE и ILIKE", summary: "Поиск по части текста: все блокнот, все почты на gmail.",
    skill: ["sql-like", "Поиск по шаблону", "Искать строки по шаблону с LIKE и ILIKE."],
    now: "Учимся искать по части текста: по началу, концу или слову внутри.",
    body: [
      scene("Где-то внутри слова",
        ["you", "Покажи всё, где есть «блокнот». Там и «Блокнот», и «Скетчбук»."],
        ["slon", "Для шаблонов — LIKE. Процент значит «что угодно». Но LIKE различает регистр: «Блокнот» и «блокнот» для него разные."],
        ["you", "А если регистр не важен?"],
        ["slon", "ILIKE — то же, но без учёта регистра. Это особенность PostgreSQL."]),
      op("LIKE", "Шаблон строки", "`текст LIKE 'шаблон'`. В шаблоне `%` — любое количество любых символов, `_` — ровно один символ.", "Поиск по началу, концу или середине строки.", "SELECT name, email\nFROM customers\nWHERE email LIKE '%@gmail.com';"),
      op("ILIKE", "Без учёта регистра", "Как LIKE, но `'блокнот'` найдёт и «Блокнот». Есть только в PostgreSQL.", "Поиск, как его ждут люди: без «Caps Lock-проблем».", "SELECT name\nFROM products\nWHERE name ILIKE '%блокнот%';"),
      idea("% и _", "Подстановочные символы", "`'Р%'` — начинается на Р. `'%ка'` — заканчивается на «ка». `'_ук'` — три символа, оканчивается на «ук».", "Точно описать, где в строке должен быть кусок.", "SELECT name\nFROM products\nWHERE name LIKE '%ка';"),
      rule("Ищешь кусок текста — `%` с обеих сторон. Регистр не важен — ILIKE.")
    ],
    tasks: [task("Все блокнот", "Выведи `name` и `price` товаров, в названии которых есть «блокнот» в любом регистре.", {
      checks: [rows("SELECT name, price FROM products WHERE name ILIKE '%блокнот%'", "Найдены «Блокнот» и «Скетчбук»"), src("ilike", "Поиск без учёта регистра — `ILIKE`")],
      hint: "`WHERE name ILIKE '%блокнот%'`",
      solution: "SELECT name, price\nFROM products\nWHERE name ILIKE '%блокнот%';"
    })],
    quizzes: [
      single("sql-like-pct", "Процент", "Что значит `%` в шаблоне LIKE?", [["any", "Любое количество любых символов, даже ноль"], ["one", "Ровно один символ"], ["digit", "Любая цифра"], ["percent", "Знак процента в тексте"]], "any", "Один любой символ — это `_`."),
      single("sql-like-case", "Регистр", "Найдёт ли `name LIKE '%блокнот%'` строку «Блокнот»?", [["no", "Нет, LIKE различает регистр"], ["yes", "Да, LIKE не различает регистр"], ["pg", "Да, но только в PostgreSQL"], ["err", "Будет ошибка"]], "no", "«Л» и «л» — разные символы. Без учёта регистра ищет ILIKE.")
    ]
  });

  L({
    slug: "null", title: "NULL: пустые значения", summary: "Почему `= NULL` не работает и как правильно искать пустоты.",
    skill: ["sql-null", "NULL", "Понимать NULL и проверять его через IS NULL и IS NOT NULL."],
    now: "У некоторых строк значения просто нет. Разбираемся, как SQL работает с пустотой.",
    body: [
      scene("Пустота, которая не равна ничему",
        ["you", "Пишу `WHERE phone = NULL` — ноль строк. Хотя пустых телефонов полно!"],
        ["slon", "NULL — это «неизвестно». Неизвестно ли, равно ли неизвестное неизвестному? Неизвестно. Поэтому строка не проходит."],
        ["nika", "Для NULL есть свой оператор: IS NULL."]),
      idea("NULL", "Неизвестное значение", "Отметка «значения нет». Это не ноль и не пустая строка. Любое сравнение с NULL даёт не «истину», а NULL, и строка в WHERE не проходит.", "Честно хранить «не знаем»: день рождения не указан, телефона нет. Но и проверять это нужно особым образом.", "SELECT NULL = NULL AS equal, NULL + 1 AS plus, 1 = 1 AS true_value;"),
      op("IS NULL", "Проверка на пустоту", "`столбец IS NULL` истинно, если значения нет. `IS NOT NULL` — если есть.", "Найти незаполненные данные или, наоборот, только заполненные.", "SELECT name, phone\nFROM customers\nWHERE phone IS NOT NULL;"),
      op("IS DISTINCT FROM", "Сравнение с учётом NULL", "Как `<>`, но NULL считается обычным значением: `NULL IS DISTINCT FROM 1` — истина.", "Сравнивать столбцы, где бывают пустоты, без сюрпризов.", "SELECT name, email\nFROM customers\nWHERE email IS DISTINCT FROM 'anna@mail.ru';"),
      rule("Никогда не пиши `= NULL`. Только `IS NULL` и `IS NOT NULL`.")
    ],
    tasks: [task("Покупатели без телефона", "Выведи `name` и `email` покупателей, у которых не указан телефон (`phone`).", {
      start: "SELECT name, email\nFROM customers\nWHERE phone = NULL;",
      checks: [rows("SELECT name, email FROM customers WHERE phone IS NULL", "Только покупатели без телефона"), src("is null", "Проверка через `IS NULL`")],
      hint: "Замени `= NULL` на `IS NULL`.",
      solution: "SELECT name, email\nFROM customers\nWHERE phone IS NULL;"
    })],
    quizzes: [
      single("sql-null-eq", "Равно NULL", "Сколько строк вернёт `WHERE phone = NULL`?", [["zero", "Ноль: сравнение с NULL никогда не истинно"], ["all", "Все строки без телефона"], ["err", "Ошибку синтаксиса"], ["all2", "Все строки таблицы"]], "zero", "Сравнение с NULL даёт NULL, а WHERE пропускает только истину."),
      multi("sql-null-what", "Что такое NULL", "Что верно про NULL?", [["unknown", "Это «значение неизвестно»"], ["zero", "Это то же, что 0"], ["empty", "Это то же, что пустая строка `''`"], ["is", "Проверяется через `IS NULL`"]], ["unknown", "is"], "NULL — отдельное «неизвестно», не 0 и не пустая строка.")
    ]
  });
}
