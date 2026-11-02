// Chapter 3: sorting and paging.
import { scene, clause, kw, idea, rule, rows, src, task, makeLesson } from "./kit.mjs";

export default function order(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, short } = c;

  L({
    slug: "order-by", title: "ORDER BY", summary: "Сортировка: по возрастанию, по убыванию, по нескольким столбцам и с пустотами.",
    skill: ["sql-order", "ORDER BY", "Сортировать результат по одному и нескольким столбцам."],
    now: "Меню на доске должно идти от дорогого к дешёвому. Слон пока выдаёт строки как попало.",
    body: [
      scene("В каком порядке?",
        ["marta", "Почему меню каждый раз в разном порядке?"],
        ["slon", "Без ORDER BY я не обещаю никакого порядка. Отдаю, как мне удобнее. Нужен порядок — попроси."]),
      clause("ORDER BY", "Сортировка", "Последняя часть запроса: по каким столбцам упорядочить строки. Можно по нескольким: при равенстве первого смотрим второй.", "Меню по цене, гости по алфавиту, заказы от новых к старым.", "SELECT name, price\nFROM products\nORDER BY price DESC, name;"),
      kw("ASC · DESC", "Направление", "`ASC` — по возрастанию (по умолчанию), `DESC` — по убыванию. Пишется после каждого столбца отдельно.", "Самые дорогие сверху, самые свежие заказы первыми.", "SELECT id, created_at\nFROM orders\nORDER BY created_at DESC\nLIMIT 5;"),
      kw("NULLS FIRST · NULLS LAST", "Где пустоты", "В PostgreSQL NULL при сортировке считается больше любого значения: при `ASC` пустоты внизу, при `DESC` — наверху. `NULLS LAST` и `NULLS FIRST` переставляют их.", "Гости без дня рождения не должны вылезать в начало списка.", "SELECT name, birthday\nFROM customers\nORDER BY birthday DESC NULLS LAST;"),
      rule("Нужен порядок — пиши ORDER BY, всегда. «Само так выводится» — не порядок.")
    ],
    tasks: [task("Меню на доску", "Выведи `name` и `price` всех товаров: сначала дорогие, при одинаковой цене — по названию в алфавитном порядке.", {
      checks: [rows("SELECT name, price FROM products ORDER BY price DESC, name", "Порядок: цена по убыванию, затем название", { ordered: true }), src("order by", "Есть `ORDER BY`")],
      hint: "`ORDER BY price DESC, name`",
      solution: "SELECT name, price\nFROM products\nORDER BY price DESC, name;"
    })],
    quizzes: [
      single("sql-order-default", "По умолчанию", "Как сортирует `ORDER BY price` без слова направления?", [["asc", "По возрастанию"], ["desc", "По убыванию"], ["none", "Никак"], ["random", "Случайно"]], "asc", "ASC — направление по умолчанию."),
      single("sql-order-no", "Без сортировки", "В каком порядке вернутся строки без ORDER BY?", [["any", "Порядок не гарантирован"], ["id", "Всегда по id"], ["insert", "Всегда в порядке добавления"], ["alpha", "По алфавиту"]], "any", "Порядок без ORDER BY может меняться от запуска к запуску.")
    ]
  });

  L({
    slug: "limit-offset", title: "LIMIT и OFFSET", summary: "Топ-3 и постраничный вывод.",
    skill: ["sql-limit", "LIMIT и OFFSET", "Ограничивать число строк и пропускать первые строки."],
    now: "Даша делает баннер «Топ-3 самых дорогих напитка», а для сайта нужно меню по страницам.",
    body: [
      scene("Только три",
        ["dasha", "Мне нужны три самых дорогих. Не шестнадцать."],
        ["slon", "Отсортируй по цене по убыванию и скажи LIMIT 3. Без сортировки «первые три» — какие попало."]),
      clause("LIMIT", "Не больше N строк", "Ограничивает число строк результата. Ставится в самом конце.", "Топы, превью, защита от огромных ответов.", "SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3;"),
      clause("OFFSET", "Пропустить строки", "`OFFSET 5` пропускает первые 5 строк. Вместе с LIMIT даёт страницы: страница 2 по 5 строк — `LIMIT 5 OFFSET 5`.", "Постраничный вывод каталога или списка заказов.", "SELECT name, price\nFROM products\nORDER BY name\nLIMIT 5 OFFSET 5;"),
      clause("FETCH FIRST", "Стандартная запись", "`FETCH FIRST 3 ROWS ONLY` — то же, что `LIMIT 3`, но по стандарту SQL. Работает и в других базах.", "Встретишь в чужом коде — не пугайся, это тот же LIMIT.", "SELECT name\nFROM products\nORDER BY price\nFETCH FIRST 2 ROWS ONLY;"),
      rule("LIMIT без ORDER BY — лотерея. Сначала сортировка, потом ограничение.")
    ],
    tasks: [task("Топ-3", "Выведи `name` и `price` трёх самых дорогих товаров, от самого дорогого.", {
      checks: [rows("SELECT name, price FROM products ORDER BY price DESC LIMIT 3", "Три самых дорогих, по убыванию цены", { ordered: true }), src("limit", "Есть `LIMIT`")],
      solution: "SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3;"
    }), task("Вторая страница", "Гости по 4 на страницу, по алфавиту имён (`name`). Выведи `name` и `city` гостей второй страницы.", {
      checks: [rows("SELECT name, city FROM customers ORDER BY name LIMIT 4 OFFSET 4", "Гости с 5-го по 8-й по алфавиту", { ordered: true }), src("offset", "Есть `OFFSET`")],
      hint: "Вторая страница: пропустить первые 4 — `LIMIT 4 OFFSET 4`.",
      solution: "SELECT name, city\nFROM customers\nORDER BY name\nLIMIT 4 OFFSET 4;"
    })],
    quizzes: [
      single("sql-limit-page", "Третья страница", "Страницы по 10 строк. Как получить третью?", [["20", "`LIMIT 10 OFFSET 20`"], ["30", "`LIMIT 10 OFFSET 30`"], ["3", "`LIMIT 10 OFFSET 3`"], ["l30", "`LIMIT 30`"]], "20", "Пропускаем две страницы по 10 — 20 строк."),
      short("sql-limit-word", "Ограничение", "Какое слово ограничивает количество строк в PostgreSQL?", ["LIMIT"], "`LIMIT n` в конце запроса.")
    ]
  });
}
