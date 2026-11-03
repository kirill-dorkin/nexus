// Authoring kit for the SQL course. Same story format as the HTML and CSS courses
// (scenes, concept cards, hands-on tasks, quizzes); examples and tasks run on PostgreSQL in
// the learner's browser against the teaching store database (ADR-0065).
import { scene, card, diagram, rule, code } from "../html-course/stories/kit.mjs";
export { scene, diagram, rule, code };

/** Cards run their SQL example and show what the database answers. `still` keeps an example static. */
export const still = { show: undefined };
const kinded = (kind) => (name, title, what, why, how, extra = {}) =>
  card(name, title, what, why, how, { ...(kind ? { kind } : {}), ...(how ? { lang: "sql", show: 80 } : {}), ...extra });
export const stmt = kinded("statement");
export const clause = kinded("clause");
export const kw = kinded("keyword");
export const op = kinded("operator");
export const fn = kinded("function");
export const type = kinded("type");
export const cons = kinded("constraint");
export const idea = kinded(undefined);
export const sql = (src) => code("sql", src);

// Challenge checks.
/** The learner's last result must have the same rows as this reference query. */
export const rows = (query, label, extra = {}) => ({ label, rows: query, ...extra });
/** A query run after the learner's code must return true. */
export const holds = (query, label) => ({ label, sql: query });
/** A case-insensitive fragment of the learner's SQL. */
export const src = (contains, label, extra = {}) => ({ label, contains, ...extra });
export const task = (title, text, { start = "-- Напиши запрос здесь\n", checks, solution, hint, at, setup, db }) => ({
  ...(at ? { at } : {}), title, task: text, lang: "sql", ...(db ? { db } : {}), ...(setup ? { setup } : {}),
  start, checks, solution, ...(hint ? { hint } : {})
});

/** Declares a lesson with its story line, tasks and quizzes in one place. */
export function makeLesson(c, challenges, recaps) {
  return ({ slug, title, summary, skill, now, body, tasks = [], quizzes, minutes = 10 }) => {
    challenges[slug] = tasks;
    recaps[slug] = now;
    c.lesson({ slug, title, minutes, summary, skill, body, quizzes });
  };
}
