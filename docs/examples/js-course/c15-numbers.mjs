// Chapter 15: Numbers completely — Number constants and methods, BigInt, every Math function.
import { scene, rule, meth, fnc, val, run, has, task, makeLesson, on } from "./kit.mjs";

const N = (...m) => on("Number", ...m);
const M = (...m) => on("Math", ...m);

export default function numbers(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, short } = c;

  L({
    slug: "number-limits", title: "Границы чисел", summary: "Number.MAX_SAFE_INTEGER, MIN_SAFE_INTEGER, MAX_VALUE, MIN_VALUE, EPSILON, бесконечности, Number.NaN и проверки isInteger, isSafeInteger, isFinite.",
    skill: ["js-number-limits", "Границы чисел", "Знать, где у чисел заканчивается точность, и проверять числа строго."],
    now: "Выясняем, где у чисел границы точности, и проверяем числа строго.",
    body: [
      scene("Лишние копейки",
        ["bug", "0.1 + 0.2 !== 0.3. Ваш калькулятор врёт на триллионную копейки!"],
        ["nika", "Числа в JavaScript — 64-битные дробные. У них есть пределы и погрешность. Знаешь их — не попадёшься."]),
      val("Number.MAX_SAFE_INTEGER · Number.MIN_SAFE_INTEGER", "Безопасные целые", "Целые до ±(2⁵³ − 1) = 9 007 199 254 740 991 точны. Дальше соседние целые сливаются.", "Идентификаторы и большие счётчики.", "console.log(Number.MAX_SAFE_INTEGER, 2 ** 53 === 2 ** 53 + 1, Number.MIN_SAFE_INTEGER);", { covers: N("MAX_SAFE_INTEGER", "MIN_SAFE_INTEGER") }),
      meth("Number.isSafeInteger() · Number.isInteger()", "Целое ли и точное ли", "`isInteger(5.0)` → true; `isSafeInteger(2 ** 53)` → false.", "Проверка количества, идентификаторов.", "console.log(Number.isInteger(5.0), Number.isInteger(5.5), Number.isSafeInteger(2 ** 53));", { covers: N("isSafeInteger", "isInteger") }),
      val("Number.MAX_VALUE · Number.MIN_VALUE", "Самое большое и самое маленькое", "`MAX_VALUE` ≈ 1.8e308 — больше будет `Infinity`; `MIN_VALUE` ≈ 5e-324 — самое близкое к нулю положительное.", "Понять пределы вычислений.", "console.log(Number.MAX_VALUE * 2, Number.MIN_VALUE / 2);", { covers: N("MAX_VALUE", "MIN_VALUE") }),
      val("Number.EPSILON", "Погрешность", "Разница между 1 и следующим представимым числом (~2.2e-16). Дробные сравнивают с допуском.", "Сравнение дробных без ловушки 0.1 + 0.2.", "const close = (a, b) => Math.abs(a - b) < Number.EPSILON;\nconsole.log(0.1 + 0.2 === 0.3, close(0.1 + 0.2, 0.3));", { covers: N("EPSILON") }),
      val("Number.POSITIVE_INFINITY · Number.NEGATIVE_INFINITY · Number.NaN", "Особые значения", "То же, что `Infinity`, `-Infinity` и `NaN`, но как свойства Number.", "Явная запись в коде.", "console.log(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN);", { covers: N("POSITIVE_INFINITY", "NEGATIVE_INFINITY", "NaN") }),
      meth("Number.isFinite()", "Конечное ли число", "Строгая проверка: true только для настоящих чисел, не `Infinity` и не `NaN`; строки не превращает.", "Проверка результата расчёта.", 'console.log(Number.isFinite(1 / 0), Number.isFinite("12"), Number.isFinite(12));', { covers: N("isFinite") }),
      meth("Number.parseFloat() · Number.parseInt()", "То же, что глобальные", "Ровно те же функции, что `parseFloat` и `parseInt`, но в пространстве Number.", "Код без глобальных функций.", 'console.log(Number.parseInt === parseInt, Number.parseFloat("3.5л"));', { covers: N("parseFloat", "parseInt") }),
      rule("Деньги — в копейках целыми числами. Дробные сравнивай с допуском `Number.EPSILON`.")
    ],
    tasks: [task("Сравнение с допуском", "Напиши `almostEqual(a, b)` через `Number.EPSILON` и `validQty(n)` — true, только если `n` безопасное целое от 1 до 99.", {
      start: "function almostEqual(a, b) {\n  return a === b;\n}\nfunction validQty(n) {\n  return n > 0;\n}\n",
      checks: [run("almostEqual(0.1 + 0.2, 0.3)", "0.1 + 0.2 ≈ 0.3"), run("!almostEqual(0.1, 0.2)", "Разные числа не равны"), run('validQty(2) && !validQty(2.5) && !validQty("3") && !validQty(100)', "Количество проверяется строго")],
      solution: "function almostEqual(a, b) {\n  return Math.abs(a - b) < Number.EPSILON;\n}\nfunction validQty(n) {\n  return Number.isSafeInteger(n) && n >= 1 && n <= 99;\n}"
    })],
    quizzes: [
      single("js-safe-int", "Точность", "Что вернёт `2 ** 53 === 2 ** 53 + 1`?", [["true", "true"], ["false", "false"], ["err", "Ошибку"], ["nan", "NaN"]], "true", "За пределом безопасных целых точность теряется."),
      single("js-isfinite-strict", "Строгая проверка", "Что вернёт `Number.isFinite(\"5\")`?", [["false", "false"], ["true", "true"], ["nan", "NaN"], ["5", "5"]], "false", "Строки не превращаются.")
    ]
  });

  L({
    slug: "number-format", title: "Числа в строку", summary: "toString с основанием, toPrecision, toExponential, toLocaleString и valueOf у чисел.",
    skill: ["js-number-format", "Форматирование чисел", "Превращать числа в строки нужного вида."],
    now: "Превращаем числа в строки нужного вида.",
    body: [
      scene("Разные виды",
        ["you", "Мне нужен цвет в виде «c8763a», а не 13137466."],
        ["bro", "`toString(16)` — и число превратится в шестнадцатеричную строку."]),
      meth("toString(основание)", "Число в любой системе", "`(255).toString(16)` → «ff», `(5).toString(2)` → «101».", "Цвета, двоичные маски.", "console.log((13137466).toString(16), (5).toString(2));", { covers: on("Number.prototype", "toString") }),
      meth("toPrecision()", "Значащие цифры", "`(1234.5).toPrecision(3)` → «1.23e+3», `(0.004567).toPrecision(2)` → «0.0046».", "Округлить до точности измерения.", "console.log((1234.5).toPrecision(6), (0.004567).toPrecision(2));", { covers: on("Number.prototype", "toPrecision") }),
      meth("toExponential()", "Научная запись", "`(123456).toExponential(2)` → «1.23e+5».", "Очень большие и малые величины.", "console.log((123456).toExponential(2), (0.00015).toExponential());", { covers: on("Number.prototype", "toExponential") }),
      meth("toLocaleString()", "Число по-русски", "`(1250.5).toLocaleString(\"ru-RU\")` → «1 250,5». Принимает те же настройки, что `Intl.NumberFormat`.", "Цены и количества для людей.", 'console.log((1250.5).toLocaleString("ru-RU"), (1250.5).toLocaleString("ru-RU", { style: "currency", currency: "RUB" }));', { covers: on("Number.prototype", "toLocaleString") }),
      meth("valueOf()", "Примитив из обёртки", "Возвращает число из объекта `new Number(…)`.", "Понимать обёртки.", "console.log(typeof new Number(5), typeof new Number(5).valueOf());", { covers: on("Number.prototype", "valueOf") }),
      rule("Для людей — `toLocaleString`, для машин — `toString` и `toFixed`.")
    ],
    tasks: [task("Цвет и цена", "Напиши `hex(n)` — шестнадцатеричная строка из 6 символов с ведущими нулями (`toString(16)` + `padStart`), и `rub(n)` — цена через `toLocaleString(\"ru-RU\")` + ` ₽`.", {
      start: "function hex(n) {\n  return String(n);\n}\nfunction rub(n) {\n  return n + \" ₽\";\n}\n",
      checks: [run('hex(13137466) === "c8763a" && hex(255) === "0000ff"', "Шестнадцатеричный цвет"), run('rub(1250) === (1250).toLocaleString("ru-RU") + " ₽"', "Цена по-русски")],
      solution: 'function hex(n) {\n  return n.toString(16).padStart(6, "0");\n}\nfunction rub(n) {\n  return n.toLocaleString("ru-RU") + " ₽";\n}'
    })],
    quizzes: [
      single("js-tostring-2", "Двоичная", "Что вернёт `(6).toString(2)`?", [["110", "\"110\""], ["6", "\"6\""], ["11", "\"11\""], ["101", "\"101\""]], "110", "6 = 4 + 2."),
      single("js-toprecision", "Точность", "Что делает `toPrecision(3)`?", [["sig", "Оставляет 3 значащие цифры"], ["frac", "3 знака после запятой"], ["round", "Округляет до сотен"], ["exp", "Всегда научная запись"]], "sig", "Знаки после запятой — это toFixed.")
    ]
  });

  L({
    slug: "bigint", title: "BigInt: огромные целые", summary: "Тип BigInt, конструктор BigInt(), операции, BigInt.asIntN, asUintN, toString, toLocaleString и valueOf.",
    skill: ["js-bigint", "BigInt", "Считать с целыми любого размера без потери точности."],
    now: "Считаем с целыми любого размера: BigInt.",
    body: [
      scene("Огромные номера",
        ["you", "Банк присылает номера платежей длиной 20 цифр — и последние цифры портятся!"],
        ["bro", "Обычное число точно только до 2⁵³. Для любых целых есть BigInt."]),
      fnc("BigInt()", "Создать BigInt", "`BigInt(\"12345678901234567890\")` или литерал `123n`. Не смешивается с обычными числами в арифметике: `1n + 1` — ошибка. Деление отбрасывает дробь.", "Номера, криптография, точные целые.", 'const id = BigInt("12345678901234567890");\nconsole.log(id + 1n, 7n / 2n, typeof id);', { covers: ["BigInt"] }),
      meth("BigInt.asIntN() · BigInt.asUintN()", "Обрезать до N бит", "`BigInt.asUintN(8, 257n)` → 1n — как переполнение в 8-битном целом без знака; `asIntN` — со знаком.", "Эмуляция целых фиксированной длины.", "console.log(BigInt.asUintN(8, 257n), BigInt.asIntN(8, 255n));", { covers: on("BigInt", "asIntN", "asUintN") }),
      meth("toString() · toLocaleString() · valueOf()", "Вывод BigInt", "`toString(16)` — в любой системе, `toLocaleString(\"ru-RU\")` — с разрядами, `valueOf()` — примитив.", "Показать большое число человеку.", 'const n = 12345678901234567890n;\nconsole.log(n.toString(16), n.toLocaleString("ru-RU"), typeof n.valueOf());', { covers: on("BigInt.prototype", "toString", "toLocaleString", "valueOf") }),
      rule("BigInt и Number не смешиваются: переводи явно — `BigInt(n)` или `Number(big)`.")
    ],
    tasks: [task("Номер платежа", "Напиши `nextId(id)`: принимает строку из цифр, возвращает строку следующего номера через BigInt (без потери точности).", {
      start: "function nextId(id) {\n  return String(Number(id) + 1);\n}\n",
      checks: [run('nextId("12345678901234567890") === "12345678901234567891"', "Точно для 20 цифр"), run('nextId("9") === "10"', "И для маленьких")],
      solution: "function nextId(id) {\n  return String(BigInt(id) + 1n);\n}"
    })],
    quizzes: [
      single("js-bigint-mix", "Смешивание", "Что будет при `10n + 1`?", [["err", "TypeError — нельзя смешивать BigInt и Number"], ["11n", "11n"], ["11", "11"], ["str", "\"101\""]], "err", "Нужно явное преобразование."),
      single("js-bigint-div", "Деление", "Чему равно `7n / 2n`?", [["3n", "3n"], ["three-half", "3.5"], ["4n", "4n"], ["err", "Ошибка"]], "3n", "Дробная часть отбрасывается.")
    ]
  });

  L({
    slug: "math-basic", title: "Math: округление, степени, корни", summary: "Math.trunc, Math.sign, Math.pow, Math.sqrt, Math.cbrt, Math.hypot, Math.exp, Math.expm1, Math.log, Math.log2, Math.log10, Math.log1p и константы E, PI, SQRT2, SQRT1_2, LN2, LN10, LOG2E, LOG10E.",
    skill: ["js-math-basic", "Математика", "Пользоваться степенями, корнями, логарифмами и константами Math."],
    now: "Пользуемся степенями, корнями, логарифмами и константами Math.",
    body: [
      scene("Вся математика",
        ["you", "Сколько до пользователя по прямой, если он на 3 км восточнее и 4 км севернее?"],
        ["bro", "`Math.hypot(3, 4)` — 5 км. У Math есть всё: корни, степени, логарифмы, константы."]),
      fnc("Math.trunc() · Math.sign()", "Целая часть и знак", "`trunc` отбрасывает дробь (в отличие от `floor` для отрицательных); `sign` даёт −1, 0 или 1.", "Целая часть без округления; направление изменения.", "console.log(Math.trunc(-4.7), Math.floor(-4.7), Math.sign(-3), Math.sign(0));", { covers: M("trunc", "sign") }),
      fnc("Math.pow() · Math.sqrt() · Math.cbrt()", "Степень и корни", "`pow(2, 10)` = `2 ** 10`; `sqrt` — квадратный корень, `cbrt` — кубический.", "Площади, объёмы, формулы.", "console.log(Math.pow(2, 10), Math.sqrt(16), Math.cbrt(27));", { covers: M("pow", "sqrt", "cbrt") }),
      fnc("Math.hypot()", "Длина вектора", "Корень из суммы квадратов: `hypot(3, 4)` → 5.", "Расстояние между точками.", "console.log(Math.hypot(3, 4), Math.hypot(1, 2, 2));", { covers: M("hypot") }),
      fnc("Math.exp() · Math.expm1()", "Экспонента", "`exp(x)` = eˣ; `expm1(x)` = eˣ − 1 точно для маленьких x.", "Рост, затухание, проценты.", "console.log(Math.exp(1), Math.expm1(1e-10));", { covers: M("exp", "expm1") }),
      fnc("Math.log() · Math.log2() · Math.log10() · Math.log1p()", "Логарифмы", "Натуральный, по основанию 2 и 10; `log1p(x)` = ln(1 + x) точно для малых x.", "Сколько раз удвоить, порядок величины.", "console.log(Math.log(Math.E), Math.log2(8), Math.log10(1000), Math.log1p(1e-10));", { covers: M("log", "log2", "log10", "log1p") }),
      val("Math.PI · Math.E", "Пи и e", "`Math` — встроенный объект с константами и функциями (не конструктор). π ≈ 3.14159 и e ≈ 2.71828.", "Окружности и экспоненты.", "const r = 4;\nconsole.log((Math.PI * r ** 2).toFixed(1), Math.E.toFixed(3));", { covers: ["Math", ...M("PI", "E")] }),
      val("Math.SQRT2 · Math.SQRT1_2", "Корни из 2 и ½", "√2 ≈ 1.414 и √½ ≈ 0.707.", "Диагонали, нормировка.", "console.log(Math.SQRT2, Math.SQRT1_2);", { covers: M("SQRT2", "SQRT1_2") }),
      val("Math.LN2 · Math.LN10 · Math.LOG2E · Math.LOG10E", "Логарифмические константы", "ln 2, ln 10, log₂e и log₁₀e — для перевода между основаниями.", "Готовые точные значения.", "console.log(Math.LN2, Math.LN10, Math.LOG2E, Math.LOG10E);", { covers: M("LN2", "LN10", "LOG2E", "LOG10E") }),
      rule("Расстояние — `Math.hypot`, а не `Math.sqrt(a*a + b*b)`: короче и без переполнения.")
    ],
    tasks: [task("Доставка", "Напиши `distance(dx, dy)` через `Math.hypot`, и `cylinderVolume(r, h)` — объём цилиндра `PI * r² * h`, округлённый `Math.round`.", {
      start: "function distance(dx, dy) {\n  return dx + dy;\n}\nfunction cylinderVolume(r, h) {\n  return 0;\n}\n",
      checks: [run("distance(3, 4) === 5", "3 и 4 → 5 км"), run("cylinderVolume(4, 10) === 503", "Объём цилиндра"), has("hypot", "Через Math.hypot")],
      solution: "function distance(dx, dy) {\n  return Math.hypot(dx, dy);\n}\nfunction cylinderVolume(r, h) {\n  return Math.round(Math.PI * r ** 2 * h);\n}"
    })],
    quizzes: [
      single("js-trunc-floor", "trunc и floor", "Что вернут `Math.trunc(-2.5)` и `Math.floor(-2.5)`?", [["m2-m3", "−2 и −3"], ["m3-m2", "−3 и −2"], ["same", "Оба −2"], ["both3", "Оба −3"]], "m2-m3", "trunc отбрасывает дробь, floor — вниз."),
      short("js-log2", "log2", "Чему равен `Math.log2(1024)`? Введи число.", ["10"], "2¹⁰ = 1024.")
    ]
  });

  L({
    slug: "math-trig", title: "Math: тригонометрия и биты", summary: "Math.sin, cos, tan, asin, acos, atan, atan2, гиперболические sinh, cosh, tanh, asinh, acosh, atanh, а также clz32, imul, fround и f16round.",
    skill: ["js-math-trig", "Тригонометрия", "Использовать тригонометрию для анимаций и графики и низкоуровневые функции Math."],
    now: "Тригонометрия и низкоуровневые функции Math.",
    body: [
      scene("Углы",
        ["you", "Хочу, чтобы точки кружились вокруг логотипа по кругу."],
        ["bro", "Координаты на окружности — это `cos` и `sin` угла. Углы в радианах."]),
      fnc("Math.sin() · Math.cos() · Math.tan()", "Синус, косинус, тангенс", "Принимают угол в радианах: градусы × π / 180.", "Точки на окружности, колебания в анимации.", "const deg = 60, rad = deg * Math.PI / 180;\nconsole.log(Math.cos(rad).toFixed(2), Math.sin(rad).toFixed(2), Math.tan(Math.PI / 4).toFixed(2));", { covers: M("sin", "cos", "tan") }),
      fnc("Math.asin() · Math.acos() · Math.atan()", "Обратные функции", "Угол по значению синуса, косинуса или тангенса (в радианах).", "Найти угол по сторонам.", "console.log(Math.asin(1) * 180 / Math.PI, Math.acos(0.5) * 180 / Math.PI, Math.atan(1) * 180 / Math.PI);", { covers: M("asin", "acos", "atan") }),
      fnc("Math.atan2()", "Угол точки", "`atan2(y, x)` — угол от оси X до точки, во всех четырёх четвертях.", "Повернуть стрелку к курсору.", "console.log(Math.atan2(1, -1) * 180 / Math.PI);", { covers: M("atan2") }),
      fnc("Math.sinh() · Math.cosh() · Math.tanh()", "Гиперболические", "Гиперболические синус, косинус, тангенс. `tanh` — плавная «ступенька» от −1 до 1.", "Плавные кривые, физика, нейросети.", "console.log(Math.sinh(1).toFixed(3), Math.cosh(0), Math.tanh(10).toFixed(3));", { covers: M("sinh", "cosh", "tanh") }),
      fnc("Math.asinh() · Math.acosh() · Math.atanh()", "Обратные гиперболические", "Обратные к sinh, cosh и tanh.", "Обратные расчёты в формулах.", "console.log(Math.asinh(Math.sinh(2)), Math.acosh(1), Math.atanh(0));", { covers: M("asinh", "acosh", "atanh") }),
      fnc("Math.clz32() · Math.imul()", "32-битные операции", "`clz32(x)` — число ведущих нулевых битов в 32-битном представлении; `imul(a, b)` — умножение как в 32-битных целых.", "Хэши, бинарные алгоритмы.", "console.log(Math.clz32(1), Math.clz32(0xffffffff), Math.imul(0xffffffff, 5));", { covers: M("clz32", "imul") }),
      fnc("Math.fround() · Math.f16round()", "Округлить до float32 и float16", "Ближайшее число одинарной (32 бит) или половинной (16 бит) точности.", "Предсказать, что сохранится в Float32Array или Float16Array.", "console.log(Math.fround(5.05), Math.f16round(5.05));", { covers: M("fround", "f16round") }),
      rule("Тригонометрия в JavaScript — в радианах. Из градусов: `deg * Math.PI / 180`.")
    ],
    tasks: [task("Зёрна по кругу", "Напиши `pointOnCircle(r, deg)`: возвращает `{ x, y }` точки окружности радиуса `r` под углом `deg` градусов, округлив координаты до 2 знаков (`Math.round(v * 100) / 100`).", {
      start: "function pointOnCircle(r, deg) {\n  return { x: r, y: 0 };\n}\n",
      checks: [run("(() => { const p = pointOnCircle(10, 90); return p.x === 0 && p.y === 10; })()", "90° — вверху"), run("(() => { const p = pointOnCircle(2, 45); return p.x === 1.41 && p.y === 1.41; })()", "45° — по диагонали")],
      solution: "function pointOnCircle(r, deg) {\n  const rad = deg * Math.PI / 180;\n  const round = (v) => Math.round(v * 100) / 100;\n  return { x: round(r * Math.cos(rad)), y: round(r * Math.sin(rad)) };\n}"
    })],
    quizzes: [
      single("js-radians", "Радианы", "В каких единицах угол для `Math.sin`?", [["rad", "В радианах"], ["deg", "В градусах"], ["turn", "В оборотах"], ["any", "В любых"]], "rad", "180° = π радиан."),
      single("js-atan2", "atan2", "Чем `Math.atan2(y, x)` лучше `Math.atan(y / x)`?", [["quad", "Правильно определяет угол во всех четвертях и при x = 0"], ["fast", "Он быстрее"], ["deg", "Возвращает градусы"], ["same", "Ничем"]], "quad", "Учитывает знаки обоих аргументов.")
    ]
  });
}
