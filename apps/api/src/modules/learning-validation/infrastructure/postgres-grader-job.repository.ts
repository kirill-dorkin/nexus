import { Injectable } from "@nestjs/common";
import type { GraderJob } from "@platform/contracts";
import type { GraderJobRequest } from "@platform/contracts/grader";
import type { DatabaseTransaction } from "@platform/database";

import {
  GraderJobRepository,
  type GraderJobCreateResult,
  type NewGraderJob,
  type PersistedGraderJob
} from "../application/grader-job.repository";

type GraderJobRow = {
  job_id: string;
  organization_id: string;
  submission_id: string;
  activity_version_id: string;
  validator_key: string;
  validator_version: number;
  validator_config: Record<string, unknown>;
  profile_key: string;
  profile_version: number;
  profile_fingerprint: string;
  request_payload: GraderJobRequest;
  requested_by_user_id: string | null;
  created_at: Date;
  status: GraderJob["status"];
  attempt_count: number;
  available_at: Date;
  last_error_code: string | null;
  finished_at: Date | null;
  updated_at: Date;
};

const graderJobSelect = `job.job_id,
  job.organization_id::text,
  job.submission_id::text,
  job.activity_version_id::text,
  job.validator_key,
  job.validator_version,
  job.validator_config,
  job.profile_key,
  job.profile_version,
  job.profile_fingerprint,
  job.request_payload,
  job.requested_by_user_id::text,
  job.created_at,
  processing.status,
  processing.attempt_count,
  processing.available_at,
  processing.last_error_code,
  processing.finished_at,
  processing.updated_at`;

function mapGraderJob(row: GraderJobRow): PersistedGraderJob {
  return {
    job: {
      jobId: row.job_id,
      organizationId: row.organization_id,
      submissionId: row.submission_id,
      activityVersionId: row.activity_version_id,
      validatorKey: row.validator_key,
      validatorVersion: row.validator_version,
      profile: {
        key: row.profile_key,
        version: row.profile_version,
        fingerprint: row.profile_fingerprint
      },
      status: row.status,
      attemptCount: row.attempt_count,
      availableAt: row.available_at.toISOString(),
      lastErrorCode: row.last_error_code,
      finishedAt: row.finished_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    },
    requestPayload: row.request_payload,
    validatorConfig: row.validator_config,
    requestedByUserId: row.requested_by_user_id
  };
}

@Injectable()
export class PostgresGraderJobRepository extends GraderJobRepository {
  async createOrFind(
    transaction: DatabaseTransaction,
    input: NewGraderJob
  ): Promise<GraderJobCreateResult> {
    const inserted = await transaction.client.query<{ job_id: string }>(
      `INSERT INTO learning_validation.grader_jobs (
         job_id,
         organization_id,
         submission_id,
         activity_version_id,
         validator_key,
         validator_version,
         validator_config,
         profile_key,
         profile_version,
         profile_fingerprint,
         request_payload,
         requested_by_user_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb, $12
       )
       ON CONFLICT (
         organization_id, submission_id, validator_key, validator_version
       ) DO NOTHING
       RETURNING job_id`,
      [
        input.jobId,
        input.organizationId,
        input.submissionId,
        input.activityVersionId,
        input.validatorKey,
        input.validatorVersion,
        JSON.stringify(input.validatorConfig),
        input.profileKey,
        input.profileVersion,
        input.profileFingerprint,
        JSON.stringify(input.requestPayload),
        input.requestedByUserId
      ]
    );

    const existing = await transaction.client.query<GraderJobRow>(
      `SELECT ${graderJobSelect}
         FROM learning_validation.grader_jobs AS job
         JOIN learning_validation.grader_job_processing AS processing
           ON processing.organization_id = job.organization_id
          AND processing.job_id = job.job_id
        WHERE job.organization_id = $1
          AND job.submission_id = $2
          AND job.validator_key = $3
          AND job.validator_version = $4`,
      [
        input.organizationId,
        input.submissionId,
        input.validatorKey,
        input.validatorVersion
      ]
    );
    const row = existing.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the idempotent grader job.");
    }

    return {
      persisted: mapGraderJob(row),
      created: inserted.rows.length === 1
    };
  }
}
