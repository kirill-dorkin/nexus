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

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { OrganizationsApplicationService } from "../../organizations/application/organizations.service";
import { ProjectOperator } from "./project-operator";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsViewQuery } from "./projects-view.query";

@Injectable()
export class ProjectsApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly projects: ProjectsRepository,
    private readonly identity: IdentityApplicationService,
    private readonly organizations: OrganizationsApplicationService,
    private readonly operator: ProjectOperator,
    private readonly view: ProjectsViewQuery
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
      await this.operator.require(
        transaction,
        organizationId,
        context.userId,
        "organization",
        organizationId
      );

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
      return this.view.team(transaction, team);
    });
  }

  async getTeam(organizationId: string, teamId: string): Promise<ProjectTeam> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.operator.require(
        transaction,
        organizationId,
        context.userId,
        "team",
        teamId
      );
      const team = await this.projects.findTeam(
        transaction,
        organizationId,
        teamId
      );
      if (team === null) throw new NotFoundException("Project team not found.");
      return this.view.team(transaction, team);
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
      await this.operator.require(
        transaction,
        organizationId,
        context.userId,
        "organization",
        organizationId
      );
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
      return this.view.project(transaction, project);
    });
  }

  async getProject(
    organizationId: string,
    projectId: string
  ): Promise<Project> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.operator.require(
        transaction,
        organizationId,
        context.userId,
        "project",
        projectId
      );
      const project = await this.projects.findProject(
        transaction,
        organizationId,
        projectId
      );
      if (project === null) throw new NotFoundException("Project not found.");
      return this.view.project(transaction, project);
    });
  }
}
