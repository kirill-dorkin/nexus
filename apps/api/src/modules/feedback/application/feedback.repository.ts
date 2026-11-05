import type {
  FeedbackDevice,
  FeedbackKind,
  FeedbackReport,
  FeedbackReportListQuery,
  FeedbackRoute,
  FeedbackStatus
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewFeedbackReport = Readonly<{
  organizationId: string;
  userId: string | null;
  kind: FeedbackKind;
  text: string;
  expected: string | null;
  actual: string | null;
  route: FeedbackRoute;
  courseSlug: string | null;
  lessonSlug: string | null;
  release: string;
  device: FeedbackDevice | null;
}>;

export type FeedbackReportChange = Readonly<{
  status: FeedbackStatus;
  ownerNote: string | null;
}>;

/** Owned by the Feedback module (ADR-0083); every call runs under tenant RLS. */
export abstract class FeedbackRepository {
  abstract insert(
    transaction: DatabaseTransaction,
    report: NewFeedbackReport
  ): Promise<string>;

  /** Newest first; returns up to `limit` rows. */
  abstract list(
    transaction: DatabaseTransaction,
    organizationId: string,
    query: FeedbackReportListQuery,
    limit: number
  ): Promise<FeedbackReport[]>;

  abstract findForUpdate(
    transaction: DatabaseTransaction,
    organizationId: string,
    reportId: string
  ): Promise<FeedbackReport | null>;

  abstract update(
    transaction: DatabaseTransaction,
    organizationId: string,
    reportId: string,
    change: FeedbackReportChange
  ): Promise<FeedbackReport>;
}
