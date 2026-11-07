// Builds ../vue-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/vue-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Vue.
const chapters = [
  ["Старт Vue", "v01-start.mjs"],
  ["Шаблоны", "v02-templates.mjs"],
  ["Реактивность", "v03-reactivity.mjs"],
  ["Компоненты", "v04-components.mjs"],
  ["Формы и события", "v05-forms.mjs"],
  ["Списки и условия", "v06-lists.mjs"],
  ["Composition API", "v07-composition.mjs"],
  ["Маршрутизация", "v08-router.mjs"],
  ["Состояние приложения", "v09-state.mjs"],
  ["Данные и асинхронность", "v10-data.mjs"],
  ["Vue на практике", "v11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../vue-track.manifest.json", import.meta.url),
  course: {
    slug: "vue",
    title: "Vue: реактивные интерфейсы",
    description:
      "Vue 3 с нуля до приложения. Создание проекта на Vite, шаблоны и директивы, реактивность ref, reactive и computed, компоненты, props и события, формы и v-model, списки и условия, Composition API и composables, Vue Router, состояние в Pinia, загрузка данных, тесты и выпуск. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
