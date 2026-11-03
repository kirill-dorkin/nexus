import { ConflictException, Injectable } from "@nestjs/common";
import { manifestActivitySchema } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { QuizValidationContentQuery } from "../application/quiz-validation-content.query";
@Injectable()
export class PostgresQuizValidationContentQuery extends QuizValidationContentQuery {
  async requireDefinition(
    tx: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ) {
    const row = (
      await tx.client.query<{
        slug: string;
        title: string;
        instructions: string;
        activity_type: string;
        config: Record<string, unknown>;
        validation: unknown;
      }>(
        `SELECT a.slug,a.title,a.instructions,a.activity_type,a.config,q.config AS validation
       FROM learning_content.course_version_activities a
       JOIN learning_content.course_versions v ON v.organization_id=a.organization_id AND v.id=a.course_version_id
       JOIN learning_content.quiz_validation_configs q ON q.organization_id=a.organization_id AND q.course_version_id=a.course_version_id AND q.activity_version_id=a.id
       WHERE a.organization_id=$1 AND a.id=$2 AND v.status='published' AND v.manifest_schema_version=1`,
        [organizationId, activityVersionId]
      )
    ).rows[0];
    const parsed =
      row &&
      manifestActivitySchema.safeParse({
        slug: row.slug,
        title: row.title,
        instructions: row.instructions,
        type: row.activity_type,
        skillKeys: ["server-definition"],
        presentation: row.config.presentation,
        validation: row.validation
      });
    if (!parsed?.success)
      throw new ConflictException("Quiz definition is unavailable.");
    return parsed.data;
  }
}
