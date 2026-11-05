// Characters of the skill map (ADR-0074). `depth` gives each branch its tier (core, practice,
// advanced, reference, internals; default practice), which weights its skills in level@2.
// `abilities` are milestone badges: active while every skill of their branches is active.
// Each character is a subject a learner levels up.
// Skills come from course manifests: a source takes every skill of a manifest that no earlier
// source took, or only the listed ones. Branches are the manifest chapters, in order.
// Rebuild after editing this file or a manifest: node docs/examples/skill-map/build.mjs

export const characters = [
  {
    slug: "pc",
    depth: {},
    abilities: [{ title: "Устройство компьютера", branches: ["Устройство компьютера"] }],
    name: "ПК",
    role: "Знаток компьютера",
    summary:
      "Как устроен компьютер: детали, память и файлы, загрузка системы и путь от клика до результата.",
    accent: "rose",
    sources: [
      {
        manifest: "computer-basics-first-course.manifest.json",
        published: false,
        branch: "Устройство компьютера"
      }
    ]
  },
  {
    slug: "browser",
    depth: {},
    abilities: [{ title: "Как работает веб", branches: ["Как работает веб"] }],
    name: "Браузер",
    role: "Проводник по вебу",
    summary:
      "Что происходит между адресной строкой и готовой страницей, и какими инструментами пользуется веб-разработчик.",
    accent: "blue",
    sources: [
      {
        manifest: "html-track.manifest.json",
        published: true,
        skills: ["web-how-it-works", "web-tools"],
        branch: "Как работает веб"
      }
    ]
  },
  {
    slug: "html",
    depth: {
      Старт: "core",
      "Основы HTML": "core",
      Текст: "core",
      "Ссылки и пути": "core",
      "Картинки, видео и встраивание": "practice",
      Таблицы: "practice",
      Формы: "practice",
      "Структура страницы": "practice",
      "Head, поиск и безопасность": "advanced",
      "HTML и JavaScript": "advanced",
      Доступность: "practice",
      "Качество и финал": "reference"
    },
    abilities: [
      { title: "Каркас", branches: ["Основы HTML"] },
      { title: "Смысл текста", branches: ["Текст"] },
      { title: "Медиа", branches: ["Картинки, видео и встраивание"] },
      { title: "Формы", branches: ["Формы"] },
      { title: "Структура", branches: ["Структура страницы"] },
      { title: "Метаданные", branches: ["Head, поиск и безопасность"] },
      { title: "Доступность", branches: ["Доступность"] }
    ],
    name: "HTML",
    role: "Строитель страниц",
    summary:
      "Разметка страниц целиком: текст, ссылки, медиа, таблицы, формы, структура, метаданные и доступность.",
    accent: "lime",
    sources: [{ manifest: "html-track.manifest.json", published: true }]
  },
  {
    slug: "css",
    depth: {
      "Старт CSS": "core",
      "Цвет и текст": "core",
      "Блочная модель": "core",
      Селекторы: "practice",
      Flexbox: "practice",
      Grid: "practice",
      Позиционирование: "practice",
      Адаптивность: "practice",
      Анимации: "practice",
      "Современный CSS": "advanced",
      "Доступность и качество": "practice"
    },
    abilities: [
      { title: "Каскад", branches: ["Старт CSS"] },
      { title: "Цвет и типографика", branches: ["Цвет и текст"] },
      { title: "Раскладка", branches: ["Flexbox", "Grid"] },
      { title: "Адаптивность", branches: ["Адаптивность"] },
      { title: "Движение", branches: ["Анимации"] },
      { title: "Современный CSS", branches: ["Современный CSS"] },
      { title: "Доступный дизайн", branches: ["Доступность и качество"] }
    ],
    name: "CSS",
    role: "Художник интерфейсов",
    summary:
      "Оформление и вёрстка: каскад и селекторы, цвет и шрифты, блочная модель, Flexbox, Grid, адаптивность и анимации.",
    accent: "violet",
    sources: [{ manifest: "css-track.manifest.json", published: true }]
  },
  {
    slug: "js",
    depth: {
      "Старт JavaScript": "core",
      "Значения и операторы": "core",
      "Условия и циклы": "core",
      Функции: "core",
      Массивы: "core",
      Объекты: "core",
      DOM: "practice",
      События: "practice",
      Формы: "practice",
      Асинхронность: "practice",
      "Хранение и финал": "practice",
      "Синтаксис полностью": "reference",
      "Объекты и функции изнутри": "internals",
      "Строки полностью": "reference",
      "Числа и Math полностью": "reference",
      "Массивы и итераторы полностью": "reference",
      Коллекции: "reference",
      "Регулярные выражения": "reference",
      "Symbol, Proxy и Reflect": "internals",
      "Ошибки, ресурсы и промисы": "reference",
      "Даты полностью": "reference",
      "Intl полностью": "reference",
      "Бинарные данные и общая память": "internals",
      "Устаревшее: как читать старый код": "reference"
    },
    abilities: [
      { title: "Значения и логика", branches: ["Старт JavaScript", "Значения и операторы", "Условия и циклы"] },
      { title: "Функции", branches: ["Функции"] },
      { title: "Данные", branches: ["Массивы", "Объекты", "Коллекции"] },
      { title: "Страница", branches: ["DOM", "События", "Формы"] },
      { title: "Асинхронность", branches: ["Асинхронность", "Ошибки, ресурсы и промисы"] },
      { title: "Весь язык", branches: ["Синтаксис полностью"] },
      { title: "Изнутри", branches: ["Объекты и функции изнутри", "Symbol, Proxy и Reflect", "Бинарные данные и общая память"] }
    ],
    name: "JavaScript",
    role: "Механик страниц",
    summary:
      "Язык, который оживляет страницы: данные, функции, события, формы, асинхронность и весь стандарт ECMAScript.",
    accent: "amber",
    sources: [{ manifest: "js-track.manifest.json", published: true }]
  },
  {
    slug: "sql",
    depth: {
      "Старт SQL": "core",
      Фильтры: "core",
      "Сортировка и порции": "core",
      "Функции и выражения": "practice",
      "Агрегаты и группы": "practice",
      "Соединения таблиц": "practice",
      "Подзапросы и множества": "practice",
      "Изменение данных": "practice",
      "Свои таблицы": "practice",
      Аналитика: "advanced",
      "Скорость и безопасность": "advanced"
    },
    abilities: [
      { title: "Вопросы к данным", branches: ["Старт SQL", "Фильтры", "Сортировка и порции"] },
      { title: "Агрегаты", branches: ["Агрегаты и группы"] },
      { title: "Соединения", branches: ["Соединения таблиц"] },
      { title: "Подзапросы", branches: ["Подзапросы и множества"] },
      { title: "Изменение данных", branches: ["Изменение данных"] },
      { title: "Проектирование", branches: ["Свои таблицы"] },
      { title: "Аналитика", branches: ["Аналитика"] },
      { title: "Скорость", branches: ["Скорость и безопасность"] }
    ],
    name: "SQL",
    role: "Хранитель данных",
    summary:
      "Запросы к PostgreSQL: выборки и фильтры, агрегаты, соединения, подзапросы, изменение данных и свои таблицы.",
    accent: "teal",
    sources: [{ manifest: "sql-track.manifest.json", published: true }]
  }
];

// Branch → branches whose skills must be at least `unlockShare` active before its skills can be
// confirmed ("character/branch title").
// Inside a character every branch also requires the previous one.
export const requires = {
  "html/Старт": ["browser/Как работает веб"],
  "html/HTML и JavaScript": ["js/Старт JavaScript"],
  "css/Старт CSS": ["html/Основы HTML"],
  "js/Старт JavaScript": ["html/Основы HTML", "css/Старт CSS"],
  "js/DOM": ["html/Структура страницы"],
  "js/Формы": ["html/Формы"]
};

/** Share of a required branch's skills that must be active before a branch opens. */
export const unlockShare = 0.5;
/** Levels 0…maxLevel by the share of active (confirmed, not forgotten) skills. */
export const maxLevel = 100;
