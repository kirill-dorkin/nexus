// Chapter 1: what NestJS is, creating a project, the request path through a Nest app.
import { idea, ns, sh, tip, makeLesson } from "./nkit.mjs";

export default function start(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "why-nest", title: "Что такое NestJS", summary: "Фреймворк для серверов на Node.js и TypeScript: структура, модули, внедрение зависимостей, когда он нужен.",
    skill: ["ns-why", "Что такое NestJS", "Объяснять, что даёт NestJS по сравнению с Express."],
    now: "Начинаем курс: знаем Node и TypeScript и строим серверы по чёткой структуре.",
    body: [
      idea("NestJS", "Каркас для сервера", "Фреймворк поверх Express или Fastify с готовой архитектурой: модули, контроллеры, сервисы, внедрение зависимостей.", "Большой сервер остаётся понятным, когда в команде десять человек."),
      idea("Express или Nest", "Свобода и порядок", "Express даёт минимум и полную свободу; Nest задаёт структуру и соглашения.", "Маленький сервис — Express, большое приложение с командой — Nest."),
      idea("TypeScript и декораторы", "Описание прямо в коде", "Декораторы @Controller, @Get, @Injectable описывают роль класса, а типы помогают ловить ошибки.", "Код читается как схема приложения."),
      idea("Где используют", "Бэкенды и API", "API для веба и мобильных приложений, микросервисы, серверы с очередями и WebSocket.", "Популярный выбор для TypeScript-бэкенда."),
      tip("Nest — структура и внедрение зависимостей поверх Express. Для больших серверов и команд.")
    ],
    quizzes: [
      single("wn-base", "Основа", "На чём работает NestJS под капотом?",
        [["express", "На Express или Fastify"], ["django", "На Django"], ["php", "На PHP"], ["nothing", "Ни на чём"]], "express",
        "Nest добавляет структуру."),
      single("wn-when", "Когда", "Когда NestJS особенно уместен?",
        [["big", "Для большого сервера, который развивает команда"], ["script", "Для скрипта на 20 строк"], ["css", "Для стилей"], ["never", "Никогда"]], "big",
        "Структура окупается с ростом."),
      multi("wn-parts", "Части", "Из чего строится приложение NestJS?",
        [["modules", "Модули"], ["controllers", "Контроллеры"], ["providers", "Провайдеры (сервисы)"], ["templates", "Только HTML-шаблоны"]], ["modules", "controllers", "providers"],
        "Шаблоны — не основа.")
    ]
  });

  L({
    slug: "create-nest", title: "Новый проект", summary: "Nest CLI, nest new, структура src, main.ts и bootstrap, режим разработки.",
    skill: ["ns-create", "Создание проекта", "Создавать и запускать проект NestJS."],
    now: "Знаем, что такое Nest, и создаём первый проект.",
    body: [
      sh("nest new", "Создать проект", "`npx @nestjs/cli new api` создаёт проект с модулем, контроллером, сервисом и тестами.", "Работающий сервер за минуту.", "$ npx @nestjs/cli new api\n$ cd api && npm run start:dev\n[Nest] LOG [NestApplication] Nest application successfully started"),
      ns("main.ts", "Точка входа", "bootstrap создаёт приложение из корневого модуля и слушает порт.", "Здесь же подключают глобальные настройки.", "import { NestFactory } from \"@nestjs/core\";\nimport { AppModule } from \"./app.module\";\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(process.env.PORT ?? 3000);\n}\nbootstrap();"),
      sh("nest generate", "Генераторы", "`nest g resource courses` создаёт модуль, контроллер, сервис, DTO и тесты для ресурса.", "Не писать шаблонный код руками."),
      idea("start:dev", "Перезапуск при изменениях", "Сервер сам перезапускается после сохранения файла.", "Быстрый цикл разработки."),
      tip("Создать — nest new, ресурс — nest g resource, разработка — start:dev.")
    ],
    quizzes: [
      single("cn-boot", "Точка входа", "Где создаётся и запускается приложение Nest?",
        [["main", "В main.ts через NestFactory.create"], ["module", "В каждом модуле"], ["controller", "В контроллере"], ["package", "В package.json"]], "main",
        "Функция bootstrap."),
      single("cn-gen", "Генератор", "Что создаёт nest g resource courses?",
        [["all", "Модуль, контроллер, сервис, DTO и тесты для ресурса"], ["db", "Базу данных"], ["page", "HTML-страницу"], ["nothing", "Ничего"]], "all",
        "Меньше шаблонного кода."),
      short("cn-dev", "Разработка", "Какой npm-скрипт запускает сервер с перезапуском при изменениях? Например, start:…", ["start:dev"],
        "npm run start:dev.")
    ]
  });

  L({
    slug: "request-path", title: "Путь запроса", summary: "Модуль → контроллер → сервис, тонкие контроллеры, логика в сервисах, ответ в JSON.",
    skill: ["ns-flow", "Путь запроса", "Понимать, как запрос проходит через приложение Nest."],
    now: "Создали проект и прослеживаем путь одного запроса.",
    body: [
      ns("Контроллер и сервис", "Разделение ролей", "Контроллер принимает HTTP-запрос и отдаёт ответ, сервис содержит логику. Сервис приходит в контроллер через конструктор.", "Логику можно переиспользовать и тестировать без HTTP.", "@Controller(\"courses\")\nexport class CoursesController {\n  constructor(private readonly courses: CoursesService) {}\n\n  @Get()\n  findAll() {\n    return this.courses.findAll();\n  }\n}"),
      idea("Тонкий контроллер", "Без логики", "Контроллер только разбирает запрос и вызывает сервис. Правила и расчёты — в сервисе.", "Тот же сервис вызовут очередь, команда или другой модуль."),
      idea("Ответ", "Объект → JSON", "Возвращённый объект или Promise Nest сам превращает в JSON с кодом 200.", "Не нужно вручную писать res.json."),
      tip("Запрос → контроллер → сервис. Контроллер тонкий, логика — в сервисе.")
    ],
    quizzes: [
      single("rp-logic", "Логика", "Где должна жить бизнес-логика?",
        [["service", "В сервисе (провайдере)"], ["controller", "В контроллере"], ["main", "В main.ts"], ["module", "В декораторе модуля"]], "service",
        "Контроллер — тонкий."),
      single("rp-json", "Ответ", "Что делает Nest с объектом, который вернул метод контроллера?",
        [["json", "Превращает в JSON-ответ с кодом 200"], ["html", "Рендерит HTML"], ["ignore", "Игнорирует"], ["error", "Выдаёт ошибку"]], "json",
        "Для POST по умолчанию — 201."),
      single("rp-inject", "Сервис", "Как сервис попадает в контроллер?",
        [["ctor", "Через параметр конструктора — его внедряет Nest"], ["new", "Через new в каждом методе"], ["global", "Через глобальную переменную"], ["import", "Только import"]], "ctor",
        "Внедрение зависимостей.")
    ]
  });
}
