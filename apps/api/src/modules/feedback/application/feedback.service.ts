import { Injectable, NotFoundException } from "@nestjs/common";
import {
  feedbackPageContext,
  feedbackReportListSchema,
  type CreateFeedbackReportRequest,
  type FeedbackReport,
  type FeedbackReportList,
  type FeedbackReportListQuery,
  type UpdateFeedbackReportRequest
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { apiRelease } from "../../../health.controller";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { FeedbackRepository } from "./feedback.repository";

const PAGE_SIZE = 50;

/** Learner feedback for the open beta (ADR-0085). */
@Injectable()
export class FeedbackApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly context: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly reports: FeedbackRepository,
    private readonly outbox: OutboxRepository
  ) {}

  /**
   * Stores a report from a page of an active Organization, signed in or not.
   * The page context and release are set here, never taken from the client.
   */
  async submit(
    command: CreateFeedbackReportRequest,
    userId: string | null
  ): Promise<{ id: string }> {
    const page = feedbackPageContext(command.path);
    const release = apiRelease();
    return this.database.transaction(async (tx) => {
      // feedback.submit_report takes the author from app.user_id.
      await tx.client.query(`SELECT set_config('app.user_id', $1, true)`, [
        userId ?? ""
      ]);
      if (userId !== null) await this.identity.requireActiveUser(tx, userId);
      const problem = command.kind === "problem";
      const id = await this.reports.submit(tx, {
        organizationSlug: command.organizationSlug,
        kind: command.kind,
        text: command.text,
        expected: problem ? (command.expected ?? null) : null,
        actual: problem ? (command.actual ?? null) : null,
        route: page.route,
        courseSlug: page.courseSlug,
        lessonSlug: page.lessonSlug,
        release,
        device: command.device ?? null
      });
      if (id === null) throw new NotFoundException("Organization not found.");
      return { id };
    });
  }

  list(
    organizationId: string,
    query: FeedbackReportListQuery
  ): Promise<FeedbackReportList> {
    return this.managed(
      organizationId,
      async (tx) => {
        const rows = await this.reports.list(
          tx,
          organizationId,
          query,
          PAGE_SIZE + 1
        );
        const page = rows.slice(0, PAGE_SIZE);
        return feedbackReportListSchema.parse({
          reports: page,
          nextCursor:
            rows.length > PAGE_SIZE ? (page[page.length - 1]?.id ?? null) : null
        });
      },
      true
    );
  }

  update(
    organizationId: string,
    reportId: string,
    command: UpdateFeedbackReportRequest
  ): Promise<FeedbackReport> {
    return this.managed(organizationId, async (tx, userId) => {
      const current = await this.reports.findForUpdate(
        tx,
        organizationId,
        reportId
      );
      if (current === null) throw new NotFoundException("Report not found.");
      const status = command.status ?? current.status;
      const ownerNote =
        command.ownerNote === undefined ? current.ownerNote : command.ownerNote;
      if (status === current.status && ownerNote === current.ownerNote)
        return current;
      const updated = await this.reports.update(tx, organizationId, reportId, {
        status,
        ownerNote
      });
      await this.outbox.append(tx, {
        organizationId,
        eventName: "feedback_report.triaged",
        eventVersion: 1,
        aggregateType: "feedback_report",
        aggregateId: reportId,
        actorUserId: userId,
        payload: {
          reportId,
          organizationId,
          previousStatus: current.status,
          status,
          noteChanged: ownerNote !== current.ownerNote
        }
      });
      return updated;
    });
  }

  /** Owners and admins of the Organization (`feedback.manage`). */
  private managed<T>(
    organizationId: string,
    operation: (tx: DatabaseTransaction, userId: string) => Promise<T>,
    readOnly = false
  ): Promise<T> {
    const context = this.context.tenantContext(organizationId);
    return this.database.tenantTransaction(
      context,
      async (tx) => {
        await this.identity.requireActiveUser(tx, context.userId);
        await this.authorization.requireCapability(
          tx,
          context.userId,
          "feedback.manage",
          {
            organizationId,
            type: "organization",
            id: organizationId
          }
        );
        return operation(tx, context.userId);
      },
      readOnly ? { readOnly: true, isolationLevel: "repeatable_read" } : {}
    );
  }
}
