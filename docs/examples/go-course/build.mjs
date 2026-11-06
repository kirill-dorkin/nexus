// Builds ../go-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/go-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Go.
const chapters = [
  ["Старт Go", "g01-start.mjs"],
  ["Типы и переменные", "g02-types.mjs"],
  ["Управление потоком", "g03-flow.mjs"],
  ["Срезы и карты", "g04-collections.mjs"],
  ["Функции и ошибки", "g05-functions.mjs"],
  ["Структуры и методы", "g06-structs.mjs"],
  ["Интерфейсы и обобщения", "g07-interfaces.mjs"],
  ["Пакеты и модули", "g08-packages.mjs"],
  ["Горутины и каналы", "g09-concurrency.mjs"],
  ["Тесты и инструменты", "g10-testing.mjs"],
  ["Go на практике", "g11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../go-track.manifest.json", import.meta.url),
  course: {
    slug: "go",
    title: "Go: быстрые программы и серверы",
    description:
      "Go с нуля до своего HTTP-сервиса. Установка и первая программа, типы и переменные, условия и циклы, срезы и карты, функции и обработка ошибок, структуры и методы, интерфейсы и обобщения, пакеты и модули, горутины, каналы и контекст, тесты, бенчмарки и инструменты, HTTP-сервер, JSON и база данных. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
