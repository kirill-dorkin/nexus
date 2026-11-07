// Builds ../nestjs-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/nestjs-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of NestJS.
const chapters = [
  ["Старт NestJS", "s01-start.mjs"],
  ["Модули и внедрение зависимостей", "s02-modules.mjs"],
  ["Контроллеры и маршруты", "s03-controllers.mjs"],
  ["Проверка данных", "s04-validation.mjs"],
  ["База данных", "s05-database.mjs"],
  ["Вход и права", "s06-auth.mjs"],
  ["Конвейер запроса", "s07-pipeline.mjs"],
  ["Конфигурация и ошибки", "s08-config.mjs"],
  ["Фоновые задачи и события", "s09-background.mjs"],
  ["Тесты", "s10-testing.mjs"],
  ["NestJS на практике", "s11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../nestjs-track.manifest.json", import.meta.url),
  course: {
    slug: "nestjs",
    title: "NestJS: серверные приложения на TypeScript",
    description:
      "NestJS с нуля до надёжного API. Модули, провайдеры и внедрение зависимостей, контроллеры и маршруты, DTO и проверка данных, база данных через ORM, вход и права, гарды, пайпы, перехватчики и фильтры исключений, конфигурация, фоновые задачи, очереди и события, модульные и сквозные тесты, документация OpenAPI и выпуск. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
