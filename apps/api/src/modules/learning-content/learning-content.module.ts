import { LearnerCourseContentQuery } from "./application/learner-course-content.query";
import { PostgresLearnerCourseContentQuery } from "./infrastructure/postgres-learner-course-content.query";
import { PublicLearningContentQuery } from "./application/public-learning-content.query";
import { PostgresPublicLearningContentQuery } from "./infrastructure/postgres-public-learning-content.query";
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
  controllers: [LearningContentController, SkillsController, CourseManifestController],
  providers: [
    { provide: LearnerCourseContentQuery, useClass: PostgresLearnerCourseContentQuery },
    { provide: PublicLearningContentQuery, useClass: PostgresPublicLearningContentQuery },
    LearningContentApplicationService,
    CourseManifestApplicationService,
    BrowserWriteOriginGuard,
    { provide: CourseManifestRepository, useClass: PostgresCourseManifestRepository },
    LearningGraphApplicationService,
    { provide: LearningContentQuery, useExisting: LearningGraphApplicationService },
    { provide: GuidedBuildContentQuery, useExisting: LearningGraphApplicationService },
    { provide: LearningContentRepository, useClass: PostgresLearningContentRepository },
    { provide: LearningGraphRepository, useClass: PostgresLearningGraphRepository }
  ],
  exports: [
    LearnerCourseContentQuery,
    PublicLearningContentQuery, LearningContentApplicationService, LearningGraphApplicationService, LearningContentQuery, GuidedBuildContentQuery]
})
export class LearningContentModule {}
