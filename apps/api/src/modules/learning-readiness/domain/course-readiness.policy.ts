const DAY_MS = 24 * 60 * 60 * 1_000;

export const COURSE_PROGRESSION_READINESS_POLICY = Object.freeze({
  key: "course-progression-readiness",
  version: 1,
  masteryAlgorithm: Object.freeze({
    key: "mean-scored-evidence",
    version: 1
  }),
  masteryTarget: 0.8,
  minimumScoredAttemptsPerSkill: 2,
  evidenceFreshnessDays: 7
});

export type CourseReadinessSkill = Readonly<{
  skillId: string;
  title: string;
  position: number;
}>;

export type CourseReadinessMastery = Readonly<{
  skillId: string;
  algorithmKey: string;
  algorithmVersion: number;
  masteryScore: number | null;
  scoredEvidenceCount: number;
}>;

export type CourseReadinessEvidenceSummary = Readonly<{
  skillId: string;
  scoredAttemptCount: number;
  lastScoredEvidenceAt: string;
}>;

export type CourseReadinessSignal = Readonly<{
  skillId: string;
  consecutiveFailureCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
}>;

type InsufficientDecision = Readonly<{
  skillId: string;
  title: string;
  position: number;
  status: "insufficient_evidence";
  masteryScore: number | null;
  scoredAttemptCount: number;
  lastScoredEvidenceAt: string | null;
  freshUntil: string | null;
  reasons: readonly [
    Readonly<{
      code: "insufficient_scored_attempts";
      observedScoredAttemptCount: number;
      requiredScoredAttemptCount: number;
    }>
  ];
}>;

type NotReadyReason =
  | Readonly<{
      code: "mastery_below_target";
      masteryScore: number;
      targetMasteryScore: number;
    }>
  | Readonly<{
      code: "scored_evidence_stale";
      lastScoredEvidenceAt: string;
      freshUntil: string;
    }>
  | Readonly<{
      code: "active_repeated_trusted_failure";
      consecutiveFailureCount: number;
      firstObservedAt: string;
      lastObservedAt: string;
    }>;

type NotReadyDecision = Readonly<{
  skillId: string;
  title: string;
  position: number;
  status: "not_ready";
  masteryScore: number;
  scoredAttemptCount: number;
  lastScoredEvidenceAt: string;
  freshUntil: string;
  reasons: readonly NotReadyReason[];
}>;

type ReadyDecision = Readonly<{
  skillId: string;
  title: string;
  position: number;
  status: "ready";
  masteryScore: number;
  scoredAttemptCount: number;
  lastScoredEvidenceAt: string;
  freshUntil: string;
  reasons: readonly [];
}>;

export type CourseReadinessSkillDecision =
  InsufficientDecision | NotReadyDecision | ReadyDecision;

export type CourseReadinessPolicyDecision = Readonly<{
  status: "insufficient_evidence" | "not_ready" | "ready";
  readyUntil: string | null;
  skills: readonly CourseReadinessSkillDecision[];
}>;

export type CourseReadinessPolicyInput = Readonly<{
  evaluatedAt: string;
  skills: readonly CourseReadinessSkill[];
  mastery: readonly CourseReadinessMastery[];
  evidence: readonly CourseReadinessEvidenceSummary[];
  signals: readonly CourseReadinessSignal[];
}>;

