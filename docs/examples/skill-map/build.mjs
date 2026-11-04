// Builds apps/web/src/lib/skill-map/skill-map.json from the characters and course manifests.
// Run from the repository root: node docs/examples/skill-map/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as config from "./characters.mjs";

const examples = join(dirname(fileURLToPath(import.meta.url)), "..");
export const outputPath = join(
  examples,
  "../../apps/web/src/lib/skill-map/skill-map.json"
);

/** Pure: the map for the given config and manifest reader. Throws on any inconsistency. */
export function buildSkillMap(
  { characters, requires, unlockShare, maxLevel } = config,
  readManifest = (name) =>
    JSON.parse(readFileSync(join(examples, name), "utf8"))
) {
  const taken = new Set();
  const branchIds = new Map();
  const result = characters.map((character) => {
    const branches = [];
    for (const source of character.sources) {
      const manifest = readManifest(source.manifest);
      const skillTitle = new Map(manifest.skills.map((s) => [s.key, s.title]));
      const activitySkills = new Map(
        manifest.activities.map((a) => [a.slug, a.skillKeys ?? []])
      );
      // A skill's lesson is the first lesson that checks it.
      const lessonOf = new Map();
      for (const lesson of manifest.lessons) {
        for (const block of lesson.blocks) {
          for (const key of activitySkills.get(block.activitySlug) ?? []) {
            if (!lessonOf.has(key)) lessonOf.set(key, lesson);
          }
        }
      }
      const wanted = source.skills ? new Set(source.skills) : null;
      for (const key of source.skills ?? []) {
        if (!skillTitle.has(key))
          throw new Error(`${character.slug}: unknown skill ${key}`);
      }
      for (const { key } of manifest.skills) {
        if ((wanted && !wanted.has(key)) || taken.has(key)) continue;
        const lesson = lessonOf.get(key);
        if (!lesson) throw new Error(`${key}: no lesson checks this skill`);
        taken.add(key);
        const title = source.branch ?? lesson.chapter ?? manifest.course.title;
        let branch = branches.find((b) => b.title === title);
        if (!branch) {
          branch = {
            id: `${character.slug}-${branches.length + 1}`,
            title,
            requires: [],
            skills: []
          };
          branches.push(branch);
          branchIds.set(`${character.slug}/${title}`, branch.id);
        }
        branch.skills.push({
          key,
          title: skillTitle.get(key),
          lesson: source.published
            ? {
                course: manifest.course.slug,
                slug: lesson.slug,
                title: lesson.title
              }
            : null
        });
      }
    }
    if (branches.length === 0)
      throw new Error(`${character.slug}: no skills`);
    branches.forEach((branch, index) => {
      if (index > 0) branch.requires.push(branches[index - 1].id);
    });
    return {
      slug: character.slug,
      name: character.name,
      role: character.role,
      summary: character.summary,
      accent: character.accent,
      published: character.sources.some((s) => s.published),
      branches
    };
  });
  const branchById = new Map(
    result.flatMap((c) => c.branches.map((b) => [b.id, b]))
  );
  for (const [target, sources] of Object.entries(requires)) {
    const id = branchIds.get(target);
    if (!id) throw new Error(`requires: unknown branch ${target}`);
    for (const source of sources) {
      const from = branchIds.get(source);
      if (!from) throw new Error(`requires: unknown branch ${source}`);
      branchById.get(id).requires.push(from);
    }
  }
  // The branch graph must have no cycles.
  const state = new Map();
  const visit = (id, path) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "open")
      throw new Error(`requires: cycle ${[...path, id].join(" → ")}`);
    state.set(id, "open");
    for (const next of branchById.get(id).requires) visit(next, [...path, id]);
    state.set(id, "done");
  };
  for (const id of branchById.keys()) visit(id, []);
  return {
    version: 1,
    unlockShare,
    maxLevel,
    characters: result
  };
}

export const serialize = (map) => `${JSON.stringify(map, null, 2)}\n`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeFileSync(outputPath, serialize(buildSkillMap()));
  console.log(`Wrote ${outputPath}`);
}
