import type { Enrollment, LearningOffering } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type ActiveEnrollmentContext = Readonly<{
  enrollment: Enrollment;
  offering: LearningOffering;
}>;

export abstract class LearningDeliveryQuery {
  abstract requireActiveEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<ActiveEnrollmentContext>;
}
