// Builds ../cicd-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/cicd-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of CI/CD.
const chapters = [
  ["Зачем автоматизация", "c01-why.mjs"],
  ["Первый конвейер", "c02-first.mjs"],
  ["Проверки качества", "c03-checks.mjs"],
  ["Тесты в конвейере", "c04-tests.mjs"],
  ["Скорость конвейера", "c05-speed.mjs"],
  ["Артефакты и версии", "c06-artifacts.mjs"],
  ["Секреты и безопасность", "c07-security.mjs"],
  ["Доставка и выкладка", "c08-delivery.mjs"],
  ["Окружения и миграции", "c09-environments.mjs"],
  ["Наблюдение после выкладки", "c10-observe.mjs"],
  ["Культура и практика", "c11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../cicd-track.manifest.json", import.meta.url),
  course: {
    slug: "cicd",
    title: "CI/CD: автоматическая проверка и выкладка",
    description:
      "Непрерывная интеграция и доставка с нуля. Зачем автоматизировать проверки, первый конвейер в GitHub Actions, линтеры, типы и тесты в CI, кэш и параллельность, артефакты и версии, секреты и безопасность цепочки поставки, стратегии выкладки, окружения и миграции базы, наблюдение и откат, культура маленьких изменений. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
