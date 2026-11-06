import { browser } from "./browser";
import { css } from "./css";
import { html } from "./html";
import { js } from "./js";
import { pc } from "./pc";
import { sql } from "./sql";
import type { CharacterDef } from "./types";

/** Characters that have a 3D body. The rest of the roster keeps its text card for now. */
export const CHARACTER_DEFS: readonly CharacterDef[] = [
  pc,
  browser,
  html,
  css,
  js,
  sql
];

export const characterDef = (slug: string) =>
  CHARACTER_DEFS.find((def) => def.slug === slug) ?? null;

export { hasBody } from "./meta";
