import { ConflictException, Injectable } from "@nestjs/common";
import type { CourseReadinessDecision } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { CourseReadinessEvaluator } from "./course-readiness-evaluator";
import { LearningReadinessQuery } from "./learning-readiness.query";

@Injectable()
export class LearningReadinessQueryService extends LearningReadinessQuery {
  constructor(
    private readonly delivery: LearningDeliveryQuery,
    private readonly evaluator: CourseReadinessEvaluator
  ) {
    super();
  }

  async evaluateActiveEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    evaluatedAt: string
  ): Promise<CourseReadinessDecision> {
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

    const decisions = await this.evaluator.evaluateActiveEnrollments(
      transaction,
      organizationId,
      enrollmentContext.offering,
      [enrollmentContext.enrollment],
      evaluatedAt
    );
    const decision = decisions[0];
    if (decision === undefined) {
      throw new Error("Course readiness evaluator returned no decision.");
    }
    return decision;
  }
}
