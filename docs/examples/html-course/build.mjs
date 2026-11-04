// Builds ../html-track.manifest.json from the module sources.
// Run from the repository root: node docs/examples/html-course/build.mjs
import { writeFileSync } from "node:fs";
import { createCourse } from "./lib.mjs";
import challenges from "./challenges.mjs";
import assignments from "./assignments.mjs";
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

const course = createCourse(challenges, stories, recaps, {}, assignments);
for (const [chapter, parts] of chapters) {
  course.chapter(chapter);
  for (const part of parts) part(course);
}

const manifest = course.manifest({
  slug: "html",
  title: "HTML с нуля",
  description:
    "Весь HTML — с нуля и до каждого тега и атрибута стандарта. Как устроен веб, текст и списки, ссылки и медиа, таблицы и формы, структура страницы, метаданные, доступность. Каждый тег — карточка с живым примером, каждое задание проверяется прямо в браузере, а мини-проекты собирают изученное вместе."
});
// The element reference links every element to the lesson whose own concept card explains it.
{
  const home = new Map();
  for (const lesson of manifest.lessons)
    for (const block of lesson.blocks)
      for (const [, body] of (block.markdown ?? "").matchAll(/```concept\n([\s\S]*?)\n```/g)) {
        const name = JSON.parse(body).name;
        // Exact tag cards (`<link>`) win over variants (`<link rel="icon">`); plain ideas never count.
        const exact = /^<([a-z][a-z0-9-]*)>$/.exec(name);
        const variant = /^<([a-z][a-z0-9-]*)[\s>]/.exec(name);
        if (exact && !home.get(exact[1])?.exact) home.set(exact[1], { slug: lesson.slug, exact: true });
        else if (variant && !home.get(variant[1])) home.set(variant[1], { slug: lesson.slug, exact: false });
      }
  const link = (tag) => (home.has(tag) ? `[\`${tag}\`](/courses/${manifest.course.slug}/${home.get(tag).slug})` : `\`${tag}\``);
  const reference = manifest.lessons.find((lesson) => lesson.slug === "element-reference");
  const block = reference?.blocks.find((b) => b.type === "markdown");
  if (block)
    block.markdown = block.markdown.replace(/^- `([^`]+)` — /gm, (_, names) => {
      const range = /^h(\d)–h(\d)$/.exec(names);
      const tags = range ? Array.from({ length: +range[2] - +range[1] + 1 }, (_, i) => `h${+range[1] + i}`) : names.split(/\s*\/\s*/);
      return `- ${tags.map(link).join(" · ")} — `;
    });
}

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

const out = new URL("../html-track.manifest.json", import.meta.url);
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} skills=${manifest.skills.length} hours=${(minutes / 60).toFixed(1)}`);
