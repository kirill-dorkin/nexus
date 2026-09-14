import { Injectable } from "@nestjs/common";
import type { NextLearningRecommendation } from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { LearningProgressQuery } from "../../learning-progress/application/learning-progress.query";
import { MasteryQuery } from "../../learning-progress/application/mastery.query";
import {
  ORDERED_MASTERY_POLICY,
  orderedMasteryV1
} from "../domain/ordered-mastery.policy";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

@Injectable()
export class LearningRecommendationsApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly delivery: LearningDeliveryQuery,
    private readonly content: LearningContentQuery,
    private readonly progress: LearningProgressQuery,
    private readonly mastery: MasteryQuery
  ) {}

  async getNextRecommendation(
    organizationId: string,
    enrollmentId: string
  ): Promise<NextLearningRecommendation> {
    const requestContext = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(
      requestContext,
      async (transaction) => {
        await this.identity.requireActiveUser(
          transaction,
          requestContext.userId
        );

        const enrollmentContext = await this.delivery.requireActiveEnrollment(
          transaction,
          organizationId,
          enrollmentId
        );
        const learnerUserId = enrollmentContext.enrollment.userId;

        await this.authorization.requireCapability(
          transaction,
          requestContext.userId,
          learnerUserId === requestContext.userId
            ? "recommendation.read"
            : "recommendation.read_others",
          offeringScope(organizationId, enrollmentContext.offering.id)
        );

        const graph = await this.content.requirePublishedLearningGraph(
          transaction,
          organizationId,
          enrollmentContext.offering.courseVersionId
        );
        const mastery = await this.mastery.listUserMastery(
          transaction,
          organizationId,
          learnerUserId
        );
        const attemptCounts = await this.progress.listActivityAttemptCounts(
          transaction,
          organizationId,
          enrollmentId,
          graph.activities.map((activity) => activity.id)
        );

        const masteryBySkill = new Map(
          mastery.map((projection) => [
            projection.skillId,
            projection.masteryScore
          ] as const)
        );
        const attemptsByActivityVersion = new Map(
          attemptCounts.map((count) => [
            count.activityVersionId,
            count.attemptCount
          ] as const)
        );

        const decision = orderedMasteryV1({
          skills: graph.skills.map((skill) => ({
            skillId: skill.skillId,
            title: skill.title,
            position: skill.position,
            masteryScore: masteryBySkill.get(skill.skillId) ?? null
          })),
          activities: graph.activities.map((activity) => ({
            activityVersionId: activity.id,
            activityId: activity.activityId,
            slug: activity.slug,
            activityType: activity.activityType,
            title: activity.title,
            position: activity.position,
            skillIds: activity.skillIds,
            attemptCount: attemptsByActivityVersion.get(activity.id) ?? 0
          }))
        });

        const recommendationContext = {
          enrollmentId,
          offeringId: enrollmentContext.offering.id,
          courseVersionId: enrollmentContext.offering.courseVersionId,
          policy: ORDERED_MASTERY_POLICY
        };

        if (decision.status === "mastery_target_met") {
          return {
            status: "mastery_target_met",
            ...recommendationContext,
            recommendation: null
          };
        }

        if (decision.status === "no_practice_activity_available") {
          return {
            status: "no_practice_activity_available",
            ...recommendationContext,
            focusSkill: decision.focusSkill,
            reason: decision.reason,
            recommendation: null
          };
        }

        return {
          status: "recommended",
          ...recommendationContext,
          recommendation: {
            kind: "activity",
            activity: {
              activityVersionId: decision.activity.activityVersionId,
              activityId: decision.activity.activityId,
              slug: decision.activity.slug,
              activityType: decision.activity.activityType,
              title: decision.activity.title
            },
            focusSkill: decision.focusSkill,
            reason: decision.reason
          }
        };
      },
      {
        isolationLevel: "repeatable_read",
        readOnly: true
      }
    );
  }
}
