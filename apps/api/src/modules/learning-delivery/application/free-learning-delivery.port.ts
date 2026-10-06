import type { Enrollment, LearningOffering } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
export type FreeLearningRoute = Readonly<{
  organizationId: string;
  offeringId: string;
  courseVersionId: string;
}>;
export type OwnFreeLearningAddress = Readonly<{
  enrollmentId: string;
  organizationSlug: string;
  offeringSlug: string;
}>;
export abstract class FreeLearningDeliveryPort {
  abstract resolve(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string
  ): Promise<FreeLearningRoute | null>;
  abstract listOwn(
    tx: DatabaseTransaction,
    after: string | null
  ): Promise<readonly OwnFreeLearningAddress[]>;
  abstract offering(
    tx: DatabaseTransaction,
    route: FreeLearningRoute,
    lock?: boolean
  ): Promise<LearningOffering | null>;
  abstract ownEnrollment(
    tx: DatabaseTransaction,
    route: FreeLearningRoute,
    userId: string
  ): Promise<Enrollment | null>;
  abstract enrollSelf(
    tx: DatabaseTransaction,
    route: FreeLearningRoute,
    userId: string
  ): Promise<Enrollment>;
}
