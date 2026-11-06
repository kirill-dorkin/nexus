// Authoring kit for the ПК and Браузер courses: concept cards, diagrams and quizzes, no scenes.
// Lessons explain everything themselves; the story lives only in docs/story/season-1.md.
import { card, diagram, code } from "../html-course/stories/kit.mjs";
export { diagram, code };

/**
 * A concept card. `how` is a static example (plain text by default); `extra.lang` changes
 * the highlighting, and `lang: "js"` with `show` runs the example and shows its console.
 */
const kinded = (kind) => (name, title, what, why, how, extra = {}) =>
  card(name, title, what, why, how, { kind, ...(how ? { lang: "text" } : {}), ...extra });
export const idea = kinded("idea");
/** A command of the command line. */
export const cmd = kinded("statement");
/** A runnable JavaScript example: what the browser itself reports. */
export const js = (name, title, what, why, how, extra = {}) =>
  card(name, title, what, why, how, { kind: "object", lang: "js", show: 80, ...extra });

/** A rule of thumb at the end of a section, as plain text. */
export const tip = (text) => `**Главное.** ${text}`;

/** Reading time (~130 words a minute), a short look at each card's example and each quiz. */
function estimate(body, quizzes) {
  const text = body.join("\n");
  let words = text.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length;
  let cards = 0;
  for (const [, json] of text.matchAll(/```concept\n([\s\S]*?)\n```/g)) {
    const card = JSON.parse(json);
    words += `${card.what} ${card.why}`.split(/\s+/).length;
    cards += 1;
  }
  return Math.max(5, Math.round(words / 130 + cards * 0.5 + quizzes));
}

/** Declares a lesson with its one-sentence recap and quizzes in one place. */
export function makeLesson(c, recaps) {
  return ({ slug, title, summary, skill, now, body, quizzes, minutes }) => {
    recaps[slug] = now;
    c.lesson({ slug, title, minutes: minutes ?? estimate(body, quizzes.length), summary, skill, body, quizzes });
  };
}

/** Builds a course manifest from chapters (a module file or a function); every lesson banner shows the given cast. */
export async function buildCourse({ createCourse, base, chapters, course, cast, out }) {
  const recaps = {};
  const c = createCourse({}, {}, recaps, { cast });
  for (const [chapter, part] of chapters) {
    c.chapter(chapter);
    const write = typeof part === "string" ? (await import(new URL(part, base).href)).default : part;
    write(c, recaps);
  }
  const manifest = c.manifest(course);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
  const minutes = manifest.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
  console.log(`${course.slug}: lessons=${manifest.lessons.length} activities=${manifest.activities.length} hours=${(minutes / 60).toFixed(1)}`);
  return manifest;
}
