import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  LearningDeliveryQuery,
  type ActiveEnrollmentContext,
  type EnrollmentContext
} from "./learning-delivery.query";
import { LearningDeliveryRepository } from "./learning-delivery.repository";

@Injectable()
export class LearningDeliveryQueryService extends LearningDeliveryQuery {
  constructor(private readonly delivery: LearningDeliveryRepository) {
    super();
  }

  async requireOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ) {
    const offering = await this.delivery.findOffering(
      transaction,
      organizationId,
      offeringId
    );
    if (offering === null) {
      throw new NotFoundException("Learning offering not found.");
    }
    return offering;
  }

  listActiveEnrollmentsForOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ) {
    return this.delivery.listActiveEnrollmentsForOffering(
      transaction,
      organizationId,
      offeringId
    );
  }

  listEnrollmentsForUsers(
    transaction: DatabaseTransaction,
    organizationId: string,
    userIds: readonly string[]
  ) {
    return this.delivery.listEnrollmentsForUsers(
      transaction,
      organizationId,
      userIds
    );
  }

  async requireEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<EnrollmentContext> {
    const enrollment = await this.delivery.findEnrollment(
      transaction,
      organizationId,
      enrollmentId
    );
    if (enrollment === null) {
      throw new NotFoundException("Enrollment not found.");
    }

    const offering = await this.requireOffering(
      transaction,
      organizationId,
      enrollment.offeringId
    );

    return { enrollment, offering };
  }

  async requireActiveEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<ActiveEnrollmentContext> {
    const context = await this.requireEnrollment(
      transaction,
      organizationId,
      enrollmentId
    );
    if (context.enrollment.status !== "active") {
      throw new ConflictException(
        "Only an active enrollment can create attempts."
      );
    }
    return context;
  }
}
