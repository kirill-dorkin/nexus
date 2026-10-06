import type { DatabaseTransaction } from "@platform/database";
import type { StudioCourseSummary } from "@platform/contracts";
export abstract class StudioRepository {
  abstract list(
    tx: DatabaseTransaction,
    org: string,
    allCourses: boolean,
    courseIds: string[],
    after: string | null
  ): Promise<StudioCourseSummary[]>;
  abstract latest(
    tx: DatabaseTransaction,
    org: string,
    course: string
  ): Promise<StudioCourseSummary | null>;
}
