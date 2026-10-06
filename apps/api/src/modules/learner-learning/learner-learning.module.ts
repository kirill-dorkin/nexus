import { Module } from "@nestjs/common";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { LearnerLearningController } from "./learner-learning.controller";
import { LearnerLearningService } from "./learner-learning.service";
@Module({
  imports: [
    IdentityModule,
    OrganizationsModule,
    LearningContentModule,
    LearningDeliveryModule,
    LearningProgressModule
  ],
  controllers: [LearnerLearningController],
  providers: [BrowserWriteOriginGuard, LearnerLearningService]
})
export class LearnerLearningModule {}
