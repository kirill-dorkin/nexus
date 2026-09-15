import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { ConnectProjectRepositoryRequest, Project } from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GitHubRepositoryReferenceQuery } from "../../integrations/application/github-repository-reference.query";
import { ProjectCommandContext } from "./project-command-context";
import { ProjectsRepository } from "./projects.repository";

@Injectable()
export class ProjectRepositoryConnectService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly projects: ProjectsRepository,
    private readonly identity: IdentityApplicationService,
    private readonly githubRepositories: GitHubRepositoryReferenceQuery,
    private readonly commandContext: ProjectCommandContext
  ) {}

  async connect(
    organizationId: string,
    projectId: string,
    command: ConnectProjectRepositoryRequest
  ): Promise<Project> {
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
      if (project.status !== "active") {
        throw new ConflictException("An active project is required.");
      }

      const reference = await this.githubRepositories.findRepositoryReference(
        transaction,
        organizationId,
        command.repositoryMappingId
      );
      if (reference === null) {
        throw new NotFoundException("Trusted repository mapping not found.");
      }
      if (reference.availability !== "active") {
        throw new ConflictException(
          "Only an active trusted repository mapping can be connected."
        );
      }

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        teamId: project.teamId,
        repository: null,
        createdAt: project.createdAt.toISOString()
      };
    });
  }
}
