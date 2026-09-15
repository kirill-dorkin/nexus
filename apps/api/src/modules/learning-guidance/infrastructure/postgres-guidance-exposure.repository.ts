import { Injectable } from "@nestjs/common";
import type { GuidedBuildExposure } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { GuidanceExposureRepository, type NewGuidanceExposure } from "../application/guidance-exposure.repository";

type ExposureRow = {
  id: string;
  organization_id: string;
  enrollment_id: string;
  attempt_id: string;
  activity_version_id: string;
  kind: "hint" | "professional_solution";
  step_key: string | null;
  hint_key: string | null;
  solution_key: string | null;
  revealed_at: Date;
};

const exposureSelect = `id::text, organization_id::text, enrollment_id::text, attempt_id::text, activity_version_id::text, kind, step_key, hint_key, solution_key, revealed_at`;
function required(value: string | null, field: string): string { if (value === null) throw new Error(`GuidanceExposure row is missing ${field}.`); return value; }
function mapExposure(row: ExposureRow): GuidedBuildExposure {
  const base = { id: row.id, organizationId: row.organization_id, enrollmentId: row.enrollment_id, attemptId: row.attempt_id, activityVersionId: row.activity_version_id, revealedAt: row.revealed_at.toISOString() };
  return row.kind === "hint"
    ? { ...base, kind: "hint", stepKey: required(row.step_key, "step_key"), hintKey: required(row.hint_key, "hint_key") }
    : { ...base, kind: "professional_solution", solutionKey: required(row.solution_key, "solution_key") };
}

@Injectable()
export class PostgresGuidanceExposureRepository extends GuidanceExposureRepository {
  async lockAttemptScope(transaction: DatabaseTransaction, attemptId: string): Promise<void> {
    await transaction.client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [attemptId]);
  }
  async listForAttempt(transaction: DatabaseTransaction, organizationId: string, attemptId: string): Promise<readonly GuidedBuildExposure[]> {
    const result = await transaction.client.query<ExposureRow>(`SELECT ${exposureSelect} FROM learning_guidance.guidance_exposures WHERE organization_id=$1 AND attempt_id=$2 ORDER BY revealed_at, id`, [organizationId, attemptId]);
    return result.rows.map(mapExposure);
  }
  async findByIdempotencyKey(transaction: DatabaseTransaction, organizationId: string, attemptId: string, idempotencyKey: string): Promise<GuidedBuildExposure | null> {
    const result = await transaction.client.query<ExposureRow>(`SELECT ${exposureSelect} FROM learning_guidance.guidance_exposures WHERE organization_id=$1 AND attempt_id=$2 AND idempotency_key=$3`, [organizationId, attemptId, idempotencyKey]);
    const row = result.rows[0]; return row === undefined ? null : mapExposure(row);
  }
  async create(transaction: DatabaseTransaction, exposure: NewGuidanceExposure): Promise<GuidedBuildExposure> {
    const result = await transaction.client.query<ExposureRow>(`INSERT INTO learning_guidance.guidance_exposures (id, organization_id, enrollment_id, attempt_id, activity_version_id, kind, step_key, hint_key, solution_key, idempotency_key, revealed_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING ${exposureSelect}`, [exposure.id, exposure.organizationId, exposure.enrollmentId, exposure.attemptId, exposure.activityVersionId, exposure.kind, exposure.kind === "hint" ? exposure.stepKey : null, exposure.kind === "hint" ? exposure.hintKey : null, exposure.kind === "professional_solution" ? exposure.solutionKey : null, exposure.idempotencyKey, exposure.revealedByUserId]);
    const row = result.rows[0]; if (row === undefined) throw new Error("PostgreSQL did not return the created GuidanceExposure."); return mapExposure(row);
  }
}
