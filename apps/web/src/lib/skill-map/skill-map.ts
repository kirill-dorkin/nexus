import data from "./skill-map.json";
import {
  isActive,
  skillFreshness,
  type Freshness,
  type FreshnessState
} from "./freshness";

/**
 * The skill map (ADR-0074): characters a learner levels up, each a set of the organization's
 * skills grouped into branches. Built from course manifests by docs/examples/skill-map/build.mjs.
 * Progress is derived from the learner's confirmations (`skill-freshness@1`). "Locked" means a
 * skill cannot be confirmed yet; lessons stay readable and access is still decided by Enrollment
 * and Entitlement. Until the map moves into Learning Content the lock is shown, not enforced.
 */
export type SkillMapLesson = { course: string; slug: string; title: string };
export type SkillMapSkill = {
  key: string;
  title: string;
  /** Null while the character's course is not published. */
  lesson: SkillMapLesson | null;
};
/** Branch tier; weights its skills in `level@2` (docs/product/skill-trees/README.md, 3.2). */
export type BranchDepth =
  "core" | "practice" | "advanced" | "reference" | "internals";

export const DEPTH_WEIGHTS: Record<BranchDepth, number> = {
  core: 3,
  practice: 2,
  advanced: 1.5,
  reference: 1,
  internals: 1
};

export type SkillMapBranch = {
  id: string;
  title: string;
  depth: BranchDepth;
  /** Branches that should be at least `unlockShare` mastered first. */
  requires: string[];
  skills: SkillMapSkill[];
};
/** A milestone badge: active while every skill of its branches is active. */
export type CharacterAbility = { title: string; branches: string[] };

export type Character = {
  slug: string;
  name: string;
  role: string;
  summary: string;
  accent: string;
  published: boolean;
  abilities: CharacterAbility[];
  branches: SkillMapBranch[];
};
export type SkillMap = {
  version: 1;
  /** Share of a required branch that must be active before a branch opens. */
  unlockShare: number;
  maxLevel: number;
  characters: Character[];
};

export const SKILL_MAP = data as SkillMap;

export function findCharacter(
  slug: string,
  map: SkillMap = SKILL_MAP
): Character | undefined {
  return map.characters.find((c) => c.slug === slug);
}

/**
 * The learner's confirmations of one skill: UTC days with passing Evidence (API, the latest 30)
 * and, when the API sent it, `skill-freshness@1` computed over the whole history (ADR-0076).
 */
export type SkillRecord = {
  confirmedDays: readonly string[];
  freshness?: FreshnessState | undefined;
};
export type RecordsByKey = ReadonlyMap<string, SkillRecord>;

/**
 * `locked`: a required branch is not active enough, so the skill cannot be confirmed yet (it can
 * still be studied). `open`: ready to confirm. Then the freshness states of `skill-freshness@1`.
 */
export type SkillState = "locked" | "open" | Exclude<Freshness, "unconfirmed">;

export type SkillProgress = {
  skill: SkillMapSkill;
  state: SkillState;
  freshness: FreshnessState;
};

export type BranchProgress = {
  branch: SkillMapBranch;
  unlocked: boolean;
  active: number;
  skills: SkillProgress[];
};

export const RANKS = [
  { from: 0, title: "Новичок" },
  { from: 20, title: "Ученик" },
  { from: 40, title: "Практик" },
  { from: 60, title: "Мастер" },
  { from: 80, title: "Эксперт" },
  { from: 95, title: "Легенда" }
] as const;

export function rankOf(level: number): string {
  let title: string = RANKS[0].title;
  for (const rank of RANKS) if (level >= rank.from) title = rank.title;
  return title;
}

export type AbilityProgress = {
  ability: CharacterAbility;
  active: boolean;
  activeSkills: number;
  totalSkills: number;
};

export type CharacterProgress = {
  character: Character;
  /**
   * `level@2`: 0…maxLevel by the weighted share of active skills (core counts three times as
   * much as reference). Falls when skills are forgotten.
   */
  level: number;
  maxLevel: number;
  rank: string;
  /** Never decreases: 100 for a first confirmation, 25 for each spaced repeat. */
  xp: number;
  active: number;
  fading: number;
  forgotten: number;
  total: number;
  branches: BranchProgress[];
  abilities: AbilityProgress[];
  /**
   * What to do next: repeat a fading skill first, then recall a forgotten one, then confirm the
   * first open skill.
   */
  next: {
    action: "repeat" | "recall" | "confirm";
    skill: SkillMapSkill;
  } | null;
};

