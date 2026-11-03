import { Injectable } from "@nestjs/common";
import type { Project, ProjectTeam } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { GitHubRepositoryReferenceQuery } from "../../integrations/application/github-repository-reference.query";
import {
  ProjectsRepository,
  type ProjectRecord,
  type ProjectRepositoryBindingRecord,
  type ProjectTeamRecord
} from "./projects.repository";

@Injectable()
export class ProjectsViewQuery {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly githubRepositories: GitHubRepositoryReferenceQuery
  ) {}

  async team(
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

  async project(
    transaction: DatabaseTransaction,
    project: ProjectRecord,
    knownBinding?: ProjectRepositoryBindingRecord
  ): Promise<Project> {
    const binding =
      knownBinding ??
      (await this.projects.findActiveRepositoryBindingForProject(
        transaction,
        project.organizationId,
        project.id
      ));

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
