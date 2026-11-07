// Builds ../os-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/os-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of the operating system.
const chapters = [
  ["Что делает ОС", "o01-intro.mjs"],
  ["Процессы", "o02-processes.mjs"],
  ["Потоки и планировщик", "o03-scheduling.mjs"],
  ["Память", "o04-memory.mjs"],
  ["Файловые системы", "o05-filesystems.mjs"],
  ["Ввод-вывод и драйверы", "o06-io.mjs"],
  ["Синхронизация", "o07-sync.mjs"],
  ["Пользователи и безопасность", "o08-security.mjs"],
  ["Загрузка и службы", "o09-boot.mjs"],
  ["Виртуализация и контейнеры", "o10-virtualization.mjs"],
  ["Наблюдение за системой", "o11-observability.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../os-track.manifest.json", import.meta.url),
  course: {
    slug: "os",
    title: "Операционная система: как устроен компьютер изнутри",
    description:
      "Как работает операционная система: ядро и системные вызовы, процессы и потоки, планировщик, виртуальная память и подкачка, файловые системы и журналирование, ввод-вывод и драйверы, синхронизация и взаимные блокировки, пользователи, права и изоляция, загрузка и службы, виртуальные машины и контейнеры, наблюдение за системой. На примерах Linux, macOS и Windows. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
