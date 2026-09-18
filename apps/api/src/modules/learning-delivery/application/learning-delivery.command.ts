import type { Enrollment } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class LearningDeliveryCommand {
  abstract completeEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    completedAt: string,
    actorUserId: string
  ): Promise<Enrollment>;
}
