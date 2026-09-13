import { Injectable } from "@nestjs/common";

export const authorizationCapabilities = [
  "organization.read",
  "organization.manage",
  "authorization.read",
  "authorization.assign_roles",
  "authorization.assign_owner"
] as const;

export type AuthorizationCapability =
  (typeof authorizationCapabilities)[number];

export const systemRoleKeys = [
  "organization_owner",
  "organization_admin",
  "instructor",
  "mentor",
  "learner"
] as const;

export type SystemRoleKey = (typeof systemRoleKeys)[number];

export const authorizationScopeTypes = [
  "organization",
  "course",
  "offering",
  "group",
  "team",
  "project"
] as const;

export type AuthorizationScopeType =
  (typeof authorizationScopeTypes)[number];

export type AuthorizationScope = Readonly<{
  organizationId: string;
  type: AuthorizationScopeType;
  id: string;
}>;

export type RoleAssignmentScope = Readonly<{
  organizationId: string;
  roleKey: SystemRoleKey;
  type: AuthorizationScopeType;
  id: string;
}>;

const roleCapabilities: Readonly<Record<SystemRoleKey, ReadonlySet<AuthorizationCapability>>> = {
  organization_owner: new Set(authorizationCapabilities),
  organization_admin: new Set([
    "organization.read",
    "organization.manage",
    "authorization.read",
    "authorization.assign_roles"
  ]),
  instructor: new Set(["organization.read", "authorization.read"]),
  mentor: new Set(["organization.read"]),
  learner: new Set(["organization.read"])
};

@Injectable()
export class AuthorizationPolicy {
  roleAllows(
    roleKey: SystemRoleKey,
    capability: AuthorizationCapability
  ): boolean {
    return roleCapabilities[roleKey].has(capability);
  }

  assignmentCoversScope(
    assignment: RoleAssignmentScope,
    requestedScope: AuthorizationScope
  ): boolean {
    if (assignment.organizationId !== requestedScope.organizationId) {
      return false;
    }

    if (
      assignment.type === "organization" &&
      assignment.id === assignment.organizationId
    ) {
      return true;
    }

    return (
      assignment.type === requestedScope.type &&
      assignment.id === requestedScope.id
    );
  }

  allows(
    assignments: readonly RoleAssignmentScope[],
    capability: AuthorizationCapability,
    requestedScope: AuthorizationScope
  ): boolean {
    return assignments.some(
      (assignment) =>
        this.assignmentCoversScope(assignment, requestedScope) &&
        this.roleAllows(assignment.roleKey, capability)
    );
  }
}
