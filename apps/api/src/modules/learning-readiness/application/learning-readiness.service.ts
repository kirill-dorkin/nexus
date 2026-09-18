import { Injectable } from "@nestjs/common";
import type {
  CourseReadinessDecision,
  OfferingReadinessOverview
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { CourseReadinessEvaluator } from "./course-readiness-evaluator";
import { LearningReadinessQuery } from "./learning-readiness.query";
import { COURSE_PROGRESSION_READINESS_POLICY } from "../domain/course-readiness.policy";
import {
  OFFERING_READINESS_TRIAGE_POLICY,
  orderOfferingReadinessV1
} from "../domain/offering-readiness-triage.policy";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

@Injectable()
export class LearningReadinessApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly delivery: LearningDeliveryQuery,
    private readonly evaluator: CourseReadinessEvaluator,
    private readonly readinessQuery: LearningReadinessQuery
  ) {}

  async getCourseReadiness(
    organizationId: string,
    enrollmentId: string
  ): Promise<CourseReadinessDecision> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(
      context,
      async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);

        const enrollmentContext = await this.delivery.requireEnrollment(
          transaction,
          organizationId,
          enrollmentId
        );

        const learnerUserId = enrollmentContext.enrollment.userId;
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          learnerUserId === context.userId
            ? "readiness.read"
            : "readiness.read_others",
          offeringScope(organizationId, enrollmentContext.offering.id)
        );

        return this.readinessQuery.evaluateActiveEnrollment(
          transaction,
          organizationId,
          enrollmentId,
          new Date().toISOString()
        );
      },
      {
        isolationLevel: "repeatable_read",
        readOnly: true
      }
    );
  }

  async getOfferingReadiness(
    organizationId: string,
    offeringId: string
  ): Promise<OfferingReadinessOverview> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(
      context,
      async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);

        const offering = await this.delivery.requireOffering(
          transaction,
          organizationId,
          offeringId
        );
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "readiness.read_others",
          offeringScope(organizationId, offeringId)
        );

        const activeEnrollments =
          await this.delivery.listActiveEnrollmentsForOffering(
            transaction,
            organizationId,
            offeringId
          );
        const evaluatedAt = new Date().toISOString();
        const decisions = await this.evaluator.evaluateActiveEnrollments(
          transaction,
          organizationId,
          offering,
          activeEnrollments,
          evaluatedAt
        );

        const decisionByEnrollmentId = new Map(
          decisions.map((decision) => [decision.enrollmentId, decision])
        );
        const learners = orderOfferingReadinessV1(
          activeEnrollments.map((enrollment) => {
            const decision = decisionByEnrollmentId.get(enrollment.id);
            if (decision === undefined) {
              throw new Error(
                `Missing readiness decision for Enrollment ${enrollment.id}.`
              );
            }
            return {
              enrollmentId: enrollment.id,
              learnerUserId: enrollment.userId,
              enrolledAt: enrollment.enrolledAt,
              status: decision.status,
              readyUntil: decision.readyUntil,
              skills: decision.skills
            };
          })
        );

        const notReadyCount = learners.filter(
          (learner) => learner.status === "not_ready"
        ).length;
        const insufficientEvidenceCount = learners.filter(
          (learner) => learner.status === "insufficient_evidence"
        ).length;
        const readyCount = learners.filter(
          (learner) => learner.status === "ready"
        ).length;

        return {
          organizationId,
          offeringId,
          courseVersionId: offering.courseVersionId,
          evaluatedAt,
          policy: COURSE_PROGRESSION_READINESS_POLICY,
          triagePolicy: {
            key: OFFERING_READINESS_TRIAGE_POLICY.key,
            version: OFFERING_READINESS_TRIAGE_POLICY.version,
            statusOrder: [...OFFERING_READINESS_TRIAGE_POLICY.statusOrder]
          },
          summary: {
            activeEnrollmentCount: learners.length,
            attentionCount: notReadyCount + insufficientEvidenceCount,
            notReadyCount,
            insufficientEvidenceCount,
            readyCount
          },
          learners
        };
      },
      {
        isolationLevel: "repeatable_read",
        readOnly: true
      }
    );
  }
}
