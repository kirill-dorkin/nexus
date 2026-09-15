import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { GitHubAppGateway } from "./application/github-app.gateway";
import { GitHubAppSetupRepository } from "./application/github-app-setup.repository";
import { GitHubAppSetupApplicationService } from "./application/github-app-setup.service";
import { GitHubRepositoryReferenceQuery } from "./application/github-repository-reference.query";
import { GitHubWebhookInboxRepository } from "./application/github-webhook-inbox.repository";
import { GitHubWebhookApplicationService } from "./application/github-webhook.service";
import { GitHubAppSetupController } from "./github-app-setup.controller";
import { GitHubWebhookController } from "./github-webhook.controller";
import { GitHubHttpAppGateway } from "./infrastructure/github-http-app.gateway";
import { PostgresGitHubAppSetupRepository } from "./infrastructure/postgres-github-app-setup.repository";
import { GitHubWebhookSignatureVerifier } from "./infrastructure/github-webhook-signature.verifier";
import { PostgresGitHubWebhookInboxRepository } from "./infrastructure/postgres-github-webhook-inbox.repository";

@Module({
  imports: [IdentityModule, AuthorizationModule],
  controllers: [GitHubWebhookController, GitHubAppSetupController],
  providers: [
    GitHubWebhookApplicationService,
    GitHubWebhookSignatureVerifier,
    GitHubAppSetupApplicationService,
    GitHubRepositoryReferenceQuery,
    {
      provide: GitHubAppGateway,
      useClass: GitHubHttpAppGateway
    },
    {
      provide: GitHubAppSetupRepository,
      useClass: PostgresGitHubAppSetupRepository
    },
    {
      provide: GitHubWebhookInboxRepository,
      useClass: PostgresGitHubWebhookInboxRepository
    }
  ],
  exports: [GitHubRepositoryReferenceQuery]
})
export class IntegrationsModule {}
