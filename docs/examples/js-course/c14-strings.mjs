// Chapter 14: Strings completely — characters and code points, search, transformation,
// Unicode correctness and locale-aware comparison.
import { scene, rule, meth, idea, run, has, task, makeLesson, on } from "./kit.mjs";

const S = (...m) => on("String.prototype", ...m);

export default function strings(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "string-chars", title: "Символы и коды", summary: "at, charAt, charCodeAt, codePointAt, String.fromCharCode, String.fromCodePoint и почему эмодзи — это два символа.",
    skill: ["js-string-chars", "Символы строки", "Доставать символы и их коды, правильно работать с эмодзи."],
    now: "В названии «Латте ☕» длина 7, а не 6. Разбираемся, из чего сделаны строки.",
    body: [
      scene("Лишний символ",
        ["bug", "\"☕\".length === 1, а \"🍵\".length === 2! Чай весит вдвое больше кофе. Хе-хе."],
        ["nika", "Строка — это последовательность кодовых единиц UTF-16. Некоторые символы занимают две. Разберём все методы для символов."]),
      meth("at()", "Символ по индексу", "`str.at(0)` — первый, `str.at(-1)` — последний. Отрицательные индексы считаются с конца.", "Последняя буква без `length - 1`.", 'console.log("Латте".at(0), "Латте".at(-1));', { covers: S("at") }),
      meth("charAt()", "Символ по индексу (старый)", "`str.charAt(i)` — как `str[i]`, но за пределами вернёт пустую строку вместо `undefined`.", "Старый код и безопасное чтение.", 'console.log("Раф".charAt(1), "Раф".charAt(10) === "", "Раф"[10]);', { covers: S("charAt") }),
      meth("charCodeAt() · codePointAt()", "Код символа", "`charCodeAt(i)` — код UTF-16 (0…65535), `codePointAt(i)` — полный код Unicode, включая эмодзи.", "Сравнение, кодирование, проверки диапазонов.", 'console.log("A".charCodeAt(0), "🍵".charCodeAt(0), "🍵".codePointAt(0));', { covers: S("charCodeAt", "codePointAt") }),
      meth("String.fromCharCode() · String.fromCodePoint()", "Символ из кода", "Обратное превращение: `String.fromCodePoint(127861)` → «🍵».", "Генерировать символы, эмодзи.", "console.log(String.fromCharCode(1047, 1077, 1088, 1085, 1086), String.fromCodePoint(127861));", { covers: on("String", "fromCharCode", "fromCodePoint") }),
      idea("Строка перебором", "for…of и spread идут по символам", "`[...\"чай🍵\"]` разбивает по настоящим символам (кодовым точкам), а не по половинкам эмодзи. Работает через итератор строки.", "Правильно считать символы с эмодзи.", 'console.log("чай🍵".length, [..."чай🍵"].length);', { covers: [] }),
      rule("Длина строки с эмодзи — `[...str].length`, а не `str.length`.")
    ],
    tasks: [task("Честная длина", "Напиши `charCount(str)` — число настоящих символов (с эмодзи), и `lastChar(str)` — последний символ через `at(-1)` для обычных строк.", {
      start: "function charCount(str) {\n  return str.length;\n}\nfunction lastChar(str) {\n  return str[str.length];\n}\n",
      checks: [run('charCount("чай🍵") === 4', "Эмодзи — один символ"), run('lastChar("Латте") === "е"', "Последний символ"), has("at(-1)", "Использован `at(-1)`")],
      solution: "function charCount(str) {\n  return [...str].length;\n}\nfunction lastChar(str) {\n  return str.at(-1);\n}"
    })],
    quizzes: [
      single("js-at-neg", "at", "Что вернёт `\"Раф\".at(-1)`?", [["f", "\"ф\""], ["r", "\"Р\""], ["undef", "undefined"], ["err", "Ошибку"]], "f", "Отрицательный индекс — с конца."),
      single("js-emoji-length", "Эмодзи", "Почему `\"🍵\".length` равно 2?", [["utf16", "Эмодзи занимает две кодовые единицы UTF-16"], ["bug", "Это баг"], ["bytes", "Длина в байтах"], ["space", "В строке есть пробел"]], "utf16", "Суррогатная пара.")
    ]
  });

  L({
    slug: "string-search", title: "Поиск в строке", summary: "indexOf, lastIndexOf, startsWith, endsWith, search, match и matchAll.",
    skill: ["js-string-search", "Поиск в строке", "Находить подстроки и совпадения с шаблоном."],
    now: "В отзывах гостей ищем упоминания напитков и промокоды.",
    body: [
      scene("Отзывы",
        ["marta", "Хочу видеть, какие напитки хвалят в отзывах, и найти все промокоды вида ZERNO10."],
        ["bro", "Для простого поиска — `indexOf` и `startsWith`. Для шаблонов — `match` и `matchAll` с регулярками."]),
      meth("indexOf() · lastIndexOf()", "Где подстрока", "Индекс первого (или последнего) вхождения, `-1` если нет. Второй аргумент — откуда искать.", "Найти позицию, чтобы вырезать кусок.", 'const s = "латте, раф, латте";\nconsole.log(s.indexOf("латте"), s.lastIndexOf("латте"), s.indexOf("какао"));', { covers: S("indexOf", "lastIndexOf") }),
      meth("startsWith() · endsWith()", "Начинается или заканчивается", "`str.startsWith(\"https\")`, `file.endsWith(\".png\")`.", "Проверить префикс и расширение.", 'console.log("ZERNO10".startsWith("ZERNO"), "menu.png".endsWith(".png"));', { covers: S("startsWith", "endsWith") }),
      meth("search()", "Индекс по шаблону", "Как `indexOf`, но принимает регулярное выражение.", "Найти первую цифру, первое слово с заглавной.", 'console.log("Заказ №1042".search(/\\d/));', { covers: S("search") }),
      meth("match()", "Совпадения с шаблоном", "Без флага `g` — первое совпадение с группами; с флагом `g` — массив всех совпадений; нет — `null`.", "Достать все числа или коды из текста.", 'console.log("Скидка ZERNO10 и ZERNO20".match(/ZERNO\\d+/g));', { covers: S("match") }),
      meth("matchAll()", "Все совпадения с группами", "Итератор всех совпадений (нужен флаг `g`), у каждого — группы и индекс.", "Разобрать текст на части.", 'for (const m of "Латте 220, раф 290".matchAll(/(\\p{L}+) (\\d+)/gu)) console.log(m[1], Number(m[2]));', { covers: S("matchAll") }),
      rule("Простая подстрока — `includes`/`indexOf`. Шаблон — регулярка с `match`/`matchAll`.")
    ],
    tasks: [task("Промокоды из отзывов", "Напиши `promoCodes(text)`: массив всех кодов вида `ZERNO` + цифры (через `match` с флагом `g`), или `[]`, если их нет.", {
      start: "function promoCodes(text) {\n  return [];\n}\n",
      checks: [run('promoCodes("Код ZERNO10, а ещё ZERNO25!").join() === "ZERNO10,ZERNO25"', "Найдены все коды"), run('Array.isArray(promoCodes("без кодов")) && promoCodes("без кодов").length === 0', "Нет кодов — пустой массив")],
      solution: "function promoCodes(text) {\n  return text.match(/ZERNO\\d+/g) ?? [];\n}"
    })],
    quizzes: [
      single("js-match-null", "Нет совпадений", "Что вернёт `\"abc\".match(/\\d/g)`?", [["null", "null"], ["empty", "[]"], ["undef", "undefined"], ["false", "false"]], "null", "Поэтому пишут `?? []`."),
      single("js-matchall-flag", "matchAll", "Какой флаг обязателен для `matchAll`?", [["g", "g"], ["i", "i"], ["m", "m"], ["none", "Никакой"]], "g", "Без него — ошибка TypeError.")
    ]
  });

  L({
    slug: "string-transform", title: "Преобразование строк", summary: "substring, concat, repeat, padStart, padEnd, trimStart, trimEnd, toLocaleUpperCase, toLocaleLowerCase, toString и valueOf.",
    skill: ["js-string-transform", "Преобразование строк", "Собирать, выравнивать и чистить строки."],
    now: "Печатаем чек: названия слева, цены справа, ровными колонками.",
    body: [
      scene("Ровный чек",
        ["marta", "Чек кривой: цены прыгают. Хочу ровные колонки, как в настоящей кассе."],
        ["bro", "`padEnd` и `padStart` добивают строку пробелами до нужной длины. Чек станет ровным."]),
      meth("padStart() · padEnd()", "Дополнить до длины", "`\"7\".padStart(3, \"0\")` → «007», `\"Раф\".padEnd(8, \".\")` → «Раф.....».", "Колонки, номера с нулями.", 'console.log("Латте".padEnd(10, ".") + "220".padStart(5));\nconsole.log("Раф".padEnd(10, ".") + "290".padStart(5));\nconsole.log(String(7).padStart(4, "0"));', { covers: S("padStart", "padEnd") }),
      meth("repeat()", "Повторить", "`\"-\".repeat(20)` — строка из 20 дефисов.", "Разделители, рамки.", 'console.log("=".repeat(15));', { covers: S("repeat") }),
      meth("substring()", "Кусок по индексам", "`str.substring(start, end)` — как `slice`, но не понимает отрицательные индексы и меняет местами аргументы, если start > end.", "Старый код; в новом — `slice`.", 'console.log("Капучино".substring(0, 4), "Капучино".substring(4, 0));', { covers: S("substring") }),
      meth("concat()", "Склеить", "`a.concat(b, c)` — то же, что `a + b + c`.", "Узнать в чужом коде.", 'console.log("Латте".concat(" × ", 2));', { covers: S("concat") }),
      meth("trimStart() · trimEnd()", "Пробелы с одной стороны", "Убирают пробелы только в начале или только в конце.", "Аккуратно чистить ввод.", 'console.log("[" + "  Аня  ".trimStart() + "]", "[" + "  Аня  ".trimEnd() + "]");', { covers: S("trimStart", "trimEnd") }),
      meth("toLocaleUpperCase() · toLocaleLowerCase()", "Регистр по правилам языка", "Учитывают язык: в турецком `\"i\".toLocaleUpperCase(\"tr\")` → «İ».", "Регистр для нелатинских языков.", 'console.log("istanbul".toLocaleUpperCase("tr"), "istanbul".toUpperCase());', { covers: S("toLocaleUpperCase", "toLocaleLowerCase") }),
      meth("toString() · valueOf()", "Строка из строкового объекта", "Возвращают примитив строки. Вызываются сами, когда нужна строка.", "Понимать обёртку `new String`.", 'const boxed = new String("Раф");\nconsole.log(typeof boxed, typeof boxed.valueOf(), boxed.toString());', { covers: S("toString", "valueOf") }),
      rule("Ровные колонки в тексте — `padEnd` для названий и `padStart` для чисел.")
    ],
    tasks: [task("Строка чека", "Напиши `line(name, price)`: название, добитое точками до 12 символов (`padEnd`), и цена, выровненная вправо на 5 символов (`padStart`).", {
      start: "function line(name, price) {\n  return name + \" \" + price;\n}\n",
      checks: [run('line("Латте", 220) === "Латте.......  220"', "Латте выровнен"), run('line("Раф", 1290).length === 17', "Одинаковая длина строк")],
      solution: 'function line(name, price) {\n  return name.padEnd(12, ".") + String(price).padStart(5);\n}'
    })],
    quizzes: [
      single("js-padstart", "padStart", "Что вернёт `\"5\".padStart(3, \"0\")`?", [["005", "\"005\""], ["500", "\"500\""], ["5", "\"5\""], ["050", "\"050\""]], "005", "Дополняет слева."),
      single("js-substring-neg", "substring", "Чем `substring` отличается от `slice`?", [["neg", "Не понимает отрицательные индексы"], ["same", "Ничем"], ["mut", "Меняет исходную строку"], ["arr", "Возвращает массив"]], "neg", "Отрицательные превращаются в 0.")
    ]
  });

  L({
    slug: "string-unicode", title: "Юникод и сравнение строк", summary: "normalize, isWellFormed, toWellFormed и localeCompare для сортировки по алфавиту.",
    skill: ["js-string-unicode", "Юникод", "Сравнивать и сортировать строки правильно для любого языка."],
    now: "Гости с именами «Ёжиков» и «Елена» сортируются неправильно, а «café» не равно «café». Чиним.",
    body: [
      scene("Два café",
        ["bug", "Два одинаковых «café» не равны! Один из них я собрал из «e» и отдельного ударения."],
        ["nika", "Юникод позволяет записать один символ по-разному. `normalize` приводит к одному виду."]),
      meth("normalize()", "Единая форма Юникода", "`str.normalize(\"NFC\")` собирает символ с диакритикой в одну кодовую точку; `NFD` — раскладывает.", "Сравнивать имена и искать без сюрпризов.", 'const a = "caf\\u00e9", b = "cafe\\u0301";\nconsole.log(a === b, a.normalize() === b.normalize());', { covers: S("normalize") }),
      meth("isWellFormed() · toWellFormed()", "Целые ли символы", "Строка «плохая», если в ней одиночная половинка суррогатной пары. `toWellFormed()` заменяет такие куски на «�».", "Перед кодированием в URL или отправкой.", 'const broken = "чай\\uD83C";\nconsole.log(broken.isWellFormed(), broken.toWellFormed());', { covers: S("isWellFormed", "toWellFormed") }),
      meth("localeCompare()", "Сравнение по алфавиту языка", "`a.localeCompare(b, \"ru\")` — отрицательное, 0 или положительное число. Правильно сортирует «ё», регистр и акценты.", "Сортировка имён и названий.", 'const names = ["ёлка", "Яна", "ель", "Борис"];\nconsole.log([...names].sort(), [...names].sort((a, b) => a.localeCompare(b, "ru")));', { covers: S("localeCompare") }),
      rule("Сортируешь слова для людей — только `localeCompare`, обычный `sort()` сравнивает коды.")
    ],
    tasks: [task("Список гостей по алфавиту", "Напиши `sortGuests(names)`: новый массив, отсортированный по-русски через `localeCompare`; и `same(a, b)` — равны ли строки после `normalize()`.", {
      start: "function sortGuests(names) {\n  return names.sort();\n}\nfunction same(a, b) {\n  return a === b;\n}\n",
      checks: [run('sortGuests(["яна", "Борис", "ёж", "Аня"]).join() === "Аня,Борис,ёж,яна"', "Русский алфавит, ё и регистр"), run('same("caf\\u00e9", "cafe\\u0301")', "café равно café"), run('(() => { const a = ["б", "а"]; sortGuests(a); return a[0] === "б"; })()', "Исходный массив не изменён")],
      solution: 'function sortGuests(names) {\n  return [...names].sort((a, b) => a.localeCompare(b, "ru"));\n}\nfunction same(a, b) {\n  return a.normalize() === b.normalize();\n}'
    })],
    quizzes: [
      single("js-localecompare", "Сортировка", "Как правильно отсортировать русские имена?", [["locale", "`sort((a, b) => a.localeCompare(b, \"ru\"))`"], ["plain", "`sort()`"], ["reverse", "`reverse()`"], ["upper", "Привести к верхнему регистру и sort()"]], "locale", "Учитывает ё и регистр."),
      single("js-normalize", "normalize", "Зачем `normalize()`?", [["form", "Привести символы с диакритикой к одной записи"], ["trim", "Убрать пробелы"], ["lower", "Сделать строчными"], ["escape", "Экранировать HTML"]], "form", "é может быть одной или двумя кодовыми точками.")
    ]
  });
}
