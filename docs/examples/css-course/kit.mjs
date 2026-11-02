// Authoring kit for the CSS course. Same story format as the HTML course
// (scenes, concept cards, hands-on tasks, quizzes), plus CSS-specific card kinds and checks.
import { scene, card, diagram, demo, rule, code } from "../html-course/stories/kit.mjs";
export { scene, diagram, demo, rule, code };

/** A preview page: a stylesheet plus a little markup. */
export const page = (css, body) => `<style>\n${css.trim()}\n</style>\n${body.trim()}`;

const kinded = (kind) => (name, title, what, why, how, extra = {}) =>
  card(name, title, what, why, how, { kind, ...(how ? { show: 80 } : {}), ...extra });
export const prop = kinded("property");
export const sel = kinded("selector");
export const at = kinded("at-rule");
export const fn = kinded("function");
export const val = kinded("value");
export const idea = (name, title, what, why, how, extra = {}) => card(name, title, what, why, how, { ...(how ? { show: 80 } : {}), ...extra });

// Challenge checks.
export const el = (selector, label, extra = {}) => ({ label, selector, ...extra });
export const src = (contains, label, extra = {}) => ({ label, contains, ...extra });
/** css(".card", "display", "Карточка — сетка", { value: "grid" }) */
export const css = (selector, property, label, extra = {}) => ({ label, css: { selector, property, ...extra } });
export const task = (title, text, { start, checks, solution, hint, at }) => ({
  ...(at ? { at } : {}), title, task: text, start, checks, solution, ...(hint ? { hint } : {})
});

/** Declares a lesson with its story line, tasks and quizzes in one place. */
export function makeLesson(c, challenges, recaps) {
  return ({ slug, title, summary, skill, now, body, tasks = [], quizzes, minutes = 10 }) => {
    challenges[slug] = tasks;
    recaps[slug] = now;
    c.lesson({ slug, title, minutes, summary, skill, body, quizzes });
  };
}
