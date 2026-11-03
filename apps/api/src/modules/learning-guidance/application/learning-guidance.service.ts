import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  GuidedBuildCompareView,
  GuidedBuildDefinition,
  GuidedBuildExposure,
  GuidedBuildLearnerView,
  GuidedBuildProtectedDefinition,
  GuidedBuildTransferHandoff,
  RevealGuidedBuildHintRequest,
  RevealGuidedBuildSolutionRequest
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GuidedBuildContentQuery } from "../../learning-content/application/guided-build-content.query";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { LearningEventSink } from "../../learning-history/application/learning-event.sink";
import {
  AttemptGuidanceQuery,
  type AttemptGuidanceContext
} from "../../learning-progress/application/attempt-guidance.query";
import { deriveGuidedBuildLearnerState } from "../domain/guided-build-state";
import { GuidanceExposureRepository } from "./guidance-exposure.repository";

function offeringScope(organizationId: string, offeringId: string) {
  return { organizationId, type: "offering" as const, id: offeringId };
}
function publicDefinition(
  definition: GuidedBuildProtectedDefinition
): GuidedBuildDefinition {
  return {
    schemaVersion: 1,
    activityVersionId: definition.activityVersionId,
    steps: definition.steps.map((step) => ({
      key: step.key,
      title: step.title,
      instructions: step.instructions,
      hints: step.hints.map((hint) => ({ key: hint.key }))
    })),
    professionalSolution: {
      key: definition.professionalSolution.key,
      title: definition.professionalSolution.title
    },
    transferActivityVersionId: definition.transferActivityVersionId
  };
}

