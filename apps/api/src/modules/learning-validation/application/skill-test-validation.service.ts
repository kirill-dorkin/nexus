import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import {
  activityValidationConfigSchema,
  SKILL_TEST,
  submitSkillTestRequestSchema,
  type CourseVersionActivity,
  type SkillTestAnswer,
  type SkillTestQuestion,
  type ValidationResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { SkillTestContentQuery } from "../../learning-content/application/skill-test-content.query";
import { LearningEventSink } from "../../learning-history/application/learning-event.sink";
import { LearningProgressQuery } from "../../learning-progress/application/learning-progress.query";
import { TrustedValidationEvidenceSink } from "../../learning-progress/application/trusted-validation-evidence.sink";
import {
  evaluateSkillTest,
  SkillTestAnswersMismatch,
  type SkillTestEvaluation
} from "../domain/skill-test-evaluator";
import { ValidatorRegistry } from "../domain/validator-registry";
import { ValidationRepository } from "./validation.repository";

/** The questions one draw showed for one skill test activity. */
export type SkillTestPart = Readonly<{
  skillKey: string;
  activityVersionId: string;
  questionKeys: readonly string[];
}>;

export type RecordedSkillTest = Readonly<{
  result: ValidationResult;
  activity: CourseVersionActivity;
  evaluation: SkillTestEvaluation;
}>;

/**
 * ADR-0075, `skill_test@1`: grades the answers of a drawn skill (or branch) test against
 * the protected banks. The learner chooses neither the questions nor the result.
 */
@Injectable()
export class SkillTestValidationApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly content: LearningContentQuery,
    private readonly banks: SkillTestContentQuery,
    private readonly progress: LearningProgressQuery,
    private readonly registry: ValidatorRegistry,
    private readonly validation: ValidationRepository,
    private readonly evidence: TrustedValidationEvidenceSink,
    private readonly learningEvents: LearningEventSink,
    private readonly outbox: OutboxRepository
  ) {}

  /** The banks of the drawn parts, for grading and for explanations after grading. */
  async banksOf(
    tx: DatabaseTransaction,
    organizationId: string,
    parts: readonly SkillTestPart[]
  ): Promise<ReadonlyMap<string, readonly SkillTestQuestion[]>> {
    const banks = new Map<string, readonly SkillTestQuestion[]>();
    for (const part of parts)
      if (!banks.has(part.activityVersionId))
        banks.set(
          part.activityVersionId,
          await this.banks.requireBank(
            tx,
            organizationId,
            part.activityVersionId
          )
        );
    return banks;
  }

  /** Grades exactly the drawn questions; refuses answers to anything else. */
  async evaluate(
    tx: DatabaseTransaction,
    organizationId: string,
    parts: readonly SkillTestPart[],
    answers: readonly SkillTestAnswer[],
    threshold: number
  ): Promise<SkillTestEvaluation> {
    const banks = await this.banksOf(tx, organizationId, parts);
    try {
      return evaluateSkillTest(
        parts.map((part) => ({
          skillKey: part.skillKey,
          questionKeys: part.questionKeys,
          bank: banks.get(part.activityVersionId) ?? []
        })),
        answers,
        threshold
      );
    } catch (error) {
      if (error instanceof SkillTestAnswersMismatch)
        throw new BadRequestException(
          "Answer exactly the drawn questions, each once."
        );
      throw error;
    }
  }

  /**
   * Records the `skill_test@1` result of one part's Submission. The answers come from the
   * immutable Submission, so the result is reproducible.
   */
  async recordOwn(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionId: string,
    submissionId: string,
    parts: readonly SkillTestPart[],
    threshold: number
  ): Promise<RecordedSkillTest> {
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
      submitted.attempt.activityVersionId !== activityVersionId ||
      !parts.some((part) => part.activityVersionId === activityVersionId)
    )
      throw new ForbiddenException(
        "Only your exact skill test submission can be checked."
      );
    const activity = await this.content.requireActivityVersionById(
      tx,
      organizationId,
      activityVersionId
    );
    const parsed = activityValidationConfigSchema.safeParse(activity.config);
    const binding = parsed.success ? parsed.data.validation : null;
    const definition =
      binding &&
      this.registry.find(binding.validatorKey, binding.validatorVersion);
    if (
      !binding ||
      definition?.recordingAuthority !== "deterministic_skill_test" ||
      definition.key !== activity.activityType ||
      definition.evidenceTrust !== "trusted" ||
      Object.keys(binding.config).length !== 0
    )
      throw new ConflictException("Skill test validator is unavailable.");
    const answers = submitSkillTestRequestSchema.safeParse({
      answers: (submitted.submission.payload as { answers?: unknown }).answers
    });
    if (!answers.success)
      throw new ConflictException("Submitted skill test answers are invalid.");
    const evaluation = await this.evaluate(
      tx,
      organizationId,
      parts,
      answers.data.answers,
      threshold
    );
    const persisted = await this.validation.createOrFind(tx, {
      id: await this.database.nextUuid(),
      organizationId,
      submissionId,
      activityVersionId,
      validatorKey: SKILL_TEST.validatorKey,
      validatorVersion: SKILL_TEST.validatorVersion,
      validatorConfig: {},
      idempotencyKey: "skill_test@1",
      status: "completed",
      outcome: evaluation.outcome,
      score: evaluation.score,
      evidenceTrust: "trusted",
      payload: {
        correctCount: evaluation.correctCount,
        total: evaluation.total,
        threshold: evaluation.threshold,
        questions: evaluation.questions
      },
      recordedByUserId: userId
    });
    const r = persisted.result;
    if (
      r.status !== "completed" ||
      r.outcome !== evaluation.outcome ||
      r.score !== evaluation.score ||
      r.evidenceTrust !== "trusted" ||
      r.recordedByUserId !== userId
    )
      throw new ConflictException(
        "Skill test result attribution is inconsistent."
      );
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
    return { result: r, activity, evaluation };
  }

  /** One normalized Evidence for the tested skill (ADR-0075 point 3). */
  async normalize(recorded: RecordedSkillTest) {
    const context = this.requestContext.tenantContext(
      recorded.result.organizationId
    );
    if (recorded.result.recordedByUserId !== context.userId)
      throw new ForbiddenException(
        "Skill test result belongs to another learner."
      );
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
