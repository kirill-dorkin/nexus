import { Injectable } from "@nestjs/common";
import type { Attempt, Evidence } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  LearningProgressRepository,
  type AttemptContext,
  type NewAttempt,
  type NewEvidence
} from "../application/learning-progress.repository";

type AttemptRow = {
  id: string;
  organization_id: string;
  enrollment_id: string;
  activity_version_id: string;
  attempt_number: number;
  submission: Record<string, unknown>;
  submitted_at: Date;
};

type AttemptContextRow = AttemptRow & { offering_id: string };

type EvidenceRow = {
  id: string;
  organization_id: string;
  attempt_id: string;
  skill_id: string;
  kind: string;
  score: string | null;
  payload: Record<string, unknown>;
  recorded_by_user_id: string | null;
  created_at: Date;
};

const attemptSelect = `attempt.id::text,
  attempt.organization_id::text,
  attempt.enrollment_id::text,
  attempt.activity_version_id::text,
  attempt.attempt_number,
  attempt.submission,
  attempt.submitted_at`;

function mapAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    organizationId: row.organization_id,
    enrollmentId: row.enrollment_id,
    activityVersionId: row.activity_version_id,
    attemptNumber: row.attempt_number,
    submission: row.submission,
    submittedAt: row.submitted_at.toISOString()
  };
}

function mapEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    organizationId: row.organization_id,
    attemptId: row.attempt_id,
    skillId: row.skill_id,
    kind: row.kind,
    score: row.score === null ? null : Number(row.score),
    payload: row.payload,
    recordedByUserId: row.recorded_by_user_id,
    createdAt: row.created_at.toISOString()
  };
}

@Injectable()
export class PostgresLearningProgressRepository extends LearningProgressRepository {
  async createAttempt(
    transaction: DatabaseTransaction,
    attempt: NewAttempt
  ): Promise<Attempt> {
    const result = await transaction.client.query<AttemptRow>(
      `WITH locked_enrollment AS (
         SELECT id
           FROM learning_delivery.enrollments
          WHERE organization_id = $2
            AND id = $3
          FOR UPDATE
       ), next_attempt AS (
         SELECT COALESCE(MAX(attempt_number), 0) + 1 AS attempt_number
           FROM learning_progress.attempts
          WHERE organization_id = $2
            AND enrollment_id = $3
            AND activity_version_id = $4
       )
       INSERT INTO learning_progress.attempts
         (id, organization_id, enrollment_id, activity_version_id,
          attempt_number, submission)
       SELECT $1, $2, $3, $4, next_attempt.attempt_number, $5::jsonb
         FROM locked_enrollment
         CROSS JOIN next_attempt
       RETURNING id::text,
                 organization_id::text,
                 enrollment_id::text,
                 activity_version_id::text,
                 attempt_number,
                 submission,
                 submitted_at`,
      [
        attempt.id,
        attempt.organizationId,
        attempt.enrollmentId,
        attempt.activityVersionId,
        JSON.stringify(attempt.submission)
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created attempt.");
    }
    return mapAttempt(row);
  }

  async findAttemptContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<AttemptContext | null> {
    const result = await transaction.client.query<AttemptContextRow>(
      `SELECT ${attemptSelect}, enrollment.offering_id::text
         FROM learning_progress.attempts AS attempt
         JOIN learning_delivery.enrollments AS enrollment
           ON enrollment.organization_id = attempt.organization_id
          AND enrollment.id = attempt.enrollment_id
        WHERE attempt.organization_id = $1
          AND attempt.id = $2`,
      [organizationId, attemptId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      attempt: mapAttempt(row),
      offeringId: row.offering_id
    };
  }

  async createEvidence(
    transaction: DatabaseTransaction,
    evidence: NewEvidence
  ): Promise<Evidence> {
    const result = await transaction.client.query<EvidenceRow>(
      `INSERT INTO learning_progress.evidence
         (id, organization_id, attempt_id, skill_id, kind, score,
          payload, recorded_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING id::text,
                 organization_id::text,
                 attempt_id::text,
                 skill_id::text,
                 kind,
                 score::text,
                 payload,
                 recorded_by_user_id::text,
                 created_at`,
      [
        evidence.id,
        evidence.organizationId,
        evidence.attemptId,
        evidence.skillId,
        evidence.kind,
        evidence.score,
        JSON.stringify(evidence.payload),
        evidence.recordedByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created evidence.");
    }
    return mapEvidence(row);
  }
}
