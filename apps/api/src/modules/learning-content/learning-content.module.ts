import { StudioController } from "./studio.controller";
import { StudioApplicationService } from "./application/studio.service";
import { StudioRepository } from "./application/studio.repository";
import { PostgresStudioRepository } from "./infrastructure/postgres-studio.repository";
import { QuizValidationContentQuery } from "./application/quiz-validation-content.query";
import { PostgresQuizValidationContentQuery } from "./infrastructure/postgres-quiz-validation-content.query";
import { SkillTestContentQuery } from "./application/skill-test-content.query";
import { PostgresSkillTestContentQuery } from "./infrastructure/postgres-skill-test-content.query";
import { LearnerCourseContentQuery } from "./application/learner-course-content.query";
import { PostgresLearnerCourseContentQuery } from "./infrastructure/postgres-learner-course-content.query";
import { PublicLearningContentQuery } from "./application/public-learning-content.query";
import { PostgresPublicLearningContentQuery } from "./infrastructure/postgres-public-learning-content.query";
import { SkillKeyQuery } from "./application/skill-key.query";
import { PostgresSkillKeyQuery } from "./infrastructure/postgres-skill-key.query";
import { Module } from "@nestjs/common";
import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { GuidedBuildContentQuery } from "./application/guided-build-content.query";
import { LearningContentQuery } from "./application/learning-content.query";
import { LearningContentRepository } from "./application/learning-content.repository";
import { LearningContentApplicationService } from "./application/learning-content.service";
import { LearningGraphRepository } from "./application/learning-graph.repository";
import { LearningGraphApplicationService } from "./application/learning-graph.service";
import { PostgresLearningContentRepository } from "./infrastructure/postgres-learning-content.repository";
import { PostgresLearningGraphRepository } from "./infrastructure/postgres-learning-graph.repository";
import { LearningContentController } from "./learning-content.controller";
import { SkillsController } from "./skills.controller";
import { CourseManifestRepository } from "./application/course-manifest.repository";
import { CourseManifestApplicationService } from "./application/course-manifest.service";
import { PostgresCourseManifestRepository } from "./infrastructure/postgres-course-manifest.repository";
import { CourseManifestController } from "./course-manifest.controller";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";

@Module({
  imports: [IdentityModule, AuthorizationModule, OutboxModule],
  controllers: [
    LearningContentController,
    SkillsController,
    CourseManifestController,
    StudioController
  ],
  providers: [
    StudioApplicationService,
    { provide: StudioRepository, useClass: PostgresStudioRepository },
    {
      provide: QuizValidationContentQuery,
      useClass: PostgresQuizValidationContentQuery
    },
    {
      provide: SkillTestContentQuery,
      useClass: PostgresSkillTestContentQuery
    },
    { provide: SkillKeyQuery, useClass: PostgresSkillKeyQuery },
    {
      provide: LearnerCourseContentQuery,
      useClass: PostgresLearnerCourseContentQuery
    },
    {
      provide: PublicLearningContentQuery,
      useClass: PostgresPublicLearningContentQuery
    },
    LearningContentApplicationService,
    CourseManifestApplicationService,
    BrowserWriteOriginGuard,
    {
      provide: CourseManifestRepository,
      useClass: PostgresCourseManifestRepository
    },
    LearningGraphApplicationService,
    {
      provide: LearningContentQuery,
      useExisting: LearningGraphApplicationService
    },
    {
      provide: GuidedBuildContentQuery,
      useExisting: LearningGraphApplicationService
    },
    {
      provide: LearningContentRepository,
      useClass: PostgresLearningContentRepository
    },
    {
      provide: LearningGraphRepository,
      useClass: PostgresLearningGraphRepository
    }
  ],
  exports: [
    SkillKeyQuery,
    QuizValidationContentQuery,
    SkillTestContentQuery,
    LearnerCourseContentQuery,
    PublicLearningContentQuery,
    LearningContentApplicationService,
    LearningGraphApplicationService,
    LearningContentQuery,
    GuidedBuildContentQuery
  ]
})
export class LearningContentModule {}
