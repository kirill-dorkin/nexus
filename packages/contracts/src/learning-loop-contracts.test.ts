import { describe, expect, it } from "vitest";

import {
  courseVersionActivitySchema,
  createAttemptRequestSchema,
  createCourseVersionActivityRequestSchema,
  createEvidenceRequestSchema,
  createSkillRequestSchema
} from "./index";

const skillId = "01994f13-8de0-7a11-8d5f-1e8c5526f001";
const organizationId = "01994f13-8de0-7a11-8d5f-1e8c5526f002";
const courseVersionId = "01994f13-8de0-7a11-8d5f-1e8c5526f003";
const activityId = "01994f13-8de0-7a11-8d5f-1e8c5526f004";
const activityVersionId = "01994f13-8de0-7a11-8d5f-1e8c5526f005";

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

  it("accepts compact structured attempts and scored evidence", () => {
    expect(
      createAttemptRequestSchema.parse({
        submission: { answer: "grid-template-columns" }
      }).submission
    ).toEqual({ answer: "grid-template-columns" });

    expect(
      createEvidenceRequestSchema.parse({
        skillId,
        kind: "manual-review",
        score: 0.85,
        payload: { note: "Meets the rubric" }
      }).score
    ).toBe(0.85);
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
