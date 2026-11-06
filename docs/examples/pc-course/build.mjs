// Builds ../pc-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/pc-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "./kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of ПК.
const chapters = [
  ["Железо", "c01-hardware.mjs"],
  ["Двоичный мир и данные", "c02-data.mjs"],
  ["Файлы", "c03-files.mjs"],
  ["Папки, пути и файловые системы", "c04-paths.mjs"],
  ["Операционная система", "c05-os.mjs"],
  ["Установка программ", "c06-software.mjs"],
  ["Клавиатура и сочетания клавиш", "c07-keyboard.mjs"],
  ["Командная строка", "c08-cli.mjs"],
  ["Домашняя сеть", "c09-network.mjs"],
  ["Безопасность", "c10-security.mjs"],
  ["Диагностика", "c11-diagnostics.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../pc-track.manifest.json", import.meta.url),
  course: {
    slug: "pc",
    title: "ПК с нуля: как устроен компьютер",
    description:
      "Всё, что нужно знать о компьютере перед веб-разработкой. Железо и двоичные данные, файлы, папки и пути, операционная система и процессы, установка программ, клавиатура и сочетания клавиш, командная строка, домашняя сеть, безопасность и диагностика. Каждое понятие объясняется карточкой, каждый урок закрепляется вопросами."
  }
});
