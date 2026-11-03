export default function tables(c) {
  const { lesson, single, multi, short } = c;

  lesson({
    slug: "tables", title: "Таблицы", minutes: 11,
    summary: "table, tr, th, td и caption: данные в строках и столбцах.",
    skill: ["html-tables", "Таблицы", "Размечать табличные данные со строкой заголовков и подписью."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("tables-th", "Ячейка-заголовок", "Каким тегом размечают ячейку-заголовок столбца?",
        [["th", "<th>"], ["td", "<td>"], ["tr", "<tr>"], ["caption", "<caption>"]], "th",
        "th — ячейка-заголовок. td — обычная ячейка, tr — строка, caption — название таблицы."),
      single("tables-layout", "Когда нужна таблица", "В каком случае таблица — правильный выбор?",
        [["data", "Сравнение тарифов по цене и возможностям"], ["layout", "Колонка меню слева и контент справа"], ["center", "Чтобы отцентрировать картинку"], ["footer", "Подвал сайта в три колонки"]], "data",
        "Таблица — для табличных данных. Раскладку страницы делают CSS."),
      short("tables-caption", "Название таблицы", "Каким элементом задают название таблицы? Введите имя тега без скобок.",
        ["caption"], "Название таблицы — элемент caption, первым внутри table.")
    ]
  });

  lesson({
    slug: "complex-tables", title: "Сложные таблицы", minutes: 12,
    summary: "thead, tbody, tfoot, scope, colspan, rowspan, headers и colgroup: таблицы, понятные и людям, и читалкам.",
    skill: ["html-tables-advanced", "Сложные таблицы", "Группировать строки, объединять ячейки и явно связывать ячейки с заголовками строк и столбцов."],
    body: [], // текст урока — stories/*.mjs
    quizzes: [
      single("tables-scope", "Заголовок строки", "Как отметить, что ячейка <th> — заголовок строки, а не столбца?",
        [["row", "scope=\"row\""], ["col", "scope=\"col\""], ["rowspan", "rowspan=\"1\""], ["headers", "headers=\"row\""]], "row",
        "scope=\"row\" связывает заголовок со всей строкой, scope=\"col\" — со столбцом."),
      single("tables-colspan", "Широкая ячейка", "Как сделать ячейку шириной в три столбца?",
        [["colspan", "colspan=\"3\""], ["rowspan", "rowspan=\"3\""], ["width", "width=\"3\""], ["span", "span=\"3\" у td"]], "colspan",
        "colspan объединяет ячейки по горизонтали, rowspan — по вертикали."),
      multi("tables-groups", "Группы строк", "Какие элементы группируют строки таблицы?",
        [["thead", "<thead>"], ["tbody", "<tbody>"], ["tfoot", "<tfoot>"], ["colgroup", "<colgroup>"]], ["thead", "tbody", "tfoot"],
        "thead, tbody и tfoot группируют строки. colgroup группирует столбцы.")
    ]
  });
}
