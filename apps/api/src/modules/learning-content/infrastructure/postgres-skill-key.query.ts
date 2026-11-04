import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { SkillKeyQuery } from "../application/skill-key.query";

@Injectable()
export class PostgresSkillKeyQuery extends SkillKeyQuery {
  async skillKeys(
    transaction: DatabaseTransaction,
    organizationId: string,
    skillIds: readonly string[]
  ): Promise<ReadonlyMap<string, string>> {
    if (skillIds.length === 0) return new Map();
    const result = await transaction.client.query<{
      id: string;
      skill_key: string;
    }>(
      `SELECT skill.id::text AS id, skill.skill_key
         FROM learning_content.skills AS skill
        WHERE skill.organization_id = $1
          AND skill.id = ANY($2::uuid[])`,
      [organizationId, [...skillIds]]
    );
    return new Map(result.rows.map((row) => [row.id, row.skill_key] as const));
  }
}
