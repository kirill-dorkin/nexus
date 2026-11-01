// Builds ../html-track.manifest.json from the module sources.
// Run from the repository root: node docs/examples/html-course/build.mjs
import { writeFileSync } from "node:fs";
import { createCourse } from "./lib.mjs";
import challenges from "./challenges.mjs";
import stories from "./stories/index.mjs";
import recaps from "./stories/recaps.mjs";
import start from "./m00-start.mjs";
import basics from "./m01-basics.mjs";
import text from "./m02-text.mjs";
import links from "./m03-links.mjs";
import media from "./m04-media.mjs";
import tables from "./m05-tables.mjs";
import forms from "./m06-forms.mjs";
import structure from "./m07-structure.mjs";
import head from "./m08-head.mjs";
import a11y from "./m09-a11y.mjs";
import { quality, projectCard, projectLanding, projectArticle, projectFinal } from "./m10-projects.mjs";
import { divSpan, bidiRuby, projectRecipe } from "./x01-text-extras.mjs";
import { imageMaps, projectGallery, advancedForms, projectSignup } from "./x02-media-forms-extras.mjs";
import { styleBaseMeta, security, structuredData, jsBridge, nativeInteractivity, webComponents } from "./x03-head-js-extras.mjs";
import { obsolete, referenceSheet } from "./x04-reference.mjs";
import { newFeatures } from "./x05-new-features.mjs";

// Order is the learning path: each project right after the modules it practises.
// Each chapter is a section of the program on the course page.
const chapters = [
  ["Старт", [start]],
  ["Основы HTML", [basics, divSpan]],
  ["Текст", [text, bidiRuby, projectRecipe]],
  ["Ссылки и пути", [links]],
  ["Картинки, видео и встраивание", [media, imageMaps, projectGallery]],
  ["Таблицы", [tables]],
  ["Формы", [forms, advancedForms, projectSignup]],
  ["Структура страницы", [structure, projectCard]],
  ["Head, поиск и безопасность", [head, styleBaseMeta, security, structuredData, projectLanding]],
  ["HTML и JavaScript", [jsBridge, nativeInteractivity, webComponents]],
  ["Доступность", [a11y, projectArticle]],
  ["Качество и финал", [quality, obsolete, newFeatures, referenceSheet, projectFinal]]
];

const course = createCourse(challenges, stories, recaps);
for (const [chapter, parts] of chapters) {
  course.chapter(chapter);
  for (const part of parts) part(course);
}

const manifest = course.manifest({
  slug: "html",
  title: "HTML с нуля: полный курс",
  description:
    "Курс-история: ты с нуля делаешь сайт для кофейни «Зерно». Хозяйка Марта приносит задачи, браузер Бро показывает, как он читает твой код, наставница Ника подсказывает, а гость Лев проверяет сайт скринридером. По пути — весь HTML: каждый тег и атрибут с живым примером, задания с мгновенной проверкой и семь проектов."
});
const out = new URL("../html-track.manifest.json", import.meta.url);
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} skills=${manifest.skills.length} hours=${(minutes / 60).toFixed(1)}`);
