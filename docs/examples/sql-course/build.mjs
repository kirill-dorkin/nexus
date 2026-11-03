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
const course = createCourse(challenges, {}, recaps);
for (const [chapter, file] of chapters) {
  // While the course is being written, missing chapters are skipped.
  if (!existsSync(new URL(file, import.meta.url))) continue;
  course.chapter(chapter);
  (await import(`./${file}`)).default(course, challenges, recaps);
}

const manifest = course.manifest({
  slug: "sql",
  title: "SQL с нуля: запросы к PostgreSQL",
  description:
    "Весь практический SQL — выборки и фильтры, функции, агрегаты, соединения, подзапросы, изменение данных, свои таблицы, оконные функции, JSON, индексы и безопасность. Настоящий PostgreSQL работает прямо в браузере на учебной базе магазина: каждый пример можно запустить, каждое задание проверяется мгновенно."
});
// The lesson banner names only the characters who actually speak in that lesson.
{
  const FENCE = "```";
  for (const lesson of manifest.lessons) {
    const cast = new Set();
    for (const block of lesson.blocks)
      for (const [, body] of (block.markdown ?? "").matchAll(new RegExp(FENCE + "story\\n([\\s\\S]*?)\\n" + FENCE, "g")))
        for (const [who] of JSON.parse(body).lines) if (who !== "you") cast.add(who);
    const list = cast.size ? [...cast] : ["slon", "nika"];
    for (const block of lesson.blocks)
      if (block.markdown)
        block.markdown = block.markdown.replace(new RegExp(FENCE + "recap\\n(.*)\\n" + FENCE), (_, json) =>
          `${FENCE}recap\n${JSON.stringify({ ...JSON.parse(json), cast: list })}\n${FENCE}`);
  }
}
writeFileSync(new URL("../sql-track.manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} hours=${(minutes / 60).toFixed(1)}`);
