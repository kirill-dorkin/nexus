import { describe, expect, it } from "vitest";

import { assignRoleRequestSchema } from "./authorization";
import { createOrganizationRequestSchema } from "./organizations";

describe("Foundation 1 API contracts", () => {
  it("accepts a canonical organization creation command", () => {
    expect(
      createOrganizationRequestSchema.parse({
        slug: "acme-learning",
        name: "Acme Learning"
      })
    ).toEqual({
      slug: "acme-learning",
      name: "Acme Learning"
    });
  });

  it("rejects organization slugs that cannot match the database constraint", () => {
    expect(() =>
      createOrganizationRequestSchema.parse({
        slug: "Acme Learning",
        name: "Acme Learning"
      })
    ).toThrow();
  });

  it("requires role assignments to use supported scoped RBAC values", () => {
    expect(() =>
      assignRoleRequestSchema.parse({
        userId: "11111111-1111-4111-8111-111111111111",
        roleKey: "platform_admin",
        scope: {
          type: "organization",
          id: "22222222-2222-4222-8222-222222222222"
        }
      })
    ).toThrow();
  });
});
