import type { DatabaseTransaction } from "@platform/database";
export type LearnerLessonStructure = Readonly<{
  slug: string;
  activities: readonly Readonly<{
    slug: string;
    activityVersionId: string;
    required: boolean;
  }>[];
}>;
export abstract class LearnerCourseContentQuery {
  abstract lessons(
    tx: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    lock?: boolean
  ): Promise<readonly LearnerLessonStructure[] | null>;
}
