import type { ProjectActivityItem } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type ProjectActivityCursorPosition = Readonly<{
  sourceReceivedAt: string;
  id: string;
}>;

export type ProjectActivityPageRow = Readonly<{
  item: ProjectActivityItem;
  position: ProjectActivityCursorPosition;
}>;

export abstract class ProjectActivityRepository {
  abstract listForProject(
    transaction: DatabaseTransaction,
    organizationId: string,
    projectId: string,
    before: ProjectActivityCursorPosition | null,
    limit: number
  ): Promise<readonly ProjectActivityPageRow[]>;
}
