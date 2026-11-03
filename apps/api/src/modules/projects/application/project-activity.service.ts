import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  uuidSchema,
  type ProjectActivityPage,
  type ProjectActivityQuery
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { ProjectOperator } from "./project-operator";
import {
  ProjectActivityRepository,
  type ProjectActivityCursorPosition
} from "./project-activity.repository";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsViewQuery } from "./projects-view.query";

function encodeCursor(position: ProjectActivityCursorPosition): string {
  return Buffer.from(JSON.stringify(position), "utf8").toString("base64url");
}

function decodeCursor(
  cursor: string | undefined
): ProjectActivityCursorPosition | null {
  if (cursor === undefined) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("cursor is not an object");
    }

    const record = parsed as Record<string, unknown>;
    if (
      Object.keys(record).sort().join(",") !== "id,sourceReceivedAt" ||
      typeof record.sourceReceivedAt !== "string" ||
      Number.isNaN(Date.parse(record.sourceReceivedAt)) ||
      !uuidSchema.safeParse(record.id).success
    ) {
      throw new Error("cursor shape is invalid");
    }

    return {
      sourceReceivedAt: record.sourceReceivedAt,
      id: record.id as string
    };
  } catch {
    throw new BadRequestException("Invalid Project activity cursor.");
  }
}

@Injectable()
export class ProjectActivityApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly operator: ProjectOperator,
    private readonly projects: ProjectsRepository,
    private readonly view: ProjectsViewQuery,
    private readonly activity: ProjectActivityRepository
  ) {}

  async list(
    organizationId: string,
    projectId: string,
    query: ProjectActivityQuery
  ): Promise<ProjectActivityPage> {
    const context = this.requestContext.tenantContext(organizationId);
    const before = decodeCursor(query.cursor);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.operator.require(
        transaction,
        organizationId,
        context.userId,
        "project",
        projectId
      );

      const project = await this.projects.findProject(
        transaction,
        organizationId,
        projectId
      );
      if (project === null) throw new NotFoundException("Project not found.");

      const rows = await this.activity.listForProject(
        transaction,
        organizationId,
        projectId,
        before,
        query.limit + 1
      );
      const hasMore = rows.length > query.limit;
      const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
      const last = pageRows.at(-1);

      return {
        project: await this.view.project(transaction, project),
        items: pageRows.map((row) => row.item),
        nextCursor:
          hasMore && last !== undefined ? encodeCursor(last.position) : null
      };
    });
  }
}
