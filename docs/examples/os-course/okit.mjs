// The OS course kit: the shared kit plus shell and C example cards.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A shell command card with terminal output. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
/** A C example card: the language of system calls. */
export const cc = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "c" });
