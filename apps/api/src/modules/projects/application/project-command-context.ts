import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { ProjectOperator } from "./project-operator";

@Injectable()
export class ProjectCommandContext {
  constructor(private readonly operator: ProjectOperator) {}

  requireProject(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    projectId: string
  ): Promise<void> {
    return this.operator.require(
      transaction,
      organizationId,
      userId,
      "project",
      projectId
    );
  }
}
