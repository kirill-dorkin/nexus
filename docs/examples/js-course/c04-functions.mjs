// Chapter 4: Functions.
import { scene, rule, kw, op, idea, run, has, lacks, task, makeLesson } from "./kit.mjs";

export default function functions(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "functions", title: "Функции: свой инструмент", summary: "Объявление function, вызов, параметры, return и почему функция без return возвращает undefined.",
    skill: ["js-functions", "Функции", "Объявлять функции с параметрами и возвращать результат."],
    now: "Упаковываем повторяющийся код в функции с параметрами и return.",
    body: [
      scene("Один раз — много раз",
        ["you", "Цену со скидкой я считаю в пяти местах одинаково. Каждый раз копирую код."],
        ["nika", "Функция — это инструмент. Описал один раз, вызываешь сколько угодно с разными входными данными."]),
      kw("function", "Объявление функции", "`function name(параметры) { … }` — описывает действие, но не выполняет его.", "Повторяющийся код — в одно место.", 'function greet() {\n  console.log("Добро пожаловать!");\n}\ngreet();\ngreet();'),
      idea("Вызов", "Запустить функцию", "Имя и круглые скобки: `greet()`. Без скобок функция не выполнится.", "Использовать функцию.", undefined),
      idea("Параметры", "Входные данные", "Имена в скобках при объявлении: `function total(price, qty)`. При вызове передаёшь аргументы: `total(220, 2)`.", "Одна функция — разные данные.", "function line(item, qty) {\n  console.log(`${item} × ${qty}`);\n}\nline(\"Книга\", 2);\nline(\"Ручка\", 1);"),
      kw("return", "Вернуть результат", "Возвращает значение из функции и сразу её завершает. Без `return` функция возвращает `undefined`.", "Чтобы результат можно было сохранить и использовать.", "function total(price, qty) {\n  return price * qty;\n}\nconst sum = total(220, 2);\nconsole.log(sum);"),
      rule("Функция должна делать одно дело и называться глаголом: `calcTotal`, `showList`.")
    ],
    tasks: [task("Функция цены", "Напиши функцию `total(price, qty)`, которая возвращает `price * qty`.", {
      start: "// function total(price, qty) { … }\n",
      checks: [run('typeof total === "function"', "Функция `total` есть"), run("total(220, 2) === 440", "`total(220, 2)` → 440"), run("total(150, 3) === 450", "`total(150, 3)` → 450")],
      solution: "function total(price, qty) {\n  return price * qty;\n}"
    }), task("Цена со скидкой", "Напиши `withDiscount(price, percent)`, которая возвращает цену со скидкой, округлённую `Math.round`.", {
      start: "function withDiscount(price, percent) {\n  console.log(price - price * percent / 100);\n}\n",
      checks: [run("withDiscount(220, 10) === 198", "`withDiscount(220, 10)` → 198"), run("withDiscount(299, 15) === 254", "Округление до целого")],
      solution: "function withDiscount(price, percent) {\n  return Math.round(price - price * percent / 100);\n}"
    })],
    quizzes: [
      single("js-fn-noreturn", "Без return", "Что вернёт функция, в которой нет `return`?", [["undef", "`undefined`"], ["null", "`null`"], ["zero", "`0`"], ["last", "Последнее вычисленное значение"]], "undef", "Нужен явный `return`."),
      single("js-fn-call", "Вызов", "Как вызвать функцию `showList`?", [["call", "`showList()`"], ["name", "`showList`"], ["fn", "`function showList`"], ["run", "`run showList`"]], "call", "Скобки запускают функцию.")
    ]
  });

  L({
    slug: "parameters", title: "Параметры по умолчанию и rest", summary: "Значения параметров по умолчанию, ...rest-параметры и arguments.",
    skill: ["js-parameters", "Параметры", "Делать параметры необязательными и принимать сколько угодно аргументов."],
    now: "Делаем параметры необязательными и принимаем сколько угодно аргументов.",
    body: [
      scene("По умолчанию",
        ["you", "Почти всегда товар берут в одном экземпляре. Неудобно каждый раз писать «1»."],
        ["bro", "Параметру можно дать значение по умолчанию. А если аргументов много — собрать их все в массив."]),
      idea("Параметр по умолчанию", "Значение, если не передали", "`function order(item, qty = 1)` — если `qty` не передан, он равен 1.", "Необязательные настройки функции.", "function order(item, qty = 1) {\n  console.log(item, qty);\n}\norder(\"Книга\");\norder(\"Ручка\", 3);"),
      op("...rest", "Остальные аргументы", "`function sum(...prices)` собирает все аргументы в массив.", "Функция для любого числа позиций.", "function sum(...prices) {\n  let total = 0;\n  for (const p of prices) total += p;\n  return total;\n}\nconsole.log(sum(220, 150, 260));"),
      rule("Обязательные параметры — первыми, необязательные — в конце.")
    ],
    tasks: [task("Сумма любой покупки", "Напиши `sum(...prices)`, которая возвращает сумму всех переданных цен, и `order(item, qty = 1)`, которая возвращает строку `` `${item} × ${qty}` ``.", {
      start: "function sum(prices) {\n  return 0;\n}\nfunction order(item, qty) {\n  return `${item} × ${qty}`;\n}\n",
      checks: [run("sum(220, 150, 260) === 630", "`sum(220, 150, 260)` → 630"), run("sum() === 0", "Пусто — 0"), run('order("Книга") === "Книга × 1"', "Количество по умолчанию 1")],
      solution: "function sum(...prices) {\n  let total = 0;\n  for (const p of prices) total += p;\n  return total;\n}\nfunction order(item, qty = 1) {\n  return `${item} × ${qty}`;\n}"
    })],
    quizzes: [
      single("js-default", "По умолчанию", "Что вернёт `f()` при `function f(x = 5) { return x; }`?", [["5", "5"], ["undef", "undefined"], ["null", "null"], ["error", "Ошибку"]], "5", "Аргумент не передан — берётся значение по умолчанию."),
      single("js-rest", "rest", "Что окажется в `nums` при вызове `f(1, 2, 3)` для `function f(...nums)`?", [["arr", "Массив [1, 2, 3]"], ["one", "1"], ["three", "3"], ["str", "Строка \"1,2,3\""]], "arr", "rest собирает аргументы в массив.")
    ]
  });

  L({
    slug: "arrow-functions", title: "Стрелочные функции", summary: "Запись () => {}, короткий return, функциональные выражения и функции как значения.",
    skill: ["js-arrow", "Стрелочные функции", "Писать короткие функции и сохранять функции в переменные."],
    now: "В коде много маленьких функций в одну строку. Есть запись короче.",
    body: [
      scene("Короче",
        ["bro", "Функция — это тоже значение. Её можно положить в переменную. А для маленьких функций есть стрелка `=>`."]),
      op("=>", "Стрелочная функция", "`const double = (x) => x * 2;` — если после стрелки выражение, оно возвращается само, без `return`.", "Короткие функции, особенно для методов массивов.", "const double = (x) => x * 2;\nconsole.log(double(110));"),
      idea("Тело в фигурных скобках", "Длинная стрелочная функция", "`(a, b) => { … return …; }` — с фигурными скобками `return` нужен явно.", "Когда в функции несколько строк.", "const total = (price, qty) => {\n  const sum = price * qty;\n  return sum;\n};\nconsole.log(total(220, 3));"),
      idea("Функция как значение", "Функции можно передавать", "Функцию можно сохранить в переменную, положить в массив и передать в другую функцию.", "Основа обработчиков событий и методов массивов.", "const greet = function (name) {\n  return `Привет, ${name}!`;\n};\nconsole.log(greet(\"Аня\"));"),
      rule("Стрелка с фигурными скобками без `return` вернёт `undefined` — частая ловушка.")
    ],
    tasks: [task("Стрелкой", "Перепиши `vat` и `label` стрелочными функциями: `vat(price)` возвращает `Math.round(price * 0.2)`, `label(item, price)` — строку `` `${item}: ${price} ₽` ``.", {
      start: "function vat(price) {\n  return Math.round(price * 0.2);\n}\nfunction label(item, price) {\n  return item + \": \" + price;\n}\n",
      checks: [run("vat(220) === 44", "`vat(220)` → 44"), run('label("Ручка", 290) === "Ручка: 290 ₽"', "Подпись с ₽"), has("=>", "Использованы стрелочные функции"), lacks("function", "Без слова function")],
      solution: "const vat = (price) => Math.round(price * 0.2);\nconst label = (item, price) => `${item}: ${price} ₽`;"
    })],
    quizzes: [
      single("js-arrow-return", "Ловушка", "Что вернёт `(() => { 5 })()`?", [["undef", "`undefined`"], ["5", "5"], ["error", "Ошибку"], ["fn", "Функцию"]], "undef", "В фигурных скобках нужен `return`."),
      single("js-arrow-short", "Короткая", "Что вернёт `((x) => x + 1)(4)`?", [["5", "5"], ["4", "4"], ["undef", "undefined"], ["41", "41"]], "5", "Выражение после стрелки возвращается само.")
    ]
  });

  L({
    slug: "scope-closures", title: "Область видимости и замыкания", summary: "Глобальные и локальные переменные, блочная область, замыкание и счётчик на замыкании.",
    skill: ["js-scope", "Область видимости", "Понимать, где видна переменная, и использовать замыкания."],
    now: "Разбираемся, где видны переменные, и прячем данные в замыкание.",
    body: [
      scene("Чужой счётчик",
        ["bug", "Ваш счётчик `clicks` лежит у всех на виду. Я поставил его в −100. Хе-хе!"],
        ["nika", "Спрячем переменную внутрь функции. Снаружи её не достать, а наша функция её помнит — это замыкание."]),
      idea("Область видимости", "Где видна переменная", "Переменная видна внутри блока `{ }`, где объявлена, и во вложенных блоках. Снаружи — нет.", "Не путать переменные разных частей кода.", "function measure() {\n  const temp = 36.6;\n  console.log(\"Внутри:\", temp);\n}\nmeasure();\nconsole.log(typeof temp);"),
      idea("Замыкание", "Функция помнит, где родилась", "Внутренняя функция сохраняет доступ к переменным внешней, даже когда та уже закончилась.", "Приватные счётчики и настройки.", "function makeCounter() {\n  let count = 0;\n  return () => {\n    count++;\n    return count;\n  };\n}\nconst next = makeCounter();\nnext();\nconsole.log(next());"),
      rule("Чем меньше глобальных переменных, тем меньше места для Вредного Скрипта.")
    ],
    tasks: [task("Защищённый счётчик", "Напиши `makeCounter()`, которая возвращает функцию: каждый вызов увеличивает скрытый счётчик и возвращает его. Два счётчика должны быть независимы.", {
      start: "let count = 0;\nfunction makeCounter() {\n  return () => count;\n}\n",
      checks: [run("(() => { const a = makeCounter(); a(); return a() === 2; })()", "Счётчик растёт: 1, 2"), run("(() => { const a = makeCounter(); const b = makeCounter(); a(); a(); return b() === 1; })()", "Счётчики независимы")],
      solution: "function makeCounter() {\n  let count = 0;\n  return () => {\n    count++;\n    return count;\n  };\n}"
    })],
    quizzes: [
      single("js-scope-block", "Блок", "Видна ли переменная `let x`, объявленная внутри `if { }`, после этого блока?", [["no", "Нет, только внутри блока"], ["yes", "Да, везде"], ["fn", "Только в функции"], ["undef", "Видна, но равна undefined"]], "no", "let и const — блочные."),
      single("js-closure", "Замыкание", "Что такое замыкание?", [["remember", "Функция, которая помнит переменные места, где была создана"], ["close", "Функция, которая закрывает окно"], ["end", "Конец функции"], ["private", "Ключевое слово private"]], "remember", "Внутренняя функция сохраняет доступ к внешним переменным.")
    ]
  });

  L({
    slug: "callbacks", title: "Колбэки: функция в функцию", summary: "Передача функции как аргумента, колбэки, функции высшего порядка.",
    skill: ["js-callbacks", "Колбэки", "Передавать функции в другие функции."],
    now: "Передаём функции в другие функции: колбэки и функции высшего порядка.",
    body: [
      scene("Сделай для каждого",
        ["you", "Иногда для каждого товара надо напечатать цену, иногда — проверить наличие. Писать две функции?"],
        ["bro", "Передай мне «что делать» функцией. Это колбэк — функция, которую вызовут потом."]),
      idea("Колбэк", "Функция-аргумент", "Функция, которую передают в другую функцию, чтобы та её вызвала.", "Обработчики кликов, таймеры, методы массивов.", "function forEachUser(action) {\n  for (const u of [\"Аня\", \"Борис\"]) action(u);\n}\nforEachUser((u) => console.log(\"Привет,\", u));"),
      idea("Функция высшего порядка", "Принимает или возвращает функцию", "Функция, которая работает с другими функциями.", "Гибкий код: «что делать» задаётся снаружи.", undefined),
      rule("Передаёшь колбэк — передавай саму функцию `fn`, а не результат её вызова `fn()`.")
    ],
    tasks: [task("Для каждого", "Напиши `applyAll(prices, fn)`: возвращает новый массив, где к каждой цене применена `fn`.", {
      start: "function applyAll(prices, fn) {\n  return prices;\n}\n",
      checks: [run("JSON.stringify(applyAll([100, 200], (p) => p * 2)) === '[200,400]'", "Удвоение работает"), run("JSON.stringify(applyAll([220], (p) => p - 20)) === '[200]'", "Любая функция работает")],
      solution: "function applyAll(prices, fn) {\n  const result = [];\n  for (const p of prices) result.push(fn(p));\n  return result;\n}"
    })],
    quizzes: [
      single("js-callback-pass", "Передать", "Как правильно передать функцию `log` как колбэк?", [["ref", "`run(log)`"], ["call", "`run(log())`"], ["str", "`run(\"log\")`"], ["new", "`run(new log)`"]], "ref", "`log()` передаст результат вызова, а не функцию."),
      single("js-hof", "Высший порядок", "Что такое функция высшего порядка?", [["fn", "Функция, которая принимает или возвращает функцию"], ["big", "Очень большая функция"], ["first", "Первая функция в файле"], ["global", "Глобальная функция"]], "fn", "Например, методы массивов map и filter.")
    ]
  });
}
