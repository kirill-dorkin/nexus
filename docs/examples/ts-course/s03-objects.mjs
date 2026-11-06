// Chapter 3: objects — type aliases and interfaces, optional and readonly, index signatures, extending.
import { idea, ts, tip, makeLesson } from "./tskit.mjs";

export default function objects(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "object-types", title: "Типы объектов", summary: "Описать форму объекта, type и interface, лишние и недостающие поля.",
    skill: ["ts-objects", "Типы объектов", "Описывать форму объектов через type и interface."],
    now: "Знаем базовые типы и описываем объекты — основу любых данных.",
    body: [
      ts("Тип объекта", "Форма данных", "Тип объекта перечисляет поля и их типы: `{ id: number; name: string }`. Объект должен иметь все обязательные поля нужных типов.", "Опечатка в имени поля или забытое поле становятся ошибкой при сборке.", "const user: { id: number; name: string } = { id: 1, name: \"Аня\" };"),
      ts("type", "Псевдоним типа", "`type User = { id: number; name: string }` даёт типу имя, чтобы использовать его везде. type описывает что угодно: объекты, объединения, кортежи.", "Один раз описал — используешь в функциях, компонентах, запросах.", "type User = {\n  id: number;\n  name: string;\n};"),
      ts("interface", "Описание объекта", "`interface User { id: number; name: string }` — другой способ описать объект. Интерфейсы можно расширять через extends и дополнять повторным объявлением.", "Для формы объектов type и interface почти равноценны; в команде выбирают один стиль.", "interface User {\n  id: number;\n  name: string;\n}"),
      idea("type или interface", "Как выбрать", "interface — только для объектов и классов, умеет слияние объявлений. type — для всего, включая объединения `\"a\" | \"b\"` и кортежи.", "Простое правило: объединения и утилиты — type, публичные формы объектов библиотеки — interface."),
      idea("Проверка лишних полей", "Опечатка в литерале", "Если сразу передать литерал объекта с полем, которого нет в типе (`{ id: 1, nmae: \"Аня\" }`), TypeScript сообщит об ошибке.", "Опечатки в именах полей ловятся там, где объект создаётся."),
      tip("Дай типу имя через type или interface и используй его во всех местах, где ходят эти данные.")
    ],
    quizzes: [
      single("ob-missing", "Нет поля", "Тип User требует id и name. Что будет при `const u: User = { id: 1 }`?",
        [["error", "Ошибка: нет обязательного поля name"], ["ok", "Всё в порядке"], ["undefined", "name станет undefined без ошибки"], ["runtime", "Ошибка только при запуске"]], "error",
        "Обязательные поля проверяются."),
      single("ob-union", "Объединение", "Чем можно описать тип `\"draft\" | \"published\"`?",
        [["type", "Только через type"], ["interface", "Только через interface"], ["both", "И type, и interface"], ["class", "Только через class"]], "type",
        "interface описывает только объекты."),
      single("ob-typo", "Опечатка", "Что поймает TypeScript в `const u: User = { id: 1, nmae: \"Аня\" }`?",
        [["typo", "Лишнее поле nmae и отсутствие name"], ["nothing", "Ничего"], ["id", "Ошибку в id"], ["const", "Что нужно let"]], "typo",
        "Проверка лишних полей работает для литералов объектов.")
    ]
  });

  L({
    slug: "optional-readonly", title: "Необязательные и неизменяемые поля", summary: "Знак ?, readonly, работа с возможным undefined через ?. и ??.",
    skill: ["ts-optional", "Необязательные поля", "Описывать необязательные и неизменяемые поля и безопасно их читать."],
    now: "Описываем объекты и уточняем, какие поля можно не указывать или нельзя менять.",
    body: [
      ts("Необязательное поле", "Знак вопроса", "`avatar?: string` — поле может отсутствовать. Его тип внутри — `string | undefined`.", "TypeScript не даст обратиться к avatar.length, пока ты не проверишь, что значение есть.", "type User = {\n  name: string;\n  avatar?: string;\n};"),
      ts("?. и ??", "Безопасное чтение", "`user.address?.city` — вернёт undefined, если address нет. `name ?? \"Аноним\"` — подставит значение, если слева null или undefined.", "Короткая запись вместо цепочки if, и TypeScript понимает её.", "const city = user.address?.city ?? \"не указан\";"),
      ts("readonly-поле", "Нельзя менять", "`readonly id: number` — поле можно прочитать, но нельзя присвоить новое значение после создания объекта.", "Идентификаторы и настройки не поменяются случайно где-то в середине кода.", "type Order = { readonly id: number; total: number };"),
      idea("Неявный undefined", "strictNullChecks", "В строгом режиме null и undefined не входят в другие типы: `string` — это только строка. Без строгого режима любое значение может оказаться null, и TypeScript не предупредит.", "Строгий режим ловит самую частую ошибку JavaScript — «cannot read properties of undefined»."),
      tip("Поле может отсутствовать — `?`. Читаешь такое поле — `?.` и `??`.")
    ],
    quizzes: [
      single("op-type", "Тип поля", "Какой тип у поля `avatar?: string` при чтении?",
        [["union", "string | undefined"], ["string", "string"], ["any", "any"], ["null", "null"]], "union",
        "Поле может отсутствовать — значит, undefined."),
      single("op-nullish", "По умолчанию", "Что вернёт `name ?? \"Аноним\"`, если name равно пустой строке \"\"?",
        [["empty", "Пустую строку: ?? срабатывает только на null и undefined"], ["guest", "\"Аноним\""], ["error", "Ошибку"], ["undefined", "undefined"]], "empty",
        "|| заменил бы и пустую строку, ?? — нет."),
      single("op-readonly", "readonly", "Что запрещает `readonly id: number`?",
        [["assign", "Присваивать полю новое значение"], ["read", "Читать поле"], ["create", "Создавать объект"], ["number", "Хранить числа больше 100"]], "assign",
        "Читать можно, менять — нет.")
    ]
  });

  L({
    slug: "extend-index", title: "Расширение и словари", summary: "extends и пересечение &, индексная сигнатура и Record для словарей.",
    skill: ["ts-extend", "Расширение типов", "Собирать типы из других и описывать словари."],
    now: "Владеем полями объектов и учимся собирать большие типы из маленьких.",
    body: [
      ts("extends", "Расширить интерфейс", "`interface Admin extends User { rights: string[] }` — Admin имеет все поля User и свои.", "Общие поля описываются один раз.", "interface Admin extends User {\n  rights: string[];\n}"),
      ts("Пересечение &", "Склеить типы", "`type Admin = User & { rights: string[] }` — значение должно соответствовать обоим типам сразу.", "Так комбинируют type: например, данные плюс метки времени `Post & Timestamps`."),
      ts("Индексная сигнатура", "Любые ключи", "`{ [key: string]: number }` — объект с любыми строковыми ключами и числовыми значениями.", "Словарь «слово → количество» или настройки с заранее неизвестными именами.", "const counts: { [word: string]: number } = { html: 3, css: 2 };"),
      ts("Record", "Словарь короче", "`Record<string, number>` — то же, что индексная сигнатура. `Record<\"ru\" | \"en\", string>` требует ровно эти ключи.", "Переводы, цены по тарифам, настройки по средам — с проверкой, что ни один ключ не забыт.", "const titles: Record<\"ru\" | \"en\", string> = { ru: \"Курсы\", en: \"Courses\" };"),
      tip("Общее выноси в базовый тип и расширяй. Фиксированный набор ключей — `Record<\"a\" | \"b\", T>`.")
    ],
    quizzes: [
      single("ex-and", "Пересечение", "Какие поля должны быть у значения типа `A & B`?",
        [["both", "Все поля A и все поля B"], ["either", "Поля A или поля B"], ["common", "Только общие поля"], ["none", "Никакие"]], "both",
        "Пересечение — это «и то, и другое»."),
      single("ex-record", "Все ключи", "Чем полезен `Record<\"ru\" | \"en\", string>`?",
        [["keys", "TypeScript проверит, что заданы оба ключа ru и en"], ["any", "Разрешает любые ключи"], ["speed", "Ускоряет доступ"], ["array", "Превращает объект в массив"]], "keys",
        "Забытый перевод станет ошибкой."),
      single("ex-extends", "Расширение", "Что значит `interface Admin extends User`?",
        [["inherit", "Admin содержит все поля User плюс свои"], ["replace", "Admin заменяет User"], ["subset", "Admin содержит часть полей User"], ["class", "Admin — класс"]], "inherit",
        "extends добавляет поля к уже описанным.")
    ]
  });
}
