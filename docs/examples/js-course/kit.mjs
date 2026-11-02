// Authoring kit for the JavaScript course. Same story format as the HTML and CSS courses;
// examples and tasks run in the learner's browser sandbox (ADR-0064).
import { scene, card, rule } from "../html-course/stories/kit.mjs";
import { makeLesson } from "../css-course/kit.mjs";
export { scene, rule, makeLesson };

/**
 * A concept card whose example runs and shows its console output.
 * `extra.page` is fixed markup the example runs on (for DOM cards); `extra.show` its height.
 */
const kinded = (kind) => (name, title, what, why, how, extra = {}) =>
  card(name, title, what, why, how, { kind, ...(how ? { lang: "js", show: 70 } : {}), ...extra });
export const kw = kinded("keyword");
export const op = kinded("operator");
export const meth = kinded("method");
export const obj = kinded("object");
export const ev = kinded("event");
export const typ = kinded("type");
export const fnc = kinded("function");
export const val = kinded("value");
export const idea = kinded("idea");

// Checks.
/** A JavaScript expression that must be truthy after the code ran (may use await). */
export const run = (js, label) => ({ label, js });
/** Text the code must print to the console. */
export const out = (log, label) => ({ label, log });
/** A fragment the source must contain (case-insensitive). */
export const has = (contains, label) => ({ label, contains });
/** A fragment the source must not contain. */
export const lacks = (contains, label) => ({ label, contains, absent: true });

/** A hands-on JavaScript task: the learner edits `start`, which runs on top of `page`. */
export const task = (title, text, { page, start, checks, solution, hint }) => ({
  title, task: text, lang: "js", ...(page ? { page } : {}), start, checks, solution, ...(hint ? { hint } : {})
});
