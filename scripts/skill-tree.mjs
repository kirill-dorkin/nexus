// Reads a character's skill tree (docs/product/skill-trees/<slug>.md) into data: branches with
// their depth, skills with stable keys, and whether a skill is new (not yet in a course).
// Usage: node scripts/skill-tree.mjs <slug>          — prints the tree as JSON
//        node scripts/skill-tree.mjs <slug> --todo   — skills still to write, by branch
//        node scripts/skill-tree.mjs --all --summary — counts per character
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const treesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../docs/product/skill-trees"
);

export const DEPTH_NAMES = {
  Основа: "core",
  Практика: "practice",
  Продвинутое: "advanced",
  "Полное покрытие": "reference",
  Изнутри: "internals"
};

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function listCharacters() {
  return readdirSync(treesDir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => f.slice(0, -3))
    .sort();
}

/** Parses one tree file; throws with the line number on anything malformed. */
export function parseTree(
  slug,
  source = readFileSync(join(treesDir, `${slug}.md`), "utf8")
) {
  const lines = source.split("\n");
  const title = lines[0]?.replace(/^# /, "") ?? slug;
  const branches = [];
  let branch = null;
  let inBranches = false;
  lines.forEach((line, index) => {
    const where = `${slug}.md:${index + 1}`;
    if (/^## /.test(line)) {
      inBranches = /^## Ветки/.test(line);
      branch = null;
      return;
    }
    if (!inBranches) return;
    const heading = /^### (.+)$/.exec(line);
    if (heading) {
      const text = heading[1];
      const tier =
        /\((Основа|Практика|Продвинутое|Полное покрытие|Изнутри)\)/.exec(text);
      branch = {
        title: text
          .replace(/\s*\(.*$/, "")
          .replace(/\s+—.*$/, "")
          .trim(),
        depth: tier ? DEPTH_NAMES[tier[1]] : null,
        isNew: /\*\*\(новое\)\*\*/.test(text),
        skills: []
      };
      branches.push(branch);
      return;
    }
    const skill = /^- (\*\*\(новое\)\*\* )?`([^`]+)` — (.+)$/.exec(line);
    if (skill) {
      if (!branch) throw new Error(`${where}: skill outside a branch`);
      const key = skill[2];
      if (!KEY.test(key)) throw new Error(`${where}: bad key ${key}`);
      branch.skills.push({
        key,
        title: skill[3].split(/ — |: /)[0].trim(),
        covers: skill[3].trim(),
        isNew: Boolean(skill[1]) || branch.isNew
      });
    }
  });
  return { slug, title, branches };
}

export function summary(tree) {
  const skills = tree.branches.flatMap((b) => b.skills);
  return {
    slug: tree.slug,
    branches: tree.branches.length,
    skills: skills.length,
    newSkills: skills.filter((s) => s.isNew).length
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [arg, flag] = process.argv.slice(2);
  if (arg === "--all") {
    const rows = listCharacters().map((slug) => summary(parseTree(slug)));
    if (flag === "--summary") console.table(rows);
    else console.log(JSON.stringify(rows, null, 2));
  } else if (arg && flag === "--todo") {
    for (const branch of parseTree(arg).branches) {
      const todo = branch.skills.filter((s) => s.isNew);
      if (todo.length === 0) continue;
      console.log(`${branch.title} (${branch.depth})`);
      for (const skill of todo) console.log(`  ${skill.key} — ${skill.covers}`);
    }
  } else if (arg) {
    console.log(JSON.stringify(parseTree(arg), null, 2));
  } else {
    console.error(
      "Usage: node scripts/skill-tree.mjs <slug> | --all [--summary]"
    );
    process.exit(2);
  }
}
