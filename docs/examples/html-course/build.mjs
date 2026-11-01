// Builds ../html-track.manifest.json from the module sources.
// Run from the repository root: node docs/examples/html-course/build.mjs
import { writeFileSync } from "node:fs";
import { createCourse } from "./lib.mjs";
import challenges from "./challenges.mjs";
import stories from "./stories/index.mjs";
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
const path = [
  start,                                            // 0. Старт с нуля
  basics, divSpan,                                  // 1. Основы
  text, bidiRuby, projectRecipe,                    // 2. Текст + мини-проект
  links,                                            // 3. Ссылки
  media, imageMaps, projectGallery,                 // 4. Медиа + мини-проект
  tables,                                           // 5. Таблицы
  forms, advancedForms, projectSignup,              // 6. Формы + мини-проект
  structure, projectCard,                           // 7. Структура + проект 1
  head, styleBaseMeta, security, structuredData, projectLanding, // 8. Head + проект 2
  jsBridge, nativeInteractivity, webComponents,     // 9. HTML и JavaScript
  a11y, projectArticle,                             // 10. Доступность + проект 3
  quality, obsolete, newFeatures, referenceSheet, projectFinal // 11. Качество, новинки, справочник, финал
];

const course = createCourse(challenges, stories);
for (const part of path) part(course);

const manifest = course.manifest({
  slug: "html",
  title: "HTML с нуля: полный курс",
  description:
    "Буквально с нуля до уверенного владения всем HTML: как устроен веб, первая страница на своём компьютере, текст, ссылки, медиа, таблицы, формы, семантика, метаданные, безопасность, связь с JavaScript, веб-компоненты и доступность. Короткие уроки, живые примеры, которые можно менять прямо в браузере, задания с мгновенной проверкой и семь проектов."
});
const out = new URL("../html-track.manifest.json", import.meta.url);
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} skills=${manifest.skills.length} hours=${(minutes / 60).toFixed(1)}`);
