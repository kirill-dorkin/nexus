import { Injectable, NotFoundException } from "@nestjs/common";
import type { Project } from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { ProjectCommandContext } from "./project-command-context";
import { disconnectedProjectView } from "./project-repository-view";
import { ProjectsRepository } from "./projects.repository";

@Injectable()
export class ProjectRepositoryDisconnectService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly projects: ProjectsRepository,
    private readonly identity: IdentityApplicationService,
    private readonly commandContext: ProjectCommandContext
  ) {}

  async disconnect(organizationId: string, projectId: string): Promise<Project> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.commandContext.requireProject(
        transaction,
        organizationId,
        context.userId,
        projectId
      );

      const project = await this.projects.findProject(
        transaction,
        organizationId,
        projectId
      );
      if (project === null) throw new NotFoundException("Project not found.");

      const binding = await this.projects.findActiveRepositoryBindingForProject(
        transaction,
        organizationId,
        projectId
      );
      if (binding !== null) {
        await this.projects.disconnectRepositoryBinding(transaction, {
          organizationId,
          bindingId: binding.id,
          disconnectedByUserId: context.userId
        });
      }

      return disconnectedProjectView(project);
    });
  }
}
