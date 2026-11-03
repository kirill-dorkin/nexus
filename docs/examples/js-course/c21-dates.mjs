// Chapter 21: Dates completely — creating, reading and changing every part, local vs UTC, output formats.
import { scene, rule, meth, idea, run, task, makeLesson, on } from "./kit.mjs";

const D = (...m) => on("Date.prototype", ...m);

export default function dates(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single } = c;

  L({
    slug: "date-create", title: "Даты: создание и время", summary: "Date.now, Date.parse, Date.UTC, getTime, setTime, valueOf, getTimezoneOffset, getUTCDay и разница между местным временем и UTC.",
    skill: ["js-date-create", "Создание дат", "Создавать даты и работать с метками времени и часовыми поясами."],
    now: "Создаём даты и работаем с метками времени и часовыми поясами.",
    body: [
      scene("Разные пояса",
        ["you", "Заказ из Владивостока пришёл «вчера», хотя там уже утро!"],
        ["nika", "Внутри дата — одно число: миллисекунды от 1 января 1970 UTC. А местное время — лишь способ его показать."]),
      idea("Метка времени", "Миллисекунды от 1970 UTC", "Каждая дата хранит одно число — сколько миллисекунд прошло с 1970-01-01 00:00 UTC. Одинаково во всём мире.", "Хранить и сравнивать время без путаницы поясов.", "console.log(new Date(0).toISOString(), new Date(86_400_000).toISOString());", { covers: [] }),
      meth("Date.now() · Date.parse() · Date.UTC()", "Числа времени", "`Date.now()` — текущая метка; `Date.parse(\"2026-11-02T09:30:00Z\")` — метка из строки ISO; `Date.UTC(2026, 10, 2)` — метка для даты в UTC.", "Засечь время, разобрать строку, создать дату без учёта пояса.", 'const start = Date.now();\nconsole.log(Date.parse("2026-11-02T09:30:00Z") === Date.UTC(2026, 10, 2, 9, 30), Date.now() - start < 1000);', { covers: on("Date", "now", "parse", "UTC") }),
      meth("getTime() · setTime() · valueOf()", "Метка времени даты", "`getTime()` и `valueOf()` — число миллисекунд; `setTime(ms)` — поставить дату по метке. Поэтому даты можно вычитать: `b - a`.", "Разница во времени, сравнение.", "const a = new Date(Date.UTC(2026, 10, 2, 9));\nconst b = new Date(a.getTime());\nb.setTime(b.getTime() + 90 * 60 * 1000);\nconsole.log((b - a) / 60000, a.valueOf() === a.getTime());", { covers: D("getTime", "setTime", "valueOf") }),
      meth("getTimezoneOffset() · getUTCDay()", "Пояс и день недели в UTC", "`getTimezoneOffset()` — разница UTC и местного времени в минутах (для Москвы −180); `getUTCDay()` — день недели по UTC.", "Понять сдвиг пояса пользователя.", "const d = new Date(Date.UTC(2026, 10, 1, 22));\nconsole.log(typeof d.getTimezoneOffset(), d.getUTCDay());", { covers: D("getTimezoneOffset", "getUTCDay") }),
      rule("Храни и передавай время меткой или строкой ISO в UTC. В местное время переводи только для показа.")
    ],
    tasks: [task("Сколько ждать", "Напиши `minutesBetween(a, b)` — сколько целых минут между двумя датами (через `getTime`, округлить вниз), и `fromIso(s)` — дата из строки ISO через `Date.parse`.", {
      start: "function minutesBetween(a, b) {\n  return 0;\n}\nfunction fromIso(s) {\n  return new Date();\n}\n",
      checks: [run('minutesBetween(new Date(Date.UTC(2026, 10, 2, 9, 0)), new Date(Date.UTC(2026, 10, 2, 10, 30, 59))) === 90', "Полтора часа — 90 минут"), run('fromIso("2026-11-02T09:30:00Z").getTime() === Date.UTC(2026, 10, 2, 9, 30)', "Дата из ISO")],
      solution: "function minutesBetween(a, b) {\n  return Math.floor((b.getTime() - a.getTime()) / 60000);\n}\nfunction fromIso(s) {\n  return new Date(Date.parse(s));\n}"
    })],
    quizzes: [
      single("js-date-store", "Хранение", "Что на самом деле хранит объект Date?", [["ms", "Число миллисекунд от 1970-01-01 UTC"], ["str", "Строку даты"], ["local", "Местное время и пояс"], ["parts", "Год, месяц и день отдельно"]], "ms", "Пояс применяется только при чтении."),
      single("js-date-diff", "Разница", "Что даст `dateB - dateA`?", [["ms", "Разницу в миллисекундах"], ["days", "Разницу в днях"], ["nan", "NaN"], ["str", "Строку"]], "ms", "Даты превращаются в числа через valueOf.")
    ]
  });

  L({
    slug: "date-parts", title: "Даты: части и изменение", summary: "Чтение и запись года, месяца, дня, часов, минут, секунд и миллисекунд — в местном времени и в UTC.",
    skill: ["js-date-parts", "Части даты", "Читать и менять любую часть даты, понимая разницу местного времени и UTC."],
    now: "Читаем и меняем любую часть даты — в местном времени и в UTC.",
    body: [
      scene("До конца месяца",
        ["you", "Подписка действует до последнего дня месяца. А в месяцах разное число дней!"],
        ["bro", "Поставь число 0 следующего месяца — и я сам перейду на последний день текущего."]),
      meth("getFullYear() · setFullYear() · getUTCFullYear() · setUTCFullYear()", "Год", "Год четырьмя цифрами в местном времени и в UTC.", "Год в отчётах.", "const d = new Date(Date.UTC(2026, 0, 15));\nd.setUTCFullYear(2027);\nconsole.log(d.getUTCFullYear(), typeof d.getFullYear());", { covers: D("getFullYear", "setFullYear", "getUTCFullYear", "setUTCFullYear") }),
      meth("getMonth() · setMonth() · getUTCMonth() · setUTCMonth()", "Месяц (с нуля)", "0 — январь, 11 — декабрь. Запись за пределами переносит год.", "Сдвиг на месяцы.", "const d = new Date(Date.UTC(2026, 10, 15));\nd.setUTCMonth(d.getUTCMonth() + 3);\nconsole.log(d.getUTCFullYear(), d.getUTCMonth() + 1, typeof d.getMonth());", { covers: D("getMonth", "setMonth", "getUTCMonth", "setUTCMonth") }),
      meth("getDate() · setDate() · getUTCDate() · setUTCDate()", "Число месяца", "1–31. `setDate(0)` — последний день предыдущего месяца, `setDate(32)` — перенос в следующий.", "Последний день месяца, сдвиг на дни.", "const d = new Date(Date.UTC(2026, 2, 1));\nd.setUTCDate(0);\nconsole.log(d.getUTCDate(), d.getUTCMonth() + 1, typeof d.getDate());", { covers: D("getDate", "setDate", "getUTCDate", "setUTCDate") }),
      meth("setHours() · getUTCHours() · setUTCHours()", "Часы", "`setHours(h, m, s, ms)` может задать сразу и минуты с секундами.", "Начало и конец дня.", "const d = new Date(Date.UTC(2026, 10, 2, 15, 45));\nd.setUTCHours(0, 0, 0, 0);\nconsole.log(d.toISOString(), d.getUTCHours());", { covers: D("setHours", "getUTCHours", "setUTCHours") }),
      meth("getMinutes() · setMinutes() · getUTCMinutes() · setUTCMinutes()", "Минуты", "0–59; перенос в часы при переполнении.", "Время готовности: через 15 минут.", "const d = new Date(Date.UTC(2026, 10, 2, 9, 50));\nd.setUTCMinutes(d.getUTCMinutes() + 15);\nconsole.log(d.getUTCHours(), d.getUTCMinutes(), typeof d.getMinutes());", { covers: D("getMinutes", "setMinutes", "getUTCMinutes", "setUTCMinutes") }),
      meth("getSeconds() · setSeconds() · getUTCSeconds() · setUTCSeconds()", "Секунды", "0–59.", "Таймеры, точное время.", "const d = new Date(Date.UTC(2026, 10, 2, 9, 0, 50));\nd.setUTCSeconds(70);\nconsole.log(d.getUTCMinutes(), d.getUTCSeconds(), typeof d.getSeconds());", { covers: D("getSeconds", "setSeconds", "getUTCSeconds", "setUTCSeconds") }),
      meth("get/setMilliseconds() · get/setUTCMilliseconds()", "Миллисекунды", "0–999.", "Замеры, точные метки.", "const d = new Date(Date.UTC(2026, 10, 2));\nd.setUTCMilliseconds(1500);\nconsole.log(d.getUTCSeconds(), d.getUTCMilliseconds(), typeof d.getMilliseconds());", { covers: D("getMilliseconds", "setMilliseconds", "getUTCMilliseconds", "setUTCMilliseconds") }),
      rule("Сдвигать даты удобно через `set…(get…() + n)`: переполнение дней и месяцев Date исправит сам.")
    ],
    tasks: [task("Последний день подписки", "Напиши `lastDayOfMonth(year, month)` — число последнего дня месяца (месяц с нуля) через UTC-дату и `setUTCDate(0)`, и `addMinutes(date, n)` — новая дата на `n` минут позже.", {
      start: "function lastDayOfMonth(year, month) {\n  return 30;\n}\nfunction addMinutes(date, n) {\n  return date;\n}\n",
      checks: [run("lastDayOfMonth(2026, 1) === 28 && lastDayOfMonth(2028, 1) === 29 && lastDayOfMonth(2026, 11) === 31", "Февраль, високосный, декабрь"), run("(() => { const a = new Date(Date.UTC(2026, 10, 2, 23, 50)); const b = addMinutes(a, 15); return b.toISOString() === \"2026-11-03T00:05:00.000Z\" && a.getUTCMinutes() === 50; })()", "Переход через полночь, оригинал цел")],
      solution: "function lastDayOfMonth(year, month) {\n  const d = new Date(Date.UTC(year, month + 1, 1));\n  d.setUTCDate(0);\n  return d.getUTCDate();\n}\nfunction addMinutes(date, n) {\n  const d = new Date(date.getTime());\n  d.setUTCMinutes(d.getUTCMinutes() + n);\n  return d;\n}"
    })],
    quizzes: [
      single("js-setdate-0", "setDate(0)", "Куда переведёт дату `setDate(0)`?", [["last", "На последний день предыдущего месяца"], ["first", "На первое число"], ["err", "Ошибка"], ["same", "Ничего не изменится"]], "last", "Дня 0 нет — Date переносит назад."),
      single("js-utc-vs-local", "UTC", "Чем `getUTCHours()` отличается от `getHours()`?", [["zone", "Часы по UTC, а не по поясу пользователя"], ["format", "Формат 12 часов"], ["round", "Округление"], ["same", "Ничем"]], "zone", "getHours учитывает пояс устройства.")
    ]
  });

  L({
    slug: "date-output", title: "Даты: вывод в строку", summary: "toISOString, toJSON, toUTCString, toString, toDateString, toTimeString, toLocaleString, toLocaleDateString и toLocaleTimeString.",
    skill: ["js-date-output", "Вывод дат", "Превращать дату в строку нужного формата: для машин и для людей."],
    now: "Превращаем дату в строку нужного формата: для машин и для людей.",
    body: [
      scene("Три вида",
        ["you", "В интерфейсе хочу «2 ноября 2026 г.», а сервер требует какое-то «2026-11-02T…Z»."],
        ["bro", "Для машин — ISO, для людей — toLocale… с языком. И ещё пара отладочных форматов."]),
      meth("toISOString() · toJSON() · toUTCString()", "Для машин", "`toISOString()` — «2026-11-02T09:30:00.000Z» (стандарт обмена), `toJSON()` — то же, его вызывает `JSON.stringify`; `toUTCString()` — формат HTTP-заголовков.", "API, хранение, заголовки.", "const d = new Date(Date.UTC(2026, 10, 2, 9, 30));\nconsole.log(d.toISOString(), JSON.stringify({ d }), d.toUTCString());", { covers: D("toISOString", "toJSON", "toUTCString") }),
      meth("toString() · toDateString() · toTimeString()", "Для отладки", "Полная строка в местном времени, только дата, только время — формат на английском, зависит от движка.", "Быстро посмотреть в консоли.", "const d = new Date(Date.UTC(2026, 10, 2, 9, 30));\nconsole.log(typeof d.toString(), d.toDateString().length > 0, d.toTimeString().includes(\":\"));", { covers: D("toString", "toDateString", "toTimeString") }),
      meth("toLocaleString() · toLocaleDateString() · toLocaleTimeString()", "Для людей", "Дата и время по правилам языка и с настройками как у `Intl.DateTimeFormat`: `toLocaleDateString(\"ru-RU\", { dateStyle: \"long\", timeZone: \"UTC\" })`.", "Чеки, сообщения, интерфейс.", 'const d = new Date(Date.UTC(2026, 10, 2, 9, 30));\nconsole.log(d.toLocaleDateString("ru-RU", { dateStyle: "long", timeZone: "UTC" }), d.toLocaleTimeString("ru-RU", { timeStyle: "short", timeZone: "UTC" }), d.toLocaleString("ru-RU", { timeZone: "Asia/Vladivostok" }));', { covers: D("toLocaleString", "toLocaleDateString", "toLocaleTimeString") }),
      rule("Серверу — `toISOString()`. Человеку — `toLocaleDateString(\"ru-RU\", …)`. Никогда не склеивай даты вручную.")
    ],
    tasks: [task("Дата в интерфейсе", "Напиши `displayDate(d)` — дата по-русски в длинном формате (`dateStyle: \"long\"`) в поясе UTC, и `apiDate(d)` — строка ISO для сервера.", {
      start: "function displayDate(d) {\n  return String(d);\n}\nfunction apiDate(d) {\n  return String(d);\n}\n",
      checks: [run('displayDate(new Date(Date.UTC(2026, 10, 2))) === new Date(Date.UTC(2026, 10, 2)).toLocaleDateString("ru-RU", { dateStyle: "long", timeZone: "UTC" })', "Длинная русская дата"), run('apiDate(new Date(Date.UTC(2026, 10, 2, 9, 30))) === "2026-11-02T09:30:00.000Z"', "ISO для сервера")],
      solution: 'function displayDate(d) {\n  return d.toLocaleDateString("ru-RU", { dateStyle: "long", timeZone: "UTC" });\n}\nfunction apiDate(d) {\n  return d.toISOString();\n}'
    })],
    quizzes: [
      single("js-iso", "Для сервера", "Какой формат даты лучше отправлять на сервер?", [["iso", "toISOString()"], ["local", "toLocaleString()"], ["string", "toString()"], ["manual", "Собранный вручную"]], "iso", "Однозначный стандарт в UTC."),
      single("js-tojson", "toJSON", "Что вызывает `JSON.stringify` у даты?", [["tojson", "toJSON(), который возвращает ISO-строку"], ["tostring", "toString()"], ["valueof", "valueOf()"], ["nothing", "Ничего — будет {}"]], "tojson", "Поэтому даты в JSON — ISO-строки.")
    ]
  });
}
