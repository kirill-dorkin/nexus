import { Injectable } from "@nestjs/common";
import {
  publicCourseContentSchema,
  publicLessonContentSchema
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { PublicLearningContentQuery } from "../application/public-learning-content.query";

@Injectable()
export class PostgresPublicLearningContentQuery extends PublicLearningContentQuery {
  async readCourse(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string
  ) {
    const result = await tx.client.query<{ content: unknown }>(
      "SELECT learning_content.read_public_learning_course($1,$2) AS content",
      [organizationSlug, offeringSlug]
    );
    const parsed = publicCourseContentSchema.safeParse(result.rows[0]?.content);
    return parsed.success ? parsed.data : null;
  }
  async readLesson(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string,
    lessonSlug: string
  ) {
    const result = await tx.client.query<{ content: unknown }>(
      "SELECT learning_content.read_public_learning_lesson($1,$2,$3) AS content",
      [organizationSlug, offeringSlug, lessonSlug]
    );
    const parsed = publicLessonContentSchema.safeParse(result.rows[0]?.content);
    return parsed.success ? parsed.data : null;
  }
}
