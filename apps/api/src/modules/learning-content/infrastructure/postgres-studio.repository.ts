import { Injectable } from "@nestjs/common";
import { studioCourseSummarySchema } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { StudioRepository } from "../application/studio.repository";
const projection = `SELECT c.id::text AS "courseId",c.slug,v.title,v.id::text AS "versionId",v.version_number AS "versionNumber",v.status,v.authoring_revision AS revision
  FROM learning_content.courses c
  JOIN LATERAL (SELECT * FROM learning_content.course_versions v WHERE v.organization_id=c.organization_id AND v.course_id=c.id ORDER BY v.version_number DESC LIMIT 1) v ON true
  WHERE c.organization_id=$1 AND c.status='active'`;
@Injectable()
export class PostgresStudioRepository extends StudioRepository {
  async list(
    tx: DatabaseTransaction,
    org: string,
    all: boolean,
    ids: string[],
    after: string | null
  ) {
    const rows = (
      await tx.client.query(
        `${projection} AND ($2::boolean OR c.id=ANY($3::uuid[])) AND ($4::uuid IS NULL OR c.id>$4::uuid) ORDER BY c.id LIMIT 101`,
        [org, all, ids, after]
      )
    ).rows;
    return rows.map((row) => studioCourseSummarySchema.parse(row));
  }
  async latest(tx: DatabaseTransaction, org: string, course: string) {
    const row = (
      await tx.client.query(`${projection} AND c.id=$2`, [org, course])
    ).rows[0];
    return row ? studioCourseSummarySchema.parse(row) : null;
  }
}
