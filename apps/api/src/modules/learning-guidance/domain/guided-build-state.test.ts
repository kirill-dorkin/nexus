import type {
  GuidedBuildDefinition,
  GuidedBuildExposure
} from "@platform/contracts";
import { describe, expect, it } from "vitest";

import { deriveGuidedBuildLearnerState } from "./guided-build-state";

const organizationId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d11";
const enrollmentId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d12";
const attemptId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d13";
const activityVersionId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d14";
const transferActivityVersionId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d15";

const definition: GuidedBuildDefinition = {
  schemaVersion: 1,
  activityVersionId,
  steps: [
    {
      key: "layout-shell",
      title: "Build the shell",
      instructions: null,
      hints: [{ key: "inspect-sections" }, { key: "group-landmarks" }]
    },
    {
      key: "responsive-pass",
      title: "Make it responsive",
      instructions: null,
      hints: [{ key: "start-mobile" }]
    }
  ],
  professionalSolution: {
    key: "professional-solution",
    title: "Professional solution"
  },
  transferActivityVersionId
};

function hintExposure(
  id: string,
  stepKey: string,
  hintKey: string
): GuidedBuildExposure {
  return {
    id,
    organizationId,
    enrollmentId,
    attemptId,
    activityVersionId,
    kind: "hint",
    stepKey,
    hintKey,
    revealedAt: "2026-09-15T12:00:00.000Z"
  };
}

function solutionExposure(): GuidedBuildExposure {
  return {
    id: "018f6f8c-2fd0-7a32-8f8b-42b0f5519d21",
    organizationId,
    enrollmentId,
    attemptId,
    activityVersionId,
    kind: "professional_solution",
    solutionKey: "professional-solution",
    revealedAt: "2026-09-15T12:05:00.000Z"
  };
}

function derive(
  submissionExists: boolean,
  exposures: readonly GuidedBuildExposure[] = []
) {
  return deriveGuidedBuildLearnerState({
    organizationId,
    enrollmentId,
    attemptId,
    definition,
    submissionExists,
    exposures
  });
}

describe("Guided Build state derivation", () => {
  it("starts working unassisted with only the first hint in each ladder available", () => {
    const state = derive(false);

    expect(state.phase).toBe("working");
    expect(state.workAssistance).toBe("unassisted");
    expect(state.solution).toEqual({
      key: "professional-solution",
      status: "locked",
      canCompare: false
    });
    expect(state.transfer).toEqual({
      activityVersionId: transferActivityVersionId,
      status: "locked"
    });
    expect(state.steps).toEqual([
      {
        stepKey: "layout-shell",
        revealedHintKeys: [],
        totalHintCount: 2,
        nextHintKey: "inspect-sections",
        canRevealNextHint: true
      },
      {
        stepKey: "responsive-pass",
        revealedHintKeys: [],
        totalHintCount: 1,
        nextHintKey: "start-mobile",
        canRevealNextHint: true
      }
    ]);
  });

  it("marks the work hint-assisted and advances only to the next hint", () => {
    const state = derive(false, [
      hintExposure(
        "018f6f8c-2fd0-7a32-8f8b-42b0f5519d20",
        "layout-shell",
        "inspect-sections"
      )
    ]);

    expect(state.workAssistance).toBe("hint_assisted");
    expect(state.steps[0]).toMatchObject({
      revealedHintKeys: ["inspect-sections"],
      nextHintKey: "group-landmarks",
      canRevealNextHint: true
    });
  });

  it("rejects skipped hints even when every referenced key exists", () => {
    expect(() =>
      derive(false, [
        hintExposure(
          "018f6f8c-2fd0-7a32-8f8b-42b0f5519d20",
          "layout-shell",
          "group-landmarks"
        )
      ])
    ).toThrow("Guided Build hints must be revealed in ladder order.");
  });

  it("locks new hints after Submission and unlocks solution plus transfer", () => {
    const state = derive(true, [
      hintExposure(
        "018f6f8c-2fd0-7a32-8f8b-42b0f5519d20",
        "layout-shell",
        "inspect-sections"
      )
    ]);

    expect(state.phase).toBe("submitted");
    expect(state.workAssistance).toBe("hint_assisted");
    expect(state.steps.every((step) => !step.canRevealNextHint)).toBe(true);
    expect(state.solution.status).toBe("available");
    expect(state.solution.canCompare).toBe(false);
    expect(state.transfer?.status).toBe("available");
  });

  it("rejects professional solution exposure before Submission", () => {
    expect(() => derive(false, [solutionExposure()])).toThrow(
      "Professional solution exposure requires a Submission."
    );
  });

  it("enters reviewing only after solution exposure and enables compare", () => {
    const state = derive(true, [solutionExposure()]);

    expect(state.phase).toBe("reviewing");
    expect(state.workAssistance).toBe("unassisted");
    expect(state.solution).toEqual({
      key: "professional-solution",
      status: "revealed",
      canCompare: true
    });
    expect(state.transfer?.status).toBe("available");
  });

  it("rejects exposure facts from a different Attempt context", () => {
    const exposure = hintExposure(
      "018f6f8c-2fd0-7a32-8f8b-42b0f5519d20",
      "layout-shell",
      "inspect-sections"
    );

    expect(() =>
      deriveGuidedBuildLearnerState({
        organizationId,
        enrollmentId,
        attemptId: "018f6f8c-2fd0-7a32-8f8b-42b0f5519d99",
        definition,
        submissionExists: false,
        exposures: [exposure]
      })
    ).toThrow("Guided Build exposure does not belong to this Attempt context.");
  });
});
