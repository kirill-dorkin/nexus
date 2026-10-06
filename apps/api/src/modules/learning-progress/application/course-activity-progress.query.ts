import type { DatabaseTransaction } from "@platform/database";
export type CourseActivityObservation = Readonly<{
  activityVersionId: string;
  passed: boolean;
  lastActionAt: string;
}>;
export abstract class CourseActivityProgressQuery {
  abstract observations(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ): Promise<readonly CourseActivityObservation[]>;
}
