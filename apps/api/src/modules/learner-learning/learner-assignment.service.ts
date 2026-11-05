import {
  BadRequestException,
  ConflictException,
  Injectable
} from "@nestjs/common";
import {
  assignmentCheckResultSchema,
  fileAssignmentPresentationSchema,
  uploadProblems,
  type AssignmentCheckResult,
  type SubmitAssignmentRequest
} from "@platform/contracts";

import { DatabaseService } from "../../database/database.service";
import { RequestContextService } from "../../request-context/request-context.service";
import { QuizSubmissionCommand } from "../learning-progress/application/quiz-submission.command";
import { AssignmentValidationApplicationService } from "../learning-validation/application/assignment-validation.service";
import { LearnerLearningService } from "./learner-learning.service";

const RETRYABLE = ["23505", "40001", "40P01"];

/**
 * A learner submits the files of a file assignment (ADR-0073): the upload is
 * checked against the limits, stored as an immutable Submission, evaluated on
 * the server and normalized into Evidence, like a quiz answer (ADR-0056).
 */
@Injectable()
export class LearnerAssignmentService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly learning: LearnerLearningService,
    private readonly submissions: QuizSubmissionCommand,
    private readonly assignments: AssignmentValidationApplicationService
  ) {}

  async submit(
    organizationSlug: string,
    offeringSlug: string,
    activitySlug: string,
    command: SubmitAssignmentRequest
  ): Promise<AssignmentCheckResult> {
    const { userId } = this.requestContext.requirePrincipal();
    try {
      const submission = await this.database.userTransaction(
        { userId },
        async (tx) => {
          const target = await this.learning.ownActivityTarget(
            tx,
            userId,
            organizationSlug,
            offeringSlug,
            activitySlug
          );
          if (target.activity.activityType !== "assignment.files")
            throw new BadRequestException("This activity takes no files.");
          const presentation = fileAssignmentPresentationSchema.safeParse(
            (target.activity.config as { presentation?: unknown }).presentation
          );
          if (!presentation.success)
            throw new ConflictException("Assignment is unavailable.");
          const problems = uploadProblems(command.files, presentation.data);
          if (problems.length)
            throw new BadRequestException({
              message: "These files cannot be checked.",
              problems
            });
          // Refuses an uncheckable page before anything is stored.
          await this.assignments.evaluate(
            tx,
            target.route.organizationId,
            target.activity,
            command.files
          );
          return this.submissions.commitOwn(
            tx,
            target.route.organizationId,
            target.enrollment.id,
            target.activity,
            command.attemptKey,
            { files: command.files }
          );
        }
      );
      const recorded = await this.database.userTransaction(
        { userId },
        async (tx) => {
          const target = await this.learning.ownActivityTarget(
            tx,
            userId,
            organizationSlug,
            offeringSlug,
            activitySlug
          );
          return this.assignments.recordOwn(
            tx,
            target.route.organizationId,
            target.enrollment.id,
            target.activity.id,
            submission.id
          );
        }
      );
      await this.assignments.normalize(recorded);
      return assignmentCheckResultSchema.parse({
        attemptNumber: recorded.attemptNumber,
        outcome: recorded.evaluation.outcome,
        score: recorded.evaluation.score,
        checks: recorded.evaluation.checks
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        RETRYABLE.includes(String(error.code))
      )
        throw new ConflictException(
          "Attempt key or learning state changed. Retry the same action."
        );
      throw error;
    }
  }
}
