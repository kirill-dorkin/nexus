import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  Attempt,
  CreateAttemptRequest,
  CreateEvidenceRequest,
  Evidence
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningGraphApplicationService } from "../../learning-content/application/learning-graph.service";
import { LearningDeliveryApplicationService } from "../../learning-delivery/application/learning-delivery.service";
import { LearningProgressRepository } from "./learning-progress.repository";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

@Injectable()
export class LearningProgressApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly progress: LearningProgressRepository,
    private readonly graph: LearningGraphApplicationService,
    private readonly delivery: LearningDeliveryApplicationService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly outbox: OutboxRepository
  ) {}

  async submitAttempt(
    organizationId: string,
    enrollmentId: string,
    activityId: string,
    command: CreateAttemptRequest
  ): Promise<Attempt> {
    const context = this.requestContext.tenantContext(organizationId);
    const attemptId = await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const enrollmentContext = await this.delivery.requireActiveEnrollment(
        transaction,
        organizationId,
        enrollmentId
      );

      if (enrollmentContext.enrollment.userId !== context.userId) {
        throw new ForbiddenException("Attempts can only be submitted for your own enrollment.");
      }

      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "attempt.submit",
        offeringScope(organizationId, enrollmentContext.offering.id)
      );

      const activity = await this.graph.requireActivityVersion(
        transaction,
        organizationId,
        enrollmentContext.offering.courseVersionId,
        activityId
      );

      const attempt = await this.progress.createAttempt(transaction, {
        id: attemptId,
        organizationId,
        enrollmentId,
        activityVersionId: activity.id,
        submission: command.submission ?? {}
      });

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "attempt.submitted",
        eventVersion: 1,
        aggregateType: "attempt",
        aggregateId: attempt.id,
        actorUserId: context.userId,
        payload: {
          organizationId,
          attemptId: attempt.id,
          enrollmentId,
          offeringId: enrollmentContext.offering.id,
          courseVersionId: enrollmentContext.offering.courseVersionId,
          activityId,
          activityVersionId: activity.id,
          attemptNumber: attempt.attemptNumber
        }
      });

      return attempt;
    });
  }

  async recordEvidence(
    organizationId: string,
    attemptId: string,
    command: CreateEvidenceRequest
  ): Promise<Evidence> {
    const context = this.requestContext.tenantContext(organizationId);
    const evidenceId = await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const attemptContext = await this.progress.findAttemptContext(
        transaction,
        organizationId,
        attemptId
      );
      if (attemptContext === null) {
        throw new NotFoundException("Attempt not found.");
      }

      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "evidence.record",
        offeringScope(organizationId, attemptContext.offeringId)
      );

      const assessesSkill = await this.graph.activityAssessesSkill(
        transaction,
        organizationId,
        attemptContext.attempt.activityVersionId,
        command.skillId
      );
      if (!assessesSkill) {
        throw new BadRequestException(
          "Evidence can only target a skill assessed by the attempt activity."
        );
      }

      const evidence = await this.progress.createEvidence(transaction, {
        id: evidenceId,
        organizationId,
        attemptId,
        skillId: command.skillId,
        kind: command.kind,
        score: command.score ?? null,
        payload: command.payload ?? {},
        recordedByUserId: context.userId
      });

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "evidence.recorded",
        eventVersion: 1,
        aggregateType: "evidence",
        aggregateId: evidence.id,
        actorUserId: context.userId,
        payload: {
          organizationId,
          evidenceId: evidence.id,
          attemptId,
          skillId: evidence.skillId,
          kind: evidence.kind,
          score: evidence.score
        }
      });

      return evidence;
    });
  }
}
