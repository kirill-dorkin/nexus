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
    abilities: [
      { title: "Железо", branches: ["Железо"] },
      { title: "Данные в двоичном виде", branches: ["Двоичный мир и данные"] },
      { title: "Файлы и пути", branches: ["Файлы", "Папки, пути и файловые системы"] },
      { title: "Система и процессы", branches: ["Операционная система", "Установка программ"] },
      { title: "Командная строка", branches: ["Клавиатура и сочетания клавиш", "Командная строка"] },
      { title: "Безопасность", branches: ["Домашняя сеть", "Безопасность"] },
      { title: "Диагностика", branches: ["Диагностика"] }
    ],
    name: "ПК",
    role: "Знаток компьютера",
    summary:
      "Компьютер целиком: железо и двоичные данные, файлы и пути, операционная система и процессы, программы, клавиатура, командная строка, домашняя сеть, безопасность и диагностика.",
    accent: "rose",
    sources: [{ manifest: "pc-track.manifest.json", published: true }]
  },
  {
    slug: "browser",
    depth: {},
    abilities: [
      { title: "Адреса", branches: ["Что такое браузер", "Адрес страницы", "DNS"] },
      { title: "HTTP", branches: ["HTTP и HTTPS", "Запросы и ответы", "Коды ответа"] },
      { title: "Кэш и хранилища", branches: ["Кэширование", "Cookies и хранилища", "Вкладки и история"] },
      { title: "Безопасность", branches: ["Расширения", "Приватность и безопасность"] },
      { title: "Отрисовка", branches: ["Как браузер рисует страницу"] },
      { title: "DevTools", branches: ["Инструменты разработчика"] },
      { title: "Доступность", branches: ["Дерево доступности", "Адаптивный режим"] }
    ],
    name: "Браузер",
    role: "Проводник по вебу",
    summary:
      "Путь от адреса до страницы: URL и DNS, HTTP и HTTPS, коды ответа, кэш, cookies и хранилища, безопасность, отрисовка, все панели DevTools, дерево доступности и адаптивный режим.",
    accent: "blue",
    sources: [{ manifest: "browser-track.manifest.json", published: true }]
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
  },
  {
    slug: "terminal",
    depth: {},
    abilities: [
      { title: "Оболочка", branches: ["Оболочка"] },
      { title: "Файлы", branches: ["Файловая система в терминале", "Файлы, ссылки и место на диске"] },
      { title: "Потоки", branches: ["Потоки и перенаправления", "Обработка текста"] },
      { title: "Процессы", branches: ["Процессы и сигналы"] },
      { title: "Окружение и права", branches: ["Переменные и окружение", "Права доступа"] },
      { title: "Скрипты", branches: ["Скрипты"] },
      { title: "Сервер", branches: ["Сеть и удалённая работа", "Архивы и продуктивность"] }
    ],
    name: "Терминал",
    role: "Заклинатель",
    summary:
      "Командная строка всерьёз: оболочки, поиск файлов, ссылки, потоки и конвейеры, grep, sed и awk, процессы и сигналы, переменные окружения, права доступа, скрипты на bash, SSH и удалённая работа, архивы, cron и приёмы продуктивности.",
    accent: "lime",
    sources: [{ manifest: "terminal-track.manifest.json", published: true }]
  },
  {
    slug: "git",
    depth: {},
    abilities: [
      { title: "Снимки", branches: ["Старт Git", "Снимки и коммиты"] },
      { title: "История", branches: ["История и различия", "Отмена изменений"] },
      { title: "Ветки", branches: ["Ветки и слияние", "Конфликты"] },
      { title: "Команда", branches: ["Удалённые репозитории", "Командная работа на GitHub"] },
      { title: "Чистая история", branches: ["Rebase и чистая история"] },
      { title: "Мастерство", branches: ["Настройки, stash и .gitignore", "Как Git устроен внутри"] }
    ],
    name: "Git",
    role: "Хронист",
    summary:
      "История кода и командная работа: коммиты и индекс, история и различия, отмена любых изменений, ветки и слияние, конфликты, удалённые репозитории, pull request и ревью на GitHub, rebase и чистая история, stash и .gitignore, устройство Git изнутри.",
    accent: "amber",
    sources: [{ manifest: "git-track.manifest.json", published: true }]
  },
  {
    slug: "ts",
    depth: {},
    abilities: [
      { title: "Основы типов", branches: ["Старт TypeScript", "Базовые типы"] },
      { title: "Формы данных", branches: ["Объекты и интерфейсы", "Функции"] },
      { title: "Сужение", branches: ["Объединения и сужение"] },
      { title: "Дженерики", branches: ["Дженерики", "Утилитные типы"] },
      { title: "Магия типов", branches: ["Типы из типов"] },
      { title: "Архитектура", branches: ["Классы, модули и декларации", "TypeScript в проекте"] },
      { title: "Практика", branches: ["TypeScript на практике"] }
    ],
    name: "TypeScript",
    role: "Страж типов",
    summary:
      "JavaScript с типами: компилятор и tsconfig, примитивы и вывод типов, объекты и интерфейсы, функции, объединения и сужение, дженерики, утилитные, отображённые и условные типы, классы и модули, строгий режим, проверка данных из сети и типы DOM.",
    accent: "blue",
    sources: [{ manifest: "ts-track.manifest.json", published: true }]
  },
  {
    slug: "node",
    depth: {},
    abilities: [
      { title: "Среда", branches: ["Старт Node.js", "Модули и npm"] },
      { title: "Асинхронность", branches: ["Асинхронность и цикл событий"] },
      { title: "Ввод-вывод", branches: ["Файлы и пути", "Потоки и буферы"] },
      { title: "Сервер", branches: ["HTTP-сервер", "Express и REST API"] },
      { title: "Данные", branches: ["Базы данных"] },
      { title: "Надёжность", branches: ["Конфигурация и безопасность", "Тесты и отладка"] },
      { title: "Продакшен", branches: ["В продакшене"] }
    ],
    name: "Node.js",
    role: "Двигатель",
    summary:
      "JavaScript на сервере: процессы и модули, npm и версии, цикл событий и async/await, файлы и потоки, HTTP без фреймворков, Express и REST API, базы данных и защита от инъекций, конфигурация и аутентификация, тесты и отладка, журналы, масштабирование и развёртывание.",
    accent: "lime",
    sources: [{ manifest: "node-track.manifest.json", published: true }]
  },
  {
    slug: "react",
    depth: {},
    abilities: [
      { title: "Компоненты", branches: ["Старт React", "JSX и компоненты", "Props и композиция"] },
      { title: "Состояние", branches: ["Состояние", "События и формы"] },
      { title: "Интерфейс", branches: ["Списки и условия"] },
      { title: "Данные", branches: ["Эффекты и данные", "Контекст и свои хуки"] },
      { title: "Приложение", branches: ["Маршруты и структура приложения"] },
      { title: "Скорость", branches: ["Производительность"] },
      { title: "Качество", branches: ["Тесты и практика"] }
    ],
    name: "React",
    role: "Сборщик интерфейсов",
    summary:
      "Интерфейсы из компонентов: JSX и компоненты, props и композиция, состояние и его правила, события и формы, списки и условия, эффекты и загрузка данных, контекст, редьюсеры и свои хуки, маршруты и структура приложения, производительность, тесты и доступность.",
    accent: "blue",
    sources: [{ manifest: "react-track.manifest.json", published: true }]
  },
  {
    slug: "network",
    depth: {},
    abilities: [
      { title: "Пакеты", branches: ["Как устроена сеть", "IP-адреса и подсети"] },
      { title: "Транспорт", branches: ["TCP и UDP"] },
      { title: "Имена и защита", branches: ["DNS изнутри", "TLS и сертификаты"] },
      { title: "HTTP", branches: ["HTTP в деталях", "Реальное время"] },
      { title: "API", branches: ["Проектирование API"] },
      { title: "Инфраструктура", branches: ["CDN, кэш и балансировка", "Прокси, NAT и файрволы"] },
      { title: "Диагностика", branches: ["Диагностика сети"] }
    ],
    name: "Сеть и HTTP",
    role: "Почтальон",
    summary:
      "Как данные путешествуют: пакеты и уровни сети, IP-адреса и подсети, TCP, UDP и QUIC, DNS изнутри, TLS и сертификаты, версии HTTP, WebSocket и SSE, проектирование API, CDN и балансировка, прокси, NAT и VPN, диагностика сети.",
    accent: "amber",
    sources: [{ manifest: "network-track.manifest.json", published: true }]
  },
  {
    slug: "python",
    depth: {},
    abilities: [
      { title: "Основы", branches: ["Старт Python", "Значения и типы"] },
      { title: "Логика", branches: ["Условия и циклы"] },
      { title: "Данные", branches: ["Коллекции", "Строки и файлы"] },
      { title: "Функции", branches: ["Функции"] },
      { title: "Надёжность", branches: ["Ошибки и отладка"] },
      { title: "Экосистема", branches: ["Модули и окружения"] },
      { title: "Объекты", branches: ["Классы", "Идиомы Python"] },
      { title: "Практика", branches: ["Python на практике"] }
    ],
    name: "Python",
    role: "Мудрец",
    summary:
      "Первый язык программирования: значения и типы, условия и циклы, списки и словари, функции, файлы, CSV и JSON, ошибки и отладка, модули и окружения, классы, идиомы Python, запросы к API, автоматизация и тесты.",
    accent: "teal",
    sources: [{ manifest: "python-track.manifest.json", published: true }]
  },
  {
    slug: "docker",
    depth: {},
    abilities: [
      { title: "Контейнеры", branches: ["Зачем контейнеры", "Образы и контейнеры", "Жизнь контейнера"] },
      { title: "Сборка", branches: ["Dockerfile", "Хорошие образы"] },
      { title: "Данные", branches: ["Данные и тома"] },
      { title: "Сети", branches: ["Сети контейнеров"] },
      { title: "Оркестр", branches: ["Docker Compose"] },
      { title: "Эксплуатация", branches: ["Настройки и здоровье", "Отладка и обслуживание"] },
      { title: "Доставка", branches: ["Docker на практике"] }
    ],
    name: "Docker",
    role: "Грузчик контейнеров",
    summary:
      "Приложения в контейнерах: образы и слои, жизнь контейнера, Dockerfile, кэш и многоэтапная сборка, безопасные образы, тома и резервные копии, сети, Docker Compose, настройки и секреты, проверки здоровья, диагностика и уборка, реестры, CI и запуск на сервере.",
    accent: "blue",
    sources: [{ manifest: "docker-track.manifest.json", published: true }]
  },
  {
    slug: "next",
    depth: {},
    abilities: [
      { title: "Основы", branches: ["Старт Next.js", "Маршруты и макеты"] },
      { title: "Компоненты", branches: ["Серверные и клиентские компоненты"] },
      { title: "Данные", branches: ["Получение данных", "Формы и Server Actions"] },
      { title: "Рендеринг", branches: ["Рендеринг и кэш"] },
      { title: "Сервер", branches: ["API и прокси", "База данных и вход"] },
      { title: "Интерфейс", branches: ["Стили, медиа и метаданные"] },
      { title: "Выпуск", branches: ["Ошибки, скорость и тесты", "Выпуск приложения"] }
    ],
    name: "Next.js",
    role: "Архитектор React",
    summary:
      "Полноценные приложения на React: App Router, маршруты и макеты, серверные и клиентские компоненты, данные и потоковая отрисовка, формы и Server Actions, рендеринг и кэш, API и прокси, стили, картинки и метаданные, база данных и вход, ошибки, скорость и тесты, выпуск на платформу и свой сервер.",
    accent: "rose",
    sources: [{ manifest: "next-track.manifest.json", published: true }]
  }
];

