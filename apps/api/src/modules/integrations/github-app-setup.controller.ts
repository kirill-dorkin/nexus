import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect
} from "@nestjs/common";
import {
  uuidSchema,
  type GitHubInstallationMapping,
  type GitHubIntegrationSetupSession,
  type GitHubIntegrationView
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { GitHubAppSetupApplicationService } from "./application/github-app-setup.service";

@Controller()
export class GitHubAppSetupController {
  constructor(private readonly setup: GitHubAppSetupApplicationService) {}

  @Post("organizations/:organizationId/integrations/github/setup-sessions")
  @HttpCode(HttpStatus.CREATED)
  initiateSetup(
    @Param("organizationId") organizationId: string
  ): Promise<GitHubIntegrationSetupSession> {
    return this.setup.initiateSetup(parseRequest(uuidSchema, organizationId));
  }

  @Get("integrations/github/setup/callback")
  @Redirect(undefined, HttpStatus.FOUND)
  async handleInstallationReturn(
    @Query("state") state: string | undefined,
    @Query("installation_id") installationId: string | undefined,
    @Query("setup_action") setupAction: string | undefined
  ): Promise<{ url: string; statusCode: number }> {
    return {
      url: await this.setup.handleInstallationReturn({
        state,
        installationId,
        setupAction
      }),
      statusCode: HttpStatus.FOUND
    };
  }

  @Get("integrations/github/oauth/callback")
  completeUserAuthorization(
    @Query("state") state: string | undefined,
    @Query("code") code: string | undefined
  ): Promise<GitHubInstallationMapping> {
    return this.setup.completeUserAuthorization({ state, code });
  }

  @Get("organizations/:organizationId/integrations/github")
  getIntegration(
    @Param("organizationId") organizationId: string
  ): Promise<GitHubIntegrationView> {
    return this.setup.getIntegration(parseRequest(uuidSchema, organizationId));
  }

  @Post(
    "organizations/:organizationId/integrations/github/installations/:installationMappingId/suspend"
  )
  @HttpCode(HttpStatus.OK)
  suspendInstallation(
    @Param("organizationId") organizationId: string,
    @Param("installationMappingId") installationMappingId: string
  ): Promise<GitHubInstallationMapping> {
    return this.setup.suspendInstallation(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, installationMappingId)
    );
  }
}
