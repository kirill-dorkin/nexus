// The NestJS course kit: the shared kit plus TypeScript and shell example cards.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A NestJS TypeScript example card (highlighted, not run). */
export const ns = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "ts" });
/** A shell command card. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
