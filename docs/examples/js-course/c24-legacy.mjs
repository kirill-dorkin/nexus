// Chapter 24: Legacy (ECMAScript Annex B) — what old code uses and what to write instead.
import { scene, rule, meth, kw, run, has, lacks, task, makeLesson, on } from "./kit.mjs";

const S = (...m) => on("String.prototype", ...m);
const OP = (...m) => on("Object.prototype", ...m);

export default function legacy(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "legacy-strings-dates", title: "Устаревшее: строки и даты", summary: "HTML-методы строк anchor, big, blink, bold, fixed, fontcolor, fontsize, italics, link, small, strike, sub, sup; substr, trimLeft, trimRight; getYear, setYear и toGMTString у дат.",
    skill: ["js-legacy-strings", "Устаревшие методы строк и дат", "Узнавать устаревшие методы в старом коде и заменять их современными."],
    now: "Достался старый скрипт «Зерна» 2005 года. Он полон странных методов — разбираем и переписываем.",
    body: [
      scene("Скрипт из 2005-го",
        ["lev", "Это я писал в 2005-м! Тогда так было можно…"],
        ["nika", "Эти методы оставлены ради старых сайтов — приложение B стандарта. Узнаём их и пишем по-новому."]),
      meth("anchor · big · blink · bold · fixed · fontcolor · fontsize · italics", "HTML-методы строк, часть 1", "Оборачивают строку в старые HTML-теги: `\"Хит\".bold()` → `<b>Хит</b>`, `fontcolor(\"red\")` → `<font color=\"red\">`. Многие из этих тегов давно удалены из HTML.", "Только узнать в древнем коде. Сегодня — разметка и CSS.", 'console.log("Хит".bold(), "Скидка".fontcolor("red"), "Раздел".anchor("menu"));', { covers: S("anchor", "big", "blink", "bold", "fixed", "fontcolor", "fontsize", "italics") }),
      meth("link() · small() · strike() · sub() · sup()", "HTML-методы строк, часть 2", "`link(url)` → `<a href>`, `small` → `<small>`, `strike` → `<strike>`, `sub`/`sup` — нижний и верхний индекс.", "Только узнать в древнем коде.", 'console.log("Меню".link("/menu"), "H".concat("2".sub(), "O"), "м".concat("2".sup()));', { covers: S("link", "small", "strike", "sub", "sup") }),
      meth("substr() · trimLeft() · trimRight()", "Старые строковые методы", "`substr(start, length)` — кусок по началу и длине (вместо него `slice`); `trimLeft`/`trimRight` — старые имена `trimStart`/`trimEnd`.", "Переписать на `slice`, `trimStart`, `trimEnd`.", 'console.log("Капучино".substr(2, 3), "Капучино".slice(2, 5), "[" + "  раф".trimLeft() + "]");', { covers: S("substr", "trimLeft", "trimRight") }),
      meth("getYear() · setYear() · toGMTString()", "Старые методы дат", "`getYear()` — год минус 1900 (2026 → 126), `setYear()` — его пара, `toGMTString()` — старое имя `toUTCString()`.", "Вместо них: `getFullYear`, `setFullYear`, `toUTCString`.", "const d = new Date(Date.UTC(2026, 10, 2));\nconsole.log(d.getYear(), d.getFullYear(), d.toGMTString() === d.toUTCString());", { covers: on("Date.prototype", "getYear", "setYear", "toGMTString") }),
      rule("Видишь в коде `substr`, `getYear` или `.bold()` — переписывай: `slice`, `getFullYear` и разметка.")
    ],
    tasks: [task("Переписать 2005-й", "Перепиши функцию `promo(name, year)` без устаревших методов: вместо `name.substr(0, 3)` — `slice`, вместо `getYear() + 1900` — `getFullYear()`, вместо `.bold()` — шаблонная строка с `<b>`.", {
      start: "function promo(name, date) {\n  return name.substr(0, 3).bold() + \" \" + (date.getYear() + 1900);\n}\n",
      checks: [run('promo("Капучино", new Date(2026, 5, 1)) === "<b>Кап</b> 2026"', "Результат тот же"), lacks("substr", "Без substr"), lacks("getYear", "Без getYear"), lacks(".bold(", "Без .bold()")],
      solution: "function promo(name, date) {\n  return `<b>${name.slice(0, 3)}</b> ${date.getFullYear()}`;\n}"
    })],
    quizzes: [
      single("js-getyear", "getYear", "Что вернёт `new Date(2026, 0).getYear()`?", [["126", "126"], ["2026", "2026"], ["26", "26"], ["err", "Ошибку"]], "126", "Год минус 1900 — поэтому метод и устарел."),
      single("js-substr", "substr", "Чем заменить `str.substr(2, 3)`?", [["slice", "`str.slice(2, 5)`"], ["substring", "`str.substring(3, 2)`"], ["at", "`str.at(2)`"], ["split", "`str.split(2)`"]], "slice", "Второй аргумент slice — конец, а не длина.")
    ]
  });

  L({
    slug: "legacy-objects", title: "Устаревшее: объекты и функции", summary: "__proto__, __defineGetter__, __defineSetter__, __lookupGetter__, __lookupSetter__, RegExp.prototype.compile, arguments и caller у функций.",
    skill: ["js-legacy-objects", "Устаревшие возможности объектов", "Узнавать старые способы работы с прототипами и свойствами и знать современные замены."],
    now: "В старом скрипте — `__proto__` и `__defineGetter__`. Переписываем на современный JavaScript.",
    body: [
      scene("Подчёркивания",
        ["bug", "`obj.__proto__ = evil` — и всё наследование моё! Хе-хе."],
        ["nika", "Это старые служебные свойства. У каждого есть современная замена — понятная и безопасная."]),
      kw("__proto__", "Старый доступ к прототипу", "Свойство-аксессор `obj.__proto__` читает и меняет прототип. Замены: `Object.getPrototypeOf` и `Object.setPrototypeOf`; в литерале `{ __proto__: p }` ещё допустим.", "Узнать в старом коде; опасен при разборе чужих ключей.", "const base = { hi() { return \"привет\"; } };\nconst o = { __proto__: base };\nconsole.log(o.hi(), o.__proto__ === Object.getPrototypeOf(o));", { covers: OP("__proto__") }),
      meth("__defineGetter__ · __defineSetter__ · __lookupGetter__ · __lookupSetter__", "Старые геттеры и сеттеры", "Определяют и находят геттеры и сеттеры свойства. Замены: `get`/`set` в литерале и классе, `Object.defineProperty`, `Object.getOwnPropertyDescriptor`.", "Переписать на современные дескрипторы.", 'const cup = { ml: 350 };\ncup.__defineGetter__("liters", function () { return this.ml / 1000; });\nconsole.log(cup.liters, typeof cup.__lookupGetter__("liters"), cup.__lookupSetter__("liters"));\ncup.__defineSetter__("liters", function (v) { this.ml = v * 1000; });\ncup.liters = 0.45;\nconsole.log(cup.ml);', { covers: OP("__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__") }),
      meth("RegExp: compile()", "Перекомпиляция регулярки", "`re.compile(\"новый\", \"флаги\")` меняет шаблон существующего объекта. Замена — просто создать новый: `new RegExp(…)`.", "Узнать в старом коде.", 'const re = /латте/;\nre.compile("раф", "i");\nconsole.log(re.test("РАФ"), re.source);', { covers: ["RegExp.prototype.compile"] }),
      kw("arguments · caller у функций", "Запрещённые свойства функций", "`fn.arguments` и `fn.caller` из старых движков. У строгих функций, стрелок и классов обращение к ним бросает TypeError. Замены: параметры `...rest` и стек ошибки для отладки.", "Знать, почему старый код падает в строгом режиме.", '"use strict";\nfunction f() {}\ntry { f.caller; } catch (e) { console.log(e.name); }', { covers: on("Function.prototype", "arguments", "caller") }),
      rule("Двойные подчёркивания в именах — сигнал: метод устарел, ищи современную замену.")
    ],
    tasks: [task("Современный стакан", "Перепиши `makeCup(ml)` без `__defineGetter__` и `__proto__`: верни объект с прототипом `base` (через `Object.create`) и обычным геттером `liters`.", {
      start: "const base = { kind: \"стакан\" };\nfunction makeCup(ml) {\n  const cup = { ml };\n  cup.__proto__ = base;\n  cup.__defineGetter__(\"liters\", function () { return this.ml / 1000; });\n  return cup;\n}\n",
      checks: [run('(() => { const c = makeCup(350); return c.liters === 0.35 && c.kind === "стакан" && Object.getPrototypeOf(c) === base; })()', "Работает как раньше"), lacks("__proto__", "Без __proto__"), lacks("__defineGetter__", "Без __defineGetter__")],
      solution: "const base = { kind: \"стакан\" };\nfunction makeCup(ml) {\n  const cup = Object.create(base);\n  cup.ml = ml;\n  Object.defineProperty(cup, \"liters\", { get() { return this.ml / 1000; }, enumerable: true });\n  return cup;\n}"
    })],
    quizzes: [single("js-proto-modern", "__proto__", "Чем заменить чтение `obj.__proto__`?", [["get", "`Object.getPrototypeOf(obj)`"], ["proto", "`obj.prototype`"], ["ctor", "`obj.constructor`"], ["this", "`this.__proto__`"]], "get", "А запись — Object.setPrototypeOf.")]
  });
}
