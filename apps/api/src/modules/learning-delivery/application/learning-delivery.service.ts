import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CreateEnrollmentRequest,
  CreateLearningOfferingRequest,
  Enrollment,
  LearningOffering
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentApplicationService } from "../../learning-content/application/learning-content.service";
import { OrganizationsApplicationService } from "../../organizations/application/organizations.service";
import { LearningDeliveryRepository } from "./learning-delivery.repository";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function courseScope(organizationId: string, courseId: string) {
  return {
    organizationId,
    type: "course" as const,
    id: courseId
  };
}

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

@Injectable()
export class LearningDeliveryApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly delivery: LearningDeliveryRepository,
    private readonly content: LearningContentApplicationService,
    private readonly organizations: OrganizationsApplicationService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly outbox: OutboxRepository
  ) {}

  async createOffering(
    organizationId: string,
    command: CreateLearningOfferingRequest
  ): Promise<LearningOffering> {
    const context = this.requestContext.tenantContext(organizationId);
    const offeringId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        const version = await this.content.requirePublishedVersion(
          transaction,
          organizationId,
          command.courseVersionId
        );
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          courseScope(organizationId, version.courseId)
        );

        const offering = await this.delivery.createOffering(transaction, {
          id: offeringId,
          organizationId,
          courseVersionId: command.courseVersionId,
          slug: command.slug,
          name: command.name,
          deliveryMode: command.deliveryMode,
          startsAt: command.startsAt ?? null,
          endsAt: command.endsAt ?? null,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "learning_offering.created",
          eventVersion: 1,
          aggregateType: "learning_offering",
          aggregateId: offering.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId: offering.id,
            courseId: version.courseId,
            courseVersionId: version.id,
            deliveryMode: offering.deliveryMode
          }
        });

        return offering;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "A learning offering with this slug already exists."
        );
      }
      throw error;
    }
  }

  async getOffering(
    organizationId: string,
    offeringId: string
  ): Promise<LearningOffering> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "offering.read",
        offeringScope(organizationId, offeringId)
      );

      const offering = await this.delivery.findOffering(
        transaction,
        organizationId,
        offeringId
      );
      if (offering === null) {
        throw new NotFoundException("Learning offering not found.");
      }
      return offering;
    });
  }

  async createEnrollment(
    organizationId: string,
    offeringId: string,
    command: CreateEnrollmentRequest
  ): Promise<Enrollment> {
    const context = this.requestContext.tenantContext(organizationId);
    const enrollmentId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.identity.requireActiveUser(transaction, command.userId);

        const offering = await this.delivery.findOffering(
          transaction,
          organizationId,
          offeringId
        );
        if (offering === null) {
          throw new NotFoundException("Learning offering not found.");
        }
        if (offering.status !== "open") {
          throw new ConflictException("Only an open learning offering accepts enrollments.");
        }

        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "enrollment.manage",
          offeringScope(organizationId, offeringId)
        );
        await this.organizations.requireActiveMembership(
          transaction,
          organizationId,
          command.userId
        );

        const enrollment = await this.delivery.createEnrollment(transaction, {
          id: enrollmentId,
          organizationId,
          offeringId,
          userId: command.userId,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "enrollment.created",
          eventVersion: 1,
          aggregateType: "enrollment",
          aggregateId: enrollment.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            enrollmentId: enrollment.id,
            offeringId,
            userId: command.userId
          }
        });

        return enrollment;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "This identity is already enrolled in the learning offering."
        );
      }
      throw error;
    }
  }
}
