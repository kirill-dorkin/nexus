// Chapter 18: Regular expressions — syntax, flags, RegExp members, groups and lookarounds.
import { scene, rule, meth, obj, kw, val, idea, run, has, task, makeLesson, on } from "./kit.mjs";

const R = (...m) => on("RegExp.prototype", ...m);

export default function regexp(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "regexp-basics", title: "Регулярные выражения: основы", summary: "RegExp и литерал, test, exec и lastIndex, классы символов, квантификаторы, якоря, source и toString.",
    skill: ["js-regexp-basics", "Основы регулярок", "Описывать шаблоны текста и проверять строки."],
    now: "Гости вводят телефоны как попало. Проверяем формат регулярным выражением.",
    body: [
      scene("Любой формат",
        ["marta", "Телефоны приходят как «+7 (999) 123-45-67», «89991234567», «999 123 45 67»…"],
        ["bro", "Регулярное выражение — мини-язык шаблонов. Опишем «одиннадцать цифр с любыми разделителями»."]),
      obj("RegExp", "Регулярное выражение", "`/шаблон/флаги` или `new RegExp(\"шаблон\", \"флаги\")` — второй способ нужен, если шаблон собирается из строки.", "Поиск, проверка и замена по шаблону.", 'const re = new RegExp("ла" + "тте", "i");\nconsole.log(re, re.test("ЛАТТЕ"));', { covers: ["RegExp"] }),
      idea("Синтаксис шаблона", "Символы, классы и повторы", "`\\d` цифра, `\\w` буква/цифра/_, `\\s` пробел, `.` любой символ, `[абв]` один из, `[^…]` кроме; `*` 0+, `+` 1+, `?` 0–1, `{2,4}`; `^` начало, `$` конец, `|` или, `\\b` граница слова.", "Описать любой формат.", 'console.log(/^\\d{3}-\\d{2}$/.test("123-45"), /^[A-Z]+\\d+$/.test("ZERNO10"), /кофе|чай/.test("зелёный чай"));', { covers: [] }),
      meth("test()", "Подходит ли", "`re.test(str)` → true или false.", "Проверка формата.", 'console.log(/^\\+?\\d{11}$/.test("+79991234567"));', { covers: R("test") }),
      meth("exec() · lastIndex", "Подробное совпадение", "`exec(str)` — массив совпадения с группами и `index`, или `null`. С флагами `g`/`y` хранит позицию в `lastIndex` и находит следующее при каждом вызове.", "Пошаговый разбор текста.", 'const re = /\\d+/g;\nconst text = "латте 220, раф 290";\nlet m;\nwhile ((m = re.exec(text))) console.log(m[0], "на позиции", m.index, "lastIndex", re.lastIndex);', { covers: R("exec") }),
      kw("source · toString()", "Текст шаблона", "`source` — шаблон без слэшей и флагов, `toString()` — как литерал `/…/flags`.", "Отладка и сборка новых регулярок.", 'const re = /\\d+/gi;\nconsole.log(re.source, re.toString());', { covers: R("source", "toString") }),
      rule("Пиши якоря `^` и `$`, когда проверяешь всю строку целиком, — иначе подойдёт и кусок.")
    ],
    tasks: [task("Проверка телефона", "Напиши `validPhone(s)`: убери из строки всё, кроме цифр (`replace(/\\D/g, \"\")`), и проверь, что осталось ровно 11 цифр, начинающихся с 7 или 8 (`test` с якорями).", {
      start: "function validPhone(s) {\n  return s.length > 5;\n}\n",
      checks: [run('validPhone("+7 (999) 123-45-67") && validPhone("89991234567")', "Разные форматы проходят"), run('!validPhone("123-45") && !validPhone("+1 999 123 45 67")', "Неверные — нет"), has("test(", "Через `test`")],
      solution: 'function validPhone(s) {\n  return /^[78]\\d{10}$/.test(s.replace(/\\D/g, ""));\n}'
    })],
    quizzes: [
      single("js-re-anchors", "Якоря", "Что даст `/\\d{3}/.test(\"ab1234\")`?", [["true", "true — нашлись три цифры подряд"], ["false", "false"], ["err", "Ошибку"], ["null", "null"]], "true", "Без ^ и $ подходит часть строки."),
      single("js-re-plus", "Квантификатор", "Что значит `+` в регулярке?", [["one", "Один или больше раз"], ["zero", "Ноль или больше"], ["opt", "Ноль или один"], ["plus", "Знак плюс"]], "one", "`*` — ноль и больше.")
    ]
  });

  L({
    slug: "regexp-flags", title: "Флаги регулярок", summary: "Флаги g, i, m, s, u, v, y, d и свойства global, ignoreCase, multiline, dotAll, unicode, unicodeSets, sticky, hasIndices и flags.",
    skill: ["js-regexp-flags", "Флаги", "Включать нужное поведение регулярного выражения флагами."],
    now: "Регулярка ищет только первое совпадение и спотыкается о кириллицу и эмодзи. Разбираем флаги.",
    body: [
      scene("Флаги",
        ["bug", "/латте/ не найдёт «ЛАТТЕ», а /./ разрежет эмодзи пополам! Хе-хе."],
        ["nika", "Поведение регулярки меняют флаги после второго слэша. Каждому — своё свойство-проверка."]),
      kw("g · global", "Все совпадения", "Флаг `g`: искать все совпадения (для `match`, `replace`, `matchAll`); свойство `global` — включён ли.", "Заменить все вхождения.", 'console.log("а-б-в".replace(/-/g, "+"), /x/g.global);', { covers: R("global") }),
      kw("i · ignoreCase", "Без учёта регистра", "Флаг `i`; свойство `ignoreCase`.", "Поиск «латте» и «Латте».", 'console.log(/латте/i.test("ЛАТТЕ"), /x/i.ignoreCase);', { covers: R("ignoreCase") }),
      kw("m · multiline", "Многострочный режим", "Флаг `m`: `^` и `$` срабатывают на каждой строке, а не только в начале и конце текста.", "Разбор многострочного текста.", 'console.log("латте\\nраф".match(/^\\p{L}+$/gmu));', { covers: R("multiline") }),
      kw("s · dotAll", "Точка — любой символ", "Флаг `s`: `.` совпадает и с переводом строки.", "Захват многострочных блоков.", 'console.log(/а.б/.test("а\\nб"), /а.б/s.test("а\\nб"), /x/s.dotAll);', { covers: R("dotAll") }),
      kw("u · unicode", "Юникод", "Флаг `u`: эмодзи — один символ, работают `\\p{…}` (`\\p{L}` — любая буква любого алфавита).", "Тексты на любых языках и с эмодзи.", 'console.log("🍵".match(/./g).length, "🍵".match(/./gu).length, /\\p{L}+/u.test("Ёж"), /x/u.unicode);', { covers: R("unicode") }),
      kw("v · unicodeSets", "Расширенный Юникод", "Флаг `v` — улучшенный `u`: операции над классами (`[\\p{L}--[a-z]]`), свойства строк.", "Сложные классы символов.", 'console.log(/^[\\p{L}--[a-z]]+$/v.test("Ёж"), /x/v.unicodeSets);', { covers: R("unicodeSets") }),
      kw("y · sticky", "Липкий поиск", "Флаг `y`: совпадение должно начинаться ровно с `lastIndex`.", "Пошаговые парсеры.", 'const re = /\\d+/y;\nre.lastIndex = 6;\nconsole.log(re.test("латте 220"), re.sticky);', { covers: R("sticky") }),
      kw("d · hasIndices", "Индексы групп", "Флаг `d`: у совпадения появляется `indices` — начало и конец каждой группы.", "Подсветка найденного в тексте.", 'const m = /(?<price>\\d+)/d.exec("латте 220");\nconsole.log(m.indices.groups.price, /x/d.hasIndices);', { covers: R("hasIndices") }),
      kw("flags", "Все флаги строкой", "Свойство `flags` — все включённые флаги, например `\"giu\"`.", "Скопировать регулярку с теми же флагами.", 'const re = /x/gimsu;\nconsole.log(re.flags, new RegExp("y", re.flags).flags);', { covers: R("flags") }),
      rule("Работаешь с русским текстом и эмодзи — ставь флаг `u` (или `v`) всегда.")
    ],
    tasks: [task("Слова на любом языке", "Напиши `words(text)`: массив всех слов (последовательностей букв любого алфавита) через `match` с `\\p{L}+` и флагами `g` и `u`, или `[]`.", {
      start: "function words(text) {\n  return text.split(\" \");\n}\n",
      checks: [run('words("Латте, café и 2 чашки!").join() === "Латте,café,и,чашки"', "Только слова, любые алфавиты"), run("words(\"123\").length === 0", "Нет слов — пустой массив")],
      solution: "function words(text) {\n  return text.match(/\\p{L}+/gu) ?? [];\n}"
    })],
    quizzes: [
      single("js-flag-g", "Флаг g", "Что меняет флаг `g` в `replace`?", [["all", "Заменяет все совпадения, а не первое"], ["case", "Игнорирует регистр"], ["line", "Многострочный режим"], ["none", "Ничего"]], "all", "Без g — только первое."),
      single("js-flag-u", "Флаг u", "Зачем флаг `u`?", [["unicode", "Правильная работа с Юникодом и \\p{…}"], ["upper", "Только заглавные"], ["unique", "Уникальные совпадения"], ["url", "Для адресов"]], "unicode", "Эмодзи становятся одним символом.")
    ]
  });

  L({
    slug: "regexp-groups", title: "Группы, замены и экранирование", summary: "Группы ( ), именованные (?<name>), обратные ссылки, lookahead и lookbehind, замены с $1 и функцией, RegExp.escape и символы Symbol.match, matchAll, replace, search, split.",
    skill: ["js-regexp-groups", "Группы и замены", "Извлекать части текста и делать умные замены."],
    now: "Превращаем «Латте 220» в объект { drink, price }, и меняем формат дат одной заменой.",
    body: [
      scene("Разобрать на части",
        ["marta", "Из строк «Латте 220» хочу получить название и цену отдельно."],
        ["bro", "Скобки в регулярке запоминают части совпадения — это группы. Им можно дать имена."]),
      idea("Группы и имена", "( ) и (?<имя>…)", "Скобки запоминают часть совпадения: `m[1]`; именованная группа `(?<price>\\d+)` — в `m.groups.price`; `(?:…)` — группа без запоминания; `\\1` или `\\k<имя>` — обратная ссылка.", "Достать части текста по смыслу.", 'const m = "Латте 220".match(/(?<drink>\\p{L}+) (?<price>\\d+)/u);\nconsole.log(m.groups.drink, Number(m.groups.price));\nconsole.log(/(\\p{L})\\1/u.test("кофе ее"));', { covers: [] }),
      idea("Просмотр вперёд и назад", "(?=…) (?!…) (?<=…) (?<!…)", "Условие «дальше/раньше идёт (не идёт) …», которое не входит в совпадение.", "Цифры только перед «₽», слово не после «не».", 'console.log("220₽ 300$".match(/\\d+(?=₽)/g), "латте и не раф".match(/(?<!не )\\p{L}{3,}/gu));', { covers: [] }),
      idea("Замены с группами", "$1, $<name> и функция", "В строке замены `$1`, `$<name>`, `$&` (всё совпадение); вместо строки можно передать функцию `(match, ...groups) => …`.", "Переформатировать даты, цены.", 'console.log("2026-11-02".replace(/(\\d+)-(\\d+)-(\\d+)/, "$3.$2.$1"));\nconsole.log("латте 220".replace(/\\d+/, (p) => p * 2));', { covers: [] }),
      meth("RegExp.escape()", "Экранировать текст для шаблона", "Превращает строку в безопасную часть регулярки: `RegExp.escape(\"1+1\")` экранирует `+`.", "Искать введённый гостем текст, не ломая шаблон.", 'const q = "латте (L)";\nconsole.log(new RegExp(RegExp.escape(q)).test("Большой латте (L)"));', { covers: on("RegExp", "escape") }),
      val("Symbol.match · .matchAll · .replace · .search", "Как строки зовут регулярку", "`str.match(re)` на самом деле вызывает `re[Symbol.match](str)`; так же устроены `matchAll`, `replace` и `search`. Свой объект с такими методами можно передавать в эти методы строк.", "Свои «шаблоны» поиска.", 'const vowels = { [Symbol.search](s) { return s.search(/[аеёиоуыэюя]/i); } };\nconsole.log("Раф".search(vowels));', { covers: on("Symbol", "match", "matchAll", "replace", "search") }),
      val("Symbol.split", "Свой разделитель", "`str.split(sep)` вызывает `sep[Symbol.split](str)`, если такой метод есть.", "Разбивать строку своей логикой.", 'const digits = { [Symbol.split](s) { return s.split(/\\D+/).filter(Boolean); } };\nconsole.log("тел. 8-999-123".split(digits));', { covers: ["Symbol.split"] }),
      rule("Вставляешь в регулярку текст пользователя — сначала `RegExp.escape`.")
    ],
    tasks: [task("Разбор позиции меню", "Напиши `parseItem(line)`: из строки вида `\"Латте 220\"` возвращает `{ drink: \"Латте\", price: 220 }` через именованные группы, или `null`, если формат не подходит.", {
      start: "function parseItem(line) {\n  return null;\n}\n",
      checks: [run('(() => { const r = parseItem("Латте 220"); return r && r.drink === "Латте" && r.price === 220; })()', "Латте 220 разобран"), run('parseItem("просто текст") === null', "Неверный формат — null"), has("?<", "Именованные группы")],
      solution: "function parseItem(line) {\n  const m = line.match(/^(?<drink>\\p{L}+) (?<price>\\d+)$/u);\n  return m ? { drink: m.groups.drink, price: Number(m.groups.price) } : null;\n}"
    })],
    quizzes: [
      single("js-re-named", "Именованная группа", "Где найти значение группы `(?<price>\\d+)`?", [["groups", "`match.groups.price`"], ["prop", "`match.price`"], ["index", "Только `match[0]`"], ["re", "`re.price`"]], "groups", "Именованные группы — в groups."),
      single("js-re-escape", "Экранирование", "Зачем `RegExp.escape(text)`?", [["safe", "Чтобы спецсимволы текста не стали частью шаблона"], ["html", "Экранировать HTML"], ["url", "Кодировать URL"], ["upper", "Привести к верхнему регистру"]], "safe", "Иначе «(» или «+» сломают регулярку.")
    ]
  });
}
