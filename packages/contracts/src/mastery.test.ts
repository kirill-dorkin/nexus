import { describe, expect, it } from "vitest";

import {
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
});
