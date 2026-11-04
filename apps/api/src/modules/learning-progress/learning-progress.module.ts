import { QuizSubmissionCommand } from "./application/quiz-submission.command";
import { CourseActivityProgressQuery } from "./application/course-activity-progress.query";
import { PostgresCourseActivityProgressQuery } from "./infrastructure/postgres-course-activity-progress.query";
import { OwnSkillsQuery } from "./application/own-skills.query";
import { OwnSkillsApplicationService } from "./application/own-skills.service";
import { SkillConfirmationRepository } from "./application/skill-confirmation.repository";
import { PostgresSkillConfirmationRepository } from "./infrastructure/postgres-skill-confirmation.repository";
import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningHistoryModule } from "../learning-history/learning-history.module";
import { AttemptGuidanceQuery } from "./application/attempt-guidance.query";
import { AttemptGuidanceReader } from "./application/attempt-guidance.reader";
import { LearnerSkillProgressApplicationService } from "./application/learner-skill-progress.service";
import { OwnSkillProgressQuery } from "./application/own-skill-progress.query";
import {
  LearningProgressQuery,
  ReadinessEvidenceQuery,
  TrustedValidationEvidenceQuery
} from "./application/learning-progress.query";
import { LearningProgressRepository } from "./application/learning-progress.repository";
import { LearningProgressApplicationService } from "./application/learning-progress.service";
import { MasteryQuery } from "./application/mastery.query";
import { MasteryRepository } from "./application/mastery.repository";
import { MasteryApplicationService } from "./application/mastery.service";
import { TrustedValidationEvidenceSink } from "./application/trusted-validation-evidence.sink";
import { TrustedValidationEvidenceApplicationService } from "./application/trusted-validation-evidence.service";
import { PostgresLearningProgressRepository } from "./infrastructure/postgres-learning-progress.repository";
import { PostgresMasteryRepository } from "./infrastructure/postgres-mastery.repository";
import { PostgresReadinessEvidenceQuery } from "./infrastructure/postgres-readiness-evidence.query";
import { PostgresTrustedValidationEvidenceQuery } from "./infrastructure/postgres-trusted-validation-evidence.query";
import { LearnerSkillProgressController } from "./learner-skill-progress.controller";
import { LearningProgressController } from "./learning-progress.controller";
import { MasteryController } from "./mastery.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    OutboxModule,
    LearningContentModule,
    LearningDeliveryModule,
    LearningHistoryModule
  ],
  controllers: [
    LearningProgressController,
    MasteryController,
    LearnerSkillProgressController
  ],
  providers: [
    {
      provide: QuizSubmissionCommand,
      useExisting: LearningProgressApplicationService
    },
    {
      provide: CourseActivityProgressQuery,
      useClass: PostgresCourseActivityProgressQuery
    },
    LearningProgressApplicationService,
    AttemptGuidanceReader,
    MasteryApplicationService,
    LearnerSkillProgressApplicationService,
    {
      provide: OwnSkillProgressQuery,
      useExisting: LearnerSkillProgressApplicationService
    },
    OwnSkillsApplicationService,
    { provide: OwnSkillsQuery, useExisting: OwnSkillsApplicationService },
    {
      provide: SkillConfirmationRepository,
      useClass: PostgresSkillConfirmationRepository
    },
    TrustedValidationEvidenceApplicationService,
    {
      provide: LearningProgressQuery,
      useExisting: LearningProgressApplicationService
    },
    { provide: AttemptGuidanceQuery, useExisting: AttemptGuidanceReader },
    {
      provide: TrustedValidationEvidenceSink,
      useExisting: TrustedValidationEvidenceApplicationService
    },
    {
      provide: TrustedValidationEvidenceQuery,
      useClass: PostgresTrustedValidationEvidenceQuery
    },
    {
      provide: ReadinessEvidenceQuery,
      useClass: PostgresReadinessEvidenceQuery
    },
    { provide: MasteryQuery, useExisting: MasteryApplicationService },
    {
      provide: LearningProgressRepository,
      useClass: PostgresLearningProgressRepository
    },
    { provide: MasteryRepository, useClass: PostgresMasteryRepository }
  ],
  exports: [
    QuizSubmissionCommand,
    CourseActivityProgressQuery,
    OwnSkillProgressQuery,
    OwnSkillsQuery,
    MasteryApplicationService,
    LearningProgressQuery,
    AttemptGuidanceQuery,
    TrustedValidationEvidenceSink,
    TrustedValidationEvidenceQuery,
    ReadinessEvidenceQuery,
    MasteryQuery
  ]
})
export class LearningProgressModule {}
