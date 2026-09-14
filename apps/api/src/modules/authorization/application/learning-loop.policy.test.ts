import { describe, expect, it } from "vitest";

import {
  AuthorizationPolicy,
  type AuthorizationScope,
  type RoleAssignmentScope
} from "./authorization.policy";

const offeringScope: AuthorizationScope = {
  organizationId: "org-a",
  type: "offering",
  id: "offering-a"
};

const organizationScope: AuthorizationScope = {
  organizationId: "org-a",
  type: "organization",
  id: "org-a"
};

function role(roleKey: RoleAssignmentScope["roleKey"]): RoleAssignmentScope {
  return {
    organizationId: "org-a",
    roleKey,
    type: "organization",
    id: "org-a"
  };
}

describe("learning-loop authorization", () => {
  const policy = new AuthorizationPolicy();

  it("lets an enrolled learner submit attempts but not manufacture evidence", () => {
    expect(policy.allows([role("learner")], "attempt.submit", offeringScope)).toBe(true);
    expect(policy.allows([role("learner")], "evidence.record", offeringScope)).toBe(false);
  });

  it("lets instructors record evidence and manage the learning graph", () => {
    expect(policy.allows([role("instructor")], "evidence.record", offeringScope)).toBe(true);
    expect(
      policy.allows([role("instructor")], "activity.manage", {
        organizationId: "org-a",
        type: "course",
        id: "course-a"
      })
    ).toBe(true);
  });

  it("separates self Mastery reads from reading other learners", () => {
    expect(policy.allows([role("learner")], "mastery.read", organizationScope)).toBe(true);
    expect(
      policy.allows([role("learner")], "mastery.read_others", organizationScope)
    ).toBe(false);
    expect(
      policy.allows([role("mentor")], "mastery.read_others", organizationScope)
    ).toBe(true);
  });

  it("keeps explicit Mastery recomputation operationally privileged", () => {
    expect(
      policy.allows([role("organization_admin")], "mastery.recompute", organizationScope)
    ).toBe(true);
    expect(
      policy.allows([role("instructor")], "mastery.recompute", organizationScope)
    ).toBe(false);
    expect(
      policy.allows([role("learner")], "mastery.recompute", organizationScope)
    ).toBe(false);
  });
});
