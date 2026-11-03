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
  FIXED_INTERVAL_REVIEW_POLICY,
  orderedMasteryWithFixedReviewV1
} from "../domain/fixed-interval-review.policy";
import { REPEATED_TRUSTED_FAILURE_SIGNAL_POLICY } from "../domain/misconception-signal.policy";
import { MisconceptionSignalQuery } from "./misconception-signal.query";
import { ORDERED_MASTERY_POLICY } from "../domain/ordered-mastery.policy";
import {
  REPEATED_FAILURE_REMEDIATION_POLICY,
  applyRepeatedFailureRemediationV1
} from "../domain/repeated-failure-remediation.policy";

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
    private readonly misconceptionSignals: MisconceptionSignalQuery,
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
          mastery.map((projection) => [projection.skillId, projection] as const)
        );
        const attemptsByActivityVersion = new Map(
          attemptCounts.map(
            (count) => [count.activityVersionId, count.attemptCount] as const
          )
        );
        const evaluatedAt = new Date().toISOString();
        const policyActivities = graph.activities.map((activity) => ({
          activityVersionId: activity.id,
          activityId: activity.activityId,
          slug: activity.slug,
          activityType: activity.activityType,
          title: activity.title,
          position: activity.position,
          skillIds: activity.skillIds,
          attemptCount: attemptsByActivityVersion.get(activity.id) ?? 0
        }));

        const decision = orderedMasteryWithFixedReviewV1({
          evaluatedAt,
          skills: graph.skills.map((skill) => {
            const projection = masteryBySkill.get(skill.skillId);
            return {
              skillId: skill.skillId,
              title: skill.title,
              position: skill.position,
              masteryScore: projection?.masteryScore ?? null,
              lastEvidenceAt: projection?.lastEvidenceAt ?? null
            };
          }),
          activities: policyActivities
        });

        const recommendationContext = {
          enrollmentId,
          offeringId: enrollmentContext.offering.id,
          courseVersionId: enrollmentContext.offering.courseVersionId,
          policy: ORDERED_MASTERY_POLICY,
          reviewPolicy: FIXED_INTERVAL_REVIEW_POLICY,
          misconceptionSignalPolicy: REPEATED_TRUSTED_FAILURE_SIGNAL_POLICY,
          interventionPolicy: REPEATED_FAILURE_REMEDIATION_POLICY
        };

        if (decision.status === "mastery_target_met") {
          return {
            status: "mastery_target_met",
            ...recommendationContext,
            nextReviewAt: decision.nextReviewAt,
            recommendation: null
          };
        }

        const misconceptionSignal =
          (
            await this.misconceptionSignals.listSignals(
              transaction,
              organizationId,
              learnerUserId,
              [decision.focusSkill.skillId]
            )
          )[0] ?? null;

        if (decision.status === "no_practice_activity_available") {
          return {
            status: "no_practice_activity_available",
            ...recommendationContext,
            focusSkill: decision.focusSkill,
            reason: decision.reason,
            misconceptionSignal,
            recommendation: null
          };
        }

        const action = applyRepeatedFailureRemediationV1({
          baseline: decision,
          signal: misconceptionSignal,
          remediations: graph.remediations,
          activities: policyActivities
        });

        return {
          status: "recommended",
          ...recommendationContext,
          recommendation: {
            kind: "activity",
            activity: {
              activityVersionId: action.activity.activityVersionId,
              activityId: action.activity.activityId,
              slug: action.activity.slug,
              activityType: action.activity.activityType,
              title: action.activity.title
            },
            focusSkill: action.focusSkill,
            reason: action.reason,
            misconceptionSignal,
            intervention: action.intervention
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
