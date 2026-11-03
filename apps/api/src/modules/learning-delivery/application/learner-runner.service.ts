import { ForbiddenException, Injectable } from "@nestjs/common";
import type {
  Assignment,
  LearnerAssignmentTiming,
  LearnerRunnerReadModel
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { AssignmentRepository } from "./assignment.repository";
import { LearningDeliveryQuery } from "./learning-delivery.query";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

function classifyTiming(
  assignment: Assignment,
  asOfEpochMs: number
): LearnerAssignmentTiming {
  if (
    assignment.availableAt !== null &&
    new Date(assignment.availableAt).getTime() > asOfEpochMs
  ) {
    return "upcoming";
  }

  if (
    assignment.dueAt !== null &&
    new Date(assignment.dueAt).getTime() < asOfEpochMs
  ) {
    return "past_due";
  }

  return "available";
}

@Injectable()
export class LearnerRunnerApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly delivery: LearningDeliveryQuery,
    private readonly assignments: AssignmentRepository,
    private readonly content: LearningContentQuery
  ) {}

  async getRunnerReadModel(
    organizationId: string,
    enrollmentId: string
  ): Promise<LearnerRunnerReadModel> {
    const context = this.requestContext.tenantContext(organizationId);
    const asOf = new Date().toISOString();
    const asOfEpochMs = new Date(asOf).getTime();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

      const enrollmentContext = await this.delivery.requireActiveEnrollment(
        transaction,
        organizationId,
        enrollmentId
      );
      if (enrollmentContext.enrollment.userId !== context.userId) {
        throw new ForbiddenException(
          "The learner runner can only be read for your own enrollment."
        );
      }

      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "attempt.submit",
        offeringScope(organizationId, enrollmentContext.offering.id)
      );

      const applicableAssignments =
        await this.assignments.listApplicableAssignments(
          transaction,
          organizationId,
          enrollmentContext.offering.id,
          enrollmentId,
          asOf
        );
      const graph = await this.content.requirePublishedLearningGraph(
        transaction,
        organizationId,
        enrollmentContext.offering.courseVersionId
      );
      const activitiesByVersionId = new Map(
        graph.activities.map((activity) => [activity.id, activity] as const)
      );

      return {
        enrollmentId,
        offeringId: enrollmentContext.offering.id,
        asOf,
        assignments: applicableAssignments.map((assignment) => {
          const activity = activitiesByVersionId.get(
            assignment.activityVersionId
          );
          if (activity === undefined) {
            throw new Error(
              `Assignment ${assignment.id} references an ActivityVersion outside its Offering graph.`
            );
          }

          return {
            assignment,
            activity,
            timing: classifyTiming(assignment, asOfEpochMs)
          };
        })
      };
    });
  }
}
