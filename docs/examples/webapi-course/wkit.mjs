// The Web API course kit: the shared kit, a runnable JavaScript card and a static JavaScript card.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A browser JavaScript example card (highlighted, not run). */
export const wa = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "js" });
/** A shell command card. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
