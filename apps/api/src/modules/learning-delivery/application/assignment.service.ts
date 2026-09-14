import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  Assignment,
  AssignmentAudience,
  CreateAssignmentRequest
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningGraphApplicationService } from "../../learning-content/application/learning-graph.service";
import { AssignmentRepository } from "./assignment.repository";
import { LearningDeliveryRepository } from "./learning-delivery.repository";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

type ResolvedAudience = Readonly<{
  audienceType: Assignment["audience"]["type"];
  courseRunId: string | null;
  groupId: string | null;
  enrollmentId: string | null;
}>;

@Injectable()
export class AssignmentApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly assignments: AssignmentRepository,
    private readonly delivery: LearningDeliveryRepository,
    private readonly graph: LearningGraphApplicationService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly outbox: OutboxRepository
  ) {}

  async createAssignment(
    organizationId: string,
    offeringId: string,
    command: CreateAssignmentRequest
  ): Promise<Assignment> {
    const context = this.requestContext.tenantContext(organizationId);
    const assignmentId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
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
        if (offering.status !== "open") {
          throw new ConflictException("New assignments require an open learning offering.");
        }

        const activity = await this.graph.requireActivityVersion(
          transaction,
          organizationId,
          offering.courseVersionId,
          command.activityId
        );
        const audience = await this.resolveAudience(
          transaction,
          organizationId,
          offeringId,
          command.audience
        );

        const assignment = await this.assignments.createAssignment(transaction, {
          id: assignmentId,
          organizationId,
          offeringId,
          activityVersionId: activity.id,
          slug: command.slug,
          name: command.name,
          ...audience,
          availableAt: command.availableAt ?? null,
          dueAt: command.dueAt ?? null,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "assignment.created",
          eventVersion: 1,
          aggregateType: "assignment",
          aggregateId: assignment.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            assignmentId: assignment.id,
            offeringId,
            courseVersionId: offering.courseVersionId,
            activityId: activity.activityId,
            activityVersionId: activity.id,
            audience: assignment.audience,
            availableAt: assignment.availableAt,
            dueAt: assignment.dueAt
          }
        });

        return assignment;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "An assignment with this slug already exists in the learning offering."
        );
      }
      throw error;
    }
  }

  async getAssignment(
    organizationId: string,
    offeringId: string,
    assignmentId: string
  ): Promise<Assignment> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "offering.manage",
        offeringScope(organizationId, offeringId)
      );

      const assignment = await this.assignments.findAssignment(
        transaction,
        organizationId,
        assignmentId
      );
      if (assignment === null || assignment.offeringId !== offeringId) {
        throw new NotFoundException("Assignment not found.");
      }
      return assignment;
    });
  }

  async cancelAssignment(
    organizationId: string,
    offeringId: string,
    assignmentId: string
  ): Promise<Assignment> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "offering.manage",
        offeringScope(organizationId, offeringId)
      );

      const assignment = await this.assignments.findAssignment(
        transaction,
        organizationId,
        assignmentId
      );
      if (assignment === null || assignment.offeringId !== offeringId) {
        throw new NotFoundException("Assignment not found.");
      }
      if (assignment.cancelledAt !== null) {
        return assignment;
      }

      const cancelled = await this.assignments.cancelAssignment(
        transaction,
        organizationId,
        assignmentId,
        context.userId
      );
      if (cancelled === null) {
        const concurrentlyCancelled = await this.assignments.findAssignment(
          transaction,
          organizationId,
          assignmentId
        );
        if (concurrentlyCancelled === null) {
          throw new Error("Assignment disappeared during cancellation.");
        }
        return concurrentlyCancelled;
      }

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "assignment.cancelled",
        eventVersion: 1,
        aggregateType: "assignment",
        aggregateId: cancelled.id,
        actorUserId: context.userId,
        payload: {
          organizationId,
          assignmentId: cancelled.id,
          offeringId,
          activityVersionId: cancelled.activityVersionId,
          audience: cancelled.audience,
          cancelledAt: cancelled.cancelledAt
        }
      });

      return cancelled;
    });
  }

  private async resolveAudience(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string,
    audience: AssignmentAudience
  ): Promise<ResolvedAudience> {
    switch (audience.type) {
      case "offering":
        return {
          audienceType: "offering",
          courseRunId: null,
          groupId: null,
          enrollmentId: null
        };

      case "course_run": {
        const courseRun = await this.delivery.findCourseRun(
          transaction,
          organizationId,
          audience.courseRunId
        );
        if (courseRun === null || courseRun.offeringId !== offeringId) {
          throw new NotFoundException("Course run not found.");
        }
        return {
          audienceType: "course_run",
          courseRunId: courseRun.id,
          groupId: null,
          enrollmentId: null
        };
      }

      case "group": {
        const group = await this.delivery.findGroup(
          transaction,
          organizationId,
          audience.groupId
        );
        if (group === null) {
          throw new NotFoundException("Group not found.");
        }
        const groupSet = await this.delivery.findGroupSet(
          transaction,
          organizationId,
          group.groupSetId
        );
        if (groupSet === null) {
          throw new NotFoundException("Group not found.");
        }
        const courseRun = await this.delivery.findCourseRun(
          transaction,
          organizationId,
          groupSet.courseRunId
        );
        if (courseRun === null || courseRun.offeringId !== offeringId) {
          throw new NotFoundException("Group not found.");
        }
        return {
          audienceType: "group",
          courseRunId: null,
          groupId: group.id,
          enrollmentId: null
        };
      }

      case "enrollment": {
        const enrollment = await this.delivery.findEnrollment(
          transaction,
          organizationId,
          audience.enrollmentId
        );
        if (enrollment === null || enrollment.offeringId !== offeringId) {
          throw new NotFoundException("Enrollment not found.");
        }
        return {
          audienceType: "enrollment",
          courseRunId: null,
          groupId: null,
          enrollmentId: enrollment.id
        };
      }
    }
  }
}
