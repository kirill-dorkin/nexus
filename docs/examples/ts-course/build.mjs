// Builds ../ts-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/ts-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of TypeScript.
const chapters = [
  ["Старт TypeScript", "s01-start.mjs"],
  ["Базовые типы", "s02-basics.mjs"],
  ["Объекты и интерфейсы", "s03-objects.mjs"],
  ["Функции", "s04-functions.mjs"],
  ["Объединения и сужение", "s05-unions.mjs"],
  ["Дженерики", "s06-generics.mjs"],
  ["Утилитные типы", "s07-utility.mjs"],
  ["Типы из типов", "s08-type-ops.mjs"],
  ["Классы, модули и декларации", "s09-classes.mjs"],
  ["TypeScript в проекте", "s10-project.mjs"],
  ["TypeScript на практике", "s11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../ts-track.manifest.json", import.meta.url),
  course: {
    slug: "ts",
    title: "TypeScript: JavaScript с типами",
    description:
      "TypeScript от первых аннотаций до типов, которые проверяют сами себя. Зачем нужны типы и как работает компилятор, примитивы и вывод типов, объекты и интерфейсы, функции, объединения и сужение, дженерики, утилитные типы, keyof, mapped и conditional types, классы и модули, tsconfig и строгий режим, типизация API, DOM и асинхронного кода. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