@Injectable()
export class LearningGuidanceApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly attempts: AttemptGuidanceQuery,
    private readonly guidedBuildContent: GuidedBuildContentQuery,
    private readonly learningContent: LearningContentQuery,
    private readonly exposures: GuidanceExposureRepository,
    private readonly learningEvents: LearningEventSink
  ) {}

  async getLearnerView(
    organizationId: string,
    attemptId: string
  ): Promise<GuidedBuildLearnerView> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const attempt = await this.authorizeAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      const definition =
        await this.guidedBuildContent.requireGuidedBuildDefinition(
          transaction,
          organizationId,
          attempt.attempt.activityVersionId
        );
      const exposures = await this.exposures.listForAttempt(
        transaction,
        organizationId,
        attemptId
      );
      return this.buildView(organizationId, attempt, definition, exposures);
    });
  }

  async getCompare(
    organizationId: string,
    attemptId: string
  ): Promise<GuidedBuildCompareView> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const attempt = await this.authorizeAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      if (attempt.submission === null) {
        throw new ConflictException(
          "Guided Build compare requires an immutable Submission for this Attempt."
        );
      }

      const definition =
        await this.guidedBuildContent.requireGuidedBuildDefinition(
          transaction,
          organizationId,
          attempt.attempt.activityVersionId
        );
      const exposures = await this.exposures.listForAttempt(
        transaction,
        organizationId,
        attemptId
      );
      const view = this.buildView(
        organizationId,
        attempt,
        definition,
        exposures
      );
      if (
        view.state.solution.status !== "revealed" ||
        view.professionalSolution === null
      ) {
        throw new ConflictException(
          "Guided Build compare requires the professional solution to be revealed first."
        );
      }

      return {
        sourceAttemptId: attempt.attempt.id,
        sourceActivityVersionId: attempt.attempt.activityVersionId,
        submission: attempt.submission,
        professionalSolution: view.professionalSolution
      };
    });
  }

  async getTransferHandoff(
    organizationId: string,
    attemptId: string
  ): Promise<GuidedBuildTransferHandoff> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const attempt = await this.authorizeAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      if (attempt.submission === null) {
        throw new ConflictException(
          "Guided Build transfer requires an immutable Submission for the source Attempt."
        );
      }

      const definition =
        await this.guidedBuildContent.requireGuidedBuildDefinition(
          transaction,
          organizationId,
          attempt.attempt.activityVersionId
        );
      if (definition.transferActivityVersionId === null) {
        throw new NotFoundException(
          "This Guided Build does not define a transfer challenge."
        );
      }

      const [sourceActivity, transferActivity] = await Promise.all([
        this.learningContent.requireActivityVersionById(
          transaction,
          organizationId,
          attempt.attempt.activityVersionId
        ),
        this.learningContent.requireActivityVersionById(
          transaction,
          organizationId,
          definition.transferActivityVersionId
        )
      ]);
      if (sourceActivity.courseVersionId !== transferActivity.courseVersionId) {
        throw new ConflictException(
          "Guided Build transfer must remain inside the source CourseVersion."
        );
      }

      return {
        sourceAttemptId: attempt.attempt.id,
        enrollmentId: attempt.attempt.enrollmentId,
        activityVersionId: transferActivity.id,
        activityId: transferActivity.activityId,
        slug: transferActivity.slug,
        title: transferActivity.title
      };
    });
  }

  async revealHint(
    organizationId: string,
    attemptId: string,
    command: RevealGuidedBuildHintRequest
  ): Promise<GuidedBuildLearnerView> {
    const context = this.requestContext.tenantContext(organizationId);
    const exposureId = await this.database.nextUuid();
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const attempt = await this.authorizeAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      const definition =
        await this.guidedBuildContent.requireGuidedBuildDefinition(
          transaction,
          organizationId,
          attempt.attempt.activityVersionId
        );
      await this.exposures.lockAttemptScope(transaction, attemptId);
      const existing = await this.exposures.findByIdempotencyKey(
        transaction,
        organizationId,
        attemptId,
        command.idempotencyKey
      );
      if (existing !== null) {
        if (existing.kind !== "hint" || existing.stepKey !== command.stepKey)
          throw new ConflictException(
            "Idempotency key is already bound to a different guidance command."
          );
        const all = await this.exposures.listForAttempt(
          transaction,
          organizationId,
          attemptId
        );
        return this.buildView(organizationId, attempt, definition, all);
      }
      const current = await this.exposures.listForAttempt(
        transaction,
        organizationId,
        attemptId
      );
      const state = deriveGuidedBuildLearnerState({
        organizationId,
        enrollmentId: attempt.attempt.enrollmentId,
        attemptId,
        definition: publicDefinition(definition),
        submissionExists: attempt.submission !== null,
        exposures: current
      });
      const step = state.steps.find(
        (candidate) => candidate.stepKey === command.stepKey
      );
      if (step === undefined)
        throw new ConflictException("Guided Build step does not exist.");
      if (!step.canRevealNextHint || step.nextHintKey === null)
        throw new ConflictException(
          "No next Guided Build hint can be revealed for this step."
        );
      const exposure = await this.exposures.create(transaction, {
        id: exposureId,
        organizationId,
        enrollmentId: attempt.attempt.enrollmentId,
        attemptId,
        activityVersionId: attempt.attempt.activityVersionId,
        kind: "hint",
        stepKey: command.stepKey,
        hintKey: step.nextHintKey,
        idempotencyKey: command.idempotencyKey,
        revealedByUserId: context.userId
      });
      if (exposure.kind !== "hint")
        throw new Error("Created hint exposure has an invalid kind.");
      await this.learningEvents.appendGuidanceHintRevealed(
        transaction,
        attempt.learnerUserId,
        attempt.attempt,
        exposure
      );
      return this.buildView(organizationId, attempt, definition, [
        ...current,
        exposure
      ]);
    });
  }

  async revealSolution(
    organizationId: string,
    attemptId: string,
    command: RevealGuidedBuildSolutionRequest
  ): Promise<GuidedBuildLearnerView> {
    const context = this.requestContext.tenantContext(organizationId);
    const exposureId = await this.database.nextUuid();
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      const attempt = await this.authorizeAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      const definition =
        await this.guidedBuildContent.requireGuidedBuildDefinition(
          transaction,
          organizationId,
          attempt.attempt.activityVersionId
        );
      await this.exposures.lockAttemptScope(transaction, attemptId);
      const existing = await this.exposures.findByIdempotencyKey(
        transaction,
        organizationId,
        attemptId,
        command.idempotencyKey
      );
      if (existing !== null) {
        if (existing.kind !== "professional_solution")
          throw new ConflictException(
            "Idempotency key is already bound to a different guidance command."
          );
        const all = await this.exposures.listForAttempt(
          transaction,
          organizationId,
          attemptId
        );
        return this.buildView(organizationId, attempt, definition, all);
      }
      const current = await this.exposures.listForAttempt(
        transaction,
        organizationId,
        attemptId
      );
      const state = deriveGuidedBuildLearnerState({
        organizationId,
        enrollmentId: attempt.attempt.enrollmentId,
        attemptId,
        definition: publicDefinition(definition),
        submissionExists: attempt.submission !== null,
        exposures: current
      });
      if (state.solution.status === "revealed")
        return this.buildView(organizationId, attempt, definition, current);
      if (state.solution.status !== "available")
        throw new ConflictException(
          "Professional solution requires an immutable Submission for this Attempt."
        );
      const exposure = await this.exposures.create(transaction, {
        id: exposureId,
        organizationId,
        enrollmentId: attempt.attempt.enrollmentId,
        attemptId,
        activityVersionId: attempt.attempt.activityVersionId,
        kind: "professional_solution",
        solutionKey: definition.professionalSolution.key,
        idempotencyKey: command.idempotencyKey,
        revealedByUserId: context.userId
      });
      if (exposure.kind !== "professional_solution")
        throw new Error("Created solution exposure has an invalid kind.");
      await this.learningEvents.appendGuidanceSolutionRevealed(
        transaction,
        attempt.learnerUserId,
        attempt.attempt,
        exposure
      );
      return this.buildView(organizationId, attempt, definition, [
        ...current,
        exposure
      ]);
    });
  }

  private async authorizeAttempt(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string,
    userId: string
  ): Promise<AttemptGuidanceContext> {
    const attempt = await this.attempts.requireAttemptGuidanceContext(
      transaction,
      organizationId,
      attemptId
    );
    if (attempt.learnerUserId !== userId)
      throw new ForbiddenException(
        "Guided Build can only be used for your own Attempt."
      );
    await this.authorization.requireCapability(
      transaction,
      userId,
      "guidance.use",
      offeringScope(organizationId, attempt.offeringId)
    );
    return attempt;
  }

  private buildView(
    organizationId: string,
    attempt: AttemptGuidanceContext,
    definition: GuidedBuildProtectedDefinition,
    exposures: readonly GuidedBuildExposure[]
  ): GuidedBuildLearnerView {
    const state = deriveGuidedBuildLearnerState({
      organizationId,
      enrollmentId: attempt.attempt.enrollmentId,
      attemptId: attempt.attempt.id,
      definition: publicDefinition(definition),
      submissionExists: attempt.submission !== null,
      exposures
    });
    const hintExposures = new Map(
      exposures
        .filter(
          (
            exposure
          ): exposure is Extract<GuidedBuildExposure, { kind: "hint" }> =>
            exposure.kind === "hint"
        )
        .map((exposure) => [exposure.hintKey, exposure])
    );
    const solutionExposure =
      exposures.find(
        (
          exposure
        ): exposure is Extract<
          GuidedBuildExposure,
          { kind: "professional_solution" }
        > => exposure.kind === "professional_solution"
      ) ?? null;
    return {
      state,
      steps: definition.steps.map((step) => ({
        key: step.key,
        title: step.title,
        instructions: step.instructions,
        revealedHints: step.hints.flatMap((hint) => {
          const exposure = hintExposures.get(hint.key);
          return exposure === undefined
            ? []
            : [
                {
                  exposureId: exposure.id,
                  key: hint.key,
                  content: hint.content,
                  revealedAt: exposure.revealedAt
                }
              ];
        })
      })),
      professionalSolution:
        solutionExposure === null
          ? null
          : {
              exposureId: solutionExposure.id,
              key: definition.professionalSolution.key,
              title: definition.professionalSolution.title,
              content: definition.professionalSolution.content,
              revealedAt: solutionExposure.revealedAt
            }
    };
  }
}
