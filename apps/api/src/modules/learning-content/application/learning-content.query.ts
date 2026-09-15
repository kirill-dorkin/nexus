import type {
  CourseVersionActivity,
  CourseVersionSkill
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type PublishedLearningGraph = Readonly<{
  skills: readonly CourseVersionSkill[];
  activities: readonly CourseVersionActivity[];
}>;

export abstract class LearningContentQuery {
  abstract requirePublishedLearningGraph(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string
  ): Promise<PublishedLearningGraph>;

  abstract requireActivityVersionById(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<CourseVersionActivity>;
}
