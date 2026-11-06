// Builds ../terminal-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/terminal-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Терминал.
const chapters = [
  ["Оболочка", "t01-shell.mjs"],
  ["Файловая система в терминале", "t02-filesystem.mjs"],
  ["Файлы, ссылки и место на диске", "t03-files.mjs"],
  ["Потоки и перенаправления", "t04-streams.mjs"],
  ["Обработка текста", "t05-text.mjs"],
  ["Процессы и сигналы", "t06-processes.mjs"],
  ["Переменные и окружение", "t07-environment.mjs"],
  ["Права доступа", "t08-permissions.mjs"],
  ["Скрипты", "t09-scripts.mjs"],
  ["Сеть и удалённая работа", "t10-remote.mjs"],
  ["Архивы и продуктивность", "t11-archives.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../terminal-track.manifest.json", import.meta.url),
  course: {
    slug: "terminal",
    title: "Терминал: командная строка всерьёз",
    description:
      "Командная строка так, как с ней работают разработчики. Оболочки и устройство команд, файловая система и поиск, ссылки и место на диске, потоки и перенаправления, обработка текста grep, sed и awk, процессы и сигналы, переменные окружения, права доступа, скрипты на bash, SSH и удалённая работа, архивы и приёмы, которые экономят часы. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
