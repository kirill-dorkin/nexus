import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import {
  evaluateAssignment,
  type AssignmentEvaluation
} from "@platform/checks";
import {
  parseHtmlOnServer,
  UncheckablePageError
} from "@platform/checks/server";
import {
  activityValidationConfigSchema,
  assignmentFilesSchema,
  type AssignmentFiles,
  type CourseVersionActivity,
  type ValidationResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { QuizValidationContentQuery } from "../../learning-content/application/quiz-validation-content.query";
import { LearningEventSink } from "../../learning-history/application/learning-event.sink";
import { LearningProgressQuery } from "../../learning-progress/application/learning-progress.query";
import { TrustedValidationEvidenceSink } from "../../learning-progress/application/trusted-validation-evidence.sink";
import { ValidatorRegistry } from "../domain/validator-registry";
import { ValidationRepository } from "./validation.repository";

export type RecordedAssignment = Readonly<{
  result: ValidationResult;
  activity: CourseVersionActivity;
  attemptNumber: number;
  evaluation: AssignmentEvaluation;
}>;

/**
 * ADR-0073: trusted checks of a file assignment. The server reads the
 * submitted files with the static checks of `@platform/checks`; nothing the
 * learner wrote is executed, and no result is accepted from the caller.
 */
@Injectable()
export class AssignmentValidationApplicationService {
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

  /** Evaluates files against the published assignment; refuses an uncheckable page. */
  async evaluate(
    tx: DatabaseTransaction,
    organizationId: string,
    activity: CourseVersionActivity,
    files: AssignmentFiles
  ): Promise<AssignmentEvaluation> {
    const parsed = activityValidationConfigSchema.safeParse(activity.config);
    const binding = parsed.success ? parsed.data.validation : null;
    const definition =
      binding &&
      this.registry.find(binding.validatorKey, binding.validatorVersion);
    if (
      !binding ||
      definition?.recordingAuthority !== "deterministic_assignment" ||
      definition.key !== activity.activityType ||
      definition.evidenceTrust !== "trusted" ||
      Object.keys(binding.config).length !== 0
    )
      throw new ConflictException("Assignment validator is unavailable.");
    const assignment = await this.protectedContent.requireDefinition(
      tx,
      organizationId,
      activity.id
    );
    if (assignment.type !== "assignment.files")
      throw new ConflictException(
        "Assignment definition does not match its binding."
      );
    try {
      return evaluateAssignment(
        files,
        {
          entry: assignment.presentation.entry,
          checks: assignment.validation.checks
        },
        parseHtmlOnServer
      );
    } catch (error) {
      if (error instanceof UncheckablePageError)
        throw new BadRequestException(
          "The page is too large or too deeply nested to check."
        );
      throw error;
    }
  }

  async recordOwn(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionId: string,
    submissionId: string
  ): Promise<RecordedAssignment> {
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
        "Only your exact assignment submission can be checked."
      );
    const activity = await this.content.requireActivityVersionById(
      tx,
      organizationId,
      activityVersionId
    );
    const files = assignmentFilesSchema.safeParse(
      (submitted.submission.payload as { files?: unknown }).files
    );
    if (!files.success)
      throw new ConflictException("Submitted assignment files are invalid.");
    // The Submission is immutable, so the evaluation is reproducible.
    const evaluated = await this.evaluate(
      tx,
      organizationId,
      activity,
      files.data
    );
    // Scores are stored as numeric(6,5); the learner sees the stored value.
    const evaluation = {
      ...evaluated,
      score: Math.round(evaluated.score * 100_000) / 100_000
    };
    const persisted = await this.validation.createOrFind(tx, {
      id: await this.database.nextUuid(),
      organizationId,
      submissionId,
      activityVersionId,
      validatorKey: activity.activityType,
      validatorVersion: 1,
      validatorConfig: {},
      idempotencyKey: "assignment-check@1",
      status: "completed",
      outcome: evaluation.outcome,
      score: evaluation.score,
      evidenceTrust: "trusted",
      payload: { checks: evaluation.checks },
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
        "Assignment result attribution is inconsistent."
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
    return {
      result: r,
      activity,
      attemptNumber: submitted.attempt.attemptNumber,
      evaluation
    };
  }

  async normalize(recorded: RecordedAssignment) {
    const context = this.requestContext.tenantContext(
      recorded.result.organizationId
    );
    if (recorded.result.recordedByUserId !== context.userId)
      throw new ForbiddenException(
        "Assignment result belongs to another learner."
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
