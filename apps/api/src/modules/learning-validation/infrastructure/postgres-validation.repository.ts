import { Injectable } from "@nestjs/common";
import type { ValidationResult } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  ValidationRepository,
  type CreateValidationResultOutcome,
  type NewValidationResult
} from "../application/validation.repository";

type ValidationResultRow = {
  id: string;
  organization_id: string;
  submission_id: string;
  activity_version_id: string;
  validator_key: string;
  validator_version: number;
  validator_config: Record<string, unknown>;
  idempotency_key: string;
  status: ValidationResult["status"];
  outcome: ValidationResult["outcome"];
  score: string | null;
  evidence_trust: ValidationResult["evidenceTrust"];
  payload: Record<string, unknown>;
  recorded_by_user_id: string | null;
  recorded_at: Date;
};

const validationResultSelect = `id::text,
  organization_id::text,
  submission_id::text,
  activity_version_id::text,
  validator_key,
  validator_version,
  validator_config,
  idempotency_key,
  status,
  outcome,
  score::text,
  evidence_trust,
  payload,
  recorded_by_user_id::text,
  recorded_at`;

function mapValidationResult(row: ValidationResultRow): ValidationResult {
  return {
    id: row.id,
    organizationId: row.organization_id,
    submissionId: row.submission_id,
    activityVersionId: row.activity_version_id,
    validatorKey: row.validator_key,
    validatorVersion: row.validator_version,
    validatorConfig: row.validator_config,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    outcome: row.outcome,
    score: row.score === null ? null : Number(row.score),
    evidenceTrust: row.evidence_trust,
    payload: row.payload,
    recordedByUserId: row.recorded_by_user_id,
    recordedAt: row.recorded_at.toISOString()
  };
}

@Injectable()
export class PostgresValidationRepository extends ValidationRepository {
  async createOrFind(
    transaction: DatabaseTransaction,
    result: NewValidationResult
  ): Promise<CreateValidationResultOutcome> {
    const inserted = await transaction.client.query<ValidationResultRow>(
      `INSERT INTO learning_validation.validation_results
         (id, organization_id, submission_id, activity_version_id,
          validator_key, validator_version, validator_config, idempotency_key,
          status, outcome, score, evidence_trust, payload, recorded_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12,
               $13::jsonb, $14)
       ON CONFLICT (
         organization_id, submission_id, validator_key, validator_version,
         idempotency_key
       ) DO NOTHING
       RETURNING ${validationResultSelect}`,
      [
        result.id,
        result.organizationId,
        result.submissionId,
        result.activityVersionId,
        result.validatorKey,
        result.validatorVersion,
        JSON.stringify(result.validatorConfig),
        result.idempotencyKey,
        result.status,
        result.outcome,
        result.score,
        result.evidenceTrust,
        JSON.stringify(result.payload),
        result.recordedByUserId
      ]
    );

    const insertedRow = inserted.rows[0];
    if (insertedRow !== undefined) {
      return { result: mapValidationResult(insertedRow), created: true };
    }

    const existing = await transaction.client.query<ValidationResultRow>(
      `SELECT ${validationResultSelect}
         FROM learning_validation.validation_results
        WHERE organization_id = $1
          AND submission_id = $2
          AND validator_key = $3
          AND validator_version = $4
          AND idempotency_key = $5`,
      [
        result.organizationId,
        result.submissionId,
        result.validatorKey,
        result.validatorVersion,
        result.idempotencyKey
      ]
    );
    const existingRow = existing.rows[0];
    if (existingRow === undefined) {
      throw new Error("PostgreSQL did not return the idempotent validation result.");
    }

    return { result: mapValidationResult(existingRow), created: false };
  }
}
