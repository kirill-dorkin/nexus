// Chapter 22: Intl completely — numbers, plurals, dates, relative time, durations, lists,
// display names, collation, segmentation and locales.
import { scene, rule, meth, obj, fnc, idea, run, has, task, makeLesson, on } from "./kit.mjs";

const LP = (...m) => on("Intl.Locale.prototype", ...m);

export default function intl(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "intl-numbers", title: "Intl: числа и множественное число", summary: "Intl.NumberFormat formatToParts, formatRange, formatRangeToParts; Intl.PluralRules select и selectRange; resolvedOptions и supportedLocalesOf у всех служб Intl.",
    skill: ["js-intl-numbers", "Числа и склонения", "Выводить числа, диапазоны и правильные формы слов на любом языке."],
    now: "«1 чашек», «5 чашка» — склонения на сайте сломаны. Чиним с Intl.",
    body: [
      scene("1 чашек",
        ["bug", "«1 чашек», «2 чашек», «21 чашек»! Русский язык — моя стихия. Хе-хе."],
        ["nika", "Intl знает правила множественного числа для любого языка: one, few, many, other."]),
      obj("Intl.PluralRules · select()", "Форма слова для числа", "`new Intl.PluralRules(\"ru\").select(n)` → `\"one\"` (1, 21), `\"few\"` (2–4, 22), `\"many\"` (5–20) или `\"other\"` (дроби).", "Склонять «чашка/чашки/чашек».", 'const pr = new Intl.PluralRules("ru");\nconst forms = { one: "чашка", few: "чашки", many: "чашек", other: "чашки" };\nfor (const n of [1, 3, 5, 21, 1.5]) console.log(n, forms[pr.select(n)]);', { covers: ["Intl.PluralRules", "Intl.PluralRules.prototype.select"] }),
      meth("selectRange()", "Форма для диапазона", "`pr.selectRange(2, 5)` — форма слова для «от 2 до 5».", "«2–5 чашек».", 'console.log(new Intl.PluralRules("ru").selectRange(2, 5));', { covers: ["Intl.PluralRules.prototype.selectRange"] }),
      meth("formatToParts()", "Число по частям", "Массив частей `{ type, value }`: целое, группы, дробная часть, валюта — чтобы стилизовать отдельно.", "Сделать копейки мельче рублей.", 'const f = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" });\nconsole.log(f.formatToParts(1250.5).map((p) => p.type).join(" "));', { covers: ["Intl.NumberFormat.prototype.formatToParts"] }),
      meth("formatRange() · formatRangeToParts()", "Диапазон чисел", "`formatRange(200, 300)` → «200–300 ₽» по правилам языка; `…ToParts` — по частям.", "Цены «от и до».", 'const f = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });\nconsole.log(f.formatRange(200, 300), f.formatRangeToParts(200, 300).length > 0);', { covers: on("Intl.NumberFormat.prototype", "formatRange", "formatRangeToParts") }),
      meth("resolvedOptions() · supportedLocalesOf()", "Общие методы всех служб Intl", "У каждой службы Intl: `resolvedOptions()` — какие настройки и язык реально применены; статический `supportedLocalesOf(list)` — какие языки из списка поддерживаются.", "Проверить, что язык и настройки сработали.", 'console.log(new Intl.NumberFormat("ru").resolvedOptions().locale, Intl.DateTimeFormat.supportedLocalesOf(["ru", "xx"]));', { covers: ["Intl.*.prototype.resolvedOptions", "Intl.*.supportedLocalesOf"] }),
      rule("Никогда не пиши склонения через `if (n === 1)`: правила языков сложнее. Есть `Intl.PluralRules`.")
    ],
    tasks: [task("Правильные чашки", "Напиши `cups(n)`: `` `${n} чашка` ``, `чашки` или `чашек` по `Intl.PluralRules(\"ru\")`.", {
      start: 'function cups(n) {\n  return n === 1 ? `${n} чашка` : `${n} чашек`;\n}\n',
      checks: [run('cups(1) === "1 чашка" && cups(21) === "21 чашка"', "1 и 21 — чашка"), run('cups(3) === "3 чашки" && cups(22) === "22 чашки"', "3 и 22 — чашки"), run('cups(5) === "5 чашек" && cups(11) === "11 чашек"', "5 и 11 — чашек"), has("PluralRules", "Через PluralRules")],
      solution: 'const rules = new Intl.PluralRules("ru");\nconst forms = { one: "чашка", few: "чашки", many: "чашек", other: "чашки" };\nfunction cups(n) {\n  return `${n} ${forms[rules.select(n)]}`;\n}'
    })],
    quizzes: [single("js-plural-ru", "Склонение", "Какую категорию вернёт `new Intl.PluralRules(\"ru\").select(22)`?", [["few", "\"few\""], ["one", "\"one\""], ["many", "\"many\""], ["other", "\"other\""]], "few", "22 — как 2: «чашки».")]
  });

  L({
    slug: "intl-time", title: "Intl: даты, «назад» и длительность", summary: "Intl.DateTimeFormat formatToParts, formatRange, formatRangeToParts; Intl.RelativeTimeFormat; Intl.DurationFormat.",
    skill: ["js-intl-time", "Время для людей", "Выводить диапазоны дат, относительное время и длительности на языке пользователя."],
    now: "Хотим «заказ 5 минут назад», «акция 2–8 ноября» и «готовится 1 ч 15 мин».",
    body: [
      scene("По-человечески",
        ["marta", "«2026-11-02T09:30» гости не понимают. Хочу «5 минут назад»."],
        ["bro", "Intl умеет и «назад», и диапазоны дат, и длительности — на любом языке."]),
      meth("formatToParts()", "Дата по частям", "Массив частей даты: день, месяц, год, разделители.", "Стилизовать части даты.", 'const f = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" });\nconsole.log(f.formatToParts(new Date(Date.UTC(2026, 10, 2))).map((p) => p.type).join(","));', { covers: ["Intl.DateTimeFormat.prototype.formatToParts"] }),
      meth("formatRange() · formatRangeToParts()", "Диапазон дат", "`formatRange(a, b)` → «2–8 ноября 2026 г.» — без повторения общего месяца и года.", "Сроки акций.", 'const f = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" });\nconsole.log(f.formatRange(new Date(Date.UTC(2026, 10, 2)), new Date(Date.UTC(2026, 10, 8))));\nconsole.log(f.formatRangeToParts(new Date(0), new Date(86400000)).length > 0);', { covers: on("Intl.DateTimeFormat.prototype", "formatRange", "formatRangeToParts") }),
      obj("Intl.RelativeTimeFormat", "«5 минут назад»", "`new Intl.RelativeTimeFormat(\"ru\", { numeric: \"auto\" }).format(-1, \"day\")` → «вчера»; `formatToParts` — по частям.", "Ленты событий, комментарии.", 'const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });\nconsole.log(rtf.format(-5, "minute"), rtf.format(-1, "day"), rtf.format(2, "hour"), rtf.formatToParts(3, "day").length);', { covers: ["Intl.RelativeTimeFormat", ...on("Intl.RelativeTimeFormat.prototype", "format", "formatToParts")] }),
      obj("Intl.DurationFormat", "Длительность", "`new Intl.DurationFormat(\"ru\", { style: \"short\" }).format({ hours: 1, minutes: 15 })` → «1 ч 15 мин»; `formatToParts` — по частям.", "Время приготовления, таймеры.", 'const df = new Intl.DurationFormat("ru", { style: "short" });\nconsole.log(df.format({ hours: 1, minutes: 15 }), df.formatToParts({ minutes: 5 }).length > 0);', { covers: ["Intl.DurationFormat", ...on("Intl.DurationFormat.prototype", "format", "formatToParts")] }),
      rule("Время для людей — относительное («5 минут назад»), для точности — полная дата в подсказке.")
    ],
    tasks: [task("Сколько назад", "Напиши `ago(minutes)`: строка через `Intl.RelativeTimeFormat(\"ru\", { numeric: \"auto\" })` — для `minutes < 60` в минутах, иначе в целых часах (округлить вниз), всегда в прошлом.", {
      start: "function ago(minutes) {\n  return minutes + \" мин назад\";\n}\n",
      checks: [run('ago(5) === new Intl.RelativeTimeFormat("ru", { numeric: "auto" }).format(-5, "minute")', "5 минут назад"), run('ago(150) === new Intl.RelativeTimeFormat("ru", { numeric: "auto" }).format(-2, "hour")', "2 часа назад"), has("RelativeTimeFormat", "Через RelativeTimeFormat")],
      solution: 'const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });\nfunction ago(minutes) {\n  return minutes < 60 ? rtf.format(-minutes, "minute") : rtf.format(-Math.floor(minutes / 60), "hour");\n}'
    })],
    quizzes: [single("js-rtf-auto", "numeric: auto", "Что даст `numeric: \"auto\"` для `format(-1, \"day\")`?", [["yesterday", "«вчера»"], ["ago", "«1 день назад»"], ["minus", "«-1 день»"], ["err", "Ошибку"]], "yesterday", "Без auto — «1 день назад».")]
  });

  L({
    slug: "intl-text", title: "Intl: списки, названия, сравнение, сегменты", summary: "Intl.ListFormat, Intl.DisplayNames, Intl.Collator, Intl.Segmenter, Intl.getCanonicalLocales и Intl.supportedValuesOf.",
    skill: ["js-intl-text", "Текст на любом языке", "Склеивать списки, называть языки и валюты, сравнивать и делить текст по правилам языка."],
    now: "«Латте, раф и какао», «японская иена», сортировка с ё и подсчёт слов в отзывах — всё через Intl.",
    body: [
      scene("Списки и слова",
        ["marta", "Хочу «Латте, раф и какао», а не «Латте,раф,какао»."],
        ["bro", "`Intl.ListFormat` склеит список по правилам языка — с запятыми и «и»."]),
      obj("Intl.ListFormat", "Список по правилам языка", "`new Intl.ListFormat(\"ru\", { type: \"conjunction\" }).format([...])` → «Латте, раф и какао»; `disjunction` — «или»; `formatToParts` — по частям.", "Перечисления в тексте.", 'const lf = new Intl.ListFormat("ru", { type: "conjunction" });\nconsole.log(lf.format(["латте", "раф", "какао"]), new Intl.ListFormat("ru", { type: "disjunction" }).format(["S", "M", "L"]), lf.formatToParts(["a", "b"]).length);', { covers: ["Intl.ListFormat", ...on("Intl.ListFormat.prototype", "format", "formatToParts")] }),
      obj("Intl.DisplayNames · of()", "Названия языков, стран, валют", "`new Intl.DisplayNames(\"ru\", { type: \"currency\" }).of(\"JPY\")` → «японская иена»; типы: language, region, script, currency, calendar.", "Переключатель языка, выбор страны.", 'console.log(new Intl.DisplayNames("ru", { type: "region" }).of("JP"), new Intl.DisplayNames("ru", { type: "currency" }).of("EUR"), new Intl.DisplayNames("ru", { type: "language" }).of("en"));', { covers: ["Intl.DisplayNames", "Intl.DisplayNames.prototype.of"] }),
      obj("Intl.Collator · compare()", "Сравнение строк", "`new Intl.Collator(\"ru\").compare` — функция для `sort`; настройки `sensitivity`, `numeric: true` («2» < «10»). Быстрее `localeCompare` при многих сравнениях.", "Сортировка списков людей и товаров.", 'const col = new Intl.Collator("ru", { numeric: true });\nconsole.log(["Столик 10", "столик 2", "Ёлка"].sort(col.compare));', { covers: ["Intl.Collator", "Intl.Collator.prototype.compare"] }),
      obj("Intl.Segmenter · segment()", "Деление текста", "`new Intl.Segmenter(\"ru\", { granularity: \"word\" }).segment(text)` — перебор слов, предложений или символов (графем) по правилам языка.", "Счёт слов, обрезка по символам с эмодзи.", 'const seg = new Intl.Segmenter("ru", { granularity: "word" });\nconst words = [...seg.segment("Лучший латте в городе!")].filter((s) => s.isWordLike);\nconsole.log(words.length, [...new Intl.Segmenter("ru", { granularity: "grapheme" }).segment("👨‍👩‍👧")].length);', { covers: ["Intl.Segmenter", "Intl.Segmenter.prototype.segment"] }),
      fnc("Intl.getCanonicalLocales() · Intl.supportedValuesOf()", "Языки и поддерживаемые значения", "`getCanonicalLocales([\"RU-ru\"])` → `[\"ru-RU\"]` — правильная запись тегов; `supportedValuesOf(\"currency\")` — список поддерживаемых валют, календарей, поясов.", "Проверить и показать варианты выбора.", 'console.log(Intl.getCanonicalLocales(["RU-ru", "EN-us"]), Intl.supportedValuesOf("currency").includes("RUB"));', { covers: ["Intl.getCanonicalLocales", "Intl.supportedValuesOf"] }),
      rule("Слова считай `Intl.Segmenter`, а не `split(\" \")`: язык знает лучше, где границы слов.")
    ],
    tasks: [task("Состав заказа", "Напиши `orderText(items)` — список через `Intl.ListFormat(\"ru\", { type: \"conjunction\" })`, и `wordCount(text)` — число слов через `Intl.Segmenter` с `granularity: \"word\"` (учитывай `isWordLike`).", {
      start: 'function orderText(items) {\n  return items.join(",");\n}\nfunction wordCount(text) {\n  return text.split(" ").length;\n}\n',
      checks: [run('orderText(["латте", "раф", "какао"]) === new Intl.ListFormat("ru", { type: "conjunction" }).format(["латте", "раф", "какао"])', "Список с «и»"), run('wordCount("Лучший  латте — в городе!") === 4', "4 слова, без знаков и лишних пробелов")],
      solution: 'const lf = new Intl.ListFormat("ru", { type: "conjunction" });\nconst seg = new Intl.Segmenter("ru", { granularity: "word" });\nfunction orderText(items) {\n  return lf.format(items);\n}\nfunction wordCount(text) {\n  return [...seg.segment(text)].filter((s) => s.isWordLike).length;\n}'
    })],
    quizzes: [single("js-collator-numeric", "numeric", "Что даёт `Intl.Collator(\"ru\", { numeric: true })`?", [["num", "Числа внутри строк сравниваются как числа: «2» < «10»"], ["only", "Сравниваются только цифры"], ["case", "Без учёта регистра"], ["none", "Ничего"]], "num", "Иначе «10» окажется раньше «2».")]
  });

  L({
    slug: "intl-locale", title: "Intl.Locale: всё о языке", summary: "Intl.Locale и его свойства: language, region, script, baseName, calendar, collation, hourCycle, caseFirst, numeric, numberingSystem, firstDayOfWeek, maximize, minimize, toString и сведения getCalendars, getCollations, getHourCycles, getNumberingSystems, getTimeZones, getTextInfo, getWeekInfo.",
    skill: ["js-intl-locale", "Локаль", "Разбирать и дополнять языковые теги и узнавать правила региона."],
    now: "Сайт открывают из Японии, Израиля и Казахстана. Узнаём про регион пользователя всё: календарь, неделю, направление текста.",
    body: [
      scene("Чей язык",
        ["lev", "У моего друга в Израиле неделя начинается с воскресенья, а текст пишется справа налево."],
        ["nika", "`Intl.Locale` знает правила региона: первый день недели, направление текста, календарь, формат часов."]),
      obj("Intl.Locale · toString() · baseName", "Языковой тег как объект", "`new Intl.Locale(\"ru-RU\")` разбирает тег; `toString()` — полный тег с расширениями, `baseName` — без них.", "Работать с тегами языка структурно.", 'const loc = new Intl.Locale("ru-RU-u-ca-gregory-hc-h23");\nconsole.log(loc.toString(), loc.baseName);', { covers: ["Intl.Locale", ...LP("toString", "baseName")] }),
      meth("language · region · script", "Части тега", "Язык (`ru`), регион (`RU`), письменность (`Cyrl`, если указана или после maximize).", "Выбрать флаг страны, шрифт.", 'const loc = new Intl.Locale("sr-Latn-RS");\nconsole.log(loc.language, loc.script, loc.region);', { covers: LP("language", "region", "script") }),
      meth("maximize() · minimize()", "Дополнить и сократить", "`maximize()` достраивает вероятные части (`ru` → `ru-Cyrl-RU`), `minimize()` убирает лишние.", "Нормализовать тег перед сравнением.", 'console.log(new Intl.Locale("ru").maximize().toString(), new Intl.Locale("ru-Cyrl-RU").minimize().toString());', { covers: LP("maximize", "minimize") }),
      meth("calendar · collation · hourCycle · numberingSystem", "Настройки из расширений тега", "Значения из расширения `-u-`: календарь (`ca`), правила сортировки (`co`), формат часов (`hc`: h12/h23), система цифр (`nu`).", "Учесть явные предпочтения пользователя.", 'const loc = new Intl.Locale("ar-EG", { calendar: "islamic", hourCycle: "h12", numberingSystem: "arab", collation: "compat" });\nconsole.log(loc.calendar, loc.hourCycle, loc.numberingSystem, loc.collation);', { covers: LP("calendar", "collation", "hourCycle", "numberingSystem") }),
      meth("caseFirst · numeric · firstDayOfWeek", "Ещё настройки", "`caseFirst` — сначала заглавные или строчные при сортировке, `numeric` — числовая сортировка, `firstDayOfWeek` — заданный первый день недели.", "Тонкая настройка сортировки и календаря.", 'const loc = new Intl.Locale("ru", { caseFirst: "upper", numeric: true, firstDayOfWeek: "mon" });\nconsole.log(loc.caseFirst, loc.numeric, loc.firstDayOfWeek);', { covers: LP("caseFirst", "numeric", "firstDayOfWeek") }),
      meth("getCalendars() · getCollations() · getHourCycles() · getNumberingSystems()", "Что принято в регионе", "Массивы календарей, правил сортировки, форматов часов и систем цифр, принятых для этой локали.", "Предложить пользователю привычные варианты.", 'const loc = new Intl.Locale("ja-JP");\nconsole.log(loc.getCalendars?.(), loc.getHourCycles?.(), loc.getNumberingSystems?.(), loc.getCollations?.().length);', { covers: LP("getCalendars", "getCollations", "getHourCycles", "getNumberingSystems") }),
      meth("getTimeZones() · getTextInfo() · getWeekInfo()", "Пояса, письмо и неделя", "`getTimeZones()` — часовые пояса региона, `getTextInfo()` — направление текста (`ltr`/`rtl`), `getWeekInfo()` — первый день недели и выходные.", "RTL-вёрстка, календарь с правильной неделей.", 'console.log(new Intl.Locale("he-IL").getTextInfo?.().direction, new Intl.Locale("he-IL").getWeekInfo?.().firstDay, new Intl.Locale("ru-RU").getTimeZones?.().length > 1);', { covers: LP("getTimeZones", "getTextInfo", "getWeekInfo") }),
      meth("calendars · collations · hourCycles · numberingSystems", "Старые свойства-аналоги", "Свойства с теми же данными, что `get…()`. Устарели: в новом коде используй методы `get…()`.", "Узнать в старом коде.", 'const loc = new Intl.Locale("ja-JP");\nconsole.log(Array.isArray(loc.calendars ?? []), Array.isArray(loc.hourCycles ?? []));', { covers: LP("calendars", "collations", "hourCycles", "numberingSystems") }),
      meth("timeZones · textInfo · weekInfo", "Старые свойства-аналоги", "Устаревшие свойства с данными `getTimeZones()`, `getTextInfo()` и `getWeekInfo()`.", "Узнать в старом коде.", 'const loc = new Intl.Locale("he-IL");\nconsole.log(typeof (loc.textInfo ?? {}), typeof (loc.weekInfo ?? {}), Array.isArray(loc.timeZones ?? []));', { covers: LP("timeZones", "textInfo", "weekInfo") }),
      rule("Направление текста и первый день недели бери из `Intl.Locale`, а не из своей таблицы стран.")
    ],
    tasks: [task("Направление сайта", "Напиши `direction(tag)`: `\"rtl\"` или `\"ltr\"` через `new Intl.Locale(tag).getTextInfo()`, и `fullTag(tag)` — тег после `maximize()` строкой.", {
      start: 'function direction(tag) {\n  return "ltr";\n}\nfunction fullTag(tag) {\n  return tag;\n}\n',
      checks: [run('direction("he-IL") === "rtl" && direction("ru") === "ltr"', "Иврит — справа налево"), run('fullTag("ru") === "ru-Cyrl-RU"', "ru → ru-Cyrl-RU")],
      solution: "function direction(tag) {\n  return new Intl.Locale(tag).getTextInfo().direction;\n}\nfunction fullTag(tag) {\n  return new Intl.Locale(tag).maximize().toString();\n}"
    })],
    quizzes: [single("js-locale-max", "maximize", "Что вернёт `new Intl.Locale(\"ru\").maximize().toString()`?", [["full", "\"ru-Cyrl-RU\""], ["same", "\"ru\""], ["upper", "\"RU\""], ["err", "Ошибку"]], "full", "Достраиваются вероятные письменность и регион.")]
  });
}
