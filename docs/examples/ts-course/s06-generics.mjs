// Chapter 6: generics — generic functions, constraints, generic types and defaults.
import { idea, ts, tip, makeLesson } from "./tskit.mjs";

export default function generics(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "generic-functions", title: "Дженерики в функциях", summary: "Параметр типа <T>, вывод T из аргументов и зачем это лучше any.",
    skill: ["ts-generics", "Дженерик-функции", "Писать функции, которые работают с любым типом и сохраняют его."],
    now: "Обрабатываем все варианты объединений и учимся писать код, общий для разных типов.",
    body: [
      ts("Параметр типа", "<T>", "`function first<T>(items: T[]): T | undefined` — T подставляется при вызове. Для `first([1, 2])` T — number, для `first([\"a\"])` — string.", "Одна функция для всех типов, и тип результата не теряется.", "function first<T>(items: T[]): T | undefined {\n  return items[0];\n}\nconst n = first([10, 20]); // number | undefined"),
      idea("Дженерик против any", "Тип сохраняется", "С any функция `first` вернула бы any, и дальше проверка исчезла бы. С T связь «что дали — то и получили» остаётся.", "Именно так типизированы map, filter, Promise, useState и почти вся стандартная библиотека."),
      ts("Явный аргумент типа", "Когда вывод не справился", "Обычно T выводится из аргументов. Если нет — указывают явно: `useState<User | null>(null)`.", "Без явного T начальное null дало бы тип null навсегда.", "const [user, setUser] = useState<User | null>(null);"),
      tip("Видишь `any` в универсальной функции — замени на `<T>`. Тип пусть выводится из аргументов.")
    ],
    quizzes: [
      single("gf-infer", "Вывод T", "Какой тип вернёт `first([\"a\", \"b\"])` для `function first<T>(items: T[]): T | undefined`?",
        [["string", "string | undefined"], ["any", "any"], ["array", "string[]"], ["unknown", "unknown"]], "string",
        "T выводится из аргумента как string."),
      single("gf-any", "Против any", "Почему `<T>` лучше, чем any, в универсальной функции?",
        [["keep", "Тип результата связан с типом аргумента и не теряется"], ["fast", "Код быстрее"], ["short", "Короче писать"], ["same", "Разницы нет"]], "keep",
        "any обрывает проверку дальше по коду."),
      single("gf-explicit", "Явно", "Зачем писать `useState<User | null>(null)`?",
        [["widen", "Иначе тип выведется как null, и записать User будет нельзя"], ["style", "Только для красоты"], ["speed", "Для скорости"], ["react", "Так требует React всегда"]], "widen",
        "Начальное значение не описывает все будущие.")
    ]
  });

  L({
    slug: "constraints", title: "Ограничения дженериков", summary: "extends в параметре типа, keyof в ограничении и значение по умолчанию для T.",
    skill: ["ts-constraints", "Ограничения", "Ограничивать параметры типа нужной формой."],
    now: "Пишем дженерик-функции и учимся требовать от T нужных свойств.",
    body: [
      ts("T extends", "Требование к типу", "`function longest<T extends { length: number }>(a: T, b: T)` — подойдёт любой тип с полем length: строки, массивы.", "Внутри можно обращаться к a.length, а снаружи тип не теряется.", "function longest<T extends { length: number }>(a: T, b: T): T {\n  return a.length >= b.length ? a : b;\n}"),
      ts("K extends keyof T", "Только существующий ключ", "`function pick<T, K extends keyof T>(obj: T, key: K): T[K]` — ключ должен быть одним из ключей объекта, а результат — типа этого поля.", "`pick(user, \"emial\")` — ошибка с подсказкой правильного имени.", "function get<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}"),
      ts("Тип по умолчанию", "T = …", "`type Response<T = unknown> = { data: T }` — если T не указан, будет unknown.", "Удобно для библиотечных типов: простое использование без лишних угловых скобок."),
      tip("Нужны свойства у T — `T extends {…}`. Нужен ключ объекта — `K extends keyof T`.")
    ],
    quizzes: [
      single("cn-extends", "Ограничение", "Что подойдёт в `longest<T extends { length: number }>`?",
        [["length", "Любое значение с полем length: строка, массив"], ["number", "Только числа"], ["object", "Любой объект"], ["any", "Что угодно"]], "length",
        "У числа нет length."),
      single("cn-keyof", "Ключ", "Что даст `get(user, \"emial\")` при сигнатуре `get<T, K extends keyof T>`?",
        [["error", "Ошибку: такого ключа у user нет"], ["undefined", "undefined без ошибки"], ["any", "Значение типа any"], ["string", "Пустую строку"]], "error",
        "keyof перечисляет только существующие ключи."),
      single("cn-default", "По умолчанию", "Какой тип у data в `Response` при `type Response<T = unknown> = { data: T }`?",
        [["unknown", "unknown"], ["any", "any"], ["never", "never"], ["object", "object"]], "unknown",
        "Параметр по умолчанию используется, когда T не указан.")
    ]
  });

  L({
    slug: "generic-types", title: "Дженерик-типы", summary: "Обобщённые type и interface, обёртки ответа API и типизированные коллекции.",
    skill: ["ts-generic-types", "Дженерик-типы", "Описывать обобщённые структуры данных."],
    now: "Ограничиваем параметры типов и делаем обобщёнными сами типы.",
    body: [
      ts("Обобщённый тип", "type Box<T>", "`type ApiResponse<T> = { data: T; error: string | null }` — одна обёртка для всех ответов: `ApiResponse<User>`, `ApiResponse<Order[]>`.", "Формат ответа описывается один раз, а данные внутри — свои для каждого запроса.", "type ApiResponse<T> = {\n  data: T;\n  error: string | null;\n};\ntype UserResponse = ApiResponse<User>;"),
      ts("Пагинация", "Page<T>", "`type Page<T> = { items: T[]; total: number; next: string | null }` — общая форма страницы любых данных.", "Компонент списка с подгрузкой пишется один раз для пользователей, заказов и курсов."),
      idea("Встроенные дженерики", "Уже знакомые", "`Array<T>`, `Promise<T>`, `Map<K, V>`, `Set<T>`, `Record<K, V>` — всё это дженерик-типы стандартной библиотеки.", "Читая их подсказки в редакторе, ты уже пользуешься дженериками."),
      tip("Повторяется форма с разными данными внутри — сделай тип с параметром `<T>`.")
    ],
    quizzes: [
      single("gt-what", "Что это", "Что такое `ApiResponse<User>`?",
        [["filled", "Тип ApiResponse, где T заменено на User"], ["array", "Массив пользователей"], ["function", "Функция"], ["class", "Класс"]], "filled",
        "Параметр типа подставляется как аргумент."),
      single("gt-map", "Map", "Что описывает `Map<string, number>`?",
        [["map", "Словарь со строковыми ключами и числовыми значениями"], ["array", "Массив строк и чисел"], ["tuple", "Пару строка-число"], ["union", "Строку или число"]], "map",
        "K — тип ключа, V — тип значения."),
      single("gt-why", "Зачем", "Когда стоит сделать тип обобщённым?",
        [["repeat", "Когда одна форма повторяется с разными данными внутри"], ["always", "Всегда"], ["never", "Никогда"], ["big", "Когда тип больше 10 строк"]], "repeat",
        "Иначе пришлось бы копировать тип для каждого случая.")
    ]
  });
}
