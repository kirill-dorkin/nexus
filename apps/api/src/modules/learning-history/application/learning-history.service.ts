import {
  BadRequestException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import {
  uuidSchema,
  type LearningEventHistoryPage,
  type LearningEventHistoryQuery
} from "@platform/contracts";
import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import {
  LearningEventRepository,
  type LearningEventCursorPosition
} from "./learning-event.repository";
function offeringScope(organizationId: string, offeringId: string) {
  return { organizationId, type: "offering" as const, id: offeringId };
}
function encodeCursor(position: LearningEventCursorPosition): string {
  return Buffer.from(JSON.stringify(position), "utf8").toString("base64url");
}
function decodeCursor(
  cursor: string | undefined
): LearningEventCursorPosition | null {
  if (cursor === undefined) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      throw new Error("cursor is not an object");
    const record = parsed as Record<string, unknown>;
    if (
      Object.keys(record).sort().join(",") !== "eventOrder,id,occurredAt" ||
      typeof record.occurredAt !== "string" ||
      Number.isNaN(Date.parse(record.occurredAt)) ||
      typeof record.eventOrder !== "number" ||
      ![10, 15, 20, 25, 30, 40].includes(record.eventOrder) ||
      !uuidSchema.safeParse(record.id).success
    )
      throw new Error("cursor shape is invalid");
    return {
      occurredAt: record.occurredAt,
      eventOrder: record.eventOrder,
      id: record.id as string
    };
  } catch {
    throw new BadRequestException("Invalid learning event cursor.");
  }
}
@Injectable()
export class LearningHistoryApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly delivery: LearningDeliveryQuery,
    private readonly events: LearningEventRepository
  ) {}
  async listEnrollmentHistory(
    organizationId: string,
    enrollmentId: string,
    query: LearningEventHistoryQuery
  ): Promise<LearningEventHistoryPage> {
    const context = this.requestContext.tenantContext(organizationId);
    const before = decodeCursor(query.cursor);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const enrollmentContext = await this.delivery.requireEnrollment(
        transaction,
        organizationId,
        enrollmentId
      );
      if (enrollmentContext.enrollment.userId !== context.userId)
        throw new ForbiddenException(
          "Learning history can only be read for your own enrollment."
        );
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "learning_event.read",
        offeringScope(organizationId, enrollmentContext.offering.id)
      );
      const rows = await this.events.listForEnrollment(
        transaction,
        organizationId,
        enrollmentId,
        before,
        query.limit + 1
      );
      const hasMore = rows.length > query.limit;
      const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
      const last = pageRows.at(-1);
      return {
        organizationId,
        enrollmentId,
        offeringId: enrollmentContext.offering.id,
        events: pageRows.map((row) => row.event),
        nextCursor:
          hasMore && last !== undefined ? encodeCursor(last.position) : null
      };
    });
  }
}
