import { describe, expect, it } from "vitest";

import {
  createCourseRequestSchema,
  createCourseVersionRequestSchema,
  createEnrollmentRequestSchema,
  createLearningOfferingRequestSchema
} from "./index";

const id = "018f47f1-16ce-7d1f-8f65-c61d8be24a31";

describe("learning catalog and delivery contracts", () => {
  it("accepts stable course identity with versioned presentation fields", () => {
    expect(
      createCourseRequestSchema.parse({
        slug: "frontend-development",
        title: "Frontend Development",
        description: "A structured frontend curriculum."
      })
    ).toEqual({
      slug: "frontend-development",
      title: "Frontend Development",
      description: "A structured frontend curriculum."
    });

    expect(
      createCourseVersionRequestSchema.parse({
        title: "Frontend Development v2"
      })
    ).toEqual({ title: "Frontend Development v2" });
  });

  it("validates offering schedule ordering without requiring dates for self-paced delivery", () => {
    expect(
      createLearningOfferingRequestSchema.parse({
        courseVersionId: id,
        slug: "self-paced-2026",
        name: "Self-paced 2026",
        deliveryMode: "self_paced"
      }).deliveryMode
    ).toBe("self_paced");

    expect(() =>
      createLearningOfferingRequestSchema.parse({
        courseVersionId: id,
        slug: "september-cohort",
        name: "September Cohort",
        deliveryMode: "cohort",
        startsAt: "2026-09-30T10:00:00.000Z",
        endsAt: "2026-09-01T10:00:00.000Z"
      })
    ).toThrow();
  });

  it("requires a concrete identity for enrollment", () => {
    expect(createEnrollmentRequestSchema.parse({ userId: id })).toEqual({
      userId: id
    });
  });
});
