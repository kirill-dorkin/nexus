import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AssignRoleRequest } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  AuthorizationPolicy,
  type AuthorizationCapability,
  type AuthorizationScope,
  type AuthorizationScopeType,
  type SystemRoleKey
} from "./authorization.policy";
import { AuthorizationRepository } from "./authorization.repository";

@Injectable()
export class AuthorizationApplicationService {
  constructor(
    private readonly assignments: AuthorizationRepository,
    private readonly policy: AuthorizationPolicy
  ) {}

  async requireCapability(
    transaction: DatabaseTransaction,
    userId: string,
    capability: AuthorizationCapability,
    scope: AuthorizationScope
  ): Promise<void> {
    const assignments = await this.assignments.listAssignments(
      transaction,
      scope.organizationId,
      userId
    );

    if (!this.policy.allows(assignments, capability, scope)) {
      throw new ForbiddenException(
        "The authenticated user is not authorized for this operation."
      );
    }
  }

  async authoringScopes(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ) {
    const assignments = await this.assignments.listAssignments(
      transaction,
      organizationId,
      userId
    );
    const scope = (type: "organization" | "course", id: string) => ({
      organizationId,
      type,
      id
    });
    const allows = (
      capability: AuthorizationCapability,
      type: "organization" | "course",
      id: string
    ) => this.policy.allows(assignments, capability, scope(type, id));
    const canAuthor = (type: "organization" | "course", id: string) =>
      allows("course.manage", type, id) && allows("activity.manage", type, id);
    return {
      allCourses: canAuthor("organization", organizationId),
      courseIds: [
        ...new Set(
          assignments
            .filter((a) => a.type === "course" && canAuthor("course", a.id))
            .map((a) => a.id)
        )
      ],
      canApply: allows("skill.manage", "organization", organizationId),
      canPublish: (courseId: string) =>
        allows("course.publish", "course", courseId)
    };
  }

  hasRoleAssignment(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    roleKey: SystemRoleKey,
    scopeType: AuthorizationScopeType,
    scopeId: string
  ): Promise<boolean> {
    return this.assignments.hasAssignment(
      transaction,
      organizationId,
      userId,
      roleKey,
      scopeType,
      scopeId
    );
  }

  async bootstrapOrganizationOwner(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<void> {
    await this.assignments.createAssignment(transaction, {
      organizationId,
      userId,
      roleKey: "organization_owner",
      scopeType: "organization",
      scopeId: organizationId,
      assignedByUserId: userId
    });
  }

  async assignRole(
    transaction: DatabaseTransaction,
    actorUserId: string,
    organizationId: string,
    request: AssignRoleRequest
  ): Promise<void> {
    const scope: AuthorizationScope = {
      organizationId,
      type: request.scope.type,
      id: request.scope.id
    };
    const capability: AuthorizationCapability =
      request.roleKey === "organization_owner"
        ? "authorization.assign_owner"
        : "authorization.assign_roles";

    await this.requireCapability(transaction, actorUserId, capability, scope);

    await this.assignments.createAssignment(transaction, {
      organizationId,
      userId: request.userId,
      roleKey: request.roleKey,
      scopeType: request.scope.type,
      scopeId: request.scope.id,
      assignedByUserId: actorUserId
    });
  }
}
