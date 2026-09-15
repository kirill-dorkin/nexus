import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CreateProjectRequest,
  CreateProjectTeamRequest,
  Project,
  ProjectTeam
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GitHubRepositoryReferenceQuery } from "../../integrations/application/github-repository-reference.query";
import { OrganizationsApplicationService } from "../../organizations/application/organizations.service";
import {
  ProjectsRepository,
  type ProjectRecord,
  type ProjectRepositoryBindingRecord,
  type ProjectTeamRecord
} from "./projects.repository";

@Injectable()
export class ProjectsApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly projects: ProjectsRepository,
    private readonly identity: IdentityApplicationService,
    private readonly organizations: OrganizationsApplicationService,
    private readonly githubRepositories: GitHubRepositoryReferenceQuery
  ) {}

  async createTeam(
    organizationId: string,
    command: CreateProjectTeamRequest
  ): Promise<ProjectTeam> {
    if (new Set(command.members).size !== command.members.length) {
      throw new BadRequestException("Project team members must be unique.");
    }

    const context = this.requestContext.tenantContext(organizationId);
    const teamId = await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

      for (const memberUserId of command.members) {
        await this.identity.requireActiveUser(transaction, memberUserId);
        await this.organizations.requireActiveMembership(
          transaction,
          organizationId,
          memberUserId
        );
      }

      const team = await this.projects.createTeam(transaction, {
        id: teamId,
        organizationId,
        name: command.name,
        createdByUserId: context.userId
      });

      for (const memberUserId of command.members) {
        await this.projects.addTeamMember(transaction, {
          organizationId,
          teamId,
          userId: memberUserId,
          addedByUserId: context.userId
        });
      }

      return this.toTeam(transaction, team);
    });
  }

  async getTeam(organizationId: string, teamId: string): Promise<ProjectTeam> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const team = await this.projects.findTeam(transaction, organizationId, teamId);
      if (team === null) throw new NotFoundException("Project team not found.");
      return this.toTeam(transaction, team);
    });
  }

  async createProject(
    organizationId: string,
    command: CreateProjectRequest
  ): Promise<Project> {
    const context = this.requestContext.tenantContext(organizationId);
    const projectId = await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const team = await this.projects.findTeam(
        transaction,
        organizationId,
        command.teamId
      );
      if (team === null) throw new NotFoundException("Project team not found.");
      if (team.status !== "active") {
        throw new ConflictException("An active project team is required.");
      }

      const project = await this.projects.createProject(transaction, {
        id: projectId,
        organizationId,
        teamId: command.teamId,
        name: command.name,
        createdByUserId: context.userId
      });
      return this.toProject(transaction, project);
    });
  }

  async getProject(organizationId: string, projectId: string): Promise<Project> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const project = await this.projects.findProject(
        transaction,
        organizationId,
        projectId
      );
      if (project === null) throw new NotFoundException("Project not found.");
      return this.toProject(transaction, project);
    });
  }

  private async toTeam(
    transaction: DatabaseTransaction,
    team: ProjectTeamRecord
  ): Promise<ProjectTeam> {
    const members = await this.projects.listActiveTeamMembers(
      transaction,
      team.organizationId,
      team.id
    );
    return {
      id: team.id,
      name: team.name,
      status: team.status,
      members: members.map((member) => ({
        userId: member.userId,
        joinedAt: member.joinedAt.toISOString()
      })),
      createdAt: team.createdAt.toISOString()
    };
  }

  private async toProject(
    transaction: DatabaseTransaction,
    project: ProjectRecord,
    knownBinding?: ProjectRepositoryBindingRecord
  ): Promise<Project> {
    const binding =
      knownBinding ??
      await this.projects.findActiveRepositoryBindingForProject(
        transaction,
        project.organizationId,
        project.id
      );

    if (binding === null) {
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
      binding.repositoryMappingId
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
        bindingId: binding.id,
        repositoryMappingId: reference.repositoryMappingId,
        githubRepositoryId: reference.githubRepositoryId,
        fullName: reference.fullName,
        availability: reference.availability,
        connectedAt: binding.connectedAt.toISOString()
      },
      createdAt: project.createdAt.toISOString()
    };
  }
}
