import { FreeLearningDeliveryPort } from "./application/free-learning-delivery.port";
import { PostgresFreeLearningDeliveryPort } from "./infrastructure/postgres-free-learning-delivery.port";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { PublicFreeLearningOfferingQuery } from "./application/public-free-learning-offering.query";
import { PostgresPublicFreeLearningOfferingQuery } from "./infrastructure/postgres-public-free-learning-offering.query";
import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CommerceModule } from "../commerce/commerce.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { AssignmentRepository } from "./application/assignment.repository";
import { AssignmentApplicationService } from "./application/assignment.service";
import { CheckoutLearningOfferingQuery } from "./application/checkout-learning-offering.query";
import { LearnerRunnerApplicationService } from "./application/learner-runner.service";
import { LearningDeliveryCommandService } from "./application/learning-delivery-command.service";
import { LearningDeliveryCommand } from "./application/learning-delivery.command";
import { LearningDeliveryQueryService } from "./application/learning-delivery-query.service";
import { LearningDeliveryQuery } from "./application/learning-delivery.query";
import { LearningDeliveryRepository } from "./application/learning-delivery.repository";
import { LearningDeliveryApplicationService } from "./application/learning-delivery.service";
import { PublicLearningOfferingQuery } from "./application/public-learning-offering.query";
import { AssignmentController } from "./assignment.controller";
import { PostgresAssignmentRepository } from "./infrastructure/postgres-assignment.repository";
import { PostgresCheckoutLearningOfferingQuery } from "./infrastructure/postgres-checkout-learning-offering.query";
import { PostgresLearningDeliveryRepository } from "./infrastructure/postgres-learning-delivery.repository";
import { PostgresPublicLearningOfferingQuery } from "./infrastructure/postgres-public-learning-offering.query";
import { LearnerRunnerController } from "./learner-runner.controller";
import { LearningDeliveryController } from "./learning-delivery.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    CommerceModule,
    OutboxModule,
    OrganizationsModule,
    LearningContentModule
  ],
  controllers: [
    LearningDeliveryController,
    AssignmentController,
    LearnerRunnerController
  ],
  providers: [
    {
      provide: FreeLearningDeliveryPort,
      useClass: PostgresFreeLearningDeliveryPort
    },
    BrowserWriteOriginGuard,
    {
      provide: PublicFreeLearningOfferingQuery,
      useClass: PostgresPublicFreeLearningOfferingQuery
    },
    LearningDeliveryApplicationService,
    LearningDeliveryCommandService,
    LearningDeliveryQueryService,
    AssignmentApplicationService,
    LearnerRunnerApplicationService,
    {
      provide: LearningDeliveryCommand,
      useExisting: LearningDeliveryCommandService
    },
    {
      provide: LearningDeliveryQuery,
      useExisting: LearningDeliveryQueryService
    },
    {
      provide: LearningDeliveryRepository,
      useClass: PostgresLearningDeliveryRepository
    },
    {
      provide: AssignmentRepository,
      useClass: PostgresAssignmentRepository
    },
    {
      provide: PublicLearningOfferingQuery,
      useClass: PostgresPublicLearningOfferingQuery
    },
    {
      provide: CheckoutLearningOfferingQuery,
      useClass: PostgresCheckoutLearningOfferingQuery
    }
  ],
  exports: [
    FreeLearningDeliveryPort,
    PublicFreeLearningOfferingQuery,
    LearningDeliveryApplicationService,
    LearningDeliveryCommand,
    LearningDeliveryQuery,
    PublicLearningOfferingQuery,
    CheckoutLearningOfferingQuery,
    AssignmentApplicationService
  ]
})
export class LearningDeliveryModule {}