// Branch → branches whose skills must be at least `unlockShare` active before its skills can be
// confirmed ("character/branch title").
// Inside a character every branch also requires the previous one.
// A requirement on an unpublished character does not lock a published one (skill-map.ts).
export const requires = {
  "html/Старт": ["browser/Адрес страницы"],
  "browser/DNS": ["pc/Домашняя сеть"],
  "html/HTML и JavaScript": ["js/Старт JavaScript"],
  "css/Старт CSS": ["html/Основы HTML"],
  "js/Старт JavaScript": ["html/Основы HTML", "css/Старт CSS"],
  "js/DOM": ["html/Структура страницы"],
  "js/Формы": ["html/Формы"],
  "terminal/Оболочка": ["pc/Командная строка"],
  "git/Старт Git": ["terminal/Файловая система в терминале"],
  "ts/Старт TypeScript": ["js/Старт JavaScript"],
  "node/Старт Node.js": ["js/Старт JavaScript"],
  "react/Старт React": ["js/Старт JavaScript"],
  "network/Как устроена сеть": ["browser/HTTP и HTTPS"],
  "python/Старт Python": ["pc/Командная строка"],
  "docker/Зачем контейнеры": ["terminal/Процессы и сигналы"],
  "docker/Сети контейнеров": ["network/IP-адреса и подсети"],
  "next/Старт Next.js": ["react/Маршруты и структура приложения"]
};

/** Share of a required branch's skills that must be active before a branch opens. */
export const unlockShare = 0.5;
/** Levels 0…maxLevel by the share of active (confirmed, not forgotten) skills. */
export const maxLevel = 100;
