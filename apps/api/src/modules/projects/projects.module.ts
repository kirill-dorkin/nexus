import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { ProjectCommandContext } from "./application/project-command-context";
import { ProjectOperator } from "./application/project-operator";
import { ProjectRepositoryConnectService } from "./application/project-repository-connect.service";
import { ProjectRepositoryDisconnectService } from "./application/project-repository-disconnect.service";
import { ProjectsRepository } from "./application/projects.repository";
import { ProjectsApplicationService } from "./application/projects.service";
import { ProjectsViewQuery } from "./application/projects-view.query";
import { PostgresProjectsRepository } from "./infrastructure/postgres-projects.repository";
import { ProjectsController } from "./projects.controller";

@Module({
  imports: [
    IdentityModule,
    OrganizationsModule,
    AuthorizationModule,
    IntegrationsModule
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsApplicationService,
    ProjectRepositoryConnectService,
    ProjectRepositoryDisconnectService,
    ProjectOperator,
    ProjectCommandContext,
    ProjectsViewQuery,
    {
      provide: ProjectsRepository,
      useClass: PostgresProjectsRepository
    }
  ]
})
export class ProjectsModule {}
