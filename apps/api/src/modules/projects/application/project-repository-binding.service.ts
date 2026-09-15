import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { ConnectProjectRepositoryRequest, Project } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GitHubRepositoryReferenceQuery } from "../../integrations/application/github-repository-reference.query";
import {
  ProjectsRepository,
  type ProjectRecord,
  type ProjectRepositoryBindingRecord
} from "./projects.repository";

@Injectable()
export class ProjectRepositoryBindingApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly projects: ProjectsRepository,
    private readonly identity: IdentityApplicationService,
    private readonly githubRepositories: GitHubRepositoryReferenceQuery
  ) {}

  async connectRepository(
    organizationId: string,
    projectId: string,
    command: ConnectProjectRepositoryRequest
  ): Promise<Project> {
    const context = this.requestContext.tenantContext(organizationId);
    const bindingId = await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

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

      const existingForProject =
        await this.projects.findActiveRepositoryBindingForProject(
          transaction,
          organizationId,
          projectId
        );
      if (existingForProject !== null) {
        if (existingForProject.repositoryMappingId === command.repositoryMappingId) {
          return this.toProject(transaction, project, existingForProject);
        }
        throw new ConflictException(
          "This project is already connected to another repository."
        );
      }

      const existingForRepository =
        await this.projects.findActiveRepositoryBindingByMapping(
          transaction,
          organizationId,
          command.repositoryMappingId
        );
      if (existingForRepository !== null) {
        throw new ConflictException(
          "This repository is already connected to another project."
        );
      }

      const created = await this.projects.createRepositoryBinding(transaction, {
        id: bindingId,
        organizationId,
        projectId,
        repositoryMappingId: command.repositoryMappingId,
        connectedByUserId: context.userId
      });
      if (created !== null) {
        return this.toProject(transaction, project, created);
      }

      const racedBinding = await this.projects.findActiveRepositoryBindingForProject(
        transaction,
        organizationId,
        projectId
      );
      if (
        racedBinding !== null &&
        racedBinding.repositoryMappingId === command.repositoryMappingId
      ) {
        return this.toProject(transaction, project, racedBinding);
      }

      throw new ConflictException(
        "The project or repository was connected concurrently."
      );
    });
  }

  async disconnectRepository(
    organizationId: string,
    projectId: string
  ): Promise<Project> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
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

      return this.toProject(transaction, project);
    });
  }

  private async toProject(
    transaction: DatabaseTransaction,
    project: ProjectRecord,
    binding?: ProjectRepositoryBindingRecord
  ): Promise<Project> {
    const activeBinding =
      binding ??
      await this.projects.findActiveRepositoryBindingForProject(
        transaction,
        project.organizationId,
        project.id
      );

    if (activeBinding === null) {
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        teamId: project.teamId,
        repository: null,
        createdAt: project.createdAt.toISOString()
      };
    }

    const reference = await this.githubRepositories.findRepositoryReference(
      transaction,
      project.organizationId,
      activeBinding.repositoryMappingId
    );
    if (reference === null) {
      throw new Error("Connected repository mapping could not be resolved.");
    }

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      teamId: project.teamId,
      repository: {
        bindingId: activeBinding.id,
        repositoryMappingId: reference.repositoryMappingId,
        githubRepositoryId: reference.githubRepositoryId,
        fullName: reference.fullName,
        availability: reference.availability,
        connectedAt: activeBinding.connectedAt.toISOString()
      },
      createdAt: project.createdAt.toISOString()
    };
  }
}
