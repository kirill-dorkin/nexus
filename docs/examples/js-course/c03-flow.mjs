// Chapter 3: Conditions and loops.
import { scene, rule, kw, op, idea, run, out, has, task, makeLesson } from "./kit.mjs";

export default function flow(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "if-else", title: "if и else: решения", summary: "Условия if, else if, else и блоки кода в фигурных скобках.",
    skill: ["js-if", "Условия", "Выполнять разный код в зависимости от условия."],
    now: "Учим код принимать решения: if, else if и else.",
    body: [
      scene("Онлайн или нет",
        ["you", "Чат поддержки работает до 22:00. Хочу, чтобы страница сама писала, отвечают ли сейчас."],
        ["nika", "Код умеет выбирать: «если час меньше 22 — онлайн, иначе — офлайн». Это `if`."]),
      kw("if", "Если", "`if (условие) { … }` — код в скобках выполнится, только если условие truthy.", "Любое решение в программе.", "const hour = 10;\nif (hour < 22) {\n  console.log(\"Поддержка онлайн\");\n}"),
      kw("else", "Иначе", "Код, который выполнится, если условие ложно.", "Второй вариант.", "const hour = 23;\nif (hour < 22) {\n  console.log(\"Поддержка онлайн\");\n} else {\n  console.log(\"Поддержка офлайн\");\n}"),
      kw("else if", "Иначе если", "Цепочка проверок по порядку: сработает первая подходящая.", "Утро, день, вечер.", "const hour = 15;\nif (hour < 12) {\n  console.log(\"Доброе утро\");\n} else if (hour < 18) {\n  console.log(\"Добрый день\");\n} else {\n  console.log(\"Добрый вечер\");\n}"),
      idea("Блок { }", "Группа команд", "Фигурные скобки объединяют несколько команд в одну группу.", "Ставь их всегда, даже для одной строки, — меньше ошибок.", undefined),
      rule("Сначала самые частые или самые строгие условия, потом общие. Последний `else` ловит всё остальное.")
    ],
    tasks: [task("Статус поддержки", "Через `if`/`else`: если `hour` меньше 22, сохрани в `status` строку `онлайн`, иначе — `офлайн`. Выведи `status`.", {
      start: "const hour = 23;\nlet status = \"\";\n",
      checks: [run('status === "офлайн"', "В 23 часа — офлайн"), has("if", "Использован `if`"), has("else", "Есть `else`"), out("офлайн", "Статус в консоли")],
      solution: "const hour = 23;\nlet status = \"\";\nif (hour < 22) {\n  status = \"онлайн\";\n} else {\n  status = \"офлайн\";\n}\nconsole.log(status);"
    })],
    quizzes: [
      single("js-if-else-if", "Цепочка", "Сколько веток выполнится в цепочке `if … else if … else`?", [["one", "Ровно одна — первая подходящая"], ["all", "Все подходящие"], ["two", "Две"], ["none", "Ни одной"]], "one", "Дальше проверки не идут."),
      single("js-if-truthy", "Условие", "Выполнится ли `if (\"\") { … }`?", [["no", "Нет, пустая строка — falsy"], ["yes", "Да"], ["error", "Будет ошибка"], ["maybe", "Зависит от браузера"]], "no", "Пустая строка считается ложью.")
    ]
  });

  L({
    slug: "ternary-switch", title: "Тернарный оператор и switch", summary: "Короткое условие ? :, выбор из многих вариантов switch / case / break / default.",
    skill: ["js-ternary-switch", "Короткие условия", "Записывать простые условия коротко и выбирать из многих вариантов."],
    now: "Пишем короткие условия тернарным оператором и выбираем из многих вариантов через switch.",
    body: [
      scene("Короче",
        ["bro", "Для простого «или то, или это» есть запись в одну строку. А для длинного списка вариантов — `switch`."]),
      op("? :", "Тернарный оператор", "`условие ? да : нет` — выражение, которое возвращает одно из двух.", "Подпись, класс, текст кнопки.", "const done = true;\nconsole.log(done ? \"Готово\" : \"В работе\");"),
      kw("switch", "Выбор из вариантов", "`switch (x) { case \"S\": … break; }` — сравнивает `x` с каждым `case` через `===`. В конце каждого `case` ставят `break`, иначе выполнение «проваливается» в следующий.", "Уровень сложности, способ оплаты.", "const level = \"medium\";\nswitch (level) {\n  case \"easy\": console.log(10); break;\n  case \"medium\": console.log(20); break;\n  default: console.log(30);\n}"),
      kw("default", "Иначе для switch", "Срабатывает, если ни один `case` не подошёл.", "Значение по умолчанию.", undefined),
      rule("Тернарный оператор — для коротких выражений. Если внутри уже условие в условии, пиши обычный `if`.")
    ],
    tasks: [task("Очки за уровень", "По `level` найди `points` через `switch`: `easy` → 10, `medium` → 20, иначе 30.", {
      start: 'const level = "medium";\nlet points = 0;\n',
      checks: [run("points === 20", "Для medium — 20 очков"), has("switch", "Использован `switch`"), has("break", "Есть `break`")],
      solution: 'const level = "medium";\nlet points = 0;\nswitch (level) {\n  case "easy":\n    points = 10;\n    break;\n  case "medium":\n    points = 20;\n    break;\n  default:\n    points = 30;\n}'
    }), task("Подпись к количеству", "Сделай `label` через тернарный оператор: `задача`, если `count === 1`, иначе `задачи`.", {
      start: "const count = 2;\nconst label = \"\";\n",
      checks: [run('label === "задачи"', "Для 2 — «задачи»"), has("?", "Использован `? :`")],
      solution: 'const count = 2;\nconst label = count === 1 ? "задача" : "задачи";'
    })],
    quizzes: [
      single("js-ternary", "Тернарный", "Что вернёт `5 > 3 ? \"да\" : \"нет\"`?", [["yes", "\"да\""], ["no", "\"нет\""], ["true", "`true`"], ["error", "Ошибку"]], "yes", "Условие верно."),
      single("js-switch-break", "break", "Что будет, если в `case` забыть `break`?", [["fall", "Выполнятся и следующие case"], ["error", "Ошибка"], ["stop", "Ничего не изменится"], ["loop", "Бесконечный цикл"]], "fall", "Это «проваливание».")
    ]
  });

  L({
    slug: "loops", title: "Циклы for и while", summary: "Цикл for, цикл while, бесконечные циклы и как их избежать.",
    skill: ["js-loops", "Циклы", "Повторять действия нужное число раз."],
    now: "Повторяем действия циклами for и while.",
    body: [
      scene("Десять раз",
        ["you", "Нужно вывести номера страниц с 1 по 10. Писать десять строк?"],
        ["nika", "Повторение — работа для цикла. Пишешь один раз, а выполняется сколько нужно."],
        ["bug", "А я сделаю так, чтобы цикл никогда не кончался!"],
        ["bro", "Не выйдет: в курсе я остановлю такой цикл через полторы секунды и покажу ошибку."]),
      kw("for", "Цикл со счётчиком", "`for (let i = 1; i <= 10; i++) { … }` — старт; условие продолжения; шаг.", "Повторить известное число раз.", "for (let i = 1; i <= 5; i++) {\n  console.log(\"Страница\", i);\n}"),
      kw("while", "Цикл с условием", "`while (условие) { … }` — повторяет, пока условие верно.", "Когда число повторов заранее неизвестно.", "let lives = 3;\nwhile (lives > 0) {\n  console.log(\"Жизней:\", lives);\n  lives--;\n}"),
      idea("Бесконечный цикл", "Цикл, который не кончается", "Если условие никогда не станет ложным, страница зависнет. Проверь, что внутри меняется то, что в условии.", "Самая частая ошибка с циклами.", undefined),
      rule("В каждом `while` спроси себя: что внутри приближает выход из цикла?")
    ],
    tasks: [task("От 1 до 10", "Циклом `for` выведи в консоль числа от 1 до 10 и посчитай их сумму в `sum`.", {
      start: "let sum = 0;\n",
      checks: [run("sum === 55", "Сумма 1…10 = 55"), has("for", "Использован `for`"), out("10", "Числа в консоли")],
      solution: "let sum = 0;\nfor (let i = 1; i <= 10; i++) {\n  console.log(i);\n  sum += i;\n}"
    })],
    quizzes: [
      single("js-for-parts", "Части for", "Что означает третья часть в `for (let i = 0; i < 5; i++)`?", [["step", "Шаг после каждого повтора"], ["start", "Начальное значение"], ["cond", "Условие продолжения"], ["end", "Последнее значение"]], "step", "`i++` выполняется после каждого прохода."),
      short("js-for-count", "Сколько раз", "Сколько раз выполнится тело `for (let i = 0; i < 4; i++)`? Введи число.", ["4"], "i = 0, 1, 2, 3.")
    ]
  });

  L({
    slug: "loop-control", title: "for…of, break и continue", summary: "Перебор for…of, досрочный выход break, пропуск шага continue, do…while.",
    skill: ["js-loop-control", "Управление циклами", "Перебирать коллекции и управлять ходом цикла."],
    now: "Перебираем списки for…of и управляем циклом через break и continue.",
    body: [
      scene("Список задач",
        ["you", "Нужно пройти по задачам: отменённые пропустить, а как найдётся срочная — сразу остановиться."],
        ["nika", "`for…of` перебирает список, `continue` пропускает шаг, `break` выходит из цикла."]),
      kw("for…of", "Перебор значений", "`for (const item of list) { … }` — по очереди каждый элемент.", "Пройти по списку без счётчика.", 'for (const lang of ["HTML", "CSS", "JS"]) {\n  console.log(lang);\n}'),
      kw("continue", "Пропустить шаг", "Сразу переходит к следующему повтору.", "Пропустить отменённые задачи.", "for (let i = 1; i <= 5; i++) {\n  if (i === 3) continue;\n  console.log(i);\n}"),
      kw("break", "Выйти из цикла", "Прерывает цикл целиком.", "Нашли нужное — дальше искать незачем.", "for (const n of [4, 8, 15, 16]) {\n  if (n > 10) {\n    console.log(\"Нашёл\", n);\n    break;\n  }\n}"),
      kw("do…while", "Хотя бы один раз", "Тело выполняется, а потом проверяется условие.", "Спросить хотя бы один раз.", "let n = 0;\ndo {\n  n++;\n} while (n < 3);\nconsole.log(n);"),
      rule("Нашёл, что искал, — `break`. Не трать время на остальное.")
    ],
    tasks: [task("Первая срочная", "Пройди `tasks` через `for…of`: пропусти `\"отмена\"` (`continue`), а на первой `\"срочно\"` сохрани её номер в `found` и выйди (`break`). Каждую просмотренную задачу добавляй в `seen`.", {
      start: 'const tasks = ["обычная", "отмена", "срочно", "обычная"];\nlet found = -1;\nconst seen = [];\n',
      checks: [run("found === 2", "Найдена срочная задача №2"), run('seen.length === 2 && !seen.includes("отмена")', "Отмена пропущена, после срочного — стоп"), has("break", "Использован `break`"), has("continue", "Использован `continue`")],
      solution: 'const tasks = ["обычная", "отмена", "срочно", "обычная"];\nlet found = -1;\nconst seen = [];\nlet i = -1;\nfor (const item of tasks) {\n  i++;\n  if (item === "отмена") continue;\n  seen.push(item);\n  if (item === "срочно") {\n    found = i;\n    break;\n  }\n}'
    })],
    quizzes: [
      single("js-continue", "continue", "Что делает `continue` в цикле?", [["skip", "Пропускает остаток текущего шага"], ["stop", "Останавливает цикл"], ["restart", "Начинает цикл заново"], ["pause", "Ставит на паузу"]], "skip", "Переход к следующему повтору."),
      single("js-forof", "for…of", "Что получает переменная в `for (const x of [\"a\", \"b\"])`?", [["values", "Значения \"a\", потом \"b\""], ["index", "Индексы 0 и 1"], ["array", "Весь массив"], ["keys", "Ключи объекта"]], "values", "for…of — по значениям.")
    ]
  });

  L({
    slug: "project-bill", title: "Проект: корзина со скидкой", summary: "Считаем сумму корзины циклом, применяем скидку условием и печатаем итог.",
    skill: ["js-project-bill", "Сумма корзины", "Собрать небольшую программу из переменных, условий и циклов."],
    now: "Проект главы: считаем корзину, даём скидку от 500 ₽ и выводим итог.",
    body: [scene("Корзина", ["you", "Хочу, чтобы корзина сама считала сумму, давала скидку и показывала итог."], ["nika", "Три шага: сумма циклом, скидка условием, итог шаблонной строкой."])],
    tasks: [
      task("Шаг 1. Сумма", "Пройди циклом по `prices` и сложи их в `total`.", {
        start: "const prices = [220, 290, 150];\nlet total = 0;\n",
        checks: [run("total === 660", "Сумма 660"), has("for", "Использован цикл")],
        solution: "const prices = [220, 290, 150];\nlet total = 0;\nfor (const price of prices) {\n  total += price;\n}"
      }),
      task("Шаг 2. Скидка", "Если `total` от 500 — `discount` равна 10% от суммы (округли `Math.round`), иначе 0. `pay = total - discount`.", {
        start: "const prices = [220, 290, 150];\nlet total = 0;\nfor (const price of prices) {\n  total += price;\n}\nlet discount = 0;\nlet pay = total;\n",
        checks: [run("discount === 66", "Скидка 66"), run("pay === 594", "К оплате 594")],
        solution: "const prices = [220, 290, 150];\nlet total = 0;\nfor (const price of prices) {\n  total += price;\n}\nlet discount = 0;\nif (total >= 500) {\n  discount = Math.round(total * 0.1);\n}\nlet pay = total - discount;"
      }),
      task("Шаг 3. Итог", "Выведи шаблонной строкой: `Итого: 660 ₽, скидка 66 ₽, к оплате 594 ₽`.", {
        start: "const total = 660;\nconst discount = 66;\nconst pay = 594;\n",
        checks: [out("Итого: 660 ₽, скидка 66 ₽, к оплате 594 ₽", "Итог в консоли"), has("${", "Шаблонная строка")],
        solution: "const total = 660;\nconst discount = 66;\nconst pay = 594;\nconsole.log(`Итого: ${total} ₽, скидка ${discount} ₽, к оплате ${pay} ₽`);"
      })
    ],
    quizzes: [single("js-proj-bill", "Скидка", "Как записать «скидка 10%, если сумма от 500»?", [["if", "`if (total >= 500) discount = total * 0.1;`"], ["while", "`while (total >= 500) discount++;`"], ["eq", "`if (total = 500) …`"], ["for", "`for (total >= 500) …`"]], "if", "Одно решение — одно условие.")]
  });
}
