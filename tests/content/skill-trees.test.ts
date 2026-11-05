import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The character pipeline (spec P1.7): docs/product/skill-trees/*.md are the target of every
// character course. They must parse, keep keys unique, give every branch a depth, and stay in
// sync with the published skill map: no course skill may be missing from its tree.

type TreeSkill = { key: string; title: string; isNew: boolean };
type Tree = {
  slug: string;
  branches: { title: string; depth: string | null; skills: TreeSkill[] }[];
};
type Parser = {
  treesDir: string;
  listCharacters: () => string[];
  parseTree: (slug: string) => Tree;
};

const parserUrl = new URL("../../scripts/skill-tree.mjs", import.meta.url).href;
const { treesDir, listCharacters, parseTree } = (await import(
  parserUrl
)) as Parser;

const map = JSON.parse(
  readFileSync(
    new URL("../../apps/web/src/lib/skill-map/skill-map.json", import.meta.url),
    "utf8"
  )
) as {
  characters: {
    slug: string;
    branches: { skills: { key: string }[] }[];
  }[];
};

// Characters whose course is rebuilt in an open PR (#200): its map keys change on merge.
const PENDING = new Set(["pc", "browser"]);

const trees = listCharacters().map((slug) => parseTree(slug));

describe("skill trees (docs/product/skill-trees)", () => {
  it("has the 32 characters of the roster", () => {
    expect(trees).toHaveLength(32);
    const readme = readFileSync(join(treesDir, "README.md"), "utf8");
    for (const { slug } of trees) expect(readme).toContain(`\`${slug}.md\``);
  });

  it("gives every branch a depth and at least one skill", () => {
    for (const tree of trees)
      for (const branch of tree.branches) {
        expect(branch.depth, `${tree.slug}: ${branch.title}`).not.toBeNull();
        expect(
          branch.skills.length,
          `${tree.slug}: ${branch.title}`
        ).toBeGreaterThan(0);
      }
  });

  it("uses every skill key once across all characters", () => {
    const keys = trees.flatMap((t) =>
      t.branches.flatMap((b) => b.skills.map((s) => s.key))
    );
    const seen = new Set<string>();
    const duplicates = keys.filter((k) =>
      seen.has(k) ? true : (seen.add(k), false)
    );
    expect(duplicates).toEqual([]);
  });

  it("keeps every published course skill in its character's tree", () => {
    for (const character of map.characters) {
      if (PENDING.has(character.slug)) continue;
      const tree = trees.find((t) => t.slug === character.slug);
      expect(tree, character.slug).toBeDefined();
      const treeKeys = new Set(
        tree!.branches.flatMap((b) => b.skills.map((s) => s.key))
      );
      const mapKeys = character.branches.flatMap((b) =>
        b.skills.map((s) => s.key)
      );
      expect(
        mapKeys.filter((k) => !treeKeys.has(k)),
        character.slug
      ).toEqual([]);
      // Skills the tree marks as existing must already be in the course.
      const existing = tree!.branches.flatMap((b) =>
        b.skills.filter((s) => !s.isNew).map((s) => s.key)
      );
      const mapSet = new Set(mapKeys);
      expect(
        existing.filter((k) => !mapSet.has(k)),
        character.slug
      ).toEqual([]);
    }
  });
});
