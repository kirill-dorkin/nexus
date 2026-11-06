// The TypeScript course kit: the shared ПК/Браузер kit plus a TypeScript example card.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A TypeScript example card, highlighted but not run. */
export const ts = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "ts" });
