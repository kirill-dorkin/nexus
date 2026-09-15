import type {
  GuidedBuildDefinition,
  GuidedBuildExposure,
  GuidedBuildLearnerState
} from "@platform/contracts";

export type GuidedBuildStateFacts = Readonly<{
  organizationId: string;
  enrollmentId: string;
  attemptId: string;
  definition: GuidedBuildDefinition;
  submissionExists: boolean;
  exposures: readonly GuidedBuildExposure[];
}>;

function assertExposureContext(
  facts: GuidedBuildStateFacts,
  exposure: GuidedBuildExposure
): void {
  if (
    exposure.organizationId !== facts.organizationId ||
    exposure.enrollmentId !== facts.enrollmentId ||
    exposure.attemptId !== facts.attemptId ||
    exposure.activityVersionId !== facts.definition.activityVersionId
  ) {
    throw new Error("Guided Build exposure does not belong to this Attempt context.");
  }
}

export function deriveGuidedBuildLearnerState(
  facts: GuidedBuildStateFacts
): GuidedBuildLearnerState {
  const hintsByStep = new Map<string, Set<string>>();
  const seenExposureIds = new Set<string>();
  let solutionExposure: Extract<
    GuidedBuildExposure,
    { kind: "professional_solution" }
  > | null = null;

  for (const exposure of facts.exposures) {
    assertExposureContext(facts, exposure);

    if (seenExposureIds.has(exposure.id)) {
      throw new Error("Guided Build exposure ids must be unique.");
    }
    seenExposureIds.add(exposure.id);

    if (exposure.kind === "professional_solution") {
      if (solutionExposure !== null) {
        throw new Error("Professional solution exposure is idempotent per Attempt.");
      }
      if (exposure.solutionKey !== facts.definition.professionalSolution.key) {
        throw new Error("Professional solution exposure does not match the definition.");
      }
      solutionExposure = exposure;
      continue;
    }

    const step = facts.definition.steps.find(
      (candidate) => candidate.key === exposure.stepKey
    );
    if (step === undefined) {
      throw new Error("Hint exposure references an unknown Guided Build step.");
    }
    if (!step.hints.some((hint) => hint.key === exposure.hintKey)) {
      throw new Error("Hint exposure does not belong to its Guided Build step.");
    }

    const revealed = hintsByStep.get(step.key) ?? new Set<string>();
    if (revealed.has(exposure.hintKey)) {
      throw new Error("Hint exposure is idempotent per Attempt and hint.");
    }
    revealed.add(exposure.hintKey);
    hintsByStep.set(step.key, revealed);
  }

  if (solutionExposure !== null && !facts.submissionExists) {
    throw new Error("Professional solution exposure requires a Submission.");
  }

  const steps = facts.definition.steps.map((step) => {
    const revealed = hintsByStep.get(step.key) ?? new Set<string>();
    const revealedHintKeys = step.hints
      .filter((hint) => revealed.has(hint.key))
      .map((hint) => hint.key);

    if (revealedHintKeys.length !== revealed.size) {
      throw new Error("Guided Build hint exposure contains an unknown hint.");
    }

    const expectedPrefix = step.hints
      .slice(0, revealedHintKeys.length)
      .map((hint) => hint.key);
    if (
      expectedPrefix.length !== revealedHintKeys.length ||
      expectedPrefix.some((key, index) => key !== revealedHintKeys[index])
    ) {
      throw new Error("Guided Build hints must be revealed in ladder order.");
    }

    const nextHintKey = step.hints[revealedHintKeys.length]?.key ?? null;

    return {
      stepKey: step.key,
      revealedHintKeys,
      totalHintCount: step.hints.length,
      nextHintKey,
      canRevealNextHint: !facts.submissionExists && nextHintKey !== null
    };
  });

  const hintExposureCount = steps.reduce(
    (total, step) => total + step.revealedHintKeys.length,
    0
  );
  const solutionRevealed = solutionExposure !== null;

  return {
    organizationId: facts.organizationId,
    enrollmentId: facts.enrollmentId,
    attemptId: facts.attemptId,
    activityVersionId: facts.definition.activityVersionId,
    phase: solutionRevealed
      ? "reviewing"
      : facts.submissionExists
        ? "submitted"
        : "working",
    workAssistance: hintExposureCount > 0 ? "hint_assisted" : "unassisted",
    steps,
    solution: {
      key: facts.definition.professionalSolution.key,
      status: solutionRevealed
        ? "revealed"
        : facts.submissionExists
          ? "available"
          : "locked",
      canCompare: solutionRevealed
    },
    transfer:
      facts.definition.transferActivityVersionId === null
        ? null
        : {
            activityVersionId: facts.definition.transferActivityVersionId,
            status: facts.submissionExists ? "available" : "locked"
          }
  };
}
