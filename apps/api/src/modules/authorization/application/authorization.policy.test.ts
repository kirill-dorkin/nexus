import { describe, expect, it } from "vitest";

import {
  AuthorizationPolicy,
  type AuthorizationScope,
  type RoleAssignmentScope
} from "./authorization.policy";

const organizationScope: AuthorizationScope = {
  organizationId: "org-a",
  type: "organization",
  id: "org-a"
};

function assignment(
  overrides: Partial<RoleAssignmentScope> = {}
): RoleAssignmentScope {
  return {
    organizationId: "org-a",
    roleKey: "organization_owner",
    type: "organization",
    id: "org-a",
    ...overrides
  };
}

describe("AuthorizationPolicy", () => {
  const policy = new AuthorizationPolicy();

  it("allows organization owners to manage their organization", () => {
    expect(
      policy.allows(
        [assignment()],
        "organization.manage",
        organizationScope
      )
    ).toBe(true);
  });

  it("lets an organization-scoped assignment cover child scopes", () => {
    expect(
      policy.allows(
        [assignment({ roleKey: "organization_admin" })],
        "authorization.assign_roles",
        {
          organizationId: "org-a",
          type: "course",
          id: "course-a"
        }
      )
    ).toBe(true);
  });

  it("does not let a child-scope assignment escape its exact scope", () => {
    expect(
      policy.allows(
        [
          assignment({
            roleKey: "instructor",
            type: "course",
            id: "course-a"
          })
        ],
        "organization.read",
        {
          organizationId: "org-a",
          type: "course",
          id: "course-b"
        }
      )
    ).toBe(false);
  });

  it("never lets an assignment cross organization boundaries", () => {
    expect(
      policy.allows(
        [assignment()],
        "organization.read",
        {
          organizationId: "org-b",
          type: "organization",
          id: "org-b"
        }
      )
    ).toBe(false);
  });

  it("keeps learner privileges read-only at this foundation layer", () => {
    expect(
      policy.allows(
        [assignment({ roleKey: "learner" })],
        "authorization.assign_roles",
        organizationScope
      )
    ).toBe(false);
  });
});
