// Builds ../sql-track.manifest.json. Run from the repository root: node docs/examples/sql-course/build.mjs
import { existsSync, writeFileSync } from "node:fs";
import { createCourse } from "../html-course/lib.mjs";

const chapters = [
  ["Старт SQL", "c01-start.mjs"],
  ["Фильтры", "c02-where.mjs"],
  ["Сортировка и порции", "c03-order.mjs"],
  ["Функции и выражения", "c04-functions.mjs"],
  ["Агрегаты и группы", "c05-aggregates.mjs"],
  ["Соединения таблиц", "c06-joins.mjs"],
  ["Подзапросы и множества", "c07-subqueries.mjs"],
  ["Изменение данных", "c08-dml.mjs"],
  ["Свои таблицы", "c09-ddl.mjs"],
  ["Аналитика", "c10-analytics.mjs"],
  ["Скорость и безопасность", "c11-quality.mjs"]
];

const challenges = {};
const recaps = {};
const course = createCourse(challenges, {}, recaps, {
  premise: "Курс-история: ты наводишь порядок в данных кофейни «Зерно»",
  cast: ["marta", "dasha", "slon", "nika"]
});
for (const [chapter, file] of chapters) {
  // While the course is being written, missing chapters are skipped.
  if (!existsSync(new URL(file, import.meta.url))) continue;
  course.chapter(chapter);
  (await import(`./${file}`)).default(course, challenges, recaps);
}

const manifest = course.manifest({
  slug: "sql",
  title: "SQL с нуля: данные кофейни",
  description:
    "Курс-история: заказы «Зерна» живут в тетрадках, а маркетологу Даше нужны цифры. Вместе с базой данных Слоном ты переносишь всё в PostgreSQL и учишься задавать данным вопросы. Весь практический SQL — выборки и фильтры, функции, агрегаты, соединения, подзапросы, изменение данных, свои таблицы, оконные функции, индексы и безопасность — с настоящим PostgreSQL прямо в браузере и мгновенной проверкой заданий."
});
writeFileSync(new URL("../sql-track.manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} hours=${(minutes / 60).toFixed(1)}`);
