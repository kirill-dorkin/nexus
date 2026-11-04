// Characters of the skill map (ADR-0074). Each character is a subject a learner levels up.
// Skills come from course manifests: a source takes every skill of a manifest that no earlier
// source took, or only the listed ones. Branches are the manifest chapters, in order.
// Rebuild after editing this file or a manifest: node docs/examples/skill-map/build.mjs

export const characters = [
  {
    slug: "pc",
    name: "ПК",
    role: "Знаток компьютера",
    summary:
      "Как устроен компьютер: детали, память и файлы, загрузка системы и путь от клика до результата.",
    accent: "slate",
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
    name: "Браузер",
    role: "Проводник по вебу",
    summary:
      "Что происходит между адресной строкой и готовой страницей, и какими инструментами пользуется веб-разработчик.",
    accent: "sky",
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
    name: "HTML",
    role: "Строитель страниц",
    summary:
      "Разметка страниц целиком: текст, ссылки, медиа, таблицы, формы, структура, метаданные и доступность.",
    accent: "lime",
    sources: [{ manifest: "html-track.manifest.json", published: true }]
  },
  {
    slug: "css",
    name: "CSS",
    role: "Художник интерфейсов",
    summary:
      "Оформление и вёрстка: каскад и селекторы, цвет и шрифты, блочная модель, Flexbox, Grid, адаптивность и анимации.",
    accent: "violet",
    sources: [{ manifest: "css-track.manifest.json", published: true }]
  },
  {
    slug: "js",
    name: "JavaScript",
    role: "Механик страниц",
    summary:
      "Язык, который оживляет страницы: данные, функции, события, формы, асинхронность и весь стандарт ECMAScript.",
    accent: "amber",
    sources: [{ manifest: "js-track.manifest.json", published: true }]
  },
  {
    slug: "sql",
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
