// Builds ../redis-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/redis-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Redis.
const chapters = [
  ["Зачем Redis", "r01-why.mjs"],
  ["Строки и ключи", "r02-strings.mjs"],
  ["Списки и множества", "r03-collections.mjs"],
  ["Хэши и упорядоченные множества", "r04-hashes.mjs"],
  ["Кэширование", "r05-caching.mjs"],
  ["Сессии и ограничения", "r06-sessions.mjs"],
  ["Очереди и потоки", "r07-streams.mjs"],
  ["Публикация и подписка", "r08-pubsub.mjs"],
  ["Атомарность и скрипты", "r09-atomic.mjs"],
  ["Надёжность и масштаб", "r10-durability.mjs"],
  ["Redis на практике", "r11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../redis-track.manifest.json", import.meta.url),
  course: {
    slug: "redis",
    title: "Redis: быстрая память приложений",
    description:
      "Redis с нуля до кэша, очередей и счётчиков в боевом приложении. Ключи и время жизни, строки и счётчики, списки, множества, хэши и упорядоченные множества, стратегии кэширования и инвалидация, сессии и ограничение частоты запросов, очереди и потоки, публикация и подписка, транзакции, Lua и блокировки, сохранение на диск, репликация и кластер, наблюдение и безопасность. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
