import type { Enrollment, LearningOffering } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type EnrollmentContext = Readonly<{
  enrollment: Enrollment;
  offering: LearningOffering;
}>;

export type ActiveEnrollmentContext = EnrollmentContext;

export abstract class LearningDeliveryQuery {
  abstract requireEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<EnrollmentContext>;

  abstract requireActiveEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<ActiveEnrollmentContext>;
}
