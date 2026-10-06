import { describe, it, expect } from "vitest";
import {
  studioEmptyRequestSchema,
  studioListQuerySchema,
  studioPublishRequestSchema,
  studioCreateOrganizationSchema
} from "./studio";
describe("Studio caller boundaries", () => {
  it("accepts only publication locator/revision, never actor, tenant or status authority", () => {
    const command = {
      draftVersionId: "11111111-1111-4111-8111-111111111111",
      expectedRevision: 10
    };
    expect(studioPublishRequestSchema.safeParse(command).success).toBe(true);
    for (const field of ["actorId", "organizationId", "userId", "status"])
      expect(
        studioPublishRequestSchema.safeParse({ ...command, [field]: "caller" })
          .success
      ).toBe(false);
  });
  it("keeps discovery/create/next-draft strict", () => {
    expect(studioListQuerySchema.safeParse({ userId: "caller" }).success).toBe(
      false
    );
    expect(studioEmptyRequestSchema.safeParse({ role: "owner" }).success).toBe(
      false
    );
    expect(
      studioCreateOrganizationSchema.safeParse({
        slug: "academy",
        name: "Academy",
        roleKey: "owner"
      }).success
    ).toBe(false);
  });
});
