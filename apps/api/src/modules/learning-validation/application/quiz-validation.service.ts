import {
  ConflictException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import {
  activityValidationConfigSchema,
  type CourseVersionActivity,
  type QuizAnswer,
  type ValidationResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { QuizValidationContentQuery } from "../../learning-content/application/quiz-validation-content.query";
import { LearningProgressQuery } from "../../learning-progress/application/learning-progress.query";
import { TrustedValidationEvidenceSink } from "../../learning-progress/application/trusted-validation-evidence.sink";
import { LearningEventSink } from "../../learning-history/application/learning-event.sink";
import { ValidatorRegistry } from "../domain/validator-registry";
import { validateQuizAnswerV1 } from "../domain/quiz-validator";
import { ValidationRepository } from "./validation.repository";
export type RecordedQuiz = Readonly<{
  result: ValidationResult;
  activity: CourseVersionActivity;
  attemptNumber: number;
}>;
@Injectable()
export class QuizValidationApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly content: LearningContentQuery,
    private readonly protectedContent: QuizValidationContentQuery,
    private readonly progress: LearningProgressQuery,
    private readonly registry: ValidatorRegistry,
    private readonly validation: ValidationRepository,
    private readonly evidence: TrustedValidationEvidenceSink,
    private readonly learningEvents: LearningEventSink,
    private readonly outbox: OutboxRepository
  ) {}

  async validateAnswer(
    tx: DatabaseTransaction,
    organizationId: string,
    activity: CourseVersionActivity,
    answer: QuizAnswer
  ) {
    const parsed = activityValidationConfigSchema.safeParse(activity.config);
    if (!parsed.success)
      throw new ConflictException("Quiz validation binding is unavailable.");
    const binding = parsed.data.validation;
    const definition = this.registry.find(
      binding.validatorKey,
      binding.validatorVersion
    );
    if (
      definition?.recordingAuthority !== "deterministic_quiz" ||
      definition.version !== 1 ||
      definition.evidenceTrust !== "trusted" ||
      definition.key !== activity.activityType ||
      Object.keys(binding.config).length !== 0
    )
      throw new ConflictException("Quiz validator version is unavailable.");
    const protectedDefinition = await this.protectedContent.requireDefinition(
      tx,
      organizationId,
      activity.id
    );
    if (protectedDefinition.type !== definition.key)
      throw new ConflictException(
        "Quiz definition does not match its binding."
      );
    return {
      ...validateQuizAnswerV1(protectedDefinition, answer),
      evidenceTrust: definition.evidenceTrust
    };
  }

  async recordOwn(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionId: string,
    submissionId: string
  ): Promise<RecordedQuiz> {
    const { userId } = this.requestContext.requirePrincipal();
    const submitted = await this.progress.requireSubmissionForValidation(
      tx,
      organizationId,
      submissionId
    );
    if (
      submitted.learnerUserId !== userId ||
      submitted.submission.submittedByUserId !== userId ||
      submitted.attempt.enrollmentId !== enrollmentId ||
      submitted.attempt.activityVersionId !== activityVersionId
    )
      throw new ForbiddenException(
        "Only your exact quiz submission can be checked."
      );
    const activity = await this.content.requireActivityVersionById(
      tx,
      organizationId,
      activityVersionId
    );
    // The submitted payload is immutable; no result or validator authority is accepted from a caller.
    const computed = await this.validateAnswer(
      tx,
      organizationId,
      activity,
      submitted.submission.payload as QuizAnswer
    );
    const persisted = await this.validation.createOrFind(tx, {
      id: await this.database.nextUuid(),
      organizationId,
      submissionId,
      activityVersionId,
      validatorKey: activity.activityType,
      validatorVersion: 1,
      validatorConfig: {},
      idempotencyKey: "quiz-check@1",
      status: "completed",
      outcome: computed.outcome,
      score: computed.score,
      evidenceTrust: computed.evidenceTrust,
      payload: {},
      recordedByUserId: userId
    });
    const r = persisted.result;
    if (
      r.status !== "completed" ||
      r.outcome !== computed.outcome ||
      r.score !== computed.score ||
      r.evidenceTrust !== computed.evidenceTrust ||
      r.recordedByUserId !== userId ||
      Object.keys(r.validatorConfig).length ||
      Object.keys(r.payload).length
    )
      throw new ConflictException("Quiz result attribution is inconsistent.");
    if (persisted.created) {
      await this.learningEvents.appendValidationResultRecorded(
        tx,
        userId,
        submitted.attempt,
        r
      );
      await this.outbox.append(tx, {
        organizationId,
        eventName: "validation.result_recorded",
        eventVersion: 1,
        aggregateType: "validation_result",
        aggregateId: r.id,
        actorUserId: userId,
        payload: {
          organizationId,
          validationResultId: r.id,
          submissionId,
          activityVersionId,
          validatorKey: r.validatorKey,
          validatorVersion: r.validatorVersion,
          status: r.status,
          outcome: r.outcome,
          score: r.score,
          evidenceTrust: r.evidenceTrust
        }
      });
    }
    return {
      result: r,
      activity,
      attemptNumber: submitted.attempt.attemptNumber
    };
  }

  async normalize(recorded: RecordedQuiz) {
    const context = this.requestContext.tenantContext(
      recorded.result.organizationId
    );
    if (recorded.result.recordedByUserId !== context.userId)
      throw new ForbiddenException("Quiz result belongs to another learner.");
    return this.database.tenantTransaction(context, (tx) =>
      this.evidence.materializeTrustedValidationEvidence(
        tx,
        context.organizationId,
        recorded.result,
        recorded.activity
      )
    );
  }
}
