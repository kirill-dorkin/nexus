// The Redis course kit: the shared kit plus redis-cli and application code example cards.
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A redis-cli session card. */
export const cli = (name, title, what, why, how) =>
  idea(name, title, what, why, how, how ? { lang: "shell" } : {});
/** An application code card (JavaScript with a Redis client). */
export const app = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "js" });
