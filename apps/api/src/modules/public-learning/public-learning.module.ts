import { Module } from "@nestjs/common";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PublicLearningController } from "./public-learning.controller";
import { PublicLearningService } from "./public-learning.service";
@Module({
  imports: [OrganizationsModule, LearningContentModule, LearningDeliveryModule],
  controllers: [PublicLearningController],
  providers: [PublicLearningService]
})
export class PublicLearningModule {}
