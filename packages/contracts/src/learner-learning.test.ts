import { it, expect } from "vitest";
import {
  freeSelfEnrollmentRequestSchema,
  ownLearningListQuerySchema
} from "./learner-learning";
it("never accepts browser actor, tenant, role or enrollment authority", () => {
  expect(freeSelfEnrollmentRequestSchema.safeParse({}).success).toBe(true);
  for (const key of [
    "userId",
    "organizationId",
    "enrollmentId",
    "offeringId",
    "roleKey",
    "status",
    "completedAt",
    "progress"
  ])
    expect(
      freeSelfEnrollmentRequestSchema.safeParse({ [key]: "forged" }).success
    ).toBe(false);
  expect(
    ownLearningListQuerySchema.safeParse({ userId: "foreign" }).success
  ).toBe(false);
  expect(
    ownLearningListQuerySchema.safeParse({ after: "not-a-uuid" }).success
  ).toBe(false);
});
