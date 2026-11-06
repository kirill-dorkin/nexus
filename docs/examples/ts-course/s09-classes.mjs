// Chapter 9: classes, modules and declaration files.
import { idea, ts, cmd, tip, makeLesson } from "./tskit.mjs";

export default function classes(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "classes", title: "Классы в TypeScript", summary: "Поля и конструктор, public, private и protected, readonly, implements и abstract.",
    skill: ["ts-classes", "Классы", "Писать типизированные классы с модификаторами доступа."],
    now: "Описываем строки по шаблону и переходим к классам.",
    body: [
      ts("Поля класса", "Объявить и инициализировать", "Поля класса объявляют с типами; в строгом режиме каждое должно получить значение в конструкторе или при объявлении.", "Забытая инициализация поля становится ошибкой, а не undefined в работе.", "class Cart {\n  items: string[] = [];\n  constructor(readonly owner: string) {}\n}"),
      ts("Модификаторы доступа", "public, private, protected", "`private` — только внутри класса, `protected` — ещё и в наследниках, `public` — везде (по умолчанию). Это проверка TypeScript; настоящие приватные поля JavaScript пишутся через `#`.", "Внутреннее состояние нельзя случайно поменять снаружи.", "class Counter {\n  #value = 0;\n  increment() { this.#value++; }\n}"),
      ts("implements", "Класс по договору", "`class FileLogger implements Logger` — TypeScript проверит, что в классе есть все методы интерфейса Logger.", "Можно подменять реализации (в тестах, в разных средах), сохраняя договор."),
      ts("abstract", "Шаблон для наследников", "Абстрактный класс нельзя создать напрямую; его абстрактные методы обязаны реализовать наследники.", "Общая логика в базовом классе, обязательные детали — в наследниках."),
      tip("Внутреннее состояние — `#поле` или `private`. Договор о методах — interface и `implements`.")
    ],
    quizzes: [
      single("cl-private", "private", "Где доступно поле с модификатором private?",
        [["inside", "Только внутри самого класса"], ["children", "В классе и наследниках"], ["everywhere", "Везде"], ["module", "Во всём файле"]], "inside",
        "protected добавил бы наследников."),
      single("cl-implements", "implements", "Что проверяет `class A implements B`?",
        [["contract", "Что в классе A есть всё, что требует интерфейс B"], ["inherit", "Что A наследует код B"], ["runtime", "Что B существует при запуске"], ["nothing", "Ничего"]], "contract",
        "implements не добавляет код, только проверяет."),
      single("cl-hash", "Настоящий private", "Чем `#value` отличается от `private value`?",
        [["runtime", "#value скрыто и при выполнении JavaScript, private — только проверка TypeScript"], ["same", "Ничем"], ["public", "#value — публичное поле"], ["static", "#value — статическое поле"]], "runtime",
        "Типы стираются, а # — часть самого JavaScript.")
    ]
  });

  L({
    slug: "modules", title: "Модули и импорт типов", summary: "export и import типов, import type, пространства имён против модулей и пути импорта.",
    skill: ["ts-modules", "Модули", "Делить типы и код по модулям и импортировать типы правильно."],
    now: "Пишем классы и раскладываем код по модулям.",
    body: [
      ts("Экспорт типов", "Как и значения", "Типы экспортируют и импортируют так же, как функции: `export type User = …`, `import { User } from \"./types\"`.", "Общие типы живут в одном файле и используются по всему проекту.", "// types.ts\nexport type User = { id: number; name: string };\n// app.ts\nimport type { User } from \"./types\";"),
      ts("import type", "Только тип", "`import type { User }` гарантирует, что импорт исчезнет из JavaScript: ничего лишнего не попадёт в сборку.", "Сборщики вроде Vite и esbuild обрабатывают файлы по одному и иначе не знают, тип это или значение."),
      idea("Псевдонимы путей", "paths в tsconfig", "`\"paths\": { \"@/*\": [\"src/*\"] }` позволяет писать `import { Button } from \"@/ui/button\"` вместо `../../../ui/button`.", "Импорты не ломаются при переносе файлов; сборщик должен знать те же псевдонимы."),
      idea("namespace", "Устаревший способ", "Пространства имён `namespace X {}` пришли из времён до модулей ES. В новом коде вместо них используют обычные модули.", "Встретишь их в старых проектах и файлах объявлений."),
      tip("Типы импортируй через `import type`. Общие типы — в отдельном модуле.")
    ],
    quizzes: [
      single("md-importtype", "import type", "Зачем писать `import type { User }`?",
        [["erase", "Импорт гарантированно исчезнет из JavaScript и не попадёт в сборку"], ["faster", "Ускоряет выполнение кода"], ["runtime", "Делает тип доступным при запуске"], ["global", "Делает тип глобальным"]], "erase",
        "Типы при выполнении не существуют."),
      single("md-paths", "Псевдонимы", "Где настраивают короткие пути импорта вроде `@/ui/button`?",
        [["paths", "В paths внутри tsconfig.json (и в сборщике)"], ["package", "Только в package.json"], ["env", "В .env"], ["gitignore", "В .gitignore"]], "paths",
        "Сборщик должен знать те же псевдонимы."),
      single("md-namespace", "namespace", "Что использовать в новом коде вместо namespace?",
        [["modules", "Обычные модули с import и export"], ["global", "Глобальные переменные"], ["class", "Статические классы"], ["enum", "enum"]], "modules",
        "namespace остался от времён до модулей ES.")
    ]
  });

  L({
    slug: "declarations", title: "Файлы объявлений и @types", summary: "Что такое .d.ts, пакеты @types, declare и как типизировать библиотеку без типов.",
    skill: ["ts-declarations", "Файлы объявлений", "Подключать типы библиотек и описывать недостающие."],
    now: "Раскладываем код по модулям и разбираемся, откуда берутся типы чужих библиотек.",
    body: [
      idea("Файл .d.ts", "Только типы", "Файл объявлений описывает типы модуля без кода. Библиотеки публикуют .d.ts рядом с JavaScript, и редактор знает их API.", "Подсказки для React, lodash или Express появляются именно из .d.ts."),
      cmd("@types", "Типы от сообщества", "Если библиотека написана на JavaScript без типов, их часто можно поставить отдельно: `npm install -D @types/express`.", "Проект DefinitelyTyped содержит типы для тысяч пакетов."),
      ts("declare module", "Своё описание", "Для библиотеки без типов создают файл `types/lib.d.ts`: `declare module \"old-lib\" { export function run(x: string): void; }`.", "Описываешь только то, что используешь, и вместо any получаешь проверку.", "declare module \"*.svg\" {\n  const url: string;\n  export default url;\n}"),
      ts("declare global", "Глобальные дополнения", "Расширить глобальный тип, например добавить поле в Window: `declare global { interface Window { analytics: Analytics } }`.", "Скрипты, которые подключаются тегом script, получают типы."),
      tip("Нет типов у пакета — попробуй `@types/имя`. Нет и их — опиши нужное в своём .d.ts.")
    ],
    quizzes: [
      single("dc-dts", ".d.ts", "Что содержит файл .d.ts?",
        [["types", "Только объявления типов, без кода"], ["code", "Скомпилированный код"], ["tests", "Тесты"], ["config", "Настройки компилятора"]], "types",
        "Это описание API модуля."),
      single("dc-types", "@types", "У пакета express нет встроенных типов. Что сделать?",
        [["install", "`npm install -D @types/express`"], ["any", "Объявить всё как any"], ["rewrite", "Переписать express на TypeScript"], ["nothing", "Ничего, TypeScript догадается"]], "install",
        "Типы сообщества лежат в пакетах @types."),
      single("dc-svg", "Импорт картинок", "Как разрешить `import logo from \"./logo.svg\"` в TypeScript?",
        [["declare", "Объявить модуль \"*.svg\" в файле .d.ts"], ["rename", "Переименовать в logo.ts"], ["any", "Написать // any"], ["json", "Сохранить картинку как JSON"]], "declare",
        "declare module описывает, что возвращает такой импорт.")
    ]
  });
}
