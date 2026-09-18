import { ConflictException, Injectable } from "@nestjs/common";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { ReadinessEvidenceQuery } from "../../learning-progress/application/learning-progress.query";
import { MasteryQuery } from "../../learning-progress/application/mastery.query";
import { MisconceptionSignalQuery } from "../../learning-recommendations/application/misconception-signal.query";
import {
  COURSE_PROGRESSION_READINESS_POLICY,
  courseProgressionReadinessV1
} from "../domain/course-readiness.policy";

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
    private readonly content: LearningContentQuery,
    private readonly mastery: MasteryQuery,
    private readonly evidence: ReadinessEvidenceQuery,
    private readonly misconceptionSignals: MisconceptionSignalQuery
  ) {}

  async getCourseReadiness(
    organizationId: string,
    enrollmentId: string
  ) {
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
        if (enrollmentContext.enrollment.status !== "active") {
          throw new ConflictException(
            "Course readiness is defined only for an active Enrollment."
          );
        }

        const learnerUserId = enrollmentContext.enrollment.userId;
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          learnerUserId === context.userId
            ? "readiness.read"
            : "readiness.read_others",
          offeringScope(organizationId, enrollmentContext.offering.id)
        );

        const graph = await this.content.requirePublishedLearningGraph(
          transaction,
          organizationId,
          enrollmentContext.offering.courseVersionId
        );
        if (graph.skills.length === 0) {
          throw new ConflictException(
            "A CourseVersion without Skills cannot be evaluated for readiness."
          );
        }

        const skillIds = graph.skills.map((skill) => skill.skillId);
        const skillIdSet = new Set(skillIds);
        const [allMastery, evidence, signals] = await Promise.all([
          this.mastery.listUserMastery(
            transaction,
            organizationId,
            learnerUserId
          ),
          this.evidence.listScoredAttemptSummaries(
            transaction,
            organizationId,
            learnerUserId,
            skillIds
          ),
          this.misconceptionSignals.listSignals(
            transaction,
            organizationId,
            learnerUserId,
            skillIds
          )
        ]);

        const evaluatedAt = new Date().toISOString();
        const decision = courseProgressionReadinessV1({
          evaluatedAt,
          skills: graph.skills.map((skill) => ({
            skillId: skill.skillId,
            title: skill.title,
            position: skill.position
          })),
          mastery: allMastery
            .filter((projection) => skillIdSet.has(projection.skillId))
            .map((projection) => ({
              skillId: projection.skillId,
              algorithmKey: projection.algorithmKey,
              algorithmVersion: projection.algorithmVersion,
              masteryScore: projection.masteryScore,
              scoredEvidenceCount: projection.scoredEvidenceCount
            })),
          evidence,
          signals: signals.map((signal) => ({
            skillId: signal.skillId,
            consecutiveFailureCount: signal.consecutiveFailureCount,
            firstObservedAt: signal.firstObservedAt,
            lastObservedAt: signal.lastObservedAt
          }))
        });

        return {
          organizationId,
          enrollmentId,
          offeringId: enrollmentContext.offering.id,
          courseVersionId: enrollmentContext.offering.courseVersionId,
          evaluatedAt,
          policy: COURSE_PROGRESSION_READINESS_POLICY,
          ...decision
        };
      },
      {
        isolationLevel: "repeatable_read",
        readOnly: true
      }
    );
  }
}
