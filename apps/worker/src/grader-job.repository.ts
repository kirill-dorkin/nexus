import type { GraderJobRequest, GraderJobResult } from "@platform/contracts/grader";
import type { DatabasePool } from "@platform/database";

export type ClaimedGraderJob = Readonly<{
  jobId: string;
  organizationId: string;
  submissionId: string;
  activityVersionId: string;
  validatorKey: string;
  validatorVersion: number;
  validatorConfig: Readonly<Record<string, unknown>>;
  profileKey: string;
  profileVersion: number;
  profileFingerprint: string;
  request: GraderJobRequest;
  attemptCount: number;
  leaseToken: string;
  leaseExpiresAt: Date;
}>;

export type GraderFailureState = "retryable" | "dead_letter" | null;

type ClaimedGraderJobRow = {
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
  attempt_count: number;
  lease_token: string;
  lease_expires_at: Date;
};

function mapClaim(row: ClaimedGraderJobRow): ClaimedGraderJob {
  return {
    jobId: row.job_id,
    organizationId: row.organization_id,
    submissionId: row.submission_id,
    activityVersionId: row.activity_version_id,
    validatorKey: row.validator_key,
    validatorVersion: row.validator_version,
    validatorConfig: row.validator_config,
    profileKey: row.profile_key,
    profileVersion: row.profile_version,
    profileFingerprint: row.profile_fingerprint,
    request: row.request_payload,
    attemptCount: row.attempt_count,
    leaseToken: row.lease_token,
    leaseExpiresAt: row.lease_expires_at
  };
}

export class GraderJobRepository {
  constructor(private readonly pool: DatabasePool) {}

  async claim(leaseSeconds: number): Promise<ClaimedGraderJob | null> {
    const result = await this.pool.query<ClaimedGraderJobRow>(
      `SELECT * FROM platform_internal.claim_grader_job($1)`,
      [leaseSeconds]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapClaim(row);
  }

  async acknowledge(
    job: Pick<ClaimedGraderJob, "jobId" | "leaseToken">,
    result: GraderJobResult
  ): Promise<string | null> {
    const acknowledged = await this.pool.query<{ validation_result_id: string | null }>(
      `SELECT platform_internal.acknowledge_grader_job($1, $2, $3::jsonb)::text AS validation_result_id`,
      [job.jobId, job.leaseToken, JSON.stringify(result)]
    );
    return acknowledged.rows[0]?.validation_result_id ?? null;
  }

  async fail(
    job: Pick<ClaimedGraderJob, "jobId" | "leaseToken">,
    errorCode: string,
    retryAt: Date
  ): Promise<GraderFailureState> {
    const failed = await this.pool.query<{ status: GraderFailureState }>(
      `SELECT platform_internal.fail_grader_job($1, $2, $3, $4::timestamptz) AS status`,
      [job.jobId, job.leaseToken, errorCode, retryAt.toISOString()]
    );
    return failed.rows[0]?.status ?? null;
  }
}
