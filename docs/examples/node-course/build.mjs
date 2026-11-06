// Builds ../node-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/node-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Node.js.
const chapters = [
  ["Старт Node.js", "n01-start.mjs"],
  ["Модули и npm", "n02-modules.mjs"],
  ["Асинхронность и цикл событий", "n03-async.mjs"],
  ["Файлы и пути", "n04-fs.mjs"],
  ["Потоки и буферы", "n05-streams.mjs"],
  ["HTTP-сервер", "n06-http.mjs"],
  ["Express и REST API", "n07-express.mjs"],
  ["Базы данных", "n08-database.mjs"],
  ["Конфигурация и безопасность", "n09-security.mjs"],
  ["Тесты и отладка", "n10-testing.mjs"],
  ["В продакшене", "n11-production.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../node-track.manifest.json", import.meta.url),
  course: {
    slug: "node",
    title: "Node.js: JavaScript на сервере",
    description:
      "Node.js от первого скрипта до сервера в продакшене. Среда выполнения и процессы, модули и npm, цикл событий и промисы, файлы и пути, потоки и буферы, HTTP без фреймворков, Express и REST API, работа с базой данных, переменные окружения и безопасность, тесты и отладка, логи, масштабирование и развёртывание. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
