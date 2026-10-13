import { ForbiddenException, Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import type {
  AuthorizationScopeType,
  SystemRoleKey
} from "../../authorization/application/authorization.policy";

const operatorRoles: readonly SystemRoleKey[] = [
  "organization_owner",
  "organization_admin",
  "instructor"
];

@Injectable()
export class ProjectOperator {
  constructor(private readonly authorization: AuthorizationApplicationService) {}

  async require(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    scopeType: AuthorizationScopeType,
    scopeId: string
  ): Promise<void> {
    await this.authorization.requireCapability(
      transaction,
      userId,
      "organization.read",
      { organizationId, type: scopeType, id: scopeId }
    );

    for (const role of operatorRoles) {
      if (
        await this.authorization.hasRoleAssignment(
          transaction,
          organizationId,
          userId,
          role,
          "organization",
          organizationId
        )
      ) {
        return;
      }

      if (
        scopeType !== "organization" &&
        await this.authorization.hasRoleAssignment(
          transaction,
          organizationId,
          userId,
          role,
          scopeType,
          scopeId
        )
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      "The authenticated user is not authorized for this project operation."
    );
  }
}