function parseInstant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid ISO-8601 instant.`);
  }
  return parsed;
}

function uniqueBySkillId<T extends Readonly<{ skillId: string }>>(
  values: readonly T[],
  label: string
): Map<string, T> {
  const bySkillId = new Map<string, T>();
  for (const value of values) {
    if (bySkillId.has(value.skillId)) {
      throw new Error(`${label} contains duplicate skill ${value.skillId}.`);
    }
    bySkillId.set(value.skillId, value);
  }
  return bySkillId;
}

function compareSkills(
  left: CourseReadinessSkill,
  right: CourseReadinessSkill
): number {
  return (
    left.position - right.position || left.skillId.localeCompare(right.skillId)
  );
}

function computeFreshUntil(lastScoredEvidenceAt: string): string {
  const lastScoredEvidenceAtMs = parseInstant(
    lastScoredEvidenceAt,
    "lastScoredEvidenceAt"
  );
  return new Date(
    lastScoredEvidenceAtMs +
      COURSE_PROGRESSION_READINESS_POLICY.evidenceFreshnessDays * DAY_MS
  ).toISOString();
}

export function courseProgressionReadinessV1(
  input: CourseReadinessPolicyInput
): CourseReadinessPolicyDecision {
  if (input.skills.length === 0) {
    throw new Error(
      "Course readiness requires at least one CourseVersion skill."
    );
  }

  const evaluatedAtMs = parseInstant(input.evaluatedAt, "evaluatedAt");
  const skillIds = new Set(input.skills.map((skill) => skill.skillId));
  if (skillIds.size !== input.skills.length) {
    throw new Error(
      "Course readiness contains duplicate CourseVersion skills."
    );
  }

  const masteryBySkillId = uniqueBySkillId(input.mastery, "Mastery input");
  const evidenceBySkillId = uniqueBySkillId(input.evidence, "Evidence input");
  const signalBySkillId = uniqueBySkillId(input.signals, "Signal input");

  for (const referencedSkillId of [
    ...masteryBySkillId.keys(),
    ...evidenceBySkillId.keys(),
    ...signalBySkillId.keys()
  ]) {
    if (!skillIds.has(referencedSkillId)) {
      throw new Error(
        `Course readiness input references skill ${referencedSkillId} outside the CourseVersion.`
      );
    }
  }

  const decisions: CourseReadinessSkillDecision[] = [...input.skills]
    .sort(compareSkills)
    .map((skill) => {
      const mastery = masteryBySkillId.get(skill.skillId);
      const evidence = evidenceBySkillId.get(skill.skillId);
      const signal = signalBySkillId.get(skill.skillId);

      if (
        mastery !== undefined &&
        (mastery.algorithmKey !==
          COURSE_PROGRESSION_READINESS_POLICY.masteryAlgorithm.key ||
          mastery.algorithmVersion !==
            COURSE_PROGRESSION_READINESS_POLICY.masteryAlgorithm.version)
      ) {
        throw new Error(
          `Course readiness v1 requires ${COURSE_PROGRESSION_READINESS_POLICY.masteryAlgorithm.key}@${COURSE_PROGRESSION_READINESS_POLICY.masteryAlgorithm.version} for skill ${skill.skillId}.`
        );
      }

      if (evidence !== undefined && mastery === undefined) {
        throw new Error(
          `Scored Evidence for skill ${skill.skillId} requires a Mastery projection.`
        );
      }

      if (
        mastery !== undefined &&
        mastery.scoredEvidenceCount > 0 &&
        evidence === undefined
      ) {
        throw new Error(
          `Mastery for skill ${skill.skillId} reports scored Evidence without a readiness Evidence summary.`
        );
      }

      if (
        mastery !== undefined &&
        evidence !== undefined &&
        evidence.scoredAttemptCount > mastery.scoredEvidenceCount
      ) {
        throw new Error(
          `Distinct scored Attempts exceed scored Evidence for skill ${skill.skillId}.`
        );
      }

      const scoredAttemptCount = evidence?.scoredAttemptCount ?? 0;
      const lastScoredEvidenceAt = evidence?.lastScoredEvidenceAt ?? null;
      const freshUntil =
        lastScoredEvidenceAt === null
          ? null
          : computeFreshUntil(lastScoredEvidenceAt);

      if (
        scoredAttemptCount <
        COURSE_PROGRESSION_READINESS_POLICY.minimumScoredAttemptsPerSkill
      ) {
        return {
          skillId: skill.skillId,
          title: skill.title,
          position: skill.position,
          status: "insufficient_evidence",
          masteryScore: mastery?.masteryScore ?? null,
          scoredAttemptCount,
          lastScoredEvidenceAt,
          freshUntil,
          reasons: [
            {
              code: "insufficient_scored_attempts",
              observedScoredAttemptCount: scoredAttemptCount,
              requiredScoredAttemptCount:
                COURSE_PROGRESSION_READINESS_POLICY.minimumScoredAttemptsPerSkill
            }
          ]
        };
      }

      if (mastery === undefined || mastery.masteryScore === null) {
        throw new Error(
          `Sufficient scored Attempts for skill ${skill.skillId} require assessed Mastery.`
        );
      }
      if (lastScoredEvidenceAt === null || freshUntil === null) {
        throw new Error(
          `Sufficient scored Attempts for skill ${skill.skillId} require scored Evidence timestamps.`
        );
      }

      const reasons: NotReadyReason[] = [];

      if (
        mastery.masteryScore < COURSE_PROGRESSION_READINESS_POLICY.masteryTarget
      ) {
        reasons.push({
          code: "mastery_below_target",
          masteryScore: mastery.masteryScore,
          targetMasteryScore: COURSE_PROGRESSION_READINESS_POLICY.masteryTarget
        });
      }

      if (parseInstant(freshUntil, "freshUntil") <= evaluatedAtMs) {
        reasons.push({
          code: "scored_evidence_stale",
          lastScoredEvidenceAt,
          freshUntil
        });
      }

      if (signal !== undefined) {
        reasons.push({
          code: "active_repeated_trusted_failure",
          consecutiveFailureCount: signal.consecutiveFailureCount,
          firstObservedAt: signal.firstObservedAt,
          lastObservedAt: signal.lastObservedAt
        });
      }

      if (reasons.length > 0) {
        return {
          skillId: skill.skillId,
          title: skill.title,
          position: skill.position,
          status: "not_ready",
          masteryScore: mastery.masteryScore,
          scoredAttemptCount,
          lastScoredEvidenceAt,
          freshUntil,
          reasons
        };
      }

      return {
        skillId: skill.skillId,
        title: skill.title,
        position: skill.position,
        status: "ready",
        masteryScore: mastery.masteryScore,
        scoredAttemptCount,
        lastScoredEvidenceAt,
        freshUntil,
        reasons: []
      };
    });

  if (decisions.some((decision) => decision.status === "not_ready")) {
    return { status: "not_ready", readyUntil: null, skills: decisions };
  }

  if (
    decisions.some((decision) => decision.status === "insufficient_evidence")
  ) {
    return {
      status: "insufficient_evidence",
      readyUntil: null,
      skills: decisions
    };
  }

  const readyUntil = decisions
    .filter(
      (decision): decision is ReadyDecision => decision.status === "ready"
    )
    .map((decision) => decision.freshUntil)
    .sort(
      (left, right) =>
        parseInstant(left, "freshUntil") - parseInstant(right, "freshUntil")
    )[0];

  if (readyUntil === undefined) {
    throw new Error(
      "Ready course readiness unexpectedly has no readiness horizon."
    );
  }

  return { status: "ready", readyUntil, skills: decisions };
}
