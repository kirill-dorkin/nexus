import { z } from "zod";

import { organizationSlugSchema, resourceSlugSchema, uuidSchema } from "./common";

/**
 * `skill-map@2` (ADR-0078): the characters a learner levels up, their branches and the skills
 * of each branch, as one published document of Learning Content. Built by
 * docs/examples/skill-map/build.mjs. Every skill names the skills it stands on (`prerequisites`,
 * ADR-0077); the server checks those before a skill test starts.
 */
const title = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(2000);

export const skillMapBranchDepthSchema = z.enum([
  "core",
  "practice",
  "advanced",
  "reference",
  "internals"
]);

export const skillMapLessonSchema = z
  .object({ course: resourceSlugSchema, slug: resourceSlugSchema, title })
  .strict();

export const skillMapSkillSchema = z
  .object({
    key: resourceSlugSchema,
    title,
    /** Null while the character's course is not published. */
    lesson: skillMapLessonSchema.nullable(),
    /** Skills that must be active before this one can be confirmed. */
    prerequisites: z.array(resourceSlugSchema).max(50)
  })
  .strict();

export const skillMapBranchSchema = z
  .object({
    id: resourceSlugSchema,
    title,
    depth: skillMapBranchDepthSchema.default("practice"),
    /** Branches that should be at least `unlockShare` active first. */
    requires: z.array(resourceSlugSchema).max(50),
    skills: z.array(skillMapSkillSchema).min(1).max(500)
  })
  .strict();

export const skillMapAbilitySchema = z
  .object({ title, branches: z.array(resourceSlugSchema).min(1).max(50) })
  .strict();

export const skillMapCharacterSchema = z
  .object({
    slug: resourceSlugSchema,
    name: title,
    role: title,
    summary: text,
    accent: resourceSlugSchema,
    published: z.boolean(),
    abilities: z.array(skillMapAbilitySchema).max(50).default([]),
    branches: z.array(skillMapBranchSchema).min(1).max(200)
  })
  .strict();

/** Graph problems of a map, empty when it is consistent. Pure, shared by the API and the tests. */
export function skillMapIssues(map: {
  characters: readonly {
    slug: string;
    abilities: readonly { title: string; branches: readonly string[] }[];
    branches: readonly {
      id: string;
      requires: readonly string[];
      skills: readonly { key: string; prerequisites: readonly string[] }[];
    }[];
  }[];
}): string[] {
  const issues: string[] = [];
  const characterSlugs = new Set<string>();
  const branchOwner = new Map<string, string>();
  const skillOwner = new Map<string, string>();
  const branchEdges = new Map<string, readonly string[]>();
  const skillEdges = new Map<string, readonly string[]>();
  for (const character of map.characters) {
    if (characterSlugs.has(character.slug))
      issues.push(`character ${character.slug}: duplicate slug`);
    characterSlugs.add(character.slug);
    for (const branch of character.branches) {
      if (branchOwner.has(branch.id))
        issues.push(`branch ${branch.id}: duplicate id`);
      branchOwner.set(branch.id, character.slug);
      branchEdges.set(branch.id, branch.requires);
      for (const skill of branch.skills) {
        const owner = skillOwner.get(skill.key);
        if (owner !== undefined)
          issues.push(
            `skill ${skill.key}: belongs to ${owner} and ${character.slug}`
          );
        skillOwner.set(skill.key, character.slug);
        skillEdges.set(skill.key, skill.prerequisites);
      }
    }
  }
  for (const character of map.characters)
    for (const ability of character.abilities)
      for (const id of ability.branches)
        if (branchOwner.get(id) !== character.slug)
          issues.push(
            `ability ${character.slug}/${ability.title}: unknown branch ${id}`
          );
  const references = (
    kind: string,
    edges: Map<string, readonly string[]>
  ) => {
    for (const [from, targets] of edges)
      for (const to of targets) {
        if (to === from) issues.push(`${kind} ${from}: requires itself`);
        else if (!edges.has(to))
          issues.push(`${kind} ${from}: unknown requirement ${to}`);
      }
  };
  references("branch", branchEdges);
  references("skill", skillEdges);
  const cycle = (kind: string, edges: Map<string, readonly string[]>) => {
    const state = new Map<string, "open" | "done">();
    const visit = (id: string, path: string[]): string | null => {
      if (state.get(id) === "done") return null;
      if (state.get(id) === "open") return [...path, id].join(" → ");
      state.set(id, "open");
      for (const next of edges.get(id) ?? []) {
        if (next === id || !edges.has(next)) continue;
        const found = visit(next, [...path, id]);
        if (found) return found;
      }
      state.set(id, "done");
      return null;
    };
    for (const id of edges.keys()) {
      const found = visit(id, []);
      if (found) {
        issues.push(`${kind} cycle: ${found}`);
        return;
      }
    }
  };
  cycle("branch", branchEdges);
  cycle("skill", skillEdges);
  return issues;
}

