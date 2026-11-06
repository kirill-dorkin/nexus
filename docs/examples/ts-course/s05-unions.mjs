// Chapter 5: unions and narrowing — union types, type guards, discriminated unions, exhaustiveness.
import { idea, ts, tip, makeLesson } from "./tskit.mjs";

export default function unions(c, rc) {
  const L = makeLesson(c, rc);
  const { single, short } = c;

  L({
    slug: "union-narrowing", title: "Объединения и сужение", summary: "Тип «то или другое», typeof, in, instanceof и как TypeScript сужает тип в ветках if.",
    skill: ["ts-narrowing", "Сужение типов", "Работать с объединениями, сужая тип проверками."],
    now: "Типизируем функции и учим значения быть одного из нескольких типов.",
    body: [
      ts("Объединение", "A | B", "`string | number` — значение может быть строкой или числом. Использовать можно только то, что есть у обоих, пока тип не уточнён.", "Описывает реальность: id из URL — строка, из базы — число.", "function show(id: string | number) {\n  id.toUpperCase(); // Ошибка: у number нет toUpperCase\n}"),
      ts("Сужение через typeof", "Проверка внутри if", "После `if (typeof id === \"string\")` внутри ветки id — string, в else — number. TypeScript следит за проверками сам.", "Обычный JavaScript-код проверок становится основой типизации.", "if (typeof id === \"string\") {\n  return id.toUpperCase();\n}\nreturn id.toFixed(0);"),
      ts("in и instanceof", "Другие проверки", "`\"email\" in contact` сужает до вариантов с полем email; `err instanceof Error` — до класса Error.", "Так различают объекты разной формы и ошибки в catch.", "catch (err) {\n  if (err instanceof Error) console.log(err.message);\n}"),
      ts("Функция-проверка", "Пользовательский type guard", "`function isUser(x: unknown): x is User` — после `if (isUser(data))` data становится User.", "Проверку формы данных пишут один раз и переиспользуют, а TypeScript ей доверяет.", "function isUser(x: unknown): x is User {\n  return typeof x === \"object\" && x !== null && \"id\" in x;\n}"),
      tip("Объединение плюс проверка в if — главный приём TypeScript. Тип сужается сам.")
    ],
    quizzes: [
      single("nr-union", "Что доступно", "Какие методы можно вызвать у `id: string | number` без проверки?",
        [["common", "Только общие для string и number, например toString()"], ["all", "Все методы строк и чисел"], ["string", "Только методы строк"], ["none", "Никакие"]], "common",
        "Пока тип не сужен, доступно только общее."),
      single("nr-typeof", "Сужение", "Какой тип у id внутри `if (typeof id === \"number\") { … }`, если id: string | number?",
        [["number", "number"], ["union", "string | number"], ["string", "string"], ["unknown", "unknown"]], "number",
        "Проверка typeof сужает тип внутри ветки."),
      short("nr-guard", "Проверка-функция", "Как пишется тип результата функции-проверки, которая сужает x до User? Формат: x ___ User.", ["x is User", "is"],
        "Это пользовательский type guard.")
    ]
  });

  L({
    slug: "discriminated", title: "Размеченные объединения", summary: "Общее поле-метка, switch по метке и состояния загрузки без невозможных комбинаций.",
    skill: ["ts-discriminated", "Размеченные объединения", "Описывать состояния через объединения с полем-меткой."],
    now: "Сужаем простые объединения и описываем состояния, в которых не бывает противоречий.",
    body: [
      ts("Поле-метка", "kind или status", "У каждого варианта общее поле с литеральным значением: `{ status: \"loading\" } | { status: \"error\"; message: string } | { status: \"ok\"; data: User }`.", "Проверив status, TypeScript точно знает, какие ещё поля есть.", "type State =\n  | { status: \"loading\" }\n  | { status: \"error\"; message: string }\n  | { status: \"ok\"; data: User };"),
      ts("switch по метке", "Ветка — вариант", "`switch (state.status)` — в каждой ветке state сужен до своего варианта: в \"error\" доступно message, в \"ok\" — data.", "Невозможно прочитать data, пока загрузка не завершилась.", "switch (state.status) {\n  case \"ok\": return state.data.name;\n  case \"error\": return state.message;\n}"),
      idea("Невозможные состояния", "Флаги против объединения", "Три флага `isLoading`, `error`, `data` допускают бессмыслицу: загрузка и ошибка одновременно. Объединение с меткой разрешает только реальные состояния.", "Целый класс ошибок интерфейса исчезает: невозможное просто не описывается."),
      tip("Состояния описывай объединением с общим полем `status`, а не набором флагов.")
    ],
    quizzes: [
      single("ds-why", "Зачем", "Чем объединение с полем status лучше трёх флагов isLoading, error, data?",
        [["impossible", "Не позволяет описать невозможные комбинации, например загрузку и ошибку сразу"], ["short", "Короче пишется"], ["fast", "Быстрее работает"], ["none", "Ничем"]], "impossible",
        "Каждый вариант содержит ровно свои поля."),
      single("ds-access", "Доступ", "Можно ли прочитать state.data, не проверив state.status?",
        [["no", "Нет: data есть только у варианта status: \"ok\""], ["yes", "Да, всегда"], ["any", "Да, если state — any"], ["undefined", "Да, вернётся undefined без ошибки"]], "no",
        "Сначала сужение по метке."),
      single("ds-tag", "Метка", "Каким должно быть поле-метка в каждом варианте?",
        [["literal", "Литеральным значением, разным у вариантов"], ["string", "Любой строкой"], ["number", "Числом"], ["optional", "Необязательным"]], "literal",
        "По литералу TypeScript различает варианты.")
    ]
  });

  L({
    slug: "exhaustive", title: "Проверка всех вариантов", summary: "never в default, satisfies never и как TypeScript напоминает обработать новый вариант.",
    skill: ["ts-exhaustive", "Полнота проверки", "Гарантировать, что обработаны все варианты объединения."],
    now: "Описываем состояния объединениями и заставляем TypeScript следить, что ни одно не забыто.",
    body: [
      ts("never в default", "Ничего не осталось", "Если все варианты обработаны, в default значение имеет тип never. Присвоение `const _x: never = state` — ошибка, как только появится необработанный вариант.", "Добавил новый статус — сборка покажет все switch, где его забыли обработать.", "default: {\n  const unreachable: never = state;\n  throw new Error(`Неизвестное состояние: ${unreachable}`);\n}"),
      ts("satisfies never", "Короткая запись", "`state satisfies never` в default делает ту же проверку одной строкой.", "Читается как «здесь не должно остаться вариантов»."),
      idea("Объединения против enum", "Что выбрать", "Объединение строк `\"draft\" | \"published\"` не создаёт кода в JavaScript и сравнивается как обычная строка. enum создаёт объект и имеет подводные камни у числовых значений.", "В современных проектах для наборов значений обычно выбирают объединения строк."),
      tip("В каждом switch по объединению — default с never. Новый вариант не останется незамеченным.")
    ],
    quizzes: [
      single("ex-never", "never", "Какой тип у значения в default, если все варианты объединения обработаны?",
        [["never", "never"], ["unknown", "unknown"], ["any", "any"], ["union", "Исходное объединение"]], "never",
        "Вариантов не осталось."),
      single("ex-new", "Новый вариант", "Ты добавил вариант \"archived\" в объединение. Чем поможет проверка с never?",
        [["errors", "Сборка покажет все switch, где новый вариант не обработан"], ["auto", "TypeScript сам допишет обработку"], ["none", "Ничем"], ["runtime", "Ошибка будет только при запуске"]], "errors",
        "Значение archived не подходит к never."),
      single("ex-enum", "enum или объединение", "Чем объединение строк удобнее enum?",
        [["nocode", "Не создаёт кода в JavaScript и работает как обычные строки"], ["fast", "Работает быстрее процессора"], ["numbers", "Хранит числа"], ["always", "enum запрещён в TypeScript"]], "nocode",
        "enum — один из немногих элементов TypeScript, который остаётся в JS-коде.")
    ]
  });
}
