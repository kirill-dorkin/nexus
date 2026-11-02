// Chapter 12: The whole syntax — values, declarations, every operator, literals, classes,
// iterators and generators, async iteration, modules, the event loop.
import { scene, rule, kw, op, meth, obj, fnc, val, idea, typ, run, out, has, task, makeLesson, on } from "./kit.mjs";

export default function syntax(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "values-deep", title: "Значения: примитивы и ссылки", summary: "Семь примитивов и объекты, передача по значению и по ссылке, приведение типов, Object.is и SameValueZero.",
    skill: ["js-values-deep", "Примитивы и ссылки", "Понимать, как значения копируются и сравниваются."],
    now: "Вторая часть курса: разбираем JavaScript целиком. Начинаем с того, как устроены сами значения.",
    body: [
      scene("Глубже",
        ["nika", "Сайт «Зерна» живой. Теперь разберём JavaScript полностью — каждую конструкцию и каждый встроенный метод."],
        ["bug", "Ха! Тогда я спрячусь в мелочах: в копиях объектов, в NaN и минус нуле."]),
      idea("Примитивы", "Семь простых типов", "`number`, `bigint`, `string`, `boolean`, `undefined`, `null`, `symbol`. Они неизменяемы и копируются целиком. Всё остальное — объекты.", "Понимать, что меняется, а что нет.", 'let a = "латте";\nlet b = a;\nb = "раф";\nconsole.log(a, b);', { covers: ["примитивы"] }),
      idea("Ссылка и значение", "Объекты передаются ссылкой", "Переменная с объектом хранит ссылку. Две переменные могут указывать на один объект — изменение через одну видно через другую.", "Главный источник «магических» багов.", "const cart = [\"Латте\"];\nconst same = cart;\nsame.push(\"Раф\");\nconsole.log(cart);", { covers: ["ссылка и значение"] }),
      idea("Приведение типов", "Неявные превращения", "Операторы сами превращают значения: `\"5\" * 2` → 10, `\"5\" + 2` → \"52\", `[] + {}` → строка. В условиях — к boolean.", "Предсказывать результат и избегать сюрпризов.", 'console.log("5" * 2, "5" + 2, true + 1, [] + []);', { covers: ["приведение типов"] }),
      meth("Object.is()", "Точное сравнение", "Как `===`, но `Object.is(NaN, NaN)` — true, а `Object.is(0, -0)` — false.", "Сравнение без исключений `===`.", "console.log(NaN === NaN, Object.is(NaN, NaN), Object.is(0, -0));", { covers: ["Object.is"] }),
      idea("SameValueZero", "Сравнение в includes, Map и Set", "Как `===`, но NaN равен NaN. Так сравнивают `includes`, ключи `Map` и элементы `Set`.", "Понять, почему `[NaN].includes(NaN)` — true, а `indexOf` — −1.", "console.log([NaN].includes(NaN), [NaN].indexOf(NaN));", { covers: ["SameValueZero"] }),
      rule("Скопировал объект через `=` — у тебя не копия, а вторая ссылка на тот же объект.")
    ],
    tasks: [task("Настоящая копия", "Сделай `copy` — независимую копию массива `cart` (через spread), добавь в копию `\"Какао\"`, а в `same` сравни `cart` и `copy` через `Object.is`.", {
      start: 'const cart = ["Латте"];\nconst copy = cart;\ncopy.push("Какао");\nconst same = true;\n',
      checks: [run("cart.length === 1", "Оригинал не изменился"), run('copy.length === 2 && copy[1] === "Какао"', "В копии два напитка"), run("same === false", "Это разные объекты")],
      solution: 'const cart = ["Латте"];\nconst copy = [...cart];\ncopy.push("Какао");\nconst same = Object.is(cart, copy);'
    })],
    quizzes: [
      single("js-deep-ref", "Ссылка", "Что выведет `const a = { n: 1 }; const b = a; b.n = 2; console.log(a.n);`?", [["2", "2"], ["1", "1"], ["undef", "undefined"], ["err", "Ошибку"]], "2", "a и b — ссылки на один объект."),
      single("js-deep-objectis", "Object.is", "Что вернёт `Object.is(NaN, NaN)`?", [["true", "`true`"], ["false", "`false`"], ["nan", "`NaN`"], ["err", "Ошибку"]], "true", "В отличие от `===`.")
    ]
  });

  L({
    slug: "declarations-deep", title: "Объявления, всплытие и строгий режим", summary: "Всплытие, временная мёртвая зона, \"use strict\", автоматическая точка с запятой, пустая инструкция, метки, with и catch без параметра.",
    skill: ["js-declarations-deep", "Правила объявлений", "Понимать, когда переменные и функции доступны, и как работает строгий режим."],
    now: "Почему функцию можно вызвать до её объявления, а переменную let — нет? Разбираем правила объявлений.",
    body: [
      scene("До объявления",
        ["bug", "Я вызвал функцию раньше, чем написал её, — и она сработала! А с let — ошибка. Вот вам загадка."],
        ["nika", "Никакой магии: всплытие и мёртвая зона. Сейчас разберём."]),
      idea("Всплытие", "Hoisting", "Объявления `function` целиком «поднимаются» в начало области — функцию можно вызвать до строки объявления. `var` поднимается без значения (`undefined`).", "Понять порядок выполнения.", 'console.log(price);\nvar price = 220;\nconsole.log(greet());\nfunction greet() { return "Привет"; }', { covers: ["всплытие (hoisting)"] }),
      idea("Временная мёртвая зона", "let и const до объявления", "`let`, `const` и `class` существуют с начала блока, но до строки объявления обращение к ним — ReferenceError.", "Ошибка вместо тихого `undefined` — это защита.", 'try {\n  console.log(total);\n  let total = 1;\n} catch (e) {\n  console.log(e.name);\n}', { covers: ["временная мёртвая зона"] }),
      idea("\"use strict\"", "Строгий режим", "Строка `\"use strict\"` в начале файла или функции: запрещает необъявленные переменные, `with`, дубли параметров; `this` в обычной функции — `undefined`. Модули и классы строгие всегда.", "Ошибки видны сразу, а не теряются.", '"use strict";\ntry {\n  undeclared = 5;\n} catch (e) {\n  console.log(e.name);\n}', { covers: ["\"use strict\""] }),
      idea("Автоматическая точка с запятой", "ASI", "Если точку с запятой забыли, движок вставит её сам по правилам. Ловушка: `return` и значение на следующей строке → вернётся `undefined`.", "Знать, где ASI подставит `;` не туда.", "function f() {\n  return\n  42;\n}\nconsole.log(f());", { covers: ["автоматическая точка с запятой"] }),
      kw(";", "Пустая инструкция", "Одинокая `;` — инструкция, которая ничего не делает. Встречается в `for (;;)` и как ошибка после `if (x);`.", "Узнать опасную опечатку.", "let i = 0;\nfor (; i < 3; ) i++;\nconsole.log(i);", { covers: ["пустая инструкция ;"] }),
      kw("label:", "Метки", "`outer: for (…)` — имя для цикла; `break outer` выходит сразу из внешнего цикла.", "Выход из вложенных циклов.", 'outer: for (const a of [1, 2, 3]) {\n  for (const b of [1, 2, 3]) {\n    if (a * b === 4) {\n      console.log("Нашёл", a, b);\n      break outer;\n    }\n  }\n}', { covers: ["label:"] }),
      kw("with", "Устаревшая конструкция", "`with (obj) { … }` делает свойства объекта переменными. Запрещён в строгом режиме и модулях — не используй, но узнавай в старом коде.", "Понимать древний код.", 'const cup = { size: 350 };\nwith (cup) {\n  console.log(size);\n}', { covers: ["with"] }),
      kw("catch без параметра", "Ошибка не нужна", "`try { … } catch { … }` — без `(error)`, если сама ошибка не важна.", "Короче, когда нужен только запасной вариант.", 'let data;\ntry {\n  data = JSON.parse("не json");\n} catch {\n  data = {};\n}\nconsole.log(data);', { covers: ["catch без параметра"] }),
      rule("Объявляй переменные в начале блока и пиши `const`/`let` — тогда мёртвая зона тебя никогда не укусит.")
    ],
    tasks: [task("Выход из двух циклов", "В `tables` найди первый столик, где есть гость с именем `\"Лев\"`: сохрани номер столика в `found` и выйди из обоих циклов через метку и `break`.", {
      start: 'const tables = [["Аня", "Борис"], ["Марта"], ["Лев", "Ника"], ["Лев"]];\nlet found = -1;\nlet checked = 0;\n',
      checks: [run("found === 2", "Найден столик 2"), run("checked === 4", "После находки поиск остановлен"), has("break", "Использован `break` с меткой")],
      solution: 'const tables = [["Аня", "Борис"], ["Марта"], ["Лев", "Ника"], ["Лев"]];\nlet found = -1;\nlet checked = 0;\nsearch: for (let t = 0; t < tables.length; t++) {\n  for (const guest of tables[t]) {\n    checked++;\n    if (guest === "Лев") {\n      found = t;\n      break search;\n    }\n  }\n}'
    })],
    quizzes: [
      single("js-tdz", "Мёртвая зона", "Что будет при обращении к `let x` до строки `let x = 1`?", [["ref", "ReferenceError"], ["undef", "undefined"], ["one", "1"], ["null", "null"]], "ref", "Временная мёртвая зона."),
      single("js-asi-return", "ASI", "Что вернёт функция, где `return` и `42` на разных строках?", [["undef", "undefined"], ["42", "42"], ["err", "Ошибку"], ["null", "null"]], "undef", "После `return` автоматически вставится точка с запятой.")
    ]
  });

  L({
    slug: "operators-all", title: "Все операторы", summary: "Унарные + и −, побитовые & | ^ ~ << >> >>>, составное присваивание, логическое присваивание, void, запятая, группировка и instanceof.",
    skill: ["js-operators-all", "Все операторы", "Знать и применять каждый оператор JavaScript."],
    now: "Есть операторы, которые встречаются редко, но без них чужой код не прочитать. Разбираем все.",
    body: [
      scene("Странные значки",
        ["marta", "Нашла в коде `flags & 4` и `x ??= 1`. Это вообще JavaScript?"],
        ["bro", "Ещё какой. Побитовые операторы и логическое присваивание. Разберём каждый."]),
      op("унарный + −", "Число из значения и смена знака", "`+\"42\"` → 42 (короткое `Number()`), `-x` меняет знак.", "Быстро превратить строку в число.", 'console.log(+"42" + 1, -(-5), +true);', { covers: ["унарный + -"] }),
      op("& | ^", "Побитовые И, ИЛИ, исключающее ИЛИ", "Работают с битами 32-битных целых: `5 & 3` → 1, `5 | 3` → 7, `5 ^ 3` → 6.", "Флаги, маски, быстрые проверки.", "const HOT = 1, SUGAR = 2, MILK = 4;\nconst order = HOT | MILK;\nconsole.log(order, (order & MILK) !== 0, (order & SUGAR) !== 0);", { covers: ["& | ^"] }),
      op("~", "Побитовое НЕ", "Переворачивает все биты: `~x` равно `-x - 1`. `~~3.7` → 3 (старый способ отбросить дробь).", "Узнать в старом коде.", "console.log(~5, ~~3.7);", { covers: ["~"] }),
      op("<< >> >>>", "Сдвиги битов", "`1 << 3` → 8 (умножить на 2³), `-16 >> 2` → −4 (со знаком), `-1 >>> 0` → 4294967295 (без знака).", "Работа с бинарными данными и масками.", "console.log(1 << 3, -16 >> 2, -1 >>> 0);", { covers: ["<< >> >>>"] }),
      op("<<= >>= >>>= &= |= ^=", "Побитовое присваивание", "`flags |= MILK` — то же, что `flags = flags | MILK`.", "Включать и выключать флаги.", "let flags = 1;\nflags |= 4;\nflags &= ~1;\nflags <<= 1;\nconsole.log(flags);", { covers: ["<<= >>= >>>= &= |= ^="] }),
      op("&&= ||= ??=", "Логическое присваивание", "`a ||= b` — присвоить, если `a` falsy; `a &&= b` — если truthy; `a ??= b` — если `null`/`undefined`.", "Значения по умолчанию в одну строку.", "const settings = { qty: 0 };\nsettings.qty ??= 1;\nsettings.size ??= \"M\";\nconsole.log(settings);", { covers: ["&&= ||= ??="] }),
      op("void", "Всегда undefined", "`void выражение` вычисляет выражение и возвращает `undefined`.", "Встречается в `href=\"javascript:void 0\"` и коротких стрелках.", "console.log(void 0, void (1 + 1));", { covers: ["void"] }),
      op(", (запятая)", "Несколько выражений в одном", "`(a, b)` вычисляет оба и возвращает последнее. Чаще всего — в `for (let i = 0, j = 10; …; i++, j--)`.", "Два счётчика в одном цикле.", "for (let i = 0, j = 3; i < j; i++, j--) console.log(i, j);", { covers: [", (запятая)"] }),
      op("( )", "Группировка", "Скобки меняют порядок вычисления: `(1 + 2) * 3`.", "Явно показать порядок действий.", "console.log(1 + 2 * 3, (1 + 2) * 3);", { covers: ["( ) группировка"] }),
      op("instanceof", "Создан ли классом", "`order instanceof Order` — true, если в цепочке прототипов объекта есть `Order.prototype`.", "Проверить вид объекта.", "class Order {}\nconsole.log(new Order() instanceof Order, [] instanceof Array, [] instanceof Object);", { covers: ["instanceof"] }),
      rule("Логическое присваивание `??=` — лучший способ задать значение по умолчанию полю объекта.")
    ],
    tasks: [task("Флаги заказа", "Константы `HOT = 1`, `SUGAR = 2`, `MILK = 4`. Сделай `order` с горячим и молоком через `|`, напиши `has(order, flag)` через `&`, а `options.size` задай `\"M\"` только если его нет — через `??=`.", {
      start: "const HOT = 1, SUGAR = 2, MILK = 4;\nlet order = 0;\nfunction has(order, flag) {\n  return false;\n}\nconst options = {};\n",
      checks: [run("order === 5", "Заказ = HOT | MILK = 5"), run("has(order, MILK) && !has(order, SUGAR)", "`has` проверяет флаги"), run('options.size === "M"', "Размер по умолчанию"), has("??=", "Использован `??=`")],
      solution: 'const HOT = 1, SUGAR = 2, MILK = 4;\nlet order = HOT | MILK;\nfunction has(order, flag) {\n  return (order & flag) !== 0;\n}\nconst options = {};\noptions.size ??= "M";'
    })],
    quizzes: [
      single("js-bit-or", "Побитовое ИЛИ", "Чему равно `1 | 4`?", [["5", "5"], ["4", "4"], ["14", "14"], ["true", "true"]], "5", "Биты 001 и 100 → 101."),
      single("js-nullish-assign", "??=", "Что будет с `x` после `let x = 0; x ??= 5;`?", [["0", "0"], ["5", "5"], ["null", "null"], ["undef", "undefined"]], "0", "0 — не null и не undefined."),
      short("js-shift", "Сдвиг", "Чему равно `1 << 4`? Введи число.", ["16"], "2⁴.")
    ]
  });

  L({
    slug: "literals-deep", title: "Литералы: числа, строки, объекты", summary: "Системы счисления 0x 0o 0b, разделители 1_000, BigInt 123n, экспонента 1e3, экранирование \\u{…}, литерал регулярки, дырки в массиве, теговые шаблоны, вычисляемые ключи, методы и аксессоры в объектах.",
    skill: ["js-literals", "Литералы", "Записывать значения всеми способами, которые есть в языке."],
    now: "Как записать миллион, шестнадцатеричный цвет, эмодзи или метод объекта? Все виды литералов.",
    body: [
      scene("Как записать",
        ["sonya", "Цвет #c8763a в коде — это число?"],
        ["bro", "Можно и числом: `0xc8763a`. В JavaScript много способов записать значение — покажу все."]),
      val("0x 0o 0b", "Системы счисления", "`0xff` — шестнадцатеричное, `0o17` — восьмеричное, `0b1010` — двоичное.", "Цвета, права доступа, битовые маски.", "console.log(0xff, 0o17, 0b1010);", { covers: ["0x 0o 0b"] }),
      val("1_000_000", "Разделители разрядов", "Подчёркивания внутри числа ради читаемости, на значение не влияют.", "Большие числа без ошибок в нулях.", "console.log(1_000_000 + 250_000);", { covers: ["1_000_000"] }),
      val("123n", "Литерал BigInt", "Буква `n` в конце — целое произвольной длины.", "Числа больше 2⁵³ без потери точности.", "console.log(9007199254740993n + 1n);", { covers: ["123n"] }),
      val("1e3", "Экспоненциальная запись", "`1e3` = 1000, `2.5e-3` = 0.0025.", "Очень большие и очень маленькие числа.", "console.log(1e3, 2.5e-3);", { covers: ["1e3"] }),
      val("\\u{…}", "Экранирование в строках", "`\\n` перевод строки, `\\t` табуляция, `\\\"` кавычка, `\\u00e9` и `\\u{1F375}` — символ по коду.", "Спецсимволы и эмодзи в строках.", 'console.log("Чай\\u{1F375}\\tготов\\n— \\"Зерно\\"");', { covers: ["\\u{…} и экранирование"] }),
      val("/…/флаги", "Литерал регулярного выражения", "`/латте/i` — шаблон для поиска в тексте; флаги после второго слэша.", "Поиск и проверка строк (подробно — в главе о регулярках).", 'console.log(/латте/i.test("Овсяный ЛАТТЕ"));', { covers: ["/регулярка/флаги"] }),
      val("[1, , 3]", "Дырки в массиве", "Пропущенный элемент — «дырка»: длина учитывает его, а `forEach`/`map` пропускают.", "Понять странное поведение старого кода.", "const a = [1, , 3];\nconsole.log(a.length, 1 in a);\na.forEach((x) => console.log(x));", { covers: ["дырки в массиве"] }),
      fnc("тег`шаблон`", "Теговый шаблон", "`tag`…`` вызывает функцию `tag(strings, ...values)` — она решает, как собрать строку. Встроенный тег `String.raw` не обрабатывает экранирование.", "Безопасная подстановка, форматирование, DSL.", 'function rub(strings, ...values) {\n  return strings.reduce((out, s, i) => out + s + (i < values.length ? values[i] + " ₽" : ""), "");\n}\nconsole.log(rub`Латте ${220}, раф ${290}`);\nconsole.log(String.raw`C:\\new\\menu`);', { covers: ["тег`шаблон`", "String.raw"] }),
      op("[expr]: …", "Вычисляемые ключи", "`{ [key]: value }` — имя свойства вычисляется.", "Объект из динамических данных.", 'const size = "L";\nconst prices = { [size]: 290, [`${size}-promo`]: 250 };\nconsole.log(prices);', { covers: ["вычисляемые ключи [expr]"] }),
      idea("Методы в литерале", "Сокращённая запись методов", "`{ total() { … } }` вместо `{ total: function () { … } }`. Так же пишутся async-методы и генераторы: `async load() {}`, `*items() {}`.", "Короче и с поддержкой `super`.", "const cart = {\n  items: [220, 150],\n  total() { return this.items.reduce((a, b) => a + b, 0); }\n};\nconsole.log(cart.total());", { covers: ["сокращённые методы"] }),
      idea("get и set в объекте", "Свойства-аксессоры", "`{ get total() {…}, set total(v) {…} }` — свойство, чтение и запись которого вызывают функции.", "Вычисляемые и проверяемые свойства.", "const cup = {\n  ml: 350,\n  get liters() { return this.ml / 1000; },\n  set liters(v) { this.ml = v * 1000; }\n};\ncup.liters = 0.45;\nconsole.log(cup.ml, cup.liters);", { covers: ["accessor-свойства объекта"] }),
      rule("Большие числа пиши с `_`, а цвета — в шестнадцатеричном виде: код читается как документация.")
    ],
    tasks: [task("Литералы кассы", "Задай `limit` = миллион через разделители, `brand` = цвет `0xc8763a`, `big` = BigInt `9007199254740993n`, и объект `cup` с аксессором `get liters()` (из `ml: 350`, делить на 1000).", {
      start: "const limit = 1000;\nconst brand = 0;\nconst big = 0;\nconst cup = { ml: 350 };\n",
      checks: [run("limit === 1000000", "Миллион"), has("1_000_000", "С разделителями"), run("brand === 13137466", "Цвет в 16-ричном виде"), run('typeof big === "bigint" && big === 9007199254740993n', "BigInt"), run("cup.liters === 0.35", "Аксессор liters")],
      solution: "const limit = 1_000_000;\nconst brand = 0xc8763a;\nconst big = 9007199254740993n;\nconst cup = {\n  ml: 350,\n  get liters() { return this.ml / 1000; }\n};"
    })],
    quizzes: [
      single("js-hex", "16-ричное", "Чему равно `0x10`?", [["16", "16"], ["10", "10"], ["2", "2"], ["8", "8"]], "16", "0x — шестнадцатеричная запись."),
      single("js-tagged", "Тег", "Что получает функция-тег первым аргументом?", [["strings", "Массив статических кусков строки"], ["values", "Подставленные значения"], ["all", "Готовую строку"], ["none", "Ничего"]], "strings", "Значения идут следующими аргументами.")
    ]
  });

  L({
    slug: "classes-full", title: "Классы полностью", summary: "Поля класса, приватные #поля и методы, static-поля и методы, статический блок static {}, new.target и наследование от встроенных.",
    skill: ["js-classes-full", "Классы целиком", "Использовать все возможности классов: поля, приватность и статику."],
    now: "Вредный Скрипт меняет сумму заказа снаружи. Прячем её в приватное поле.",
    body: [
      scene("Руки прочь",
        ["bug", "`order.total = 0` — и заказ бесплатный! Хе-хе."],
        ["nika", "Приватное поле `#total` снаружи не достать вообще — даже прочитать нельзя."]),
      idea("Поля класса", "Свойства без конструктора", "`class Cart { items = []; }` — поле создаётся у каждого экземпляра.", "Короче, чем присваивать всё в constructor.", "class Cart {\n  items = [];\n  discount = 0;\n}\nconsole.log(new Cart());", { covers: ["поля класса"] }),
      op("#приватное", "Приватные поля и методы", "`#total` — доступен только внутри класса. Снаружи — синтаксическая ошибка. Проверка наличия: `#total in obj`.", "Защитить данные от изменений снаружи.", "class Order {\n  #total = 0;\n  add(price) { this.#total += price; }\n  get total() { return this.#total; }\n}\nconst o = new Order();\no.add(220);\nconsole.log(o.total, Object.keys(o));", { covers: ["#приватное"] }),
      kw("static", "Статические поля и методы", "Принадлежат самому классу, а не экземплярам: `Order.count`, `Order.fromJSON()`.", "Счётчики, фабрики, константы класса.", "class Order {\n  static count = 0;\n  constructor() { Order.count++; }\n  static create() { return new Order(); }\n}\nOrder.create();\nOrder.create();\nconsole.log(Order.count);", { covers: ["static"] }),
      kw("static { }", "Статический блок", "Код, который выполняется один раз при создании класса.", "Сложная подготовка статических данных.", 'class Menu {\n  static prices = {};\n  static {\n    for (const [n, p] of [["Латте", 220], ["Раф", 290]]) this.prices[n] = p;\n  }\n}\nconsole.log(Menu.prices);', { covers: ["static { }"] }),
      kw("new.target", "Вызвали ли через new", "Внутри функции или конструктора — функция, вызванная через `new`, иначе `undefined`.", "Запретить вызов без new или создание абстрактного класса.", "class Drink {\n  constructor() {\n    if (new.target === Drink) throw new Error(\"Только конкретный напиток\");\n  }\n}\nclass Latte extends Drink {}\nconsole.log(new Latte() instanceof Drink);", { covers: ["new.target"] }),
      rule("Всё, что не должно меняться снаружи, — в `#приватное`. Наружу — только методы и геттеры.")
    ],
    tasks: [task("Защищённый заказ", "Класс `Order`: приватное `#items = []`, метод `add(price)`, геттер `total`, статическое поле `count` (сколько заказов создано).", {
      start: "class Order {\n  items = [];\n  add(price) { this.items.push(price); }\n}\n",
      checks: [run("(() => { const o = new Order(); o.add(220); o.add(150); return o.total === 370; })()", "Сумма считается"), run("(() => { const o = new Order(); o.add(220); return !('items' in o) && Object.keys(o).length === 0; })()", "Позиции спрятаны"), run("(() => { const before = Order.count; new Order(); return Order.count === before + 1; })()", "Статический счётчик"), has("#items", "Приватное поле")],
      solution: "class Order {\n  static count = 0;\n  #items = [];\n  constructor() { Order.count++; }\n  add(price) { this.#items.push(price); }\n  get total() { return this.#items.reduce((a, b) => a + b, 0); }\n}"
    })],
    quizzes: [
      single("js-private-out", "Приватное", "Что будет при `order.#total` снаружи класса?", [["syntax", "Синтаксическая ошибка"], ["undef", "undefined"], ["value", "Значение поля"], ["null", "null"]], "syntax", "Приватные имена видны только внутри класса."),
      single("js-static", "static", "Где живёт `static count`?", [["class", "На самом классе"], ["each", "У каждого экземпляра"], ["proto", "Только в прототипе"], ["global", "В глобальной области"]], "class", "Обращение — `Order.count`.")
    ]
  });

  L({
    slug: "iterators-generators", title: "Итераторы и генераторы", summary: "Протокол итераторов и Symbol.iterator, генераторы function*, yield, yield* и методы next, return, throw.",
    skill: ["js-generators", "Итераторы и генераторы", "Делать свои перебираемые объекты и ленивые последовательности."],
    now: "Хотим, чтобы наше меню перебиралось `for…of`, а номера заказов шли бесконечной ленивой лентой.",
    body: [
      scene("Своё перебираемое",
        ["marta", "Почему массив можно перебрать `for…of`, а мой объект меню — нет?"],
        ["bro", "Массив умеет отдавать итератор. Научим и меню — через `Symbol.iterator` или генератор."]),
      idea("Протокол итераторов", "Как работает for…of", "Перебираемый объект имеет метод `[Symbol.iterator]()`, который возвращает итератор — объект с методом `next()`, отдающим `{ value, done }`.", "Основа for…of, spread, деструктуризации.", "const it = [\"Латте\", \"Раф\"][Symbol.iterator]();\nconsole.log(it.next(), it.next(), it.next());", { covers: ["протокол итераторов"] }),
      val("Symbol.iterator", "Ключ перебора", "Встроенный символ: метод под этим ключом делает объект перебираемым.", "Свои коллекции работают с for…of и `...`.", "const menu = {\n  items: [\"Латте\", \"Раф\"],\n  [Symbol.iterator]() { return this.items[Symbol.iterator](); }\n};\nconsole.log([...menu]);", { covers: ["Symbol.iterator"] }),
      kw("function*", "Генератор", "Функция со звёздочкой возвращает генератор — итератор, который выполняет тело по кусочкам.", "Ленивые и бесконечные последовательности.", "function* numbers() {\n  yield 1;\n  yield 2;\n}\nconsole.log([...numbers()]);", { covers: ["function*"] }),
      kw("yield", "Отдать значение и замереть", "Генератор отдаёт значение и ставится на паузу до следующего `next()`. `next(x)` передаёт `x` обратно как результат `yield`.", "Пошаговые вычисления.", "function* orderIds() {\n  let id = 1040;\n  while (true) yield id++;\n}\nconst ids = orderIds();\nconsole.log(ids.next().value, ids.next().value);", { covers: ["yield"] }),
      kw("yield*", "Отдать всё из другого", "`yield* other` по очереди отдаёт все значения другого перебираемого.", "Составлять генераторы из генераторов.", "function* coffee() { yield \"Латте\"; yield \"Раф\"; }\nfunction* menu() { yield* coffee(); yield \"Чизкейк\"; }\nconsole.log([...menu()]);", { covers: ["yield*"] }),
      meth("next() · return() · throw()", "Управление генератором", "`next(v)` — продолжить, `return(v)` — завершить досрочно, `throw(e)` — бросить ошибку в точку паузы.", "Полный контроль над генератором.", "function* g() {\n  try { yield 1; yield 2; } finally { console.log(\"Уборка\"); }\n}\nconst it = g();\nconsole.log(it.next());\nconsole.log(it.return(\"стоп\"));", { covers: on("Generator.prototype", "next", "return", "throw") }),
      rule("Нужна последовательность, которую считать заранее дорого или бесконечно, — пиши генератор.")
    ],
    tasks: [task("Номерки заказов", "Напиши генератор `tickets(start)`, который бесконечно отдаёт номера `start, start + 1, …`, и сделай объект `menu` перебираемым через `[Symbol.iterator]` (отдаёт элементы `menu.items`).", {
      start: 'function tickets(start) {\n  return [start];\n}\nconst menu = { items: ["Латте", "Раф", "Какао"] };\n',
      checks: [run("(() => { const t = tickets(100); t.next(); t.next(); return t.next().value === 102; })()", "Номера идут подряд"), run("(() => { const t = tickets(1); for (let i = 0; i < 1000; i++) t.next(); return t.next().done === false; })()", "Лента бесконечная"), run('[...menu].join() === "Латте,Раф,Какао"', "Меню перебирается")],
      solution: 'function* tickets(start) {\n  let n = start;\n  while (true) yield n++;\n}\nconst menu = {\n  items: ["Латте", "Раф", "Какао"],\n  *[Symbol.iterator]() { yield* this.items; }\n};'
    })],
    quizzes: [
      single("js-gen-pause", "Пауза", "Что делает `yield`?", [["pause", "Отдаёт значение и приостанавливает генератор"], ["end", "Завершает функцию навсегда"], ["wait", "Ждёт промис"], ["throw", "Бросает ошибку"]], "pause", "Продолжение — по next()."),
      single("js-iter-done", "done", "Что значит `{ value: undefined, done: true }` от итератора?", [["end", "Значения закончились"], ["error", "Ошибка"], ["empty", "Пустое значение, но будут ещё"], ["pause", "Пауза"]], "end", "for…of на этом останавливается.")
    ]
  });

  L({
    slug: "async-iteration", title: "Асинхронные итераторы", summary: "Асинхронные генераторы async function*, for await…of, протокол асинхронных итераторов, Symbol.asyncIterator и Array.fromAsync.",
    skill: ["js-async-iteration", "Асинхронный перебор", "Перебирать данные, которые приходят по частям со временем."],
    now: "Заказы приходят на кухню по одному, со временем. Перебираем их, как поток.",
    body: [
      scene("Поток заказов",
        ["marta", "Заказы приходят по одному. Хочу обрабатывать их по мере поступления."],
        ["nika", "Асинхронный генератор отдаёт значения со временем, а `for await` ждёт каждое."]),
      kw("async function*", "Асинхронный генератор", "Можно и `await`, и `yield`: отдаёт значения по мере готовности.", "Поток данных: страницы API, события.", "async function* kitchen() {\n  for (const d of [\"Латте\", \"Раф\"]) {\n    await wait(100);\n    yield d;\n  }\n}\nfor await (const d of kitchen()) console.log(\"Готов\", d);", { covers: ["async function*"] }),
      kw("for await…of", "Перебор с ожиданием", "Ждёт каждое значение асинхронного (или обычного с промисами) перебираемого.", "Обработать поток по одному элементу.", "for await (const v of [Promise.resolve(1), 2]) console.log(v);", { covers: ["for await…of"] }),
      idea("Асинхронный протокол", "next() возвращает промис", "Асинхронный итератор — объект с методом `next()`, который возвращает промис `{ value, done }`; получают его через `[Symbol.asyncIterator]()`.", "Свои асинхронные источники данных.", "const it = { i: 0, next() { return Promise.resolve(this.i < 2 ? { value: this.i++, done: false } : { done: true }); }, [Symbol.asyncIterator]() { return this; } };\nfor await (const v of it) console.log(v);", { covers: ["протокол асинхронных итераторов", "Symbol.asyncIterator"] }),
      meth("next() · return() · throw()", "Методы асинхронного генератора", "Как у обычного генератора, но каждый возвращает промис.", "Остановить поток досрочно.", "async function* g() { yield 1; yield 2; }\nconst it = g();\nconsole.log(await it.next(), await it.return(\"стоп\"));", { covers: on("AsyncGenerator.prototype", "next", "return", "throw") }),
      meth("Array.fromAsync()", "Массив из асинхронного источника", "Дожидается всех значений асинхронного перебираемого и возвращает промис массива.", "Собрать поток в массив.", "async function* g() { yield \"Латте\"; await wait(50); yield \"Раф\"; }\nconsole.log(await Array.fromAsync(g()));", { covers: ["Array.fromAsync"] }),
      rule("Данные приходят частями со временем — это асинхронный итератор, перебирай его `for await`.")
    ],
    tasks: [task("Кухня по одному", "Напиши асинхронный генератор `kitchen(orders)`: для каждого напитка ждёт `wait(30)` и отдаёт `` `${d} готов` ``. Собери результат в `done` через `Array.fromAsync` внутри `async function run()` и вызови её.", {
      start: "let done = [];\nfunction kitchen(orders) {\n  return orders;\n}\n",
      checks: [run('await wait(300) || done.join() === "Латте готов,Раф готов"', "Все напитки готовы по порядку"), run('kitchen(["x"])[Symbol.asyncIterator] !== undefined', "Это асинхронный генератор"), has("fromAsync", "Использован `Array.fromAsync`")],
      solution: 'let done = [];\nasync function* kitchen(orders) {\n  for (const d of orders) {\n    await wait(30);\n    yield `${d} готов`;\n  }\n}\nasync function run() {\n  done = await Array.fromAsync(kitchen(["Латте", "Раф"]));\n}\nrun();'
    })],
    quizzes: [
      single("js-for-await", "for await", "Что делает `for await (const x of source)`?", [["wait", "Ждёт каждое значение перед телом цикла"], ["parallel", "Запускает всё параллельно"], ["sync", "То же, что for…of"], ["error", "Это ошибка синтаксиса"]], "wait", "Подходит для потоков."),
      single("js-asynciter-next", "Протокол", "Что возвращает `next()` асинхронного итератора?", [["promise", "Промис { value, done }"], ["value", "Сразу значение"], ["array", "Массив"], ["undef", "undefined"]], "promise", "Поэтому его ждут через await.")
    ]
  });

  L({
    slug: "modules-full", title: "Модули полностью", summary: "export default, import * as, динамический import(), import.meta и await на верхнем уровне модуля.",
    skill: ["js-modules-full", "Модули целиком", "Использовать все формы импорта и экспорта."],
    now: "Код сайта разбит на модули. Разбираем все формы import и export.",
    body: [
      scene("Все формы",
        ["lev", "Я видел `import * as cart` и `await import(...)`. Что это?"],
        ["nika", "Ещё несколько форм импорта. Пример сразу запустить нельзя — модулям нужны отдельные файлы, — поэтому покажу запись."]),
      kw("export default", "Экспорт по умолчанию", "`export default function Cart() {}` — главный экспорт модуля; импортируется под любым именем: `import Cart from \"./cart.js\"`.", "Модуль, который экспортирует одну главную вещь.", undefined, { covers: ["export default"] }),
      kw("import * as", "Всё пространство имён", "`import * as cart from \"./cart.js\"` — объект со всеми экспортами модуля: `cart.total()`.", "Много экспортов под одним именем.", undefined, { covers: ["import * as"] }),
      fnc("import()", "Динамический импорт", "`const m = await import(\"./charts.js\")` — загрузить модуль по требованию, возвращает промис.", "Грузить тяжёлый код только когда нужен.", undefined, { covers: ["import()"] }),
      obj("import.meta", "Сведения о модуле", "`import.meta.url` — адрес текущего модуля.", "Строить пути к файлам рядом с модулем.", undefined, { covers: ["import.meta"] }),
      rule("Один модуль — одна тема. Тяжёлое и редкое — через динамический `import()`.")
    ],
    tasks: [task("Ленивая загрузка", "Модули в песочнице недоступны, поэтому смоделируем: напиши `async function loadCharts(loader)`, которая при первом вызове ждёт `loader()` (как `import()`) и кэширует результат — второй вызов не грузит повторно.", {
      start: "async function loadCharts(loader) {\n  return loader();\n}\n",
      checks: [run('await (async () => { let n = 0; const loader = async () => { n++; return { draw: () => "ok" }; }; const a = await loadCharts(loader); const b = await loadCharts(loader); return a.draw() === "ok" && a === b && n === 1; })()', "Загрузка один раз, потом из кэша")],
      solution: "let cached = null;\nasync function loadCharts(loader) {\n  cached ??= await loader();\n  return cached;\n}"
    })],
    quizzes: [
      single("js-default-import", "default", "Как импортировать `export default`?", [["any", "`import Name from \"./m.js\"` — под любым именем"], ["braces", "Только `import { default } from …`"], ["star", "Только через `* as`"], ["require", "Через require"]], "any", "Фигурные скобки — для именованных."),
      single("js-dynamic-import", "import()", "Что возвращает `import(\"./m.js\")`?", [["promise", "Промис модуля"], ["module", "Сразу модуль"], ["undef", "undefined"], ["string", "Текст файла"]], "promise", "Поэтому его ждут через await.")
    ]
  });

  L({
    slug: "event-loop", title: "Цикл событий и память", summary: "Цикл событий, очередь задач и микрозадач, порядок выполнения промисов и таймеров, сборка мусора.",
    skill: ["js-event-loop", "Цикл событий", "Предсказывать порядок выполнения асинхронного кода."],
    now: "Почему промис срабатывает раньше таймера с нулевой задержкой? Заглядываем в цикл событий.",
    body: [
      scene("Кто первый",
        ["bug", "Угадайте порядок: таймер 0 мс, промис и обычный console.log!"],
        ["bro", "Легко: сначала весь текущий код, потом все микрозадачи, потом следующая задача. Сейчас покажу."]),
      idea("Цикл событий", "Как JavaScript всё успевает", "Движок выполняет одну задачу целиком (скрипт, обработчик клика, колбэк таймера), затем все микрозадачи, затем отрисовка и следующая задача.", "Понять, почему долгий код замораживает страницу.", 'setTimeout(() => console.log("3: таймер"), 0);\nPromise.resolve().then(() => console.log("2: промис"));\nconsole.log("1: код");', { covers: ["цикл событий"] }),
      idea("Микрозадачи", "Очередь промисов", "Колбэки `then`, `await` и `queueMicrotask` идут в очередь микрозадач — она опустошается сразу после текущей задачи, раньше таймеров.", "Порядок промисов и таймеров.", 'queueMicrotask(() => console.log("микрозадача"));\nsetTimeout(() => console.log("задача"));\nconsole.log("синхронно");', { covers: ["микрозадачи"] }),
      idea("Сборка мусора", "Память освобождается сама", "Объект, до которого больше нельзя добраться по ссылкам, движок удаляет. Утечка — когда ненужное всё ещё достижимо (забытый обработчик, растущий массив).", "Не держать лишнего: снимать обработчики, чистить кэши.", undefined, { covers: ["сборка мусора"] }),
      rule("Тяжёлый синхронный код блокирует всё: и клики, и отрисовку. Делить работу — через задачи.")
    ],
    tasks: [task("Порядок вывода", "Заполни массив `order` так, как реально выполнится код ниже: для этого просто добавь `order.push(...)` в каждый колбэк вместо комментариев и запусти.", {
      start: 'const order = [];\nsetTimeout(() => { /* "timeout" */ }, 0);\nPromise.resolve().then(() => { /* "promise" */ });\n/* "sync" */\n',
      checks: [run('await wait(50) || order.join() === "sync,promise,timeout"', "Порядок: sync, promise, timeout")],
      solution: 'const order = [];\nsetTimeout(() => { order.push("timeout"); }, 0);\nPromise.resolve().then(() => { order.push("promise"); });\norder.push("sync");'
    })],
    quizzes: [
      single("js-micro-first", "Порядок", "Что выполнится раньше: `then` уже выполненного промиса или `setTimeout(fn, 0)`?", [["then", "then (микрозадача)"], ["timeout", "setTimeout"], ["same", "Одновременно"], ["random", "Как повезёт"]], "then", "Микрозадачи — до следующей задачи."),
      single("js-gc", "Мусор", "Когда объект удаляется сборщиком мусора?", [["unreachable", "Когда до него больше нельзя добраться по ссылкам"], ["null", "Сразу после `= null`"], ["timer", "Через 10 секунд"], ["never", "Никогда"]], "unreachable", "Пока ссылка есть — объект живёт.")
    ]
  });
}
