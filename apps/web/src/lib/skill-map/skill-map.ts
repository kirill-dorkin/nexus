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
export type SkillMapBranch = {
  id: string;
  title: string;
  /** Branches that should be at least `unlockShare` mastered first. */
  requires: string[];
  skills: SkillMapSkill[];
};
export type Character = {
  slug: string;
  name: string;
  role: string;
  summary: string;
  accent: string;
  published: boolean;
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

export type CharacterProgress = {
  character: Character;
  /** 0…maxLevel: share of active skills. Falls when skills are forgotten. */
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
  // A branch of an unpublished character cannot be studied yet, so it does not lock anything.
  const unpublished = new Set(
    map.characters
      .filter((c) => !c.published)
      .flatMap((c) => c.branches.map((b) => b.id))
  );
  const activeShare = (branch: SkillMapBranch) =>
    branch.skills.length === 0
      ? 1
      : branch.skills.filter((s) => isActive(freshnessOf(s.key).state)).length /
        branch.skills.length;

  const branches = character.branches.map((branch): BranchProgress => {
    const unlocked = branch.requires.every((id) => {
      const required = branchById.get(id);
      return (
        required === undefined ||
        (unpublished.has(id) && character.published) ||
        activeShare(required) >= map.unlockShare
      );
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
  const level =
    total === 0 ? 0 : Math.floor((active / total) * map.maxLevel + 1e-9);
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
