import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  TrustedValidationEvidenceQuery,
  type LearnerEnrollmentReference,
  type LearnerTrustedValidationEvidenceObservation,
  type TrustedValidationEvidenceObservation
} from "../application/learning-progress.query";

type ObservationRow = {
  evidence_id: string;
  attempt_id: string;
  skill_id: string;
  outcome: "passed" | "failed";
  created_at: Date;
};

type LearnerObservationRow = ObservationRow & {
  learner_user_id: string;
};

@Injectable()
export class PostgresTrustedValidationEvidenceQuery extends TrustedValidationEvidenceQuery {
  async listObservations(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerUserId: string,
    skillIds: readonly string[]
  ): Promise<readonly TrustedValidationEvidenceObservation[]> {
    if (skillIds.length === 0) {
      return [];
    }

    const result = await transaction.client.query<ObservationRow>(
      `WITH latest_per_attempt AS (
         SELECT DISTINCT ON (evidence.skill_id, evidence.attempt_id)
                evidence.id::text AS evidence_id,
                evidence.attempt_id::text,
                evidence.skill_id::text,
                evidence.payload->>'outcome' AS outcome,
                evidence.created_at
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
            AND evidence.source_type = 'validation_result'
            AND evidence.source_validation_result_id IS NOT NULL
            AND evidence.payload->>'outcome' IN ('passed', 'failed')
          ORDER BY evidence.skill_id,
                   evidence.attempt_id,
                   evidence.created_at DESC,
                   evidence.id DESC
       )
       SELECT evidence_id,
              attempt_id,
              skill_id,
              outcome,
              created_at
         FROM latest_per_attempt
        ORDER BY skill_id,
                 created_at DESC,
                 evidence_id DESC`,
      [organizationId, learnerUserId, [...skillIds]]
    );

    return result.rows.map((row) => ({
      evidenceId: row.evidence_id,
      attemptId: row.attempt_id,
      skillId: row.skill_id,
      outcome: row.outcome,
      createdAt: row.created_at.toISOString()
    }));
  }

  async listObservationsForEnrollments(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerEnrollments: readonly LearnerEnrollmentReference[],
    skillIds: readonly string[]
  ): Promise<readonly LearnerTrustedValidationEvidenceObservation[]> {
    if (learnerEnrollments.length === 0 || skillIds.length === 0) {
      return [];
    }

    const learnerUserIds = learnerEnrollments.map(
      (reference) => reference.learnerUserId
    );
    const enrollmentIds = learnerEnrollments.map(
      (reference) => reference.enrollmentId
    );

    const result = await transaction.client.query<LearnerObservationRow>(
      `WITH learner_enrollments AS (
         SELECT DISTINCT learner_user_id, enrollment_id
           FROM unnest($2::uuid[], $3::uuid[])
             AS mapping(learner_user_id, enrollment_id)
       ), latest_per_attempt AS (
         SELECT DISTINCT ON (
                  mapping.learner_user_id,
                  evidence.skill_id,
                  evidence.attempt_id
                )
                mapping.learner_user_id::text,
                evidence.id::text AS evidence_id,
                evidence.attempt_id::text,
                evidence.skill_id::text,
                evidence.payload->>'outcome' AS outcome,
                evidence.created_at
           FROM learning_progress.evidence AS evidence
           JOIN learning_progress.attempts AS attempt
             ON attempt.organization_id = evidence.organization_id
            AND attempt.id = evidence.attempt_id
           JOIN learner_enrollments AS mapping
             ON mapping.enrollment_id = attempt.enrollment_id
          WHERE evidence.organization_id = $1
            AND evidence.skill_id = ANY($4::uuid[])
            AND evidence.source_type = 'validation_result'
            AND evidence.source_validation_result_id IS NOT NULL
            AND evidence.payload->>'outcome' IN ('passed', 'failed')
          ORDER BY mapping.learner_user_id,
                   evidence.skill_id,
                   evidence.attempt_id,
                   evidence.created_at DESC,
                   evidence.id DESC
       )
       SELECT learner_user_id,
              evidence_id,
              attempt_id,
              skill_id,
              outcome,
              created_at
         FROM latest_per_attempt
        ORDER BY learner_user_id,
                 skill_id,
                 created_at DESC,
                 evidence_id DESC`,
      [
        organizationId,
        learnerUserIds,
        enrollmentIds,
        [...skillIds]
      ]
    );

    return result.rows.map((row) => ({
      learnerUserId: row.learner_user_id,
      evidenceId: row.evidence_id,
      attemptId: row.attempt_id,
      skillId: row.skill_id,
      outcome: row.outcome,
      createdAt: row.created_at.toISOString()
    }));
  }
}
