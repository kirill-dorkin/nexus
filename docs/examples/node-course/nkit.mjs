// The Node.js course kit: the shared kit plus a JavaScript example card that is not run in the browser.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A server-side JavaScript example: highlighted, not run (it needs Node.js, not the browser). */
export const node = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "js" });
