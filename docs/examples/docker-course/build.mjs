// Builds ../docker-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/docker-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Docker.
const chapters = [
  ["Зачем контейнеры", "d01-why.mjs"],
  ["Образы и контейнеры", "d02-images.mjs"],
  ["Жизнь контейнера", "d03-lifecycle.mjs"],
  ["Dockerfile", "d04-dockerfile.mjs"],
  ["Хорошие образы", "d05-build.mjs"],
  ["Данные и тома", "d06-data.mjs"],
  ["Сети контейнеров", "d07-network.mjs"],
  ["Docker Compose", "d08-compose.mjs"],
  ["Настройки и здоровье", "d09-config.mjs"],
  ["Отладка и обслуживание", "d10-debug.mjs"],
  ["Docker на практике", "d11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../docker-track.manifest.json", import.meta.url),
  course: {
    slug: "docker",
    title: "Docker: приложения в контейнерах",
    description:
      "Docker с нуля до своих образов и многосервисных проектов. Зачем контейнеры и чем они отличаются от виртуальных машин, образы и слои, жизнь контейнера, Dockerfile, кэш сборки и многоэтапные образы, тома и данные, сети контейнеров, Docker Compose, настройки, секреты и проверки здоровья, отладка и обслуживание, реестры и Docker в CI. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
