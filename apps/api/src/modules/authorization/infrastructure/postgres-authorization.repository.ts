import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  authorizationScopeTypes,
  systemRoleKeys,
  type AuthorizationScopeType,
  type RoleAssignmentScope,
  type SystemRoleKey
} from "../application/authorization.policy";
import {
  AuthorizationRepository,
  type CreateRoleAssignment
} from "../application/authorization.repository";

type AssignmentRow = {
  organization_id: string;
  role_key: string;
  scope_type: string;
  scope_id: string;
};

type RoleRow = {
  id: string;
};

function isSystemRoleKey(value: string): value is SystemRoleKey {
  return (systemRoleKeys as readonly string[]).includes(value);
}

function isScopeType(value: string): value is AuthorizationScopeType {
  return (authorizationScopeTypes as readonly string[]).includes(value);
}

@Injectable()
export class PostgresAuthorizationRepository extends AuthorizationRepository {
  async listAssignments(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly RoleAssignmentScope[]> {
    const result = await transaction.client.query<AssignmentRow>(
      `SELECT ra.organization_id::text,
              r.key AS role_key,
              ra.scope_type,
              ra.scope_id::text
         FROM access_control.role_assignments ra
         JOIN access_control.roles r ON r.id = ra.role_id
        WHERE ra.organization_id = $1
          AND ra.user_id = $2`,
      [organizationId, userId]
    );

    return result.rows.map((row) => {
      if (!isSystemRoleKey(row.role_key)) {
        throw new Error(`Unsupported persisted system role: ${row.role_key}`);
      }
      if (!isScopeType(row.scope_type)) {
        throw new Error(`Unsupported persisted authorization scope: ${row.scope_type}`);
      }

      return {
        organizationId: row.organization_id,
        roleKey: row.role_key,
        type: row.scope_type,
        id: row.scope_id
      };
    });
  }

  async createAssignment(
    transaction: DatabaseTransaction,
    assignment: CreateRoleAssignment
  ): Promise<void> {
    const roleResult = await transaction.client.query<RoleRow>(
      `SELECT id::text
         FROM access_control.roles
        WHERE key = $1
          AND is_system = true`,
      [assignment.roleKey]
    );
    const roleId = roleResult.rows[0]?.id;

    if (roleId === undefined) {
      throw new Error(`System role is not seeded: ${assignment.roleKey}`);
    }

    await transaction.client.query(
      `INSERT INTO access_control.role_assignments
         (organization_id, user_id, role_id, scope_type, scope_id, assigned_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (organization_id, user_id, role_id, scope_type, scope_id)
       DO NOTHING`,
      [
        assignment.organizationId,
        assignment.userId,
        roleId,
        assignment.scopeType,
        assignment.scopeId,
        assignment.assignedByUserId
      ]
    );
  }
}
