import { Injectable } from "@nestjs/common";
import type { MasteryProjection } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  MasteryRepository,
  type MasteryEvidenceAggregate,
  type MaterializedMasteryProjection
} from "../application/mastery.repository";

type AggregateRow = {
  skill_id: string;
  evidence_count: number;
  scored_evidence_count: number;
  score_total: string;
  last_evidence_at: Date;
};

type ProjectionRow = {
  organization_id: string;
  user_id: string;
  skill_id: string;
  algorithm_key: string;
  algorithm_version: number;
  mastery_score: string | null;
  evidence_count: number;
  scored_evidence_count: number;
  last_evidence_at: Date;
  computed_at: Date;
};

function mapAggregate(row: AggregateRow): MasteryEvidenceAggregate {
  return {
    skillId: row.skill_id,
    evidenceCount: row.evidence_count,
    scoredEvidenceCount: row.scored_evidence_count,
    scoreTotal: Number(row.score_total),
    lastEvidenceAt: row.last_evidence_at.toISOString()
  };
}

function mapProjection(row: ProjectionRow): MasteryProjection {
  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    skillId: row.skill_id,
    algorithmKey: row.algorithm_key,
    algorithmVersion: row.algorithm_version,
    masteryScore: row.mastery_score === null ? null : Number(row.mastery_score),
    evidenceCount: row.evidence_count,
    scoredEvidenceCount: row.scored_evidence_count,
    lastEvidenceAt: row.last_evidence_at.toISOString(),
    computedAt: row.computed_at.toISOString()
  };
}

const aggregateSelect = `evidence.skill_id::text AS skill_id,
  count(*)::integer AS evidence_count,
  count(evidence.score)::integer AS scored_evidence_count,
  coalesce(sum(evidence.score), 0)::text AS score_total,
  max(evidence.created_at) AS last_evidence_at`;

const projectionReturning = `organization_id::text,
  user_id::text,
  skill_id::text,
  algorithm_key,
  algorithm_version,
  mastery_score::text,
  evidence_count,
  scored_evidence_count,
  last_evidence_at,
  computed_at`;

@Injectable()
export class PostgresMasteryRepository extends MasteryRepository {
  async lockLearner(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<void> {
    await transaction.client.query(
      `SELECT pg_advisory_xact_lock(
         hashtextextended($1::text, 0)
       )`,
      [`mastery:${organizationId}:${userId}`]
    );
  }

  async aggregateSkillEvidence(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    skillId: string
  ): Promise<MasteryEvidenceAggregate | null> {
    const result = await transaction.client.query<AggregateRow>(
      `SELECT ${aggregateSelect}
         FROM learning_progress.evidence AS evidence
         JOIN learning_progress.attempts AS attempt
           ON attempt.organization_id = evidence.organization_id
          AND attempt.id = evidence.attempt_id
         JOIN learning_delivery.enrollments AS enrollment
           ON enrollment.organization_id = attempt.organization_id
          AND enrollment.id = attempt.enrollment_id
        WHERE evidence.organization_id = $1
          AND enrollment.user_id = $2
          AND evidence.skill_id = $3
        GROUP BY evidence.skill_id`,
      [organizationId, userId, skillId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapAggregate(row);
  }

  async aggregateUserEvidence(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryEvidenceAggregate[]> {
    const result = await transaction.client.query<AggregateRow>(
      `SELECT ${aggregateSelect}
         FROM learning_progress.evidence AS evidence
         JOIN learning_progress.attempts AS attempt
           ON attempt.organization_id = evidence.organization_id
          AND attempt.id = evidence.attempt_id
         JOIN learning_delivery.enrollments AS enrollment
           ON enrollment.organization_id = attempt.organization_id
          AND enrollment.id = attempt.enrollment_id
        WHERE evidence.organization_id = $1
          AND enrollment.user_id = $2
        GROUP BY evidence.skill_id
        ORDER BY evidence.skill_id`,
      [organizationId, userId]
    );
    return result.rows.map(mapAggregate);
  }

  async saveProjection(
    transaction: DatabaseTransaction,
    projection: MaterializedMasteryProjection
  ): Promise<MasteryProjection> {
    const result = await transaction.client.query<ProjectionRow>(
      `INSERT INTO learning_progress.mastery_projections
         (organization_id, user_id, skill_id, algorithm_key, algorithm_version,
          mastery_score, evidence_count, scored_evidence_count, score_total,
          last_evidence_at, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, now())
       ON CONFLICT (organization_id, user_id, skill_id)
       DO UPDATE SET
         algorithm_key = EXCLUDED.algorithm_key,
         algorithm_version = EXCLUDED.algorithm_version,
         mastery_score = EXCLUDED.mastery_score,
         evidence_count = EXCLUDED.evidence_count,
         scored_evidence_count = EXCLUDED.scored_evidence_count,
         score_total = EXCLUDED.score_total,
         last_evidence_at = EXCLUDED.last_evidence_at,
         computed_at = now()
       RETURNING ${projectionReturning}`,
      [
        projection.organizationId,
        projection.userId,
        projection.skillId,
        projection.algorithmKey,
        projection.algorithmVersion,
        projection.masteryScore,
        projection.evidenceCount,
        projection.scoredEvidenceCount,
        projection.scoreTotal,
        projection.lastEvidenceAt
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the materialized Mastery projection.");
    }
    return mapProjection(row);
  }

  async deleteSkillProjection(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    skillId: string
  ): Promise<void> {
    await transaction.client.query(
      `DELETE FROM learning_progress.mastery_projections
        WHERE organization_id = $1
          AND user_id = $2
          AND skill_id = $3`,
      [organizationId, userId, skillId]
    );
  }

  async deleteUserProjections(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<void> {
    await transaction.client.query(
      `DELETE FROM learning_progress.mastery_projections
        WHERE organization_id = $1
          AND user_id = $2`,
      [organizationId, userId]
    );
  }

  async listUserProjections(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryProjection[]> {
    const result = await transaction.client.query<ProjectionRow>(
      `SELECT ${projectionReturning}
         FROM learning_progress.mastery_projections
        WHERE organization_id = $1
          AND user_id = $2
        ORDER BY skill_id`,
      [organizationId, userId]
    );
    return result.rows.map(mapProjection);
  }
}
