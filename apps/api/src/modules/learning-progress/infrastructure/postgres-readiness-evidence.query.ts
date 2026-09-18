import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  ReadinessEvidenceQuery,
  type ReadinessEvidenceSummary
} from "../application/learning-progress.query";

type ReadinessEvidenceSummaryRow = {
  skill_id: string;
  scored_attempt_count: number;
  last_scored_evidence_at: Date;
};

@Injectable()
export class PostgresReadinessEvidenceQuery extends ReadinessEvidenceQuery {
  async listScoredAttemptSummaries(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerUserId: string,
    skillIds: readonly string[]
  ): Promise<readonly ReadinessEvidenceSummary[]> {
    if (skillIds.length === 0) {
      return [];
    }

    const result = await transaction.client.query<ReadinessEvidenceSummaryRow>(
      `SELECT evidence.skill_id::text AS skill_id,
              count(DISTINCT evidence.attempt_id)::integer AS scored_attempt_count,
              max(evidence.created_at) AS last_scored_evidence_at
         FROM learning_progress.evidence AS evidence
         JOIN learning_progress.attempts AS attempt
           ON attempt.organization_id = evidence.organization_id
          AND attempt.id = evidence.attempt_id
         JOIN learning_delivery.enrollments AS enrollment
           ON enrollment.organization_id = attempt.organization_id
          AND enrollment.id = attempt.enrollment_id
        WHERE evidence.organization_id = $1
          AND enrollment.user_id = $2
          AND evidence.skill_id = ANY($3::uuid[])
          AND evidence.score IS NOT NULL
        GROUP BY evidence.skill_id
        ORDER BY evidence.skill_id`,
      [organizationId, learnerUserId, [...skillIds]]
    );

    return result.rows.map((row) => ({
      skillId: row.skill_id,
      scoredAttemptCount: row.scored_attempt_count,
      lastScoredEvidenceAt: row.last_scored_evidence_at.toISOString()
    }));
  }
}
