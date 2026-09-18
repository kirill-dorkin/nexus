import type { CourseReadinessDecision } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class LearningReadinessQuery {
  abstract evaluateActiveEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    evaluatedAt: string
  ): Promise<CourseReadinessDecision>;
}
