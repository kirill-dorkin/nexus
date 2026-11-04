import data from "./skill-map.json";

/**
 * The skill map (ADR-0074): characters a learner levels up, each a set of the organization's
 * skills grouped into branches. Built from course manifests by docs/examples/skill-map/build.mjs.
 * It is presentation only: progress is read from the learner's Mastery, and "locked" is advice,
 * never an access rule (Enrollment and Entitlement still decide access).
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
  unlockShare: number;
  masteredScore: number;
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

/** The learner's Mastery of one skill, as the API reports it; absent means no Evidence yet. */
export type SkillMastery = {
  masteryScore: number | null;
  evidenceCount: number;
};
export type MasteryByKey = ReadonlyMap<string, SkillMastery>;

export type SkillState = "locked" | "open" | "progress" | "mastered";

export type BranchProgress = {
  branch: SkillMapBranch;
  unlocked: boolean;
  mastered: number;
  states: SkillState[];
};

export type CharacterProgress = {
  character: Character;
  level: number;
  maxLevel: number;
  /** Sum of mastery scores × 100. */
  xp: number;
  maxXp: number;
  mastered: number;
  total: number;
  /** Mastered skills still needed to reach the next level; 0 at the top. */
  toNextLevel: number;
  branches: BranchProgress[];
  /** First skill to learn: not mastered, in the first unlocked branch with work left. */
  next: { branch: SkillMapBranch; skill: SkillMapSkill } | null;
};

const isMastered = (m: SkillMastery | undefined, target: number) =>
  m?.masteryScore != null && m.masteryScore >= target;

/** Share of a branch's skills the learner has mastered. */
function branchShare(
  branch: SkillMapBranch,
  mastery: MasteryByKey,
  target: number
) {
  const done = branch.skills.filter((s) =>
    isMastered(mastery.get(s.key), target)
  ).length;
  return branch.skills.length === 0 ? 1 : done / branch.skills.length;
}

export function characterProgress(
  character: Character,
  mastery: MasteryByKey,
  map: SkillMap = SKILL_MAP
): CharacterProgress {
  const branchById = new Map(
    map.characters.flatMap((c) => c.branches.map((b) => [b.id, b] as const))
  );
  const branches = character.branches.map((branch): BranchProgress => {
    const unlocked = branch.requires.every((id) => {
      const required = branchById.get(id);
      return (
        required === undefined ||
        branchShare(required, mastery, map.masteredScore) >= map.unlockShare
      );
    });
    const states = branch.skills.map((skill): SkillState => {
      const m = mastery.get(skill.key);
      if (isMastered(m, map.masteredScore)) return "mastered";
      if (m !== undefined && m.evidenceCount > 0) return "progress";
      return unlocked ? "open" : "locked";
    });
    return {
      branch,
      unlocked,
      mastered: states.filter((s) => s === "mastered").length,
      states
    };
  });
  const skills = character.branches.flatMap((b) => b.skills);
  const total = skills.length;
  const mastered = branches.reduce((sum, b) => sum + b.mastered, 0);
  const xp = Math.round(
    skills.reduce(
      (sum, s) => sum + (mastery.get(s.key)?.masteryScore ?? 0),
      0
    ) * 100
  );
  const level =
    total === 0 ? 0 : Math.floor((mastered / total) * map.maxLevel + 1e-9);
  const toNextLevel =
    level >= map.maxLevel
      ? 0
      : Math.ceil(((level + 1) / map.maxLevel) * total - 1e-9) - mastered;
  let next: CharacterProgress["next"] = null;
  for (const progress of branches) {
    if (!progress.unlocked) continue;
    const skill = progress.branch.skills.find(
      (_, index) => progress.states[index] !== "mastered"
    );
    if (skill) {
      next = { branch: progress.branch, skill };
      break;
    }
  }
  return {
    character,
    level,
    maxLevel: map.maxLevel,
    xp,
    maxXp: total * 100,
    mastered,
    total,
    toNextLevel,
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
      .filter((c): c is Character => c !== undefined && c !== character)
  );
  return map.characters.filter((c) => needed.has(c));
}
