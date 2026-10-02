import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { GitHubAppGateway } from "./application/github-app.gateway";
import { GitHubAppSetupRepository } from "./application/github-app-setup.repository";
import { GitHubAppSetupApplicationService } from "./application/github-app-setup.service";
import { GitHubRepositoryReferenceQuery } from "./application/github-repository-reference.query";
import { GitHubWebhookInboxRepository } from "./application/github-webhook-inbox.repository";
import { GitHubWebhookApplicationService } from "./application/github-webhook.service";
import { PaymentCheckoutGateway } from "./application/payment-checkout.gateway";
import { PaymentCheckoutProvider } from "./application/payment-checkout.provider";
import { PaymentCheckoutRepository } from "./application/payment-checkout.repository";
import { PaymentCheckoutApplicationService } from "./application/payment-checkout.service";
import { PaymentWebhookInboxRepository } from "./application/payment-webhook-inbox.repository";
import { PaymentWebhookApplicationService } from "./application/payment-webhook.service";
import { PaymentWebhookVerifier } from "./application/payment-webhook.verifier";
import { GitHubAppSetupController } from "./github-app-setup.controller";
import { GitHubWebhookController } from "./github-webhook.controller";
import { PaddlePaymentWebhookController } from "./paddle-payment-webhook.controller";
import { GitHubHttpAppGateway } from "./infrastructure/github-http-app.gateway";
import { GitHubWebhookSignatureVerifier } from "./infrastructure/github-webhook-signature.verifier";
import { PaddlePaymentCheckoutProvider } from "./infrastructure/paddle-payment-checkout.provider";
import { PaddlePaymentWebhookVerifier } from "./infrastructure/paddle-payment-webhook.verifier";
import { PostgresGitHubAppSetupRepository } from "./infrastructure/postgres-github-app-setup.repository";
import { PostgresGitHubWebhookInboxRepository } from "./infrastructure/postgres-github-webhook-inbox.repository";
import { PostgresPaymentCheckoutRepository } from "./infrastructure/postgres-payment-checkout.repository";
import { PostgresPaymentWebhookInboxRepository } from "./infrastructure/postgres-payment-webhook-inbox.repository";

@Module({
  imports: [IdentityModule, AuthorizationModule],
  controllers: [
    GitHubWebhookController,
    GitHubAppSetupController,
    PaddlePaymentWebhookController
  ],
  providers: [
    GitHubWebhookApplicationService,
    GitHubWebhookSignatureVerifier,
    GitHubAppSetupApplicationService,
    GitHubRepositoryReferenceQuery,
    PaymentCheckoutApplicationService,
    PaymentWebhookApplicationService,
    PaddlePaymentCheckoutProvider,
    PaddlePaymentWebhookVerifier,
    {
      provide: PaymentCheckoutGateway,
      useExisting: PaymentCheckoutApplicationService
    },
    {
      provide: PaymentCheckoutProvider,
      useExisting: PaddlePaymentCheckoutProvider
    },
    {
      provide: PaymentCheckoutRepository,
      useClass: PostgresPaymentCheckoutRepository
    },
    {
      provide: PaymentWebhookVerifier,
      useExisting: PaddlePaymentWebhookVerifier
    },
    {
      provide: PaymentWebhookInboxRepository,
      useClass: PostgresPaymentWebhookInboxRepository
    },
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
  exports: [GitHubRepositoryReferenceQuery, PaymentCheckoutGateway]
})
export class IntegrationsModule {}
