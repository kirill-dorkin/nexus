// The Kubernetes course kit: the shared kit plus manifest (YAML) and kubectl example cards.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A Kubernetes manifest card (YAML). */
export const yml = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "yaml" });
/** A shell command card. */
export const sh = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