const NO_RECORD: SkillRecord = { confirmedDays: [] };

export function characterProgress(
  character: Character,
  records: RecordsByKey,
  today: string,
  map: SkillMap = SKILL_MAP
): CharacterProgress {
  const freshnessOf = (key: string) => {
    const record = records.get(key) ?? NO_RECORD;
    return record.freshness ?? skillFreshness(record.confirmedDays, today);
  };
  const branchById = new Map(
    map.characters.flatMap((c) => c.branches.map((b) => [b.id, b] as const))
  );
  const activeShare = (branch: SkillMapBranch) =>
    branch.skills.length === 0
      ? 1
      : branch.skills.filter((s) => isActive(freshnessOf(s.key).state)).length /
        branch.skills.length;

  const branches = character.branches.map((branch): BranchProgress => {
    const unlocked = branch.requires.every((id) => {
      const required = branchById.get(id);
      return required === undefined || activeShare(required) >= map.unlockShare;
    });
    const skills = branch.skills.map((skill): SkillProgress => {
      const freshness = freshnessOf(skill.key);
      const state: SkillState =
        freshness.state !== "unconfirmed"
          ? freshness.state
          : unlocked
            ? "open"
            : "locked";
      return { skill, state, freshness };
    });
    return {
      branch,
      unlocked,
      active: skills.filter((s) => isActive(s.freshness.state)).length,
      skills
    };
  });

  const all = branches.flatMap((b) => b.skills);
  const total = all.length;
  const active = all.filter((s) => isActive(s.freshness.state)).length;
  const weightOf = (b: BranchProgress) => DEPTH_WEIGHTS[b.branch.depth];
  const totalWeight = branches.reduce(
    (sum, b) => sum + weightOf(b) * b.skills.length,
    0
  );
  const activeWeight = branches.reduce(
    (sum, b) => sum + weightOf(b) * b.active,
    0
  );
  const level =
    totalWeight === 0
      ? 0
      : Math.floor((activeWeight / totalWeight) * map.maxLevel + 1e-9);
  const byBranch = new Map(branches.map((b) => [b.branch.id, b] as const));
  const abilities = character.abilities.map((ability): AbilityProgress => {
    const parts = ability.branches
      .map((id) => byBranch.get(id))
      .filter((b): b is BranchProgress => b !== undefined);
    const totalSkills = parts.reduce((sum, b) => sum + b.skills.length, 0);
    const activeSkills = parts.reduce((sum, b) => sum + b.active, 0);
    return {
      ability,
      active: totalSkills > 0 && activeSkills === totalSkills,
      activeSkills,
      totalSkills
    };
  });
  const xp = character.branches
    .flatMap((b) => b.skills)
    .reduce((sum, skill) => {
      const n = new Set((records.get(skill.key) ?? NO_RECORD).confirmedDays)
        .size;
      return sum + (n === 0 ? 0 : 100 + 25 * (n - 1));
    }, 0);
  const find = (state: SkillState) => all.find((s) => s.state === state)?.skill;
  const repeat = find("fading");
  const recall = find("forgotten");
  const confirm = find("open");
  const next = repeat
    ? { action: "repeat" as const, skill: repeat }
    : recall
      ? { action: "recall" as const, skill: recall }
      : confirm
        ? { action: "confirm" as const, skill: confirm }
        : null;
  return {
    character,
    level,
    maxLevel: map.maxLevel,
    rank: rankOf(level),
    xp,
    active,
    fading: all.filter((s) => s.state === "fading").length,
    forgotten: all.filter((s) => s.state === "forgotten").length,
    total,
    branches,
    abilities,
    next
  };
}

/** Characters whose branches this character's branches require, in map order. */
export function requiredCharacters(
  character: Character,
  map: SkillMap = SKILL_MAP
): Character[] {
  const owner = new Map(
    map.characters.flatMap((c) => c.branches.map((b) => [b.id, c] as const))
  );
  const needed = new Set(
    character.branches
      .flatMap((b) => b.requires)
      .map((id) => owner.get(id))
      .filter(
        (c): c is Character => c !== undefined && c.slug !== character.slug
      )
  );
  return map.characters.filter((c) => needed.has(c));
}
