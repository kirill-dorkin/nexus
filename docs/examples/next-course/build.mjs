// Builds ../next-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/next-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Next.js.
const chapters = [
  ["Старт Next.js", "n01-start.mjs"],
  ["Маршруты и макеты", "n02-routing.mjs"],
  ["Серверные и клиентские компоненты", "n03-components.mjs"],
  ["Получение данных", "n04-data.mjs"],
  ["Формы и Server Actions", "n05-actions.mjs"],
  ["Рендеринг и кэш", "n06-rendering.mjs"],
  ["API и прокси", "n07-api.mjs"],
  ["Стили, медиа и метаданные", "n08-ui.mjs"],
  ["База данных и вход", "n09-auth.mjs"],
  ["Ошибки, скорость и тесты", "n10-quality.mjs"],
  ["Выпуск приложения", "n11-deploy.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../next-track.manifest.json", import.meta.url),
  course: {
    slug: "next",
    title: "Next.js: полноценные приложения на React",
    description:
      "Next.js с нуля до приложения в интернете. App Router, маршруты и макеты, серверные и клиентские компоненты, получение данных и потоковая отрисовка, формы и Server Actions, статический и динамический рендеринг и кэш, обработчики маршрутов и прокси, стили, картинки, шрифты и метаданные, база данных и вход пользователей, ошибки, скорость и тесты, выпуск на хостинг и на свой сервер. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
