import { describe, expect, it } from "vitest";

import {
  guidedBuildDefinitionSchema,
  guidedBuildLearnerStateSchema,
  revealGuidedBuildHintRequestSchema
} from "./guided-build";

const activityVersionId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d11";
const transferActivityVersionId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d12";

function definition() {
  return {
    schemaVersion: 1 as const,
    activityVersionId,
    steps: [
      {
        key: "layout-shell",
        title: "Build the layout shell",
        instructions: "Create the page structure before styling details.",
        hints: [{ key: "inspect-sections" }, { key: "group-landmarks" }]
      }
    ],
    professionalSolution: {
      key: "professional-solution",
      title: "Professional solution"
    },
    transferActivityVersionId
  };
}

describe("guided build contracts", () => {
  it("accepts an immutable ActivityVersion-scoped Guided Build definition", () => {
    expect(guidedBuildDefinitionSchema.parse(definition())).toMatchObject({
      schemaVersion: 1,
      activityVersionId,
      transferActivityVersionId
    });
  });

  it("rejects duplicate hint keys across the definition", () => {
    const duplicate = definition();
    duplicate.steps.push({
      key: "responsive-pass",
      title: "Make it responsive",
      instructions: null,
      hints: [{ key: "inspect-sections" }]
    });

    expect(guidedBuildDefinitionSchema.safeParse(duplicate).success).toBe(false);
  });

  it("rejects using the same ActivityVersion as its own transfer challenge", () => {
    expect(
      guidedBuildDefinitionSchema.safeParse({
        ...definition(),
        transferActivityVersionId: activityVersionId
      }).success
    ).toBe(false);
  });

  it("lets the client request only the next hint for a step, not an arbitrary hint key", () => {
    expect(
      revealGuidedBuildHintRequestSchema.parse({ stepKey: "layout-shell" })
    ).toEqual({ stepKey: "layout-shell" });

    expect(
      revealGuidedBuildHintRequestSchema.safeParse({
        stepKey: "layout-shell",
        hintKey: "group-landmarks"
      }).success
    ).toBe(false);
  });

  it("keeps protected hint and solution content out of learner state", () => {
    const state = guidedBuildLearnerStateSchema.parse({
      organizationId: activityVersionId,
      enrollmentId: activityVersionId,
      attemptId: activityVersionId,
      activityVersionId,
      phase: "working",
      workAssistance: "unassisted",
      steps: [
        {
          stepKey: "layout-shell",
          revealedHintKeys: [],
          totalHintCount: 2,
          nextHintKey: "inspect-sections",
          canRevealNextHint: true
        }
      ],
      solution: {
        key: "professional-solution",
        status: "locked",
        canCompare: false
      },
      transfer: {
        activityVersionId: transferActivityVersionId,
        status: "locked"
      }
    });

    expect(state).not.toHaveProperty("professionalSolution");
    expect(state.steps[0]).not.toHaveProperty("hints");
  });
});
