import { describe, expect, it } from "vitest";

import {
  courseVersionActivitySchema,
  createAttemptRequestSchema,
  createCourseVersionActivityRequestSchema,
  createEvidenceRequestSchema,
  createSkillRequestSchema,
  createSubmissionRequestSchema,
  evidenceSchema,
  startAttemptRequestSchema,
  submissionSchema
} from "./index";

const skillId = "01994f13-8de0-7a11-8d5f-1e8c5526f001";
const organizationId = "01994f13-8de0-7a11-8d5f-1e8c5526f002";
const courseVersionId = "01994f13-8de0-7a11-8d5f-1e8c5526f003";
const activityId = "01994f13-8de0-7a11-8d5f-1e8c5526f004";
const activityVersionId = "01994f13-8de0-7a11-8d5f-1e8c5526f005";
const attemptId = "01994f13-8de0-7a11-8d5f-1e8c5526f006";
const submissionId = "01994f13-8de0-7a11-8d5f-1e8c5526f007";
const evidenceId = "01994f13-8de0-7a11-8d5f-1e8c5526f008";
const validationResultId = "01994f13-8de0-7a11-8d5f-1e8c5526f009";

describe("learning loop contracts", () => {
  it("keeps activity types package-extensible instead of hard-coding a curriculum", () => {
    expect(
      createCourseVersionActivityRequestSchema.parse({
        slug: "responsive-layout",
        activityType: "pern.code-project",
        title: "Build a responsive layout",
        skillIds: [skillId]
      }).activityType
    ).toBe("pern.code-project");
  });

  it("requires every attemptable activity to map to at least one stable skill", () => {
    expect(
      createCourseVersionActivityRequestSchema.safeParse({
        slug: "empty-skill-map",
        activityType: "practice",
        title: "No skill",
        skillIds: []
      }).success
    ).toBe(false);
  });

  it("separates starting an attempt from committing its immutable submission", () => {
    expect(startAttemptRequestSchema.parse({})).toEqual({});
    expect(startAttemptRequestSchema.safeParse({ payload: {} }).success).toBe(
      false
    );

    expect(
      createSubmissionRequestSchema.parse({
        payload: { answer: "grid-template-columns" }
      }).payload
    ).toEqual({ answer: "grid-template-columns" });

    expect(
      submissionSchema.parse({
        id: submissionId,
        organizationId,
        attemptId,
        payload: { answer: "grid-template-columns" },
        submittedByUserId: skillId,
        submittedAt: "2026-09-14T18:00:00.000Z"
      }).attemptId
    ).toBe(attemptId);
  });

  it("keeps the old atomic create-and-submit command during the transition window", () => {
    expect(
      createAttemptRequestSchema.parse({
        submission: { answer: "grid-template-columns" }
      }).submission
    ).toEqual({ answer: "grid-template-columns" });
  });

  it("accepts scored evidence and exposes explicit provenance", () => {
    expect(
      createEvidenceRequestSchema.parse({
        skillId,
        kind: "manual-review",
        score: 0.85,
        payload: { note: "Meets the rubric" }
      }).score
    ).toBe(0.85);

    const validationEvidence = {
      id: evidenceId,
      organizationId,
      attemptId,
      submissionId,
      skillId,
      kind: "foundation.structured-practice",
      score: 0.85,
      payload: { outcome: "passed" },
      recordedByUserId: null,
      sourceType: "validation_result" as const,
      sourceValidationResultId: validationResultId,
      createdAt: "2026-09-15T05:00:00.000Z"
    };

    expect(
      evidenceSchema.parse(validationEvidence).sourceValidationResultId
    ).toBe(validationResultId);
    expect(
      evidenceSchema.safeParse({
        ...validationEvidence,
        recordedByUserId: skillId
      }).success
    ).toBe(false);
    expect(
      evidenceSchema.safeParse({
        ...validationEvidence,
        sourceType: "manual"
      }).success
    ).toBe(false);
  });

  it("represents the exact immutable activity snapshot used by attempts", () => {
    expect(
      courseVersionActivitySchema.parse({
        id: activityVersionId,
        organizationId,
        courseVersionId,
        activityId,
        slug: "responsive-layout",
        activityType: "practice",
        title: "Responsive layout",
        instructions: null,
        config: {},
        position: 0,
        skillIds: [skillId]
      }).id
    ).toBe(activityVersionId);
  });

  it("validates stable skill creation independently from course versions", () => {
    expect(
      createSkillRequestSchema.parse({
        key: "css-grid",
        title: "CSS Grid"
      }).key
    ).toBe("css-grid");
  });
});
