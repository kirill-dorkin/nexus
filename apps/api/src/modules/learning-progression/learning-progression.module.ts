import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningReadinessModule } from "../learning-readiness/learning-readiness.module";
import { LearningProgressionApplicationService } from "./application/learning-progression.service";
import { LearningProgressionController } from "./learning-progression.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    LearningDeliveryModule,
    LearningReadinessModule
  ],
  controllers: [LearningProgressionController],
  providers: [LearningProgressionApplicationService]
})
export class LearningProgressionModule {}
