// Builds ../html-track.manifest.json from the module sources.
// Run from the repository root: node docs/examples/html-course/build.mjs
import { writeFileSync } from "node:fs";
import { createCourse } from "./lib.mjs";
import basics from "./m01-basics.mjs";
import text from "./m02-text.mjs";
import links from "./m03-links.mjs";
import media from "./m04-media.mjs";
import tables from "./m05-tables.mjs";
import forms from "./m06-forms.mjs";
import structure from "./m07-structure.mjs";
import head from "./m08-head.mjs";
import a11y from "./m09-a11y.mjs";
import projects from "./m10-projects.mjs";

const course = createCourse();
for (const module of [basics, text, links, media, tables, forms, structure, head, a11y, projects]) module(course);

const manifest = course.manifest({
  slug: "html",
  title: "HTML: полный курс",
  description:
    "Все возможности HTML с нуля: текст, ссылки, медиа, таблицы, формы, семантика, метаданные и доступность. Короткие уроки, живые примеры, которые можно менять прямо в браузере, задания с мгновенной проверкой и четыре проекта — от визитки до многостраничного портфолио."
});
const out = new URL("../html-track.manifest.json", import.meta.url);
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} skills=${manifest.skills.length} hours=${(minutes / 60).toFixed(1)}`);
