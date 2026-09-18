import { ConflictException, Injectable } from "@nestjs/common";
import type {
  CourseReadinessDecision,
  Enrollment,
  LearningOffering
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { ReadinessEvidenceQuery } from "../../learning-progress/application/learning-progress.query";
import { MasteryQuery } from "../../learning-progress/application/mastery.query";
import { MisconceptionSignalQuery } from "../../learning-recommendations/application/misconception-signal.query";
import {
  COURSE_PROGRESSION_READINESS_POLICY,
  courseProgressionReadinessV1
} from "../domain/course-readiness.policy";

function groupByLearner<T extends Readonly<{ learnerUserId: string }>>(
  values: readonly T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const current = grouped.get(value.learnerUserId) ?? [];
    current.push(value);
    grouped.set(value.learnerUserId, current);
  }
  return grouped;
}

@Injectable()
export class CourseReadinessEvaluator {
  constructor(
    private readonly delivery: LearningDeliveryQuery,
    private readonly content: LearningContentQuery,
    private readonly mastery: MasteryQuery,
    private readonly evidence: ReadinessEvidenceQuery,
    private readonly misconceptionSignals: MisconceptionSignalQuery
  ) {}

  async evaluateActiveEnrollments(
    transaction: DatabaseTransaction,
    organizationId: string,
    offering: LearningOffering,
    enrollments: readonly Enrollment[],
    evaluatedAt: string
  ): Promise<readonly CourseReadinessDecision[]> {
    for (const enrollment of enrollments) {
      if (
        enrollment.organizationId !== organizationId ||
        enrollment.offeringId !== offering.id ||
        enrollment.status !== "active"
      ) {
        throw new Error(
          "Course readiness evaluator requires active Enrollments from one Offering."
        );
      }
    }

    const graph = await this.content.requirePublishedLearningGraph(
      transaction,
      organizationId,
      offering.courseVersionId
    );
    if (graph.skills.length === 0) {
      throw new ConflictException(
        "A CourseVersion without Skills cannot be evaluated for readiness."
      );
    }

    const learnerUserIds = [...new Set(enrollments.map((enrollment) => enrollment.userId))];
    const skillIds = graph.skills.map((skill) => skill.skillId);

    const learnerEnrollments = await this.delivery.listEnrollmentsForUsers(
      transaction,
      organizationId,
      learnerUserIds
    );
    const enrollmentReferences = learnerEnrollments.map((enrollment) => ({
      learnerUserId: enrollment.userId,
      enrollmentId: enrollment.id
    }));

    const allMastery = await this.mastery.listUsersMastery(
      transaction,
      organizationId,
      learnerUserIds,
      skillIds
    );
    const evidence =
      await this.evidence.listScoredAttemptSummariesForEnrollments(
        transaction,
        organizationId,
        enrollmentReferences,
        skillIds
      );
    const signals = await this.misconceptionSignals.listSignalsForEnrollments(
      transaction,
      organizationId,
      enrollmentReferences,
      skillIds
    );

    const masteryByLearner = new Map<string, (typeof allMastery)[number][]>();
    for (const projection of allMastery) {
      const current = masteryByLearner.get(projection.userId) ?? [];
      current.push(projection);
      masteryByLearner.set(projection.userId, current);
    }
    const evidenceByLearner = groupByLearner(evidence);
    const signalsByLearner = groupByLearner(signals);

    return enrollments.map((enrollment) => {
      const learnerMastery = masteryByLearner.get(enrollment.userId) ?? [];
      const learnerEvidence = evidenceByLearner.get(enrollment.userId) ?? [];
      const learnerSignals = signalsByLearner.get(enrollment.userId) ?? [];

      const decision = courseProgressionReadinessV1({
        evaluatedAt,
        skills: graph.skills.map((skill) => ({
          skillId: skill.skillId,
          title: skill.title,
          position: skill.position
        })),
        mastery: learnerMastery.map((projection) => ({
          skillId: projection.skillId,
          algorithmKey: projection.algorithmKey,
          algorithmVersion: projection.algorithmVersion,
          masteryScore: projection.masteryScore,
          scoredEvidenceCount: projection.scoredEvidenceCount
        })),
        evidence: learnerEvidence.map((summary) => ({
          skillId: summary.skillId,
          scoredAttemptCount: summary.scoredAttemptCount,
          lastScoredEvidenceAt: summary.lastScoredEvidenceAt
        })),
        signals: learnerSignals.map((signal) => ({
          skillId: signal.skillId,
          consecutiveFailureCount: signal.consecutiveFailureCount,
          firstObservedAt: signal.firstObservedAt,
          lastObservedAt: signal.lastObservedAt
        }))
      });

      return {
        organizationId,
        enrollmentId: enrollment.id,
        offeringId: offering.id,
        courseVersionId: offering.courseVersionId,
        evaluatedAt,
        policy: COURSE_PROGRESSION_READINESS_POLICY,
        ...decision
      };
    });
  }
}
