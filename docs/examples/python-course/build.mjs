// Builds ../python-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/python-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Python.
const chapters = [
  ["Старт Python", "p01-start.mjs"],
  ["Значения и типы", "p02-types.mjs"],
  ["Условия и циклы", "p03-flow.mjs"],
  ["Коллекции", "p04-collections.mjs"],
  ["Функции", "p05-functions.mjs"],
  ["Строки и файлы", "p06-files.mjs"],
  ["Ошибки и отладка", "p07-errors.mjs"],
  ["Модули и окружения", "p08-modules.mjs"],
  ["Классы", "p09-classes.mjs"],
  ["Идиомы Python", "p10-idioms.mjs"],
  ["Python на практике", "p11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../python-track.manifest.json", import.meta.url),
  course: {
    slug: "python",
    title: "Python: первый язык программирования",
    description:
      "Python с нуля до своих скриптов и программ. Установка и первая программа, числа, строки и логические значения, условия и циклы, списки, словари и множества, функции, строки и файлы, ошибки и отладка, модули, pip и виртуальные окружения, классы и dataclass, генераторы, декораторы и другие идиомы, работа с API, данными и тестами. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
