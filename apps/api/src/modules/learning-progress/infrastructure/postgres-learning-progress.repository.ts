import { Injectable } from "@nestjs/common";
import type { Attempt, Evidence, Submission } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import type { ActivityAttemptCount } from "../application/learning-progress.query";
import {
  LearningProgressRepository,
  type AttemptContext,
  type CreateValidationEvidenceOutcome,
  type NewAttempt,
  type NewEvidence,
  type NewSubmission,
  type SubmissionContext
} from "../application/learning-progress.repository";

type AttemptRow = {
  id: string;
  organization_id: string;
  enrollment_id: string;
  activity_version_id: string;
  attempt_number: number;
  created_at: Date;
};

type AttemptContextRow = AttemptRow & {
  offering_id: string;
  learner_user_id: string;
};

type SubmissionRow = {
  id: string;
  organization_id: string;
  attempt_id: string;
  payload: Record<string, unknown>;
  submitted_by_user_id: string;
  submitted_at: Date;
};

type SubmissionContextRow = SubmissionRow & {
  attempt_enrollment_id: string;
  attempt_activity_version_id: string;
  attempt_number: number;
  attempt_started_at: Date;
  offering_id: string;
  learner_user_id: string;
};

type ActivityAttemptCountRow = {
  activity_version_id: string;
  attempt_count: number;
};

type EvidenceRow = {
  id: string;
  organization_id: string;
  attempt_id: string;
  submission_id: string;
  skill_id: string;
  kind: string;
  score: string | null;
  payload: Record<string, unknown>;
  recorded_by_user_id: string | null;
  source_type: "manual" | "validation_result";
  source_validation_result_id: string | null;
  created_at: Date;
};

const attemptSelect = `attempt.id::text,
  attempt.organization_id::text,
  attempt.enrollment_id::text,
  attempt.activity_version_id::text,
  attempt.attempt_number,
  attempt.created_at`;

const evidenceReturning = `id::text,
  organization_id::text,
  attempt_id::text,
  submission_id::text,
  skill_id::text,
  kind,
  score::text,
  payload,
  recorded_by_user_id::text,
  source_type,
  source_validation_result_id::text,
  created_at`;

function mapAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    organizationId: row.organization_id,
    enrollmentId: row.enrollment_id,
    activityVersionId: row.activity_version_id,
    attemptNumber: row.attempt_number,
    startedAt: row.created_at.toISOString()
  };
}

function mapSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    organizationId: row.organization_id,
    attemptId: row.attempt_id,
    payload: row.payload,
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at.toISOString()
  };
}

function mapEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    organizationId: row.organization_id,
    attemptId: row.attempt_id,
    submissionId: row.submission_id,
    skillId: row.skill_id,
    kind: row.kind,
    score: row.score === null ? null : Number(row.score),
    payload: row.payload,
    recordedByUserId: row.recorded_by_user_id,
    sourceType: row.source_type,
    sourceValidationResultId: row.source_validation_result_id,
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
         (id, organization_id, enrollment_id, activity_version_id, attempt_number)
       SELECT $1, $2, $3, $4, next_attempt.attempt_number
         FROM locked_enrollment
         CROSS JOIN next_attempt
       RETURNING id::text,
                 organization_id::text,
                 enrollment_id::text,
                 activity_version_id::text,
                 attempt_number,
                 created_at`,
      [
        attempt.id,
        attempt.organizationId,
        attempt.enrollmentId,
        attempt.activityVersionId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created attempt.");
    }
    return mapAttempt(row);
  }

  async createSubmission(
    transaction: DatabaseTransaction,
    submission: NewSubmission
  ): Promise<Submission> {
    const result = await transaction.client.query<SubmissionRow>(
      `INSERT INTO learning_progress.submissions
         (id, organization_id, attempt_id, payload, submitted_by_user_id)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING id::text,
                 organization_id::text,
                 attempt_id::text,
                 payload,
                 submitted_by_user_id::text,
                 submitted_at`,
      [
        submission.id,
        submission.organizationId,
        submission.attemptId,
        JSON.stringify(submission.payload),
        submission.submittedByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created submission.");
    }
    return mapSubmission(row);
  }

  async findAttemptContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<AttemptContext | null> {
    const result = await transaction.client.query<AttemptContextRow>(
      `SELECT ${attemptSelect},
              enrollment.offering_id::text,
              enrollment.user_id::text AS learner_user_id
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
      offeringId: row.offering_id,
      learnerUserId: row.learner_user_id
    };
  }

  async findSubmissionContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    submissionId: string
  ): Promise<SubmissionContext | null> {
    const result = await transaction.client.query<SubmissionContextRow>(
      `SELECT submission.id::text,
              submission.organization_id::text,
              submission.attempt_id::text,
              submission.payload,
              submission.submitted_by_user_id::text,
              submission.submitted_at,
              attempt.enrollment_id::text AS attempt_enrollment_id,
              attempt.activity_version_id::text AS attempt_activity_version_id,
              attempt.attempt_number,
              attempt.created_at AS attempt_started_at,
              enrollment.offering_id::text,
              enrollment.user_id::text AS learner_user_id
         FROM learning_progress.submissions AS submission
         JOIN learning_progress.attempts AS attempt
           ON attempt.organization_id = submission.organization_id
          AND attempt.id = submission.attempt_id
         JOIN learning_delivery.enrollments AS enrollment
           ON enrollment.organization_id = attempt.organization_id
          AND enrollment.id = attempt.enrollment_id
        WHERE submission.organization_id = $1
          AND submission.id = $2`,
      [organizationId, submissionId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }

    return {
      submission: mapSubmission(row),
      attempt: {
        id: row.attempt_id,
        organizationId: row.organization_id,
        enrollmentId: row.attempt_enrollment_id,
        activityVersionId: row.attempt_activity_version_id,
        attemptNumber: row.attempt_number,
        startedAt: row.attempt_started_at.toISOString()
      },
      offeringId: row.offering_id,
      learnerUserId: row.learner_user_id
    };
  }

  async findSubmissionByAttempt(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<Submission | null> {
    const result = await transaction.client.query<SubmissionRow>(
      `SELECT id::text,
              organization_id::text,
              attempt_id::text,
              payload,
              submitted_by_user_id::text,
              submitted_at
         FROM learning_progress.submissions
        WHERE organization_id = $1
          AND attempt_id = $2`,
      [organizationId, attemptId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapSubmission(row);
  }

  async listActivityAttemptCounts(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ): Promise<readonly ActivityAttemptCount[]> {
    if (activityVersionIds.length === 0) {
      return [];
    }

    const result = await transaction.client.query<ActivityAttemptCountRow>(
      `SELECT attempt.activity_version_id::text,
              count(*)::integer AS attempt_count
         FROM learning_progress.attempts AS attempt
         JOIN learning_progress.submissions AS submission
           ON submission.organization_id = attempt.organization_id
          AND submission.attempt_id = attempt.id
        WHERE attempt.organization_id = $1
          AND attempt.enrollment_id = $2
          AND attempt.activity_version_id = ANY($3::uuid[])
        GROUP BY attempt.activity_version_id
        ORDER BY attempt.activity_version_id`,
      [organizationId, enrollmentId, [...activityVersionIds]]
    );

    return result.rows.map((row) => ({
      activityVersionId: row.activity_version_id,
      attemptCount: row.attempt_count
    }));
  }

  async createEvidence(
    transaction: DatabaseTransaction,
    evidence: NewEvidence
  ): Promise<Evidence> {
    const result = await transaction.client.query<EvidenceRow>(
      `INSERT INTO learning_progress.evidence
         (id, organization_id, attempt_id, submission_id, skill_id, kind, score,
          payload, recorded_by_user_id, source_type, source_validation_result_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
       RETURNING ${evidenceReturning}`,
      [
        evidence.id,
        evidence.organizationId,
        evidence.attemptId,
        evidence.submissionId,
        evidence.skillId,
        evidence.kind,
        evidence.score,
        JSON.stringify(evidence.payload),
        evidence.recordedByUserId,
        evidence.sourceType,
        evidence.sourceValidationResultId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created evidence.");
    }
    return mapEvidence(row);
  }

  async createOrFindValidationEvidence(
    transaction: DatabaseTransaction,
    evidence: NewEvidence
  ): Promise<CreateValidationEvidenceOutcome> {
    if (
      evidence.sourceType !== "validation_result" ||
      evidence.sourceValidationResultId === null
    ) {
      throw new Error("Validation Evidence requires ValidationResult provenance.");
    }

    const inserted = await transaction.client.query<EvidenceRow>(
      `INSERT INTO learning_progress.evidence
         (id, organization_id, attempt_id, submission_id, skill_id, kind, score,
          payload, recorded_by_user_id, source_type, source_validation_result_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NULL, 'validation_result', $9)
       ON CONFLICT (organization_id, source_validation_result_id, skill_id)
         WHERE source_type = 'validation_result'
       DO NOTHING
       RETURNING ${evidenceReturning}`,
      [
        evidence.id,
        evidence.organizationId,
        evidence.attemptId,
        evidence.submissionId,
        evidence.skillId,
        evidence.kind,
        evidence.score,
        JSON.stringify(evidence.payload),
        evidence.sourceValidationResultId
      ]
    );
    const insertedRow = inserted.rows[0];
    if (insertedRow !== undefined) {
      return { evidence: mapEvidence(insertedRow), created: true };
    }

    const existing = await transaction.client.query<EvidenceRow>(
      `SELECT ${evidenceReturning}
         FROM learning_progress.evidence
        WHERE organization_id = $1
          AND source_type = 'validation_result'
          AND source_validation_result_id = $2
          AND skill_id = $3`,
      [
        evidence.organizationId,
        evidence.sourceValidationResultId,
        evidence.skillId
      ]
    );
    const existingRow = existing.rows[0];
    if (existingRow === undefined) {
      throw new Error("PostgreSQL did not return idempotent validation Evidence.");
    }
    return { evidence: mapEvidence(existingRow), created: false };
  }
}
