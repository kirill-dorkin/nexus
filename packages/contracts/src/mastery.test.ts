import { describe, expect, it } from "vitest";

import {
  learnerSkillProgressReadModelSchema,
  learnerSkillProgressSchema,
  masteryProjectionSchema,
  masteryRecomputeResultSchema
} from "./mastery";

const uuid = "018f6f8c-2fd0-7a32-8f8b-42b0f5519d11";

describe("mastery contracts", () => {
  it("accepts a versioned scored projection", () => {
    expect(
      masteryProjectionSchema.parse({
        organizationId: uuid,
        userId: uuid,
        skillId: uuid,
        algorithmKey: "mean-scored-evidence",
        algorithmVersion: 1,
        masteryScore: 0.75,
        evidenceCount: 3,
        scoredEvidenceCount: 2,
        lastEvidenceAt: "2026-09-14T10:00:00.000Z",
        computedAt: "2026-09-14T10:00:01.000Z"
      })
    ).toMatchObject({
      algorithmKey: "mean-scored-evidence",
      masteryScore: 0.75,
      evidenceCount: 3,
      scoredEvidenceCount: 2
    });
  });

  it("keeps mastery unknown when evidence is present but unscored", () => {
    const projection = masteryProjectionSchema.parse({
      organizationId: uuid,
      userId: uuid,
      skillId: uuid,
      algorithmKey: "mean-scored-evidence",
      algorithmVersion: 1,
      masteryScore: null,
      evidenceCount: 1,
      scoredEvidenceCount: 0,
      lastEvidenceAt: "2026-09-14T10:00:00.000Z",
      computedAt: "2026-09-14T10:00:01.000Z"
    });

    expect(projection.masteryScore).toBeNull();
  });

  it("wraps a bounded learner recomputation result", () => {
    expect(
      masteryRecomputeResultSchema.parse({
        userId: uuid,
        projections: []
      })
    ).toEqual({ userId: uuid, projections: [] });
  });

  it("represents zero Evidence as explicitly unobserved", () => {
    expect(
      learnerSkillProgressSchema.parse({
        skillId: uuid,
        title: "Functions",
        description: null,
        position: 0,
        state: "unobserved",
        masteryScore: null,
        evidenceCount: 0,
        scoredEvidenceCount: 0,
        lastEvidenceAt: null
      })
    ).toMatchObject({
      state: "unobserved",
      masteryScore: null,
      evidenceCount: 0
    });
  });

  it("distinguishes observed unscored Evidence from assessed mastery", () => {
    const observed = learnerSkillProgressSchema.parse({
      skillId: uuid,
      title: "Functions",
      description: "Function fundamentals",
      position: 0,
      state: "observed_unscored",
      masteryScore: null,
      evidenceCount: 2,
      scoredEvidenceCount: 0,
      lastEvidenceAt: "2026-09-14T10:00:00.000Z"
    });
    const assessed = learnerSkillProgressSchema.parse({
      skillId: uuid,
      title: "Functions",
      description: "Function fundamentals",
      position: 0,
      state: "assessed",
      masteryScore: 0.75,
      evidenceCount: 3,
      scoredEvidenceCount: 2,
      lastEvidenceAt: "2026-09-14T10:00:00.000Z"
    });

    expect(observed.state).toBe("observed_unscored");
    expect(assessed.state).toBe("assessed");
    expect(assessed.masteryScore).toBe(0.75);
  });

  it("rejects contradictory learner skill progress states", () => {
    expect(() =>
      learnerSkillProgressSchema.parse({
        skillId: uuid,
        title: "Functions",
        description: null,
        position: 0,
        state: "unobserved",
        masteryScore: 0,
        evidenceCount: 0,
        scoredEvidenceCount: 0,
        lastEvidenceAt: null
      })
    ).toThrow();

    expect(() =>
      learnerSkillProgressSchema.parse({
        skillId: uuid,
        title: "Functions",
        description: null,
        position: 0,
        state: "assessed",
        masteryScore: 0.5,
        evidenceCount: 1,
        scoredEvidenceCount: 2,
        lastEvidenceAt: "2026-09-14T10:00:00.000Z"
      })
    ).toThrow();
  });

  it("wraps learner skill progress in exact Enrollment and CourseVersion context", () => {
    const model = learnerSkillProgressReadModelSchema.parse({
      organizationId: uuid,
      enrollmentId: uuid,
      offeringId: uuid,
      courseVersionId: uuid,
      skills: []
    });

    expect(model).toEqual({
      organizationId: uuid,
      enrollmentId: uuid,
      offeringId: uuid,
      courseVersionId: uuid,
      skills: []
    });
  });
});
