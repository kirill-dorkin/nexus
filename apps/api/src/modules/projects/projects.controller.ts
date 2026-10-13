import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import {
  connectProjectRepositoryRequestSchema,
  createProjectRequestSchema,
  createProjectTeamRequestSchema,
  projectActivityQuerySchema,
  uuidSchema,
  type Project,
  type ProjectActivityPage,
  type ProjectTeam
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { ProjectActivityApplicationService } from "./application/project-activity.service";
import { ProjectRepositoryConnectService } from "./application/project-repository-connect.service";
import { ProjectRepositoryDisconnectService } from "./application/project-repository-disconnect.service";
import { ProjectsApplicationService } from "./application/projects.service";

@Controller()
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsApplicationService,
    private readonly activity: ProjectActivityApplicationService,
    private readonly connect: ProjectRepositoryConnectService,
    private readonly disconnect: ProjectRepositoryDisconnectService
  ) {}

  @Post("organizations/:organizationId/project-teams")
  createTeam(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<ProjectTeam> {
    return this.projects.createTeam(
      parseRequest(uuidSchema, organizationId),
      parseRequest(createProjectTeamRequestSchema, body)
    );
  }

  @Get("organizations/:organizationId/project-teams/:teamId")
  getTeam(
    @Param("organizationId") organizationId: string,
    @Param("teamId") teamId: string
  ): Promise<ProjectTeam> {
    return this.projects.getTeam(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, teamId)
    );
  }

  @Post("organizations/:organizationId/projects")
  createProject(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<Project> {
    return this.projects.createProject(
      parseRequest(uuidSchema, organizationId),
      parseRequest(createProjectRequestSchema, body)
    );
  }

  @Get("organizations/:organizationId/projects/:projectId")
  getProject(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string
  ): Promise<Project> {
    return this.projects.getProject(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, projectId)
    );
  }

  @Get("organizations/:organizationId/projects/:projectId/activity")
  getProjectActivity(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string,
    @Query() query: unknown
  ): Promise<ProjectActivityPage> {
    return this.activity.list(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, projectId),
      parseRequest(projectActivityQuerySchema, query)
    );
  }

  @Put("organizations/:organizationId/projects/:projectId/repository")
  connectRepository(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string,
    @Body() body: unknown
  ): Promise<Project> {
    return this.connect.connect(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, projectId),
      parseRequest(connectProjectRepositoryRequestSchema, body)
    );
  }

  @Delete("organizations/:organizationId/projects/:projectId/repository")
  disconnectRepository(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string
  ): Promise<Project> {
    return this.disconnect.disconnect(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, projectId)
    );
  }
}
