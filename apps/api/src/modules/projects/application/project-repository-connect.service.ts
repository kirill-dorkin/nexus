import { Injectable } from "@nestjs/common";
import type { ConnectProjectRepositoryRequest, Project } from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";

@Injectable()
export class ProjectRepositoryConnectService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService
  ) {}

  async connect(
    organizationId: string,
    projectId: string,
    command: ConnectProjectRepositoryRequest
  ): Promise<Project> {
    void this.database;
    void this.requestContext;
    void organizationId;
    void projectId;
    void command;
    throw new Error("Not implemented.");
  }
}
