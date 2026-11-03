// Builds ../css-track.manifest.json. Run from the repository root: node docs/examples/css-course/build.mjs
import { writeFileSync } from "node:fs";
import { createCourse } from "../html-course/lib.mjs";
import start from "./c01-start.mjs";
import colorText from "./c02-color-text.mjs";
import box from "./c03-box.mjs";
import selectors from "./c04-selectors.mjs";
import flex from "./c05-flex.mjs";
import grid from "./c06-grid.mjs";
import position from "./c07-position.mjs";
import responsive from "./c08-responsive.mjs";
import motion from "./c09-motion.mjs";
import modern from "./c10-modern.mjs";
import quality from "./c11-quality.mjs";

const chapters = [
  ["Старт CSS", [start]],
  ["Цвет и текст", [colorText]],
  ["Блочная модель", [box]],
  ["Селекторы", [selectors]],
  ["Flexbox", [flex]],
  ["Grid", [grid]],
  ["Позиционирование", [position]],
  ["Адаптивность", [responsive]],
  ["Анимации", [motion]],
  ["Современный CSS", [modern]],
  ["Доступность и качество", [quality]]
];

const challenges = {};
const recaps = {};
const course = createCourse(challenges, {}, recaps);
for (const [chapter, parts] of chapters) {
  course.chapter(chapter);
  for (const part of parts) part(course, challenges, recaps);
}

const manifest = course.manifest({
  slug: "css",
  title: "CSS с нуля: оформление и вёрстка",
  description:
    "Весь практический CSS: каскад и селекторы, цвет и типографика, блочная модель, Flexbox и Grid, позиционирование, адаптивность, анимации и современный CSS. Каждое свойство — карточка с живым превью, каждое задание проверяется прямо в браузере, а проекты собирают изученное вместе."
});
// The lesson banner names only the characters who actually speak in that lesson.
{
  const FENCE = "```";
  for (const lesson of manifest.lessons) {
    const cast = new Set();
    for (const block of lesson.blocks)
      for (const [, body] of (block.markdown ?? "").matchAll(new RegExp(FENCE + "story\\n([\\s\\S]*?)\\n" + FENCE, "g")))
        for (const [who] of JSON.parse(body).lines) if (who !== "you") cast.add(who);
    const list = cast.size ? [...cast] : ["bro", "nika"];
    for (const block of lesson.blocks)
      if (block.markdown)
        block.markdown = block.markdown.replace(new RegExp(FENCE + "recap\\n(.*)\\n" + FENCE), (_, json) =>
          `${FENCE}recap\n${JSON.stringify({ ...JSON.parse(json), cast: list })}\n${FENCE}`);
  }
}
writeFileSync(new URL("../css-track.manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} hours=${(minutes / 60).toFixed(1)}`);
