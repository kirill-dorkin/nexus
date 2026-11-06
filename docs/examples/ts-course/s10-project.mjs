// Chapter 10: TypeScript in a project — tsconfig, strict mode, linting, migrating from JavaScript.
import { idea, ts, cmd, tip, makeLesson } from "./tskit.mjs";
import { code } from "./tskit.mjs";

export default function project(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "tsconfig", title: "tsconfig.json по делу", summary: "target, module, include, lib, outDir и где настройки берутся у фреймворков.",
    skill: ["ts-tsconfig", "tsconfig", "Читать и настраивать tsconfig.json."],
    now: "Подключаем типы библиотек и разбираем настройки проекта.",
    body: [
      code("json", `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src"]
}`),
      idea("target и lib", "Какой JavaScript", "target — до какой версии JavaScript понизить синтаксис, lib — какие встроенные API доступны (DOM для браузера, без DOM — для сервера).", "В серверном проекте без DOM `document` станет ошибкой, а не падением в работе."),
      idea("module и moduleResolution", "Как искать импорты", "Как писать и искать модули: `Bundler` — для проектов со сборщиком (Vite, Next.js), `NodeNext` — для чистого Node.js.", "Неверная настройка даёт ошибки «cannot find module», хотя файл на месте."),
      idea("include и exclude", "Какие файлы проверять", "`include: [\"src\"]` — проверять только папку src. node_modules исключается по умолчанию.", "Проверка не тратит время на сборку и чужой код."),
      idea("extends в tsconfig", "Готовые основы", "`\"extends\": \"@tsconfig/node22/tsconfig.json\"` берёт проверенные настройки и позволяет дописать свои. Фреймворки генерируют tsconfig сами.", "Не нужно подбирать два десятка флагов вручную."),
      tip("В проекте со сборщиком: `moduleResolution: Bundler`, `noEmit: true`, `strict: true`.")
    ],
    quizzes: [
      single("tc-lib", "lib", "Почему в серверном проекте убирают DOM из lib?",
        [["catch", "Чтобы обращение к document или window было ошибкой при сборке"], ["speed", "Сервер работает быстрее"], ["size", "Уменьшается размер кода"], ["css", "Чтобы отключить CSS"]], "catch",
        "На сервере нет DOM."),
      single("tc-bundler", "moduleResolution", "Какой moduleResolution выбирают в проекте на Vite?",
        [["bundler", "Bundler"], ["classic", "Classic"], ["none", "None"], ["browser", "Browser"]], "bundler",
        "NodeNext — для чистого Node.js без сборщика."),
      single("tc-include", "include", "Что делает `\"include\": [\"src\"]`?",
        [["only", "Проверять только файлы из папки src"], ["exclude", "Исключить src"], ["copy", "Скопировать src"], ["build", "Собрать src в один файл"]], "only",
        "Остальные файлы TypeScript не проверяет.")
    ]
  });

  L({
    slug: "strict", title: "Строгий режим", summary: "strict и что он включает, noUncheckedIndexedAccess, exactOptionalPropertyTypes и почему строже — лучше.",
    skill: ["ts-strict", "Строгий режим", "Включать строгие проверки и понимать, что каждая ловит."],
    now: "Настраиваем проект и включаем проверки, ради которых TypeScript и нужен.",
    body: [
      idea("strict", "Набор строгих проверок", "`\"strict\": true` включает сразу несколько флагов: strictNullChecks (null отдельно), noImplicitAny (никаких скрытых any), strictFunctionTypes и другие.", "Без strict TypeScript пропускает большую часть ошибок, ради которых его ставят."),
      ts("noUncheckedIndexedAccess", "Элемент может отсутствовать", "С этим флагом `items[0]` имеет тип `T | undefined`: массив может быть пустым, ключа в словаре может не быть.", "Ловит «cannot read properties of undefined» на пустых списках.", "const first = items[0]; // Item | undefined\nfirst.name; // Ошибка: проверь, что элемент есть"),
      idea("noImplicitAny", "Без скрытого any", "Параметр без аннотации, тип которого нельзя вывести, становится ошибкой, а не тихим any.", "any не расползается по проекту незаметно."),
      idea("Включать постепенно", "В старом проекте", "В большом проекте строаноним включают по флагу: сначала noImplicitAny, потом strictNullChecks, исправляя ошибки по папкам.", "Тысяча ошибок разом пугает, десяток за раз — нормальная работа."),
      tip("Новый проект — сразу `strict: true` и `noUncheckedIndexedAccess`.")
    ],
    quizzes: [
      single("st-null", "strictNullChecks", "Что меняет strictNullChecks?",
        [["separate", "null и undefined больше не входят в другие типы автоматически"], ["forbid", "Запрещает null в коде"], ["any", "Превращает null в any"], ["nothing", "Ничего"]], "separate",
        "string — только строка, без null."),
      single("st-index", "Индекс", "Какой тип у `items[0]` при включённом noUncheckedIndexedAccess, если items: Item[]?",
        [["maybe", "Item | undefined"], ["item", "Item"], ["any", "any"], ["never", "never"]], "maybe",
        "Массив может быть пустым."),
      single("st-old", "Старый проект", "Как включать строаноним в большом старом проекте?",
        [["step", "Постепенно, по флагу и по папкам"], ["all", "Всё сразу и чинить тысячу ошибок за ночь"], ["never", "Никогда"], ["any", "Заменить всё на any"]], "step",
        "Маленькими шагами — без остановки разработки.")
    ]
  });

  L({
    slug: "migrate-lint", title: "Переход с JavaScript и линтинг", summary: "allowJs и checkJs, JSDoc-типы, typescript-eslint и правила, которые ловят опасный код.",
    skill: ["ts-migrate", "Переход и линтер", "Переводить проект на TypeScript и настраивать typescript-eslint."],
    now: "Включили строаноним и разбираем, как перевести существующий проект и усилить проверки линтером.",
    body: [
      idea("allowJs и checkJs", "JavaScript рядом с TypeScript", "`allowJs` разрешает .js-файлы в проекте, `checkJs` проверяет и их. Файлы переименовывают в .ts по одному.", "Переход идёт параллельно обычной работе, без «большого переписывания»."),
      ts("JSDoc-типы", "Типы в комментариях", "В .js-файле типы можно описать комментариями `/** @param {number} price */` — TypeScript их проверит.", "Проекты, которые остаются на JavaScript, тоже получают проверку.", "/** @param {number} price @returns {string} */\nfunction format(price) { return `${price} ₽`; }"),
      cmd("typescript-eslint", "Линтер с типами", "Плагин ESLint, который знает типы: правила no-floating-promises (забытый await), no-unsafe-assignment (расползание any), strict-boolean-expressions.", "Ловит ошибки, которые компилятор считает допустимыми."),
      idea("@ts-expect-error", "Осознанное исключение", "Комментарий над строкой разрешает ошибку типа и сам становится ошибкой, когда её больше нет. Лучше, чем @ts-ignore, который молчит всегда.", "Временные заплатки не остаются в коде навсегда."),
      tip("Переходи файл за файлом через allowJs. Вместо @ts-ignore — @ts-expect-error с пояснением.")
    ],
    quizzes: [
      single("mg-allow", "allowJs", "Зачем нужен allowJs при переходе на TypeScript?",
        [["mix", "Чтобы .js и .ts жили в проекте вместе, пока файлы переводятся по одному"], ["speed", "Чтобы ускорить JavaScript"], ["disable", "Чтобы отключить TypeScript"], ["minify", "Чтобы сжать код"]], "mix",
        "Переход идёт постепенно."),
      single("mg-expect", "Исключение", "Чем @ts-expect-error лучше @ts-ignore?",
        [["stale", "Сам станет ошибкой, когда исключение больше не нужно"], ["silent", "Молчит всегда"], ["fast", "Быстрее компилируется"], ["same", "Ничем"]], "stale",
        "Ненужные заплатки не останутся незамеченными."),
      single("mg-floating", "Забытый await", "Какое правило typescript-eslint ловит промисы, которые никто не ждёт?",
        [["floating", "no-floating-promises"], ["unused", "no-unused-vars"], ["any", "no-explicit-any"], ["console", "no-console"]], "floating",
        "Такой промис может молча упасть.")
    ]
  });
}
