import type { DatabaseTransaction } from "@platform/database";

import type {
  AuthorizationScopeType,
  RoleAssignmentScope,
  SystemRoleKey
} from "./authorization.policy";

export type CreateRoleAssignment = Readonly<{
  organizationId: string;
  userId: string;
  roleKey: SystemRoleKey;
  scopeType: AuthorizationScopeType;
  scopeId: string;
  assignedByUserId: string | null;
}>;

export abstract class AuthorizationRepository {
  abstract listAssignments(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly RoleAssignmentScope[]>;

  abstract hasAssignment(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    roleKey: SystemRoleKey,
    scopeType: AuthorizationScopeType,
    scopeId: string
  ): Promise<boolean>;

  abstract createAssignment(
    transaction: DatabaseTransaction,
    assignment: CreateRoleAssignment
  ): Promise<void>;
}
