import { LearningValidationModule } from "../learning-validation/learning-validation.module";
import { Module } from "@nestjs/common";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { LearnerLearningController } from "./learner-learning.controller";
import { LearnerAssignmentService } from "./learner-assignment.service";
import { LearnerLearningService } from "./learner-learning.service";
@Module({
  imports: [
    LearningValidationModule,
    IdentityModule,
    OrganizationsModule,
    LearningContentModule,
    LearningDeliveryModule,
    LearningProgressModule
  ],
  controllers: [LearnerLearningController],
  providers: [
    BrowserWriteOriginGuard,
    LearnerLearningService,
    LearnerAssignmentService
  ]
})
export class LearnerLearningModule {}
