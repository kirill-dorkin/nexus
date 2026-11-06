// Builds ../react-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/react-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of React.
const chapters = [
  ["Старт React", "r01-start.mjs"],
  ["JSX и компоненты", "r02-jsx.mjs"],
  ["Props и композиция", "r03-props.mjs"],
  ["Состояние", "r04-state.mjs"],
  ["События и формы", "r05-forms.mjs"],
  ["Списки и условия", "r06-lists.mjs"],
  ["Эффекты и данные", "r07-effects.mjs"],
  ["Контекст и свои хуки", "r08-context.mjs"],
  ["Маршруты и структура приложения", "r09-routing.mjs"],
  ["Производительность", "r10-performance.mjs"],
  ["Тесты и практика", "r11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../react-track.manifest.json", import.meta.url),
  course: {
    slug: "react",
    title: "React: интерфейсы из компонентов",
    description:
      "React от первого компонента до приложения. Зачем нужны компоненты и как React обновляет страницу, JSX, props и композиция, состояние и его правила, события и управляемые формы, списки и ключи, эффекты и загрузка данных, контекст и свои хуки, маршруты и структура приложения, производительность и мемоизация, тестирование компонентов и доступность. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
