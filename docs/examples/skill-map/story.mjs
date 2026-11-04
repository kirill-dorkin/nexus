// Reads the branch scenes of docs/story/season-1.md (the director's script) into data.
// The script stays the single source: build.mjs writes apps/web/src/lib/skill-map/story.json.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const scriptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../story/season-1.md"
);

/** Speaker names in the script → stable ids used by Web for portraits and colours. */
export const CAST = {
  Ника: "nika",
  Кремень: "kremen",
  Бро: "bro",
  Зодчий: "zodchy",
  Кисть: "kist",
  Искра: "iskra",
  Слон: "slon",
  Лев: "lev",
  Баг: "bug"
};

const MAX_LINE = 140;

/** Removes stage directions (`[…]` in backticks) and trims; empty means a pure direction. */
const clean = (text) =>
  text
    .replace(/`\[[^\]]*\]`/g, "")
    .replace(/\s+/g, " ")
    .trim();

function line(name, text, where) {
  const who = CAST[name];
  if (!who) throw new Error(`${where}: unknown speaker ${name}`);
  const value = clean(text);
  if (value.length > MAX_LINE)
    throw new Error(`${where}: line longer than ${MAX_LINE}: ${value}`);
  return value ? [who, value] : null;
}

/**
 * `{ [branchId]: { intro, boss, outro } }`, each a list of `[speakerId, text]`. Branch sections
 * are `#### \`id\` Title` with **Вход.**, optional **Бой** and **Выход.** parts; the deep JavaScript
 * branches are rows of a table: `| \`id\` Title | intro | outro |`.
 */
export function parseStory(source = readFileSync(scriptPath, "utf8")) {
  const scenes = {};
  let branch = null;
  let part = null;
  for (const raw of source.split("\n")) {
    const heading = /^#### `([a-z]+-\d+)`/.exec(raw);
    if (heading) {
      branch = heading[1];
      scenes[branch] = { intro: [], boss: null, outro: [] };
      part = null;
      continue;
    }
    if (/^#{1,3} /.test(raw)) {
      branch = null;
      part = null;
    }
    const row = /^\| `([a-z]+-\d+)` [^|]+\|(.+)\|(.+)\|\s*$/.exec(raw);
    if (row) {
      const [, id, intro, outro] = row;
      scenes[id] = {
        intro: tableLines(intro, "iskra", id),
        boss: null,
        outro: tableLines(outro, "iskra", id)
      };
      continue;
    }
    if (!branch) continue;
    if (raw.startsWith("**Вход.**")) part = "intro";
    else if (raw.startsWith("**Бой**")) {
      part = "boss";
      scenes[branch].boss = [];
    } else if (raw.startsWith("**Выход.**")) part = "outro";
    const spoken = /^- \*\*([^*:]+):\*\* (.+)$/.exec(raw);
    if (spoken && part) {
      const value = line(spoken[1], spoken[2], branch);
      if (value) scenes[branch][part].push(value);
    }
  }
  return scenes;
}

/** A table cell: «quoted» speech with optional **Имя:** prefixes; unnamed speech is `fallback`. */
function tableLines(cell, fallback, where) {
  const lines = [];
  const pattern = /(?:\*\*([^*:]+):\*\*\s*)?«([^»]+)»/g;
  let match;
  let speaker = null;
  while ((match = pattern.exec(cell))) {
    if (match[1]) speaker = match[1];
    const value = speaker
      ? line(speaker, match[2], where)
      : [fallback, clean(match[2])];
    if (value) lines.push(value);
  }
  return lines;
}
