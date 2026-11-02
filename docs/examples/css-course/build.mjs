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
const course = createCourse(challenges, {}, recaps, {
  premise: "Курс-история: ты делаешь сайт кофейни «Зерно» красивым",
  cast: ["marta", "sonya", "bro", "nika", "lev"]
});
for (const [chapter, parts] of chapters) {
  course.chapter(chapter);
  for (const part of parts) part(course, challenges, recaps);
}

const manifest = course.manifest({
  slug: "css",
  title: "CSS с нуля: красивый сайт кофейни",
  description:
    "Курс-история: сайт кофейни «Зерно» работает, но выглядит как 1995 год. Вместе с дизайнером Соней ты делаешь его красивым и удобным на любом экране. Весь практический CSS — каскад, цвет и типографика, блочная модель, Flexbox, Grid, адаптивность, анимации и современный CSS — с живыми примерами и заданиями с мгновенной проверкой."
});
writeFileSync(new URL("../css-track.manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} hours=${(minutes / 60).toFixed(1)}`);
