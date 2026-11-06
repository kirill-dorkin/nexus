// Chapter 11: TypeScript in practice — typing API data, runtime validation, the DOM, satisfies, branded types.
import { idea, ts, tip, makeLesson } from "./tskit.mjs";

export default function practice(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi } = c;

  L({
    slug: "api-data", title: "Данные из сети", summary: "Почему ответ fetch — это unknown, проверка схемой (Zod) и тип, выведенный из схемы.",
    skill: ["ts-api", "Данные API", "Безопасно типизировать данные, пришедшие из сети."],
    now: "Подключаем линтер и решаем главную практическую задачу: данные, которых TypeScript не видит.",
    body: [
      idea("Граница доверия", "Сеть, формы, localStorage", "Всё, что приходит извне, может иметь любую форму. Написать `as User` — значит пообещать TypeScript то, что никто не проверял.", "Ошибки «undefined is not a function» чаще всего начинаются именно на границе."),
      ts("Схема проверки", "Zod", "Библиотека Zod описывает форму данных схемой и проверяет её при выполнении: `UserSchema.parse(json)` либо вернёт данные, либо бросит понятную ошибку.", "Проверка и тип — из одного описания.", "import { z } from \"zod\";\nconst UserSchema = z.object({ id: z.number(), name: z.string() });\ntype User = z.infer<typeof UserSchema>;\nconst user = UserSchema.parse(await res.json());"),
      ts("safeParse", "Без исключений", "`UserSchema.safeParse(data)` возвращает `{ success: true, data }` или `{ success: false, error }` — размеченное объединение.", "Ошибку данных можно показать пользователю, а не уронить страницу."),
      idea("Один тип на клиенте и сервере", "Общий контракт", "Схемы выносят в общий пакет: сервер проверяет входящие запросы, клиент — ответы, а тип выводится из той же схемы.", "Поменял поле на сервере — сборка клиента сразу покажет, где его использовали."),
      tip("Внешние данные — `unknown` и проверка схемой. `as User` на ответе сервера — обещание без гарантии.")
    ],
    quizzes: [
      single("api-as", "as User", "Чем опасно `const user = (await res.json()) as User`?",
        [["trust", "TypeScript поверит на слово, а данные могут оказаться другими"], ["slow", "Медленно работает"], ["error", "Всегда ошибка компиляции"], ["none", "Ничем"]], "trust",
        "Утверждение типа ничего не проверяет."),
      single("api-infer", "Тип из схемы", "Как получить тип из схемы Zod UserSchema?",
        [["infer", "`z.infer<typeof UserSchema>`"], ["typeof", "`typeof UserSchema`"], ["return", "`ReturnType<UserSchema>`"], ["as", "`UserSchema as Type`"]], "infer",
        "Схема — источник правды и для проверки, и для типа."),
      single("api-safe", "safeParse", "Что возвращает safeParse?",
        [["union", "Объект с success: true и data или success: false и error"], ["throw", "Бросает исключение"], ["boolean", "Только true или false"], ["any", "any"]], "union",
        "Это размеченное объединение.")
    ]
  });

  L({
    slug: "dom-types", title: "Типы DOM", summary: "querySelector и null, HTMLInputElement, обобщённый querySelector<T> и события форм.",
    skill: ["ts-dom", "Типы DOM", "Типизировать работу с элементами страницы и событиями."],
    now: "Проверяем данные из сети и типизируем работу со страницей.",
    body: [
      ts("querySelector и null", "Элемента может не быть", "`document.querySelector(\".price\")` возвращает `Element | null`. Без проверки обратиться к нему нельзя.", "Страница без нужного элемента не уронит скрипт ошибкой «cannot read properties of null».", "const price = document.querySelector(\".price\");\nif (price) price.textContent = \"990 ₽\";"),
      ts("Конкретный тип элемента", "HTMLInputElement", "По тегу TypeScript знает тип: `querySelector(\"input\")` — HTMLInputElement. По классу — только Element, поэтому указывают: `querySelector<HTMLInputElement>(\".email\")`.", "Поле value и checked становятся доступны с подсказками.", "const email = document.querySelector<HTMLInputElement>(\".email\");\nconsole.log(email?.value);"),
      ts("События форм", "currentTarget", "В обработчике `form.addEventListener(\"submit\", (e) => …)` используют `e.currentTarget as HTMLFormElement` и `new FormData(form)`.", "Данные формы собираются без ручного поиска полей."),
      tip("`querySelector` может вернуть null — проверь. Нужен конкретный элемент — `querySelector<HTMLInputElement>`.")
    ],
    quizzes: [
      single("dom-null", "null", "Почему TypeScript не даёт сразу написать `document.querySelector(\".price\").textContent = …`?",
        [["null", "querySelector может вернуть null, если элемента нет"], ["readonly", "textContent только для чтения"], ["string", "textContent — не строка"], ["dom", "TypeScript не знает DOM"]], "null",
        "Сначала проверь, что элемент найден."),
      single("dom-input", "value", "Как получить доступ к value у поля, найденного по классу .email?",
        [["generic", "`querySelector<HTMLInputElement>(\".email\")`"], ["any", "`querySelector(\".email\") as any`"], ["value", "`querySelector(\".email\").value` без изменений"], ["byid", "Это невозможно"]], "generic",
        "Тип элемента указывают параметром дженерика."),
      single("dom-tag", "По тегу", "Какой тип вернёт `document.querySelector(\"input\")`?",
        [["input", "HTMLInputElement | null"], ["element", "Element"], ["any", "any"], ["node", "Node"]], "input",
        "По имени тега TypeScript знает конкретный тип.")
    ]
  });

  L({
    slug: "satisfies-brands", title: "satisfies и типы-метки", summary: "Проверить значение без потери точного типа, и как отличать ID пользователя от ID заказа.",
    skill: ["ts-satisfies", "satisfies и метки", "Проверять значения через satisfies и различать похожие значения метками."],
    now: "Типизируем DOM и завершаем курс приёмами, которые делают типы ещё точнее.",
    body: [
      ts("satisfies", "Проверить, не расширяя", "`const routes = { home: \"/\", course: \"/courses\" } satisfies Record<string, string>` — TypeScript проверит форму, но сохранит точные ключи.", "С аннотацией `: Record<string, string>` ключи home и course потерялись бы.", "const theme = {\n  accent: \"#f26a21\",\n  radius: 12\n} satisfies Record<string, string | number>;\ntheme.accent.toUpperCase(); // знает, что это строка"),
      ts("Тип-метка", "Branded type", "`type UserId = number & { readonly brand: \"UserId\" }` — число, которое нельзя перепутать с OrderId.", "Функция `deleteUser(id: UserId)` не примет id заказа, хотя оба — числа.", "type UserId = number & { readonly __brand: \"UserId\" };\nconst asUserId = (n: number) => n as UserId;"),
      idea("Типы как документация", "Код объясняет себя", "Точные типы — это документация, которая не устаревает: сигнатура функции говорит, что она принимает и возвращает, а компилятор следит за правдой.", "Через год код понятен без поиска «а что тут приходит?»."),
      tip("Проверить форму и не потерять точность — `satisfies`. Похожие числа разного смысла — метки.")
    ],
    quizzes: [
      single("sb-satisfies", "satisfies", "Чем `satisfies` отличается от аннотации типа?",
        [["keep", "Проверяет форму, но сохраняет точный выведенный тип"], ["skip", "Отключает проверку"], ["runtime", "Проверяет при выполнении"], ["same", "Ничем"]], "keep",
        "Аннотация расширила бы тип до указанного."),
      single("sb-brand", "Метки", "Зачем делать UserId и OrderId разными типами-метками?",
        [["mixup", "Чтобы TypeScript не дал перепутать id пользователя и заказа"], ["speed", "Для скорости"], ["db", "Так требует база данных"], ["none", "Незачем"]], "mixup",
        "Оба — числа, но смысл разный."),
      multi("sb-docs", "Польза типов", "Что дают точные типы в проекте?",
        [["docs", "Документацию, которая не устаревает"], ["errors", "Ошибки до запуска"], ["refactor", "Безопасные переименования"], ["speed", "Более быстрый JavaScript в браузере"]], ["docs", "errors", "refactor"],
        "На скорость выполнения типы не влияют — их нет при запуске.")
    ]
  });
}
