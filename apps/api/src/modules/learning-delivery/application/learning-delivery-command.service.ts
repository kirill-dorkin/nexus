import { ConflictException, Injectable } from "@nestjs/common";
import type { Enrollment } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { OutboxRepository } from "../../../outbox/outbox.repository";
import { LearningDeliveryCommand } from "./learning-delivery.command";
import { LearningDeliveryRepository } from "./learning-delivery.repository";

@Injectable()
export class LearningDeliveryCommandService extends LearningDeliveryCommand {
  constructor(
    private readonly delivery: LearningDeliveryRepository,
    private readonly outbox: OutboxRepository
  ) {
    super();
  }

  async completeEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    completedAt: string,
    actorUserId: string
  ): Promise<Enrollment> {
    const enrollment = await this.delivery.completeEnrollment(
      transaction,
      organizationId,
      enrollmentId,
      completedAt
    );
    if (enrollment === null) {
      throw new ConflictException(
        "Only an active Enrollment can transition to completed."
      );
    }

    await this.outbox.append(transaction, {
      organizationId,
      eventName: "enrollment.completed",
      eventVersion: 1,
      aggregateType: "enrollment",
      aggregateId: enrollment.id,
      actorUserId,
      payload: {
        organizationId,
        enrollmentId: enrollment.id,
        offeringId: enrollment.offeringId,
        userId: enrollment.userId,
        completedAt: enrollment.completedAt
      }
    });

    return enrollment;
  }
}
