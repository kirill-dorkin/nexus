import { Module } from "@nestjs/common";

import { GitHubWebhookInboxRepository } from "./application/github-webhook-inbox.repository";
import { GitHubWebhookApplicationService } from "./application/github-webhook.service";
import { GitHubWebhookController } from "./github-webhook.controller";
import { GitHubWebhookSignatureVerifier } from "./infrastructure/github-webhook-signature.verifier";
import { PostgresGitHubWebhookInboxRepository } from "./infrastructure/postgres-github-webhook-inbox.repository";

@Module({
  controllers: [GitHubWebhookController],
  providers: [
    GitHubWebhookApplicationService,
    GitHubWebhookSignatureVerifier,
    {
      provide: GitHubWebhookInboxRepository,
      useClass: PostgresGitHubWebhookInboxRepository
    }
  ]
})
export class IntegrationsModule {}
