// The Go course kit: the shared kit plus a Go example card (highlighted, not run) and a shell card.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A Go example card. */
export const go = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "go" });
/** A shell command card. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
