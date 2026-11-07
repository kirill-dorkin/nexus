// The Next.js course kit: the shared kit plus a JSX example card (highlighted, not run) and a shell card.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A Next.js (JSX/TSX) example card. */
export const nx = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "js" });
/** A shell command card. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
