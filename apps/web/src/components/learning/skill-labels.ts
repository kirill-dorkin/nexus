import type { LearnerSkillProgress } from "@platform/contracts";

/**
 * A skill counts as mastered from this score on. It mirrors the mastery target
 * of the course readiness policy (`course-readiness.policy.ts` in the API).
 */
export const MASTERED_SCORE = 0.8;

export function masteryPercent(score: number) {
  return Math.round(score * 100);
}

/** Learner-facing state of one skill, without technical terms. */
export function skillStateLabel(skill: LearnerSkillProgress) {
  if (skill.state === "unobserved") return "Ещё не проверяли";
  if (skill.state === "observed_unscored") return "Начали";
  return `Освоено на ${masteryPercent(skill.masteryScore)} %`;
}

export function masteredSkillCount(skills: readonly LearnerSkillProgress[]) {
  return skills.filter(
    (skill) =>
      skill.state === "assessed" && skill.masteryScore >= MASTERED_SCORE
  ).length;
}
