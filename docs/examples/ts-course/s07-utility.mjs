// Chapter 7: utility types — Partial, Required, Readonly, Pick, Omit, Record, Exclude, ReturnType, Awaited.
import { idea, ts, tip, makeLesson } from "./tskit.mjs";

export default function utility(c, rc) {
  const L = makeLesson(c, rc);
  const { single, short } = c;

  L({
    slug: "partial-pick", title: "Partial, Required, Pick и Omit", summary: "Новые типы из существующего: все поля необязательны, обязательны, выбранные или все кроме.",
    skill: ["ts-utility-shape", "Утилиты формы", "Строить производные типы объектов через Partial, Pick и Omit."],
    now: "Пишем обобщённые типы и знакомимся с готовыми — утилитными.",
    body: [
      ts("Partial<T>", "Все поля необязательны", "Превращает каждое поле T в необязательное.", "Обновление объекта: передают только изменённые поля.", "function updateUser(id: number, patch: Partial<User>) { /* … */ }\nupdateUser(1, { name: \"Аня\" });"),
      ts("Required<T>", "Все поля обязательны", "Обратное Partial: убирает `?` у всех полей.", "После заполнения формы значения по умолчанию гарантированно есть."),
      ts("Pick<T, K>", "Только выбранные поля", "`Pick<User, \"id\" | \"name\">` — тип с двумя полями из User.", "Карточке в списке нужны два поля, а не весь объект.", "type UserPreview = Pick<User, \"id\" | \"name\">;"),
      ts("Omit<T, K>", "Все, кроме", "`Omit<User, \"password\">` — User без пароля.", "Ответ API, который никогда не должен содержать секрет, описывается одной строкой.", "type PublicUser = Omit<User, \"password\">;"),
      idea("Один источник правды", "Производные типы", "Новые типы выводят из основного, а не копируют поля. Добавил поле в User — оно само появится в Partial<User> и Pick с ним.", "Нет рассинхронизации, когда в одном типе поле переименовали, а в копии забыли."),
      tip("Не копируй поля — выводи: `Partial`, `Pick`, `Omit` от основного типа.")
    ],
    quizzes: [
      single("us-partial", "Обновление", "Какой тип подходит для частичного обновления пользователя?",
        [["partial", "`Partial<User>`"], ["required", "`Required<User>`"], ["user", "`User`"], ["any", "`any`"]], "partial",
        "Все поля становятся необязательными."),
      single("us-omit", "Без пароля", "Как описать пользователя без поля password?",
        [["omit", "`Omit<User, \"password\">`"], ["pick", "`Pick<User, \"password\">`"], ["partial", "`Partial<User>`"], ["exclude", "`User - password`"]], "omit",
        "Pick, наоборот, оставил бы только пароль."),
      single("us-source", "Источник", "Почему лучше выводить UserPreview через Pick, чем копировать поля?",
        [["sync", "Изменения в User автоматически отразятся в производном типе"], ["short", "Только потому что короче"], ["fast", "Быстрее компилируется"], ["runtime", "Pick работает при запуске"]], "sync",
        "Один источник правды.")
    ]
  });

  L({
    slug: "record-exclude", title: "Record, Readonly, Exclude и Extract", summary: "Словари, неизменяемые объекты и фильтрация объединений.",
    skill: ["ts-utility-sets", "Утилиты множеств", "Пользоваться Record, Readonly, Exclude и Extract."],
    now: "Строим формы объектов утилитами и переходим к словарям и объединениям.",
    body: [
      ts("Readonly<T>", "Неизменяемый объект", "Делает все поля readonly.", "Настройки и состояние, которые нельзя менять напрямую, описываются одной утилитой.", "const config: Readonly<Config> = loadConfig();"),
      ts("Exclude<T, U>", "Убрать из объединения", "`Exclude<\"draft\" | \"published\" | \"archived\", \"archived\">` — `\"draft\" | \"published\"`.", "Подмножество статусов без копирования строк."),
      ts("Extract<T, U>", "Оставить подходящие", "`Extract<Event, { type: \"click\" }>` — только варианты объединения, подходящие под условие.", "Достать нужный вариант из размеченного объединения."),
      ts("NonNullable<T>", "Без null и undefined", "`NonNullable<string | null>` — string.", "После проверки на null описываешь гарантированно заполненное значение."),
      tip("Объединения фильтруют `Exclude` и `Extract`, объекты замораживают `Readonly`.")
    ],
    quizzes: [
      single("rx-exclude", "Exclude", "Что даст `Exclude<\"a\" | \"b\" | \"c\", \"c\">`?",
        [["ab", "\"a\" | \"b\""], ["c", "\"c\""], ["abc", "\"a\" | \"b\" | \"c\""], ["never", "never"]], "ab",
        "Exclude убирает подходящие варианты."),
      single("rx-extract", "Extract", "Что делает Extract<T, U>?",
        [["keep", "Оставляет варианты T, подходящие под U"], ["remove", "Удаляет варианты T, подходящие под U"], ["merge", "Склеивает T и U"], ["keys", "Возвращает ключи T"]], "keep",
        "Противоположность Exclude."),
      short("rx-nonnull", "Без null", "Какая утилита убирает null и undefined из типа?", ["NonNullable"],
        "NonNullable<string | null> — string.")
    ]
  });

  L({
    slug: "function-utilities", title: "ReturnType, Parameters и Awaited", summary: "Типы из функций и промисов: результат, параметры и содержимое Promise.",
    skill: ["ts-utility-fn", "Утилиты функций", "Получать типы из функций и промисов."],
    now: "Фильтруем объединения и учимся вытаскивать типы из функций.",
    body: [
      ts("ReturnType<T>", "Что возвращает функция", "`ReturnType<typeof createStore>` — тип результата функции без ручного описания.", "Тип объекта, который собирает функция, всегда совпадает с тем, что она реально возвращает.", "function createStore() {\n  return { items: [] as string[], add(x: string) {} };\n}\ntype Store = ReturnType<typeof createStore>;"),
      ts("Parameters<T>", "Параметры функции", "`Parameters<typeof fetch>` — кортеж типов аргументов функции.", "Обёртка над чужой функцией принимает ровно те же аргументы."),
      ts("Awaited<T>", "Что внутри промиса", "`Awaited<ReturnType<typeof loadUser>>` — тип данных, которые вернёт async-функция после await.", "Тип результата запроса без отдельного описания.", "type LoadedUser = Awaited<ReturnType<typeof loadUser>>;"),
      tip("Тип уже есть в коде функции — достань его через `ReturnType` и `Awaited`, а не переписывай руками.")
    ],
    quizzes: [
      single("fu-return", "Результат", "Как получить тип результата функции createStore?",
        [["return", "`ReturnType<typeof createStore>`"], ["typeof", "`typeof createStore`"], ["params", "`Parameters<typeof createStore>`"], ["awaited", "`Awaited<createStore>`"]], "return",
        "typeof даёт тип самой функции, а не результата."),
      single("fu-awaited", "Промис", "Какой тип у `Awaited<Promise<User>>`?",
        [["user", "User"], ["promise", "Promise<User>"], ["any", "any"], ["void", "void"]], "user",
        "Awaited разворачивает промис."),
      single("fu-params", "Параметры", "Что возвращает `Parameters<typeof f>`?",
        [["tuple", "Кортеж типов параметров функции f"], ["object", "Объект с именами параметров"], ["return", "Тип результата"], ["count", "Число параметров"]], "tuple",
        "Например, [url: string, init?: RequestInit].")
    ]
  });
}
