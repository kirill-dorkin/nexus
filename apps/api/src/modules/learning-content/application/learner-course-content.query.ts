import type { DatabaseTransaction } from "@platform/database";
export type LearnerLessonStructure = Readonly<{
  slug: string;
  /** The chapter of the lesson in this CourseVersion (ADR-0063), null without chapters. */
  chapter?: string | null;
  activities: readonly Readonly<{
    slug: string;
    /** Stable Activity identity shared by every published version of the same task. */
    activityId: string;
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
  /**
   * Every ActivityVersion of the given Activities (all versions of the course), mapped to its
   * stable Activity id, so progress can recognise work done on an earlier published version.
   */
  abstract activityLineage(
    tx: DatabaseTransaction,
    organizationId: string,
    activityIds: readonly string[]
  ): Promise<ReadonlyMap<string, string>>;
}
