import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { LearningDeliveryRepository } from "./application/learning-delivery.repository";
import { LearningDeliveryApplicationService } from "./application/learning-delivery.service";
import { PostgresLearningDeliveryRepository } from "./infrastructure/postgres-learning-delivery.repository";
import { LearningDeliveryController } from "./learning-delivery.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    OutboxModule,
    OrganizationsModule,
    LearningContentModule
  ],
  controllers: [LearningDeliveryController],
  providers: [
    LearningDeliveryApplicationService,
    {
      provide: LearningDeliveryRepository,
      useClass: PostgresLearningDeliveryRepository
    }
  ],
  exports: [LearningDeliveryApplicationService]
})
export class LearningDeliveryModule {}
