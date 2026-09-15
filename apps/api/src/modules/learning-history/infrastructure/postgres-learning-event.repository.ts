import { Injectable } from "@nestjs/common";
import type { LearningEvent } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  LearningEventRepository,
  type LearningEventCursorPosition,
  type LearningEventPageRow,
  type NewLearningEvent
} from "../application/learning-event.repository";

type LearningEventRow = {
  id: string;
  organization_id: string;
  enrollment_id: string;
  event_name: LearningEvent["eventName"];
  event_version: 1;
  attempt_id: string;
  activity_version_id: string;
  attempt_number: number;
  submission_id: string | null;
  validation_result_id: string | null;
  evidence_id: string | null;
  skill_id: string | null;
  outcome: "passed" | "failed" | "needs_review" | null;
  score: string | null;
  evidence_kind: string | null;
  evidence_source_type: "manual" | "validation_result" | null;
  guidance_exposure_id: string | null;
  guidance_step_key: string | null;
  guidance_hint_key: string | null;
  guidance_solution_key: string | null;
  occurred_at: Date;
  event_order: number;
};

const eventSelect = `id::text,
  organization_id::text,
  enrollment_id::text,
  event_name,
  event_version,
  attempt_id::text,
  activity_version_id::text,
  attempt_number,
  submission_id::text,
  validation_result_id::text,
  evidence_id::text,
  skill_id::text,
  outcome,
  score::text,
  evidence_kind,
  evidence_source_type,
  guidance_exposure_id::text,
  guidance_step_key,
  guidance_hint_key,
  guidance_solution_key,
  occurred_at,
  event_order`;

function required(value: string | null, field: string): string {
  if (value === null) throw new Error(`LearningEvent row is missing ${field}.`);
  return value;
}

function mapEvent(row: LearningEventRow): LearningEvent {
  const base = {
    id: row.id,
    organizationId: row.organization_id,
    enrollmentId: row.enrollment_id,
    attemptId: row.attempt_id,
    activityVersionId: row.activity_version_id,
    attemptNumber: row.attempt_number,
    eventVersion: row.event_version,
    occurredAt: row.occurred_at.toISOString()
  } as const;

  if (row.event_name === "attempt.started") {
    return { ...base, eventName: row.event_name };
  }
  if (row.event_name === "submission.submitted") {
    return { ...base, eventName: row.event_name, submissionId: required(row.submission_id, "submission_id") };
  }
  if (row.event_name === "validation.result_recorded") {
    if (row.outcome === null) throw new Error("Validation LearningEvent row is missing outcome.");
    return {
      ...base,
      eventName: row.event_name,
      submissionId: required(row.submission_id, "submission_id"),
      validationResultId: required(row.validation_result_id, "validation_result_id"),
      outcome: row.outcome,
      score: row.score === null ? null : Number(row.score)
    };
  }
  if (row.event_name === "guidance.hint_revealed") {
    return {
      ...base,
      eventName: row.event_name,
      guidanceExposureId: required(row.guidance_exposure_id, "guidance_exposure_id"),
      stepKey: required(row.guidance_step_key, "guidance_step_key"),
      hintKey: required(row.guidance_hint_key, "guidance_hint_key")
    };
  }
  if (row.event_name === "guidance.solution_revealed") {
    return {
      ...base,
      eventName: row.event_name,
      guidanceExposureId: required(row.guidance_exposure_id, "guidance_exposure_id"),
      solutionKey: required(row.guidance_solution_key, "guidance_solution_key")
    };
  }

  if (row.evidence_source_type === null || row.evidence_kind === null) {
    throw new Error("Evidence LearningEvent row is missing Evidence semantics.");
  }
  return {
    ...base,
    eventName: row.event_name,
    submissionId: required(row.submission_id, "submission_id"),
    evidenceId: required(row.evidence_id, "evidence_id"),
    skillId: required(row.skill_id, "skill_id"),
    kind: row.evidence_kind,
    score: row.score === null ? null : Number(row.score),
    source:
      row.evidence_source_type === "manual"
        ? { type: "manual" }
        : {
            type: "validation_result",
            validationResultId: required(row.validation_result_id, "validation_result_id")
          }
  };
}

function mapPageRow(row: LearningEventRow): LearningEventPageRow {
  return {
    event: mapEvent(row),
    position: {
      occurredAt: row.occurred_at.toISOString(),
      eventOrder: row.event_order,
      id: row.id
    }
  };
}

@Injectable()
export class PostgresLearningEventRepository extends LearningEventRepository {
  async append(transaction: DatabaseTransaction, event: NewLearningEvent): Promise<void> {
    await transaction.client.query(
      `INSERT INTO learning_history.learning_events
         (organization_id, learner_user_id, enrollment_id, event_name,
          attempt_id, activity_version_id, attempt_number, submission_id,
          validation_result_id, evidence_id, skill_id, outcome, score,
          evidence_kind, evidence_source_type, guidance_exposure_id,
          guidance_step_key, guidance_hint_key, guidance_solution_key, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               $14, $15, $16, $17, $18, $19, $20::timestamptz)`,
      [
        event.organizationId,
        event.learnerUserId,
        event.enrollmentId,
        event.eventName,
        event.attemptId,
        event.activityVersionId,
        event.attemptNumber,
        event.submissionId,
        event.validationResultId,
        event.evidenceId,
        event.skillId,
        event.outcome,
        event.score,
        event.evidenceKind,
        event.evidenceSourceType,
        event.guidanceExposureId,
        event.guidanceStepKey,
        event.guidanceHintKey,
        event.guidanceSolutionKey,
        event.occurredAt
      ]
    );
  }

  async listForEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    before: LearningEventCursorPosition | null,
    limit: number
  ): Promise<readonly LearningEventPageRow[]> {
    const result = await transaction.client.query<LearningEventRow>(
      `SELECT ${eventSelect}
         FROM learning_history.learning_events
        WHERE organization_id = $1
          AND enrollment_id = $2
          AND ($3::timestamptz IS NULL
            OR (occurred_at, event_order, id) < ($3::timestamptz, $4::smallint, $5::uuid))
        ORDER BY occurred_at DESC, event_order DESC, id DESC
        LIMIT $6`,
      [organizationId, enrollmentId, before?.occurredAt ?? null, before?.eventOrder ?? null, before?.id ?? null, limit]
    );
    return result.rows.map(mapPageRow);
  }
}
