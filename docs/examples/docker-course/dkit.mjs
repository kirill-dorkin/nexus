// The Docker course kit: the shared kit plus Dockerfile, Compose (YAML) and shell example cards.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A shell command card with highlighted terminal output. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
/** A Dockerfile example card. */
export const df = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "dockerfile" });
/** A Compose file (YAML) example card. */
export const yml = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "yaml" });
