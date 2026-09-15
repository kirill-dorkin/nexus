import { describe, expect, it } from "vitest";
import type { GuidedBuildDefinition } from "./guided-build";
import {
  guidedBuildAuthoringSchema,
  guidedBuildDefinitionSchema,
  guidedBuildLearnerStateSchema,
  revealGuidedBuildHintRequestSchema,
  revealGuidedBuildSolutionRequestSchema
} from "./guided-build";

const activityVersionId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d11";
const transferActivityVersionId = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d12";
function definition(): GuidedBuildDefinition {
  return {
    schemaVersion: 1,
    activityVersionId,
    steps: [{ key: "layout-shell", title: "Build the layout shell", instructions: "Create the page structure before styling details.", hints: [{ key: "inspect-sections" }, { key: "group-landmarks" }] }],
    professionalSolution: { key: "professional-solution", title: "Professional solution" },
    transferActivityVersionId
  };
}

describe("guided build contracts", () => {
  it("accepts an immutable ActivityVersion-scoped Guided Build definition", () => {
    expect(guidedBuildDefinitionSchema.parse(definition())).toMatchObject({ schemaVersion: 1, activityVersionId, transferActivityVersionId });
  });
  it("accepts protected authoring material without placing it in learner state", () => {
    const authored = guidedBuildAuthoringSchema.parse({
      schemaVersion: 1,
      steps: [{ key: "layout-shell", title: "Build the layout shell", hints: [{ key: "inspect-sections", content: { blocks: [{ type: "text", text: "Inspect semantic landmarks." }] } }] }],
      professionalSolution: { key: "professional-solution", title: "Professional solution", content: { blocks: [{ type: "code", language: "html", source: "<main />" }] } },
      transferActivityVersionId
    });
    expect(authored.steps[0]?.hints[0]?.content).toBeDefined();
  });
  it("rejects duplicate hint keys across the definition", () => {
    const duplicate = definition();
    duplicate.steps.push({ key: "responsive-pass", title: "Make it responsive", instructions: null, hints: [{ key: "inspect-sections" }] });
    expect(guidedBuildDefinitionSchema.safeParse(duplicate).success).toBe(false);
  });
  it("rejects using the same ActivityVersion as its own transfer challenge", () => {
    expect(guidedBuildDefinitionSchema.safeParse({ ...definition(), transferActivityVersionId: activityVersionId }).success).toBe(false);
  });
  it("lets the client request only the next hint for a step and requires retry identity", () => {
    expect(revealGuidedBuildHintRequestSchema.parse({ stepKey: "layout-shell", idempotencyKey: "hint-request-1" })).toEqual({ stepKey: "layout-shell", idempotencyKey: "hint-request-1" });
    expect(revealGuidedBuildHintRequestSchema.safeParse({ stepKey: "layout-shell", hintKey: "group-landmarks", idempotencyKey: "hint-request-2" }).success).toBe(false);
    expect(revealGuidedBuildHintRequestSchema.safeParse({ stepKey: "layout-shell" }).success).toBe(false);
    expect(revealGuidedBuildSolutionRequestSchema.safeParse({ idempotencyKey: "solution-request-1" }).success).toBe(true);
  });
  it("keeps protected hint and solution content out of learner state", () => {
    const state = guidedBuildLearnerStateSchema.parse({ organizationId: activityVersionId, enrollmentId: activityVersionId, attemptId: activityVersionId, activityVersionId, phase: "working", workAssistance: "unassisted", steps: [{ stepKey: "layout-shell", revealedHintKeys: [], totalHintCount: 2, nextHintKey: "inspect-sections", canRevealNextHint: true }], solution: { key: "professional-solution", status: "locked", canCompare: false }, transfer: { activityVersionId: transferActivityVersionId, status: "locked" } });
    expect(state).not.toHaveProperty("professionalSolution");
    expect(state.steps[0]).not.toHaveProperty("hints");
  });
  it("rejects contradictory phase and solution state", () => {
    expect(guidedBuildLearnerStateSchema.safeParse({ organizationId: activityVersionId, enrollmentId: activityVersionId, attemptId: activityVersionId, activityVersionId, phase: "working", workAssistance: "unassisted", steps: [], solution: { key: "professional-solution", status: "revealed", canCompare: true }, transfer: null }).success).toBe(false);
  });
});
