import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { oneRow } from "../../../database/one-row";
import {
  SkillTestDrawsPort,
  type SkillTestDraw,
  type SkillTestOutcome
} from "../application/skill-test-draws.port";

type DrawRow = {
  id: string;
  organization_id: string;
  enrollment_id: string;
  activity_version_id: string;
  question_keys: string[];
  drawn_at: Date;
  attempt_id: string | null;
};

const COLUMNS =
  "id::text,organization_id::text,enrollment_id::text,activity_version_id::text,question_keys,drawn_at,attempt_id::text";

const toDraw = (row: DrawRow): SkillTestDraw => ({
  id: row.id,
  organizationId: row.organization_id,
  enrollmentId: row.enrollment_id,
  activityVersionId: row.activity_version_id,
  questionKeys: row.question_keys,
  drawnAt: row.drawn_at.toISOString(),
  attemptId: row.attempt_id
});

@Injectable()
export class PostgresSkillTestDrawsRepository extends SkillTestDrawsPort {
  async find(tx: DatabaseTransaction, organizationId: string, id: string) {
    const row = (
      await tx.client.query<DrawRow>(
        `SELECT ${COLUMNS} FROM learning_progress.skill_test_draws WHERE organization_id=$1 AND id=$2`,
        [organizationId, id]
      )
    ).rows[0];
    return row ? toDraw(row) : null;
  }

  async create(
    tx: DatabaseTransaction,
    draw: Omit<SkillTestDraw, "drawnAt" | "attemptId">
  ) {
    return toDraw(
      oneRow(
        await tx.client.query<DrawRow>(
          `INSERT INTO learning_progress.skill_test_draws (id,organization_id,enrollment_id,activity_version_id,question_keys)
           VALUES ($1,$2,$3,$4,$5::text[]) RETURNING ${COLUMNS}`,
          [
            draw.id,
            draw.organizationId,
            draw.enrollmentId,
            draw.activityVersionId,
            [...draw.questionKeys]
          ]
        ),
        "the skill test draw"
      )
    );
  }

  async timesSeen(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentIds: readonly string[],
    activityVersionId: string
  ) {
    const result = await tx.client.query<{ key: string; seen: number }>(
      `SELECT key,count(*)::integer AS seen
         FROM learning_progress.skill_test_draws d CROSS JOIN LATERAL unnest(d.question_keys) AS key
        WHERE d.organization_id=$1 AND d.enrollment_id=ANY($2::uuid[]) AND d.activity_version_id=$3
        GROUP BY key`,
      [organizationId, [...enrollmentIds], activityVersionId]
    );
    return new Map(result.rows.map((row) => [row.key, row.seen] as const));
  }

  async linkAttempt(
    tx: DatabaseTransaction,
    organizationId: string,
    id: string,
    attemptId: string
  ) {
    await tx.client.query(
      "UPDATE learning_progress.skill_test_draws SET attempt_id=$3 WHERE organization_id=$1 AND id=$2 AND attempt_id IS NULL",
      [organizationId, id, attemptId]
    );
    return (await this.find(tx, organizationId, id))?.attemptId === attemptId;
  }

  async latestOutcome(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentIds: readonly string[],
    activityVersionIds: readonly string[]
  ): Promise<SkillTestOutcome | null> {
    if (!enrollmentIds.length || !activityVersionIds.length) return null;
    const row = (
      await tx.client.query<{ outcome: "passed" | "failed"; created_at: Date }>(
        `SELECT e.payload->>'outcome' AS outcome,e.created_at
           FROM learning_progress.evidence e
           JOIN learning_progress.attempts a ON a.organization_id=e.organization_id AND a.id=e.attempt_id
          WHERE e.organization_id=$1 AND a.enrollment_id=ANY($2::uuid[]) AND a.activity_version_id=ANY($3::uuid[])
            AND e.kind='skill.test' AND e.source_type='validation_result' AND e.payload->>'outcome' IN ('passed','failed')
          ORDER BY e.created_at DESC LIMIT 1`,
        [organizationId, [...enrollmentIds], [...activityVersionIds]]
      )
    ).rows[0];
    return row
      ? { outcome: row.outcome, recordedAt: row.created_at.toISOString() }
      : null;
  }
}
