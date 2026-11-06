// Chapter 8: types from types — keyof, typeof, indexed access, mapped, conditional and template literal types.
import { idea, ts, tip, makeLesson } from "./tskit.mjs";

export default function typeOps(c, rc) {
  const L = makeLesson(c, rc);
  const { single, short } = c;

  L({
    slug: "keyof-typeof", title: "keyof, typeof и доступ по индексу", summary: "Ключи типа, тип значения переменной, тип поля T[K] и as const.",
    skill: ["ts-keyof", "keyof и typeof", "Получать ключи, типы значений и полей."],
    now: "Пользуемся утилитами и узнаём, из чего они построены.",
    body: [
      ts("keyof", "Ключи типа", "`keyof User` — объединение имён полей: `\"id\" | \"name\" | \"email\"`.", "Функция сортировки по полю принимает только существующие поля.", "type UserKey = keyof User; // \"id\" | \"name\" | \"email\""),
      ts("typeof в типе", "Тип из значения", "`typeof config` в позиции типа даёт тип переменной. Значение — источник правды, тип выводится из него.", "Настройки описал один раз объектом — тип получил бесплатно.", "const config = { theme: \"dark\", pageSize: 20 };\ntype Config = typeof config;"),
      ts("Доступ по индексу", "T[K]", "`User[\"email\"]` — тип поля email. `Order[\"items\"][number]` — тип элемента массива items.", "Не нужно отдельно описывать тип вложенных данных.", "type Item = Order[\"items\"][number];"),
      ts("as const", "Самые узкие типы", "`const roles = [\"admin\", \"user\"] as const` — readonly-кортеж литералов. `typeof roles[number]` — `\"admin\" | \"user\"`.", "Список значений один, объединение типов выводится из него — нельзя забыть синхронизировать.", "const ROLES = [\"admin\", \"editor\", \"user\"] as const;\ntype Role = typeof ROLES[number];"),
      tip("Значения — источник правды: `as const` и `typeof` вместо ручного дублирования строк.")
    ],
    quizzes: [
      single("ko-keyof", "keyof", "Что такое `keyof { id: number; name: string }`?",
        [["keys", "\"id\" | \"name\""], ["values", "number | string"], ["object", "Объект с ключами"], ["count", "2"]], "keys",
        "keyof даёт объединение имён полей."),
      single("ko-index", "Тип поля", "Как получить тип поля email из типа User?",
        [["index", "`User[\"email\"]`"], ["dot", "`User.email`"], ["keyof", "`keyof User.email`"], ["typeof", "`typeof email`"]], "index",
        "В типах используют квадратные скобки."),
      single("ko-const", "as const", "Что даёт `typeof ROLES[number]` для `const ROLES = [\"admin\", \"user\"] as const`?",
        [["union", "\"admin\" | \"user\""], ["string", "string"], ["array", "string[]"], ["number", "number"]], "union",
        "as const сохраняет литералы.")
    ]
  });

  L({
    slug: "mapped-conditional", title: "Отображённые и условные типы", summary: "Перебор ключей [K in keyof T], модификаторы, условные типы и infer.",
    skill: ["ts-mapped", "Mapped и conditional", "Читать и писать отображённые и условные типы."],
    now: "Получаем типы из типов и учимся их преобразовывать.",
    body: [
      ts("Отображённый тип", "Перебор ключей", "`{ [K in keyof T]: … }` создаёт тип с теми же ключами и новым типом значений. Так устроены Partial, Readonly, Record.", "Например, тип ошибок формы: те же поля, что у формы, но значения — строки с ошибкой.", "type FormErrors<T> = { [K in keyof T]?: string };"),
      ts("Модификаторы", "+? и -readonly", "В отображённом типе можно добавить или убрать `?` и `readonly`: `-?` делает поля обязательными (так устроен Required).", "Понятно, как работают встроенные утилиты, и можно сделать свою."),
      ts("Условный тип", "T extends U ? X : Y", "Тип-развилка: если T подходит под U, то X, иначе Y. На объединениях применяется к каждому варианту.", "Так устроены Exclude, Extract и NonNullable.", "type IsString<T> = T extends string ? \"да\" : \"нет\";"),
      ts("infer", "Достать часть типа", "Внутри условного типа `infer R` извлекает фрагмент: `T extends Promise<infer R> ? R : T` — содержимое промиса.", "Так устроены ReturnType и Awaited.", "type Unwrap<T> = T extends Promise<infer R> ? R : T;"),
      tip("Встроенные утилиты — это mapped и conditional types. Свою пиши, когда утилиты не хватает.")
    ],
    quizzes: [
      single("mc-mapped", "Отображённый", "Что создаёт `{ [K in keyof T]?: string }`?",
        [["same", "Тип с теми же ключами, что у T, и необязательными строковыми значениями"], ["array", "Массив ключей"], ["union", "Объединение ключей"], ["copy", "Точную копию T"]], "same",
        "Это перебор ключей T."),
      single("mc-cond", "Условный", "Чему равен `IsString<number>` для `type IsString<T> = T extends string ? \"да\" : \"нет\"`?",
        [["no", "\"нет\""], ["yes", "\"да\""], ["never", "never"], ["boolean", "boolean"]], "no",
        "number не подходит под string."),
      short("mc-infer", "Извлечь", "Какое ключевое слово в условном типе извлекает часть типа, например содержимое Promise?", ["infer"],
        "T extends Promise<infer R> ? R : T.")
    ]
  });

  L({
    slug: "template-literals", title: "Шаблонные строковые типы", summary: "Типы вида `${A}-${B}`, имена событий и CSS-значения, встроенные Uppercase и Capitalize.",
    skill: ["ts-template", "Шаблонные типы", "Описывать строки по шаблону."],
    now: "Умеем mapped и conditional types и описываем строки, собранные по правилу.",
    body: [
      ts("Шаблонный тип", "Строка по правилу", "`type Size = \"s\" | \"m\"; type Color = \"red\" | \"blue\"; type Variant = `${Color}-${Size}`` — все комбинации: \"red-s\", \"red-m\", \"blue-s\", \"blue-m\".", "Имена вариантов компонента или ключи переводов проверяются без ручного списка.", "type Spacing = `${number}px` | `${number}rem`;\nconst gap: Spacing = \"12px\";"),
      ts("Имена событий", "on + Имя", "`type Handler<E extends string> = `on${Capitalize<E>}`` — из \"click\" получится \"onClick\".", "Так типизируют обработчики в библиотеках компонентов."),
      idea("Встроенные строковые утилиты", "Регистр", "`Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` меняют регистр литеральных типов.", "Ключи и имена приводятся к единому стилю прямо в системе типов."),
      tip("Строка собирается по правилу — опиши правило шаблонным типом, а не списком вариантов.")
    ],
    quizzes: [
      single("tl-combo", "Комбинации", "Сколько вариантов у `${\"a\" | \"b\"}-${\"1\" | \"2\"}`?",
        [["four", "Четыре: a-1, a-2, b-1, b-2"], ["two", "Два"], ["one", "Один"], ["any", "Любая строка"]], "four",
        "Шаблон перебирает все сочетания."),
      single("tl-px", "Пиксели", "Подходит ли \"12em\" к типу `${number}px`?",
        [["no", "Нет: строка должна заканчиваться на px"], ["yes", "Да"], ["number", "Да, потому что 12 — число"], ["any", "Подходит любая строка"]], "no",
        "Шаблон проверяет и число, и суффикс."),
      short("tl-cap", "Заглавная", "Какая встроенная утилита делает первую букву литерального типа заглавной?", ["Capitalize"],
        "Capitalize<\"click\"> — \"Click\".")
    ]
  });
}
