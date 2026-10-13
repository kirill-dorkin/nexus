import {
  ConflictException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import type { Enrollment } from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningDeliveryCommand } from "../../learning-delivery/application/learning-delivery.command";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { LearningReadinessQuery } from "../../learning-readiness/application/learning-readiness.query";
import {
  ENROLLMENT_COMPLETION_GATE_POLICY,
  courseReadinessEnrollmentCompletionGateV1
} from "../domain/enrollment-completion-gate.policy";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "40001"
  );
}

@Injectable()
export class LearningProgressionApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly deliveryQuery: LearningDeliveryQuery,
    private readonly deliveryCommand: LearningDeliveryCommand,
    private readonly readiness: LearningReadinessQuery
  ) {}

  async completeEnrollment(
    organizationId: string,
    enrollmentId: string
  ): Promise<Enrollment> {
    const context = this.requestContext.tenantContext(organizationId);

    try {
      return await this.database.tenantTransaction(
        context,
        async (transaction) => {
          await this.identity.requireActiveUser(transaction, context.userId);

          const enrollmentContext = await this.deliveryQuery.requireEnrollment(
            transaction,
            organizationId,
            enrollmentId
          );
          if (enrollmentContext.enrollment.userId !== context.userId) {
            throw new ForbiddenException(
              "Enrollment completion can only be requested by its learner."
            );
          }

          await this.authorization.requireCapability(
            transaction,
            context.userId,
            "progression.complete",
            offeringScope(organizationId, enrollmentContext.offering.id)
          );

          if (enrollmentContext.enrollment.status === "completed") {
            return enrollmentContext.enrollment;
          }
          if (enrollmentContext.enrollment.status !== "active") {
            throw new ConflictException(
              "Only an active Enrollment can transition to completed."
            );
          }

          const transitionAt = new Date().toISOString();
          const readiness = await this.readiness.evaluateActiveEnrollment(
            transaction,
            organizationId,
            enrollmentId,
            transitionAt
          );
          const gate = courseReadinessEnrollmentCompletionGateV1(
            readiness.status
          );

          if (gate.status === "blocked") {
            throw new ConflictException({
              message: "Enrollment completion is blocked by the progression gate.",
              code: "progression_gate_denied",
              gatePolicy: ENROLLMENT_COMPLETION_GATE_POLICY,
              readiness
            });
          }

          return this.deliveryCommand.completeEnrollment(
            transaction,
            organizationId,
            enrollmentId,
            transitionAt,
            context.userId
          );
        },
        {
          isolationLevel: "repeatable_read"
        }
      );
    } catch (error) {
      if (isSerializationFailure(error)) {
        throw new ConflictException({
          message:
            "Enrollment completion changed concurrently. Retry the request.",
          code: "progression_concurrency_conflict"
        });
      }
      throw error;
    }
  }
}
