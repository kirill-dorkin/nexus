// Authoring kit for the story version of the HTML course.
// Characters: bro (браузер), nika (наставница), lev (слушает сайты скринридером),
// bug (Вредный Скрипт), you (ученик). SQL adds slon (база данных).
const FENCE = "```";
const fence = (lang, value) => `${FENCE}${lang}\n${JSON.stringify(value, null, 2)}\n${FENCE}`;

/** Messenger scene: scene("Заказ", ["you", "Привет!"], ["you", "Сделаю"]) */
export const scene = (title, ...lines) => fence("story", { title, lines });
/** One element or attribute: what it is, why it exists, how it is written (+ live preview height). */
export const card = (name, title, what, why, how, extra = {}) =>
  fence("concept", { name, title, what, why, ...(how ? { how } : {}), ...extra });
export const diagram = (spec) => fence("diagram", spec);
export const demo = (spec) => fence("demo", spec);
export const code = (lang, src) => `${FENCE}${lang}\n${src.trim()}\n${FENCE}`;
export const html = (src) => code("html", src);
/** Mentor's rule of thumb: one chat message from Nika, styled like every other scene. */
export const rule = (text) => fence("story", { lines: [["nika", text]] });
