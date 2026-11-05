import { Injectable } from "@nestjs/common";
import {
  feedbackReportSchema,
  type FeedbackReport,
  type FeedbackReportListQuery
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  FeedbackRepository,
  type FeedbackReportChange,
  type NewFeedbackReport
} from "../application/feedback.repository";

type ReportRow = {
  id: string;
  kind: string;
  body: string;
  expected: string | null;
  actual: string | null;
  page_route: string;
  course_slug: string | null;
  lesson_slug: string | null;
  release: string;
  device: string | null;
  signed_in: boolean;
  status: string;
  owner_note: string | null;
  created_at: Date;
  updated_at: Date;
};

const COLUMNS = `id::text, kind, body, expected, actual, page_route, course_slug,
  lesson_slug, release, device, user_id IS NOT NULL AS signed_in, status,
  owner_note, created_at, updated_at`;

function toReport(row: ReportRow): FeedbackReport {
  return feedbackReportSchema.parse({
    id: row.id,
    kind: row.kind,
    text: row.body,
    expected: row.expected,
    actual: row.actual,
    route: row.page_route,
    courseSlug: row.course_slug,
    lessonSlug: row.lesson_slug,
    release: row.release,
    device: row.device,
    signedIn: row.signed_in,
    status: row.status,
    ownerNote: row.owner_note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  });
}

@Injectable()
export class PostgresFeedbackRepository extends FeedbackRepository {
  async submit(
    transaction: DatabaseTransaction,
    report: NewFeedbackReport
  ): Promise<string | null> {
    const result = await transaction.client.query<{ id: string | null }>(
      `SELECT feedback.submit_report($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)::text AS id`,
      [
        report.organizationSlug,
        report.kind,
        report.text,
        report.expected,
        report.actual,
        report.route,
        report.courseSlug,
        report.lessonSlug,
        report.release,
        report.device
      ]
    );
    return result.rows[0]?.id ?? null;
  }

  async list(
    transaction: DatabaseTransaction,
    organizationId: string,
    query: FeedbackReportListQuery,
    limit: number
  ): Promise<FeedbackReport[]> {
    const result = await transaction.client.query<ReportRow>(
      `SELECT ${COLUMNS}
         FROM feedback.reports
        WHERE organization_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR kind = $3)
          AND ($4::text IS NULL OR lesson_slug = $4)
          AND ($5::uuid IS NULL OR id < $5)
        ORDER BY id DESC
        LIMIT $6`,
      [
        organizationId,
        query.status ?? null,
        query.kind ?? null,
        query.lessonSlug ?? null,
        query.after ?? null,
        limit
      ]
    );
    return result.rows.map(toReport);
  }

  async findForUpdate(
    transaction: DatabaseTransaction,
    organizationId: string,
    reportId: string
  ): Promise<FeedbackReport | null> {
    const result = await transaction.client.query<ReportRow>(
      `SELECT ${COLUMNS} FROM feedback.reports
        WHERE organization_id = $1 AND id = $2
        FOR UPDATE`,
      [organizationId, reportId]
    );
    const row = result.rows[0];
    return row === undefined ? null : toReport(row);
  }

  async update(
    transaction: DatabaseTransaction,
    organizationId: string,
    reportId: string,
    change: FeedbackReportChange
  ): Promise<FeedbackReport> {
    const result = await transaction.client.query<ReportRow>(
      `UPDATE feedback.reports
          SET status = $3, owner_note = $4, updated_at = now()
        WHERE organization_id = $1 AND id = $2
        RETURNING ${COLUMNS}`,
      [organizationId, reportId, change.status, change.ownerNote]
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error("Feedback update matched no row.");
    return toReport(row);
  }
}