export const skillMapManifestV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    /** Share of a required branch that must be active before a branch opens. */
    unlockShare: z.number().gt(0).max(1),
    maxLevel: z.number().int().min(1).max(1000),
    characters: z.array(skillMapCharacterSchema).min(1).max(200)
  })
  .strict()
  .superRefine((map, context) => {
    for (const message of skillMapIssues(map))
      context.addIssue({ code: "custom", message, path: ["characters"] });
  });

export type SkillMapManifestV2 = z.infer<typeof skillMapManifestV2Schema>;
export type SkillMapCharacterV2 = z.infer<typeof skillMapCharacterSchema>;
export type SkillMapBranchV2 = z.infer<typeof skillMapBranchSchema>;
export type SkillMapSkillV2 = z.infer<typeof skillMapSkillSchema>;

/** Every prerequisite edge of a map: skill → skill it stands on. */
export function skillMapPrerequisites(
  map: Pick<SkillMapManifestV2, "characters">
): { skillKey: string; requiresSkillKey: string }[] {
  return map.characters.flatMap((c) =>
    c.branches.flatMap((b) =>
      b.skills.flatMap((s) =>
        s.prerequisites.map((requiresSkillKey) => ({
          skillKey: s.key,
          requiresSkillKey
        }))
      )
    )
  );
}

export const skillMapManifestCountsSchema = z
  .object({
    characters: z.number().int().min(0),
    branches: z.number().int().min(0),
    skills: z.number().int().min(0),
    prerequisites: z.number().int().min(0)
  })
  .strict();
export type SkillMapManifestCounts = z.infer<
  typeof skillMapManifestCountsSchema
>;

export const skillMapManifestPlanSchema = z
  .object({
    mode: z.enum(["create_map", "create_version"]),
    skillMapId: uuidSchema.nullable(),
    /** The latest published version; apply must name it so concurrent publishes conflict. */
    expectedLatestVersionNumber: z.number().int().min(1).nullable(),
    counts: skillMapManifestCountsSchema
  })
  .strict();
export type SkillMapManifestPlan = z.infer<typeof skillMapManifestPlanSchema>;

export const applySkillMapManifestRequestSchema = z
  .object({
    manifest: skillMapManifestV2Schema,
    expectedLatestVersionNumber: z.number().int().min(1).nullable()
  })
  .strict();
export type ApplySkillMapManifestRequest = z.infer<
  typeof applySkillMapManifestRequestSchema
>;

export const skillMapManifestApplyResultSchema = z
  .object({
    skillMapId: uuidSchema,
    versionId: uuidSchema,
    versionNumber: z.number().int().min(1),
    counts: skillMapManifestCountsSchema
  })
  .strict();
export type SkillMapManifestApplyResult = z.infer<
  typeof skillMapManifestApplyResultSchema
>;

/** `GET /v1/public/skill-map/{org}`: the published map, or null before the first publication. */
export const publicSkillMapSchema = z
  .object({
    organizationSlug: organizationSlugSchema,
    map: skillMapManifestV2Schema.nullable()
  })
  .strict();
export type PublicSkillMap = z.infer<typeof publicSkillMapSchema>;
