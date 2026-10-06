import type {
  PublicCourseContent,
  PublicLessonContent
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

/** Public addresses are revalidated by Delivery's narrow database gate. No arbitrary version IDs. */
export abstract class PublicLearningContentQuery {
  abstract readCourse(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string
  ): Promise<PublicCourseContent | null>;
  abstract readLesson(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string,
    lessonSlug: string
  ): Promise<PublicLessonContent | null>;
}
