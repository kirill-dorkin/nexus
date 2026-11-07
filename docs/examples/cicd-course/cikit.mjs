// The CI/CD course kit: the shared kit plus workflow (YAML) and shell example cards.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A pipeline configuration card (GitHub Actions and similar YAML). */
export const yml = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "yaml" });
/** A shell command card. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
