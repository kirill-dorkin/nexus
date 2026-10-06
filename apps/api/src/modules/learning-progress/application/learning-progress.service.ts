import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  Attempt,
  CreateAttemptRequest,
  CourseVersionActivity,
  CreateEvidenceRequest,
  CreateSubmissionRequest,
  Evidence,
  Submission
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningGraphApplicationService } from "../../learning-content/application/learning-graph.service";
import { LearningDeliveryApplicationService } from "../../learning-delivery/application/learning-delivery.service";
import { LearningEventSink } from "../../learning-history/application/learning-event.sink";
import type {
  ActivityAttemptCount,
  SubmissionValidationContext
} from "./learning-progress.query";
import { LearningProgressRepository } from "./learning-progress.repository";
import { MasteryApplicationService } from "./mastery.service";
import { QuizSubmissionCommand } from "./quiz-submission.command";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

@Injectable()
export class LearningProgressApplicationService extends QuizSubmissionCommand {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly progress: LearningProgressRepository,
    private readonly graph: LearningGraphApplicationService,
    private readonly delivery: LearningDeliveryApplicationService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly learningEvents: LearningEventSink,
    private readonly outbox: OutboxRepository,
    private readonly mastery: MasteryApplicationService
  ) { super(); }

  async commitOwn(transaction: DatabaseTransaction, organizationId: string, enrollmentId: string,
    activity: CourseVersionActivity, attemptKey: string, payload: Readonly<Record<string, unknown>>): Promise<Submission> {
    const { userId } = this.requestContext.requirePrincipal();
    const enrollment = await this.delivery.requireActiveEnrollment(transaction, organizationId, enrollmentId);
    if (enrollment.enrollment.userId !== userId || activity.organizationId !== organizationId ||
        activity.courseVersionId !== enrollment.offering.courseVersionId || !activity.activityType.startsWith("quiz."))
      throw new ForbiddenException("Quiz work must belong to your exact enrollment.");
    await transaction.client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["quiz-attempt:" + attemptKey]);
    const existing = await this.progress.findAttemptContext(transaction, organizationId, attemptKey);
    if (existing) {
      if (existing.learnerUserId !== userId || existing.attempt.enrollmentId !== enrollmentId || existing.attempt.activityVersionId !== activity.id)
        throw new ConflictException("Attempt key cannot be used for this learning context.");
      const submission = await this.progress.findSubmissionByAttempt(transaction, organizationId, attemptKey);
      if (!submission || JSON.stringify(submission.payload) !== JSON.stringify(payload)) {
        // jsonb object key order is independent of request order.
        const canonical = (v: Readonly<Record<string, unknown>>) => JSON.stringify(Object.keys(v).sort().map(k => [k,v[k]]));
        if (!submission || canonical(submission.payload) !== canonical(payload))
          throw new ConflictException("Attempt key is already bound to different learner work.");
      }
      return submission;
    }
    const attempt = await this.progress.createAttempt(transaction, { id:attemptKey, organizationId, enrollmentId, activityVersionId:activity.id });
    await this.learningEvents.appendAttemptStarted(transaction, userId, attempt);
    await this.outbox.append(transaction, {organizationId,eventName:"attempt.started",eventVersion:1,aggregateType:"attempt",aggregateId:attempt.id,actorUserId:userId,
      payload:{organizationId,attemptId:attempt.id,enrollmentId,offeringId:enrollment.offering.id,courseVersionId:activity.courseVersionId,activityId:activity.activityId,activityVersionId:activity.id,attemptNumber:attempt.attemptNumber}});
    const submission = await this.progress.createSubmission(transaction, {id:await this.database.nextUuid(),organizationId,attemptId:attempt.id,payload,submittedByUserId:userId});
    await this.appendSubmissionEvents(transaction,organizationId,userId,enrollment.offering.id,attempt,submission);
    return submission;
  }

  async createAttempt(
    organizationId: string,
    enrollmentId: string,
    activityId: string,
    command: CreateAttemptRequest
  ): Promise<Attempt> {
    const context = this.requestContext.tenantContext(organizationId);
    const attemptId = await this.database.nextUuid();
    const compatibilitySubmissionId =
      command.submission === undefined ? null : await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const enrollmentContext = await this.delivery.requireActiveEnrollment(
        transaction,
        organizationId,
        enrollmentId
      );

      if (enrollmentContext.enrollment.userId !== context.userId) {
        throw new ForbiddenException("Attempts can only be started for your own enrollment.");
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
        activityVersionId: activity.id
      });

      await this.learningEvents.appendAttemptStarted(
        transaction,
        enrollmentContext.enrollment.userId,
        attempt
      );

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "attempt.started",
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

      if (command.submission !== undefined && compatibilitySubmissionId !== null) {
        const submission = await this.progress.createSubmission(transaction, {
          id: compatibilitySubmissionId,
          organizationId,
          attemptId: attempt.id,
          payload: command.submission,
          submittedByUserId: context.userId
        });
        await this.appendSubmissionEvents(
          transaction,
          organizationId,
          context.userId,
          enrollmentContext.offering.id,
          attempt,
          submission
        );
      }

      return attempt;
    });
  }

  async submitAttempt(
    organizationId: string,
    attemptId: string,
    command: CreateSubmissionRequest
  ): Promise<Submission> {
    const context = this.requestContext.tenantContext(organizationId);
    const submissionId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        const attemptContext = await this.progress.findAttemptContext(
          transaction,
          organizationId,
          attemptId
        );
        if (attemptContext === null) {
          throw new NotFoundException("Attempt not found.");
        }
        if (attemptContext.learnerUserId !== context.userId) {
          throw new ForbiddenException("Attempts can only be submitted by their learner.");
        }

        const enrollmentContext = await this.delivery.requireActiveEnrollment(
          transaction,
          organizationId,
          attemptContext.attempt.enrollmentId
        );

        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "attempt.submit",
          offeringScope(organizationId, enrollmentContext.offering.id)
        );

        const submission = await this.progress.createSubmission(transaction, {
          id: submissionId,
          organizationId,
          attemptId,
          payload: command.payload,
          submittedByUserId: context.userId
        });

        await this.appendSubmissionEvents(
          transaction,
          organizationId,
          context.userId,
          enrollmentContext.offering.id,
          attemptContext.attempt,
          submission
        );

        return submission;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("This attempt already has a submission.");
      }
      throw error;
    }
  }

  async recordEvidence(
    organizationId: string,
    submissionId: string,
    command: CreateEvidenceRequest
  ): Promise<Evidence> {
    const context = this.requestContext.tenantContext(organizationId);
    const evidenceId = await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      return this.recordEvidenceInTransaction(
        transaction,
        organizationId,
        context.userId,
        submissionId,
        evidenceId,
        command
      );
    });
  }

  async recordEvidenceForAttempt(
    organizationId: string,
    attemptId: string,
    command: CreateEvidenceRequest
  ): Promise<Evidence> {
    const context = this.requestContext.tenantContext(organizationId);
    const evidenceId = await this.database.nextUuid();

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const submission = await this.progress.findSubmissionByAttempt(
        transaction,
        organizationId,
        attemptId
      );
      if (submission === null) {
        throw new ConflictException("Evidence requires a submitted attempt.");
      }

      return this.recordEvidenceInTransaction(
        transaction,
        organizationId,
        context.userId,
        submission.id,
        evidenceId,
        command
      );
    });
  }

  listActivityAttemptCounts(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ): Promise<readonly ActivityAttemptCount[]> {
    return this.progress.listActivityAttemptCounts(
      transaction,
      organizationId,
      enrollmentId,
      activityVersionIds
    );
  }

  async requireSubmissionForValidation(
    transaction: DatabaseTransaction,
    organizationId: string,
    submissionId: string
  ): Promise<SubmissionValidationContext> {
    const submissionContext = await this.progress.findSubmissionContext(
      transaction,
      organizationId,
      submissionId
    );
    if (submissionContext === null) {
      throw new NotFoundException("Submission not found.");
    }

    return submissionContext;
  }

  private async recordEvidenceInTransaction(
    transaction: DatabaseTransaction,
    organizationId: string,
    actorUserId: string,
    submissionId: string,
    evidenceId: string,
    command: CreateEvidenceRequest
  ): Promise<Evidence> {
    const submissionContext = await this.progress.findSubmissionContext(
      transaction,
      organizationId,
      submissionId
    );
    if (submissionContext === null) {
      throw new NotFoundException("Submission not found.");
    }

    await this.authorization.requireCapability(
      transaction,
      actorUserId,
      "evidence.record",
      offeringScope(organizationId, submissionContext.offeringId)
    );

    const assessesSkill = await this.graph.activityAssessesSkill(
      transaction,
      organizationId,
      submissionContext.attempt.activityVersionId,
      command.skillId
    );
    if (!assessesSkill) {
      throw new BadRequestException(
        "Evidence can only target a skill assessed by the submitted activity."
      );
    }

    const evidence = await this.progress.createEvidence(transaction, {
      id: evidenceId,
      organizationId,
      attemptId: submissionContext.attempt.id,
      submissionId: submissionContext.submission.id,
      skillId: command.skillId,
      kind: command.kind,
      score: command.score ?? null,
      payload: command.payload ?? {},
      recordedByUserId: actorUserId,
      sourceType: "manual",
      sourceValidationResultId: null
    });

    await this.learningEvents.appendEvidenceRecorded(
      transaction,
      submissionContext.learnerUserId,
      submissionContext.attempt,
      evidence
    );

    await this.mastery.refreshSkillProjection(
      transaction,
      organizationId,
      submissionContext.learnerUserId,
      evidence.skillId
    );

    await this.outbox.append(transaction, {
      organizationId,
      eventName: "evidence.recorded",
      eventVersion: 1,
      aggregateType: "evidence",
      aggregateId: evidence.id,
      actorUserId,
      payload: {
        organizationId,
        evidenceId: evidence.id,
        attemptId: evidence.attemptId,
        submissionId: evidence.submissionId,
        skillId: evidence.skillId,
        kind: evidence.kind,
        score: evidence.score,
        sourceType: evidence.sourceType,
        sourceValidationResultId: evidence.sourceValidationResultId
      }
    });

    return evidence;
  }

  private async appendSubmissionEvents(
    transaction: DatabaseTransaction,
    organizationId: string,
    actorUserId: string,
    offeringId: string,
    attempt: Attempt,
    submission: Submission
  ): Promise<void> {
    await this.learningEvents.appendSubmissionSubmitted(
      transaction,
      actorUserId,
      attempt,
      submission
    );

    await this.outbox.append(transaction, {
      organizationId,
      eventName: "submission.submitted",
      eventVersion: 1,
      aggregateType: "submission",
      aggregateId: submission.id,
      actorUserId,
      payload: {
        organizationId,
        submissionId: submission.id,
        attemptId: attempt.id,
        enrollmentId: attempt.enrollmentId,
        offeringId,
        activityVersionId: attempt.activityVersionId,
        attemptNumber: attempt.attemptNumber
      }
    });

    // Transitional integration-event alias for consumers of the pre-F4 lifecycle.
    await this.outbox.append(transaction, {
      organizationId,
      eventName: "attempt.submitted",
      eventVersion: 1,
      aggregateType: "attempt",
      aggregateId: attempt.id,
      actorUserId,
      payload: {
        organizationId,
        attemptId: attempt.id,
        submissionId: submission.id,
        enrollmentId: attempt.enrollmentId,
        offeringId,
        activityVersionId: attempt.activityVersionId,
        attemptNumber: attempt.attemptNumber
      }
    });
  }
}
