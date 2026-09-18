import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  ReadinessEvidenceQuery,
  type LearnerEnrollmentReference,
  type LearnerReadinessEvidenceSummary,
  type ReadinessEvidenceSummary
} from "../application/learning-progress.query";

type ReadinessEvidenceSummaryRow = {
  skill_id: string;
  scored_attempt_count: number;
  last_scored_evidence_at: Date;
};

type LearnerReadinessEvidenceSummaryRow = ReadinessEvidenceSummaryRow & {
  learner_user_id: string;
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

  async listScoredAttemptSummariesForEnrollments(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerEnrollments: readonly LearnerEnrollmentReference[],
    skillIds: readonly string[]
  ): Promise<readonly LearnerReadinessEvidenceSummary[]> {
    if (learnerEnrollments.length === 0 || skillIds.length === 0) {
      return [];
    }

    const learnerUserIds = learnerEnrollments.map(
      (reference) => reference.learnerUserId
    );
    const enrollmentIds = learnerEnrollments.map(
      (reference) => reference.enrollmentId
    );

    const result =
      await transaction.client.query<LearnerReadinessEvidenceSummaryRow>(
        `WITH learner_enrollments AS (
           SELECT DISTINCT learner_user_id, enrollment_id
             FROM unnest($2::uuid[], $3::uuid[])
               AS mapping(learner_user_id, enrollment_id)
         )
         SELECT mapping.learner_user_id::text,
                evidence.skill_id::text AS skill_id,
                count(DISTINCT evidence.attempt_id)::integer AS scored_attempt_count,
                max(evidence.created_at) AS last_scored_evidence_at
           FROM learning_progress.evidence AS evidence
           JOIN learning_progress.attempts AS attempt
             ON attempt.organization_id = evidence.organization_id
            AND attempt.id = evidence.attempt_id
           JOIN learner_enrollments AS mapping
             ON mapping.enrollment_id = attempt.enrollment_id
          WHERE evidence.organization_id = $1
            AND evidence.skill_id = ANY($4::uuid[])
            AND evidence.score IS NOT NULL
          GROUP BY mapping.learner_user_id, evidence.skill_id
          ORDER BY mapping.learner_user_id, evidence.skill_id`,
        [
          organizationId,
          learnerUserIds,
          enrollmentIds,
          [...skillIds]
        ]
      );

    return result.rows.map((row) => ({
      learnerUserId: row.learner_user_id,
      skillId: row.skill_id,
      scoredAttemptCount: row.scored_attempt_count,
      lastScoredEvidenceAt: row.last_scored_evidence_at.toISOString()
    }));
  }
}
