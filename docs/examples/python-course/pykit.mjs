// The Python course kit: the shared kit plus a Python example card (shown as code, not run).
import { idea } from "../pc-course/kit.mjs";
export * from "../pc-course/kit.mjs";

/** A Python example card. */
export const py = (name, title, what, why, how) =>
  idea(name, title, what, why, how, { lang: "python" });
