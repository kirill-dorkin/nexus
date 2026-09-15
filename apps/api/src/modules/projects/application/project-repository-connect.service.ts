import { Injectable } from "@nestjs/common";
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
    void this.database;
    void this.requestContext;
    void this.projects;
    void this.identity;
    void this.githubRepositories;
    void this.commandContext;
    void organizationId;
    void projectId;
    void command;
    throw new Error("Not implemented.");
  }
}
