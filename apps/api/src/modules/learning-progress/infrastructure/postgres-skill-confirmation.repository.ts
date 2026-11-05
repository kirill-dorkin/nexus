import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  SkillConfirmationRepository,
  type SkillConfirmationAggregate
} from "../application/skill-confirmation.repository";

type ConfirmationRow = {
  skill_id: string;
  confirmations: number;
  first_confirmed_at: Date;
  last_confirmed_at: Date;
  confirmed_days: string[];
};

const maxConfirmedDays = 30;

@Injectable()
export class PostgresSkillConfirmationRepository extends SkillConfirmationRepository {
  async aggregateConfirmations(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentIds: readonly string[]
  ): Promise<readonly SkillConfirmationAggregate[]> {
    if (enrollmentIds.length === 0) return [];
    // Validation-derived Evidence carries the normalized outcome in its
    // payload (trusted-validation-evidence-normalizer); manual Evidence has none.
    const result = await transaction.client.query<ConfirmationRow>(
      `SELECT evidence.skill_id::text AS skill_id,
              count(*)::integer AS confirmations,
              min(evidence.created_at) AS first_confirmed_at,
              max(evidence.created_at) AS last_confirmed_at,
              array_agg(
                DISTINCT to_char(evidence.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
                ORDER BY to_char(evidence.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
              ) AS confirmed_days
         FROM learning_progress.evidence AS evidence
         JOIN learning_progress.attempts AS attempt
           ON attempt.organization_id = evidence.organization_id
          AND attempt.id = evidence.attempt_id
        WHERE evidence.organization_id = $1
          AND attempt.enrollment_id = ANY($2::uuid[])
          AND evidence.source_type = 'validation_result'
          AND evidence.payload ->> 'outcome' = 'passed'
        GROUP BY evidence.skill_id`,
      [organizationId, [...enrollmentIds]]
    );
    return result.rows.map((row) => ({
      skillId: row.skill_id,
      confirmations: row.confirmations,
      firstConfirmedAt: row.first_confirmed_at.toISOString(),
      lastConfirmedAt: row.last_confirmed_at.toISOString(),
      confirmedDays: row.confirmed_days.slice(-maxConfirmedDays)
    }));
  }
}
