import type {
  Course,
  CourseVersion,
  CreateCourseResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewCourse = Readonly<{
  id: string;
  organizationId: string;
  slug: string;
  createdByUserId: string;
}>;

export type NewCourseVersion = Readonly<{
  id: string;
  organizationId: string;
  courseId: string;
  title: string;
  description: string | null;
  createdByUserId: string;
}>;

export abstract class LearningContentRepository {
  abstract createCourseWithInitialDraft(
    transaction: DatabaseTransaction,
    course: NewCourse,
    version: NewCourseVersion
  ): Promise<CreateCourseResult>;

  abstract createNextDraftVersion(
    transaction: DatabaseTransaction,
    version: NewCourseVersion
  ): Promise<CourseVersion | null>;

  abstract publishDraftVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string,
    versionId: string,
    publishedByUserId: string
  ): Promise<CourseVersion | null>;

  abstract findCourse(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string
  ): Promise<Course | null>;

  abstract findVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    versionId: string
  ): Promise<CourseVersion | null>;

  /** Published version ids of one Course, oldest first. */
  abstract listPublishedVersionIds(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string
  ): Promise<readonly string[]>;
}
