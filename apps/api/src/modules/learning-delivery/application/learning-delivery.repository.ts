import type {
  Enrollment,
  LearningOffering
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewLearningOffering = Readonly<{
  id: string;
  organizationId: string;
  courseVersionId: string;
  slug: string;
  name: string;
  deliveryMode: LearningOffering["deliveryMode"];
  startsAt: string | null;
  endsAt: string | null;
  createdByUserId: string;
}>;

export type NewEnrollment = Readonly<{
  id: string;
  organizationId: string;
  offeringId: string;
  userId: string;
  createdByUserId: string;
}>;

export abstract class LearningDeliveryRepository {
  abstract createOffering(
    transaction: DatabaseTransaction,
    offering: NewLearningOffering
  ): Promise<LearningOffering>;

  abstract findOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<LearningOffering | null>;

  abstract createEnrollment(
    transaction: DatabaseTransaction,
    enrollment: NewEnrollment
  ): Promise<Enrollment>;
}
