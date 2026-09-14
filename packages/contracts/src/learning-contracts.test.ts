import { describe, expect, it } from "vitest";

import {
  correctAttendanceRequestSchema,
  createCourseRequestSchema,
  createCourseRunRequestSchema,
  createCourseVersionRequestSchema,
  createDeliveryGroupRequestSchema,
  createEnrollmentRequestSchema,
  createGroupMembershipRequestSchema,
  createGroupSetRequestSchema,
  createLearningOfferingRequestSchema,
  createSessionRequestSchema,
  recordAttendanceRequestSchema
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

  it("defaults offering access to membership and validates schedule ordering", () => {
    expect(
      createLearningOfferingRequestSchema.parse({
        courseVersionId: id,
        slug: "self-paced-2026",
        name: "Self-paced 2026",
        deliveryMode: "self_paced"
      })
    ).toMatchObject({
      deliveryMode: "self_paced",
      accessMode: "membership"
    });

    expect(
      createLearningOfferingRequestSchema.parse({
        courseVersionId: id,
        slug: "restricted-2026",
        name: "Restricted 2026",
        deliveryMode: "self_paced",
        accessMode: "entitlement_required"
      }).accessMode
    ).toBe("entitlement_required");

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

  it("models scheduled course runs and explicit grouping commands", () => {
    expect(
      createCourseRunRequestSchema.parse({
        slug: "fall-2026-a",
        name: "Fall 2026 A",
        startsAt: "2026-09-15T09:00:00.000Z",
        endsAt: "2026-12-15T09:00:00.000Z"
      })
    ).toMatchObject({ slug: "fall-2026-a" });

    expect(() =>
      createCourseRunRequestSchema.parse({
        slug: "invalid-run",
        name: "Invalid run",
        startsAt: "2026-12-15T09:00:00.000Z",
        endsAt: "2026-09-15T09:00:00.000Z"
      })
    ).toThrow();

    expect(
      createGroupSetRequestSchema.parse({
        slug: "labs",
        name: "Lab sections"
      })
    ).toEqual({ slug: "labs", name: "Lab sections" });

    expect(
      createDeliveryGroupRequestSchema.parse({
        slug: "lab-a",
        name: "Lab A"
      })
    ).toEqual({ slug: "lab-a", name: "Lab A" });

    expect(
      createGroupMembershipRequestSchema.parse({ enrollmentId: id })
    ).toEqual({ enrollmentId: id });
  });

  it("models sessions separately from attendance and validates both commands", () => {
    expect(
      createSessionRequestSchema.parse({
        slug: "lecture-01",
        name: "Lecture 01",
        startsAt: "2099-10-01T09:00:00.000Z",
        endsAt: "2099-10-01T10:30:00.000Z"
      })
    ).toMatchObject({
      groupId: null,
      slug: "lecture-01"
    });

    expect(
      createSessionRequestSchema.parse({
        groupId: id,
        slug: "lab-01",
        name: "Lab 01",
        startsAt: "2099-10-01T11:00:00.000Z",
        endsAt: "2099-10-01T12:00:00.000Z"
      }).groupId
    ).toBe(id);

    expect(() =>
      createSessionRequestSchema.parse({
        slug: "invalid-session",
        name: "Invalid session",
        startsAt: "2099-10-01T12:00:00.000Z",
        endsAt: "2099-10-01T11:00:00.000Z"
      })
    ).toThrow();

    expect(
      recordAttendanceRequestSchema.parse({
        enrollmentId: id,
        status: "late"
      })
    ).toEqual({ enrollmentId: id, status: "late" });

    expect(correctAttendanceRequestSchema.parse({ status: "excused" })).toEqual({
      status: "excused"
    });

    expect(() =>
      recordAttendanceRequestSchema.parse({
        enrollmentId: id,
        status: "maybe"
      })
    ).toThrow();
  });
});
