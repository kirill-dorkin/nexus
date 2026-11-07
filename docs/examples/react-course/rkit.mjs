// The React course kit: the shared kit plus a JSX example card (highlighted, not run).
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A React/JSX example card. */
export const jsx = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "js" });
