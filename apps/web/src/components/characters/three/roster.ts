import { browser } from "./browser";
import { css } from "./css";
import { html } from "./html";
import { js } from "./js";
import { pc } from "./pc";
import { sql } from "./sql";
import { terminal } from "./terminal";
import { git } from "./git";
import { ts } from "./ts";
import { node } from "./node";
import { react } from "./react";
import { network } from "./network";
import { python } from "./python";
import { docker } from "./docker";
import { next } from "./next";
import { go } from "./go";
import type { CharacterDef } from "./types";

/** Characters that have a 3D body. The rest of the roster keeps its text card for now. */
export const CHARACTER_DEFS: readonly CharacterDef[] = [
  pc,
  browser,
  html,
  css,
  js,
  sql,
  terminal,
  git,
  ts,
  node,
  react,
  network,
  python,
  docker,
  next,
  go
];

export const characterDef = (slug: string) =>
  CHARACTER_DEFS.find((def) => def.slug === slug) ?? null;

export { hasBody } from "./meta";
