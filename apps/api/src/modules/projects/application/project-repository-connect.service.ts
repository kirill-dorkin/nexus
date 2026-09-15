import { Injectable } from "@nestjs/common";
import type { ConnectProjectRepositoryRequest, Project } from "@platform/contracts";

@Injectable()
export class ProjectRepositoryConnectService {
  async connect(
    organizationId: string,
    projectId: string,
    command: ConnectProjectRepositoryRequest
  ): Promise<Project> {
    void organizationId;
    void projectId;
    void command;
    throw new Error("Not implemented.");
  }
}
