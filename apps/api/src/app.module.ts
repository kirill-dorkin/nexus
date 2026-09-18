import { Module } from "@nestjs/common";

import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health.controller";
import { AuthenticationModule } from "./modules/authentication/authentication.module";
import { AuthorizationModule } from "./modules/authorization/authorization.module";
import { CommerceModule } from "./modules/commerce/commerce.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { LearningContentModule } from "./modules/learning-content/learning-content.module";
import { LearningDeliveryModule } from "./modules/learning-delivery/learning-delivery.module";
import { LearningGuidanceModule } from "./modules/learning-guidance/learning-guidance.module";
import { LearningHistoryModule } from "./modules/learning-history/learning-history.module";
import { LearningProgressModule } from "./modules/learning-progress/learning-progress.module";
import { LearningProgressionModule } from "./modules/learning-progression/learning-progression.module";
import { LearningReadinessModule } from "./modules/learning-readiness/learning-readiness.module";
import { LearningRecommendationsModule } from "./modules/learning-recommendations/learning-recommendations.module";
import { LearningValidationModule } from "./modules/learning-validation/learning-validation.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { RequestContextModule } from "./request-context/request-context.module";

@Module({
  imports: [
    DatabaseModule,
    RequestContextModule,
    IdentityModule,
    AuthenticationModule,
    AuthorizationModule,
    OrganizationsModule,
    CommerceModule,
    IntegrationsModule,
    ProjectsModule,
    LearningContentModule,
    LearningDeliveryModule,
    LearningHistoryModule,
    LearningProgressModule,
    LearningGuidanceModule,
    LearningValidationModule,
    LearningRecommendationsModule,
    LearningReadinessModule,
    LearningProgressionModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
