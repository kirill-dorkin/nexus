import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  GuidedBuildExposure,
  GuidedBuildLearnerView,
  RevealGuidedBuildHintRequest,
  RevealGuidedBuildSolutionRequest
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GuidedBuildContentQuery } from "../../learning-content/application/guided-build-content.query";
import { LearningEventSink } from "../../learning-history/application/learning-event.sink";
import { LearningProgressQuery } from "../../learning-progress/application/learning-progress.query";
import { deriveGuidedBuildLearnerState } from "../domain/guided-build-state";
import { GuidanceExposureRepository } from "./guidance-exposure.repository";

function offeringScope(organizationId: string, offeringId: string) {
  return { organizationId, type: "offering" as const, id: offeringId };
}

@Injectable()
export class LearningGuidanceApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly progress: LearningProgressQuery,
    private readonly content: GuidedBuildContentQuery,
    private readonly exposures: GuidanceExposureRepository,
    private readonly learningEvents: LearningEventSink
  ) {}

  async getLearnerView(
    organizationId: string,
    attemptId: string
  ): Promise<GuidedBuildLearnerView> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      const attemptContext = await this.requireOwnAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      return this.buildView(transaction, attemptContext);
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
      const attemptContext = await this.requireOwnAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      await this.exposures.lockAttempt(transaction, organizationId, attemptId);

      const idempotent = await this.exposures.findByIdempotencyKey(
        transaction,
        organizationId,
        attemptId,
        command.idempotencyKey
      );
      if (idempotent !== null) {
        if (idempotent.kind !== "hint" || idempotent.stepKey !== command.stepKey) {
          throw new ConflictException("Guidance idempotency key was already used for another reveal.");
        }
        return this.buildView(transaction, attemptContext);
      }

      const definition = await this.requireDefinition(
        transaction,
        organizationId,
        attemptContext.attempt.activityVersionId
      );
      const currentExposures = await this.exposures.listForAttempt(
        transaction,
        organizationId,
        attemptId
      );
      const state = deriveGuidedBuildLearnerState({
        organizationId,
        enrollmentId: attemptContext.attempt.enrollmentId,
        attemptId,
        definition,
        submissionExists: attemptContext.submissionExists,
        exposures: currentExposures
      });
      if (state.phase !== "working") {
        throw new ConflictException("Guided Build hints cannot be revealed after Submission.");
      }
      const step = state.steps.find((candidate) => candidate.stepKey === command.stepKey);
      if (step === undefined) throw new NotFoundException("Guided Build step not found.");
      if (!step.canRevealNextHint || step.nextHintKey === null) {
        throw new ConflictException("This Guided Build step has no next hint to reveal.");
      }

      const exposure = await this.exposures.createHint(transaction, {
        id: exposureId,
        organizationId,
        enrollmentId: attemptContext.attempt.enrollmentId,
        attemptId,
        activityVersionId: attemptContext.attempt.activityVersionId,
        stepKey: command.stepKey,
        hintKey: step.nextHintKey,
        idempotencyKey: command.idempotencyKey
      });
      if (exposure.kind !== "hint") throw new Error("Expected hint GuidanceExposure.");
      await this.learningEvents.appendGuidanceHintRevealed(
        transaction,
        attemptContext.learnerUserId,
        attemptContext.attempt,
        exposure
      );
      return this.buildView(transaction, attemptContext);
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
      const attemptContext = await this.requireOwnAttempt(
        transaction,
        organizationId,
        attemptId,
        context.userId
      );
      await this.exposures.lockAttempt(transaction, organizationId, attemptId);

      const idempotent = await this.exposures.findByIdempotencyKey(
        transaction,
        organizationId,
        attemptId,
        command.idempotencyKey
      );
      if (idempotent !== null) {
        if (idempotent.kind !== "professional_solution") {
          throw new ConflictException("Guidance idempotency key was already used for another reveal.");
        }
        return this.buildView(transaction, attemptContext);
      }

      const definition = await this.requireDefinition(
        transaction,
        organizationId,
        attemptContext.attempt.activityVersionId
      );
      const currentExposures = await this.exposures.listForAttempt(
        transaction,
        organizationId,
        attemptId
      );
      const state = deriveGuidedBuildLearnerState({
        organizationId,
        enrollmentId: attemptContext.attempt.enrollmentId,
        attemptId,
        definition,
        submissionExists: attemptContext.submissionExists,
        exposures: currentExposures
      });
      if (state.solution.status === "locked") {
        throw new ConflictException("Professional solution is available only after Submission.");
      }
      if (state.solution.status === "revealed") {
        throw new ConflictException("Professional solution was already revealed with another request.");
      }

      const exposure = await this.exposures.createSolution(transaction, {
        id: exposureId,
        organizationId,
        enrollmentId: attemptContext.attempt.enrollmentId,
        attemptId,
        activityVersionId: attemptContext.attempt.activityVersionId,
        solutionKey: definition.professionalSolution.key,
        idempotencyKey: command.idempotencyKey
      });
      if (exposure.kind !== "professional_solution") {
        throw new Error("Expected solution GuidanceExposure.");
      }
      await this.learningEvents.appendGuidanceSolutionRevealed(
        transaction,
        attemptContext.learnerUserId,
        attemptContext.attempt,
        exposure
      );
      return this.buildView(transaction, attemptContext);
    });
  }

  private async requireOwnAttempt(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string,
    userId: string
  ) {
    await this.identity.requireActiveUser(transaction, userId);
    const attemptContext = await this.progress.requireAttemptForGuidance(
      transaction,
      organizationId,
      attemptId
    );
    if (attemptContext.learnerUserId !== userId) {
      throw new ForbiddenException("Guided Build guidance is available only for your own Attempt.");
    }
    await this.authorization.requireCapability(
      transaction,
      userId,
      "attempt.submit",
      offeringScope(organizationId, attemptContext.offeringId)
    );
    return attemptContext;
  }

  private async requireDefinition(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ) {
    const definition = await this.content.findDefinition(
      transaction,
      organizationId,
      activityVersionId
    );
    if (definition === null) throw new NotFoundException("Guided Build is not configured for this ActivityVersion.");
    return definition;
  }

  private async buildView(
    transaction: DatabaseTransaction,
    attemptContext: Awaited<ReturnType<LearningProgressQuery["requireAttemptForGuidance"]>>
  ): Promise<GuidedBuildLearnerView> {
    const attempt = attemptContext.attempt;
    const definition = await this.requireDefinition(
      transaction,
      attempt.organizationId,
      attempt.activityVersionId
    );
    const exposures = await this.exposures.listForAttempt(
      transaction,
      attempt.organizationId,
      attempt.id
    );
    const state = deriveGuidedBuildLearnerState({
      organizationId: attempt.organizationId,
      enrollmentId: attempt.enrollmentId,
      attemptId: attempt.id,
      definition,
      submissionExists: attemptContext.submissionExists,
      exposures
    });

    const revealedHints: GuidedBuildLearnerView["revealedHints"] = [];
    let professionalSolution: GuidedBuildLearnerView["professionalSolution"] = null;

    for (const exposure of exposures) {
      if (exposure.kind === "hint") {
        const material = await this.content.findHintMaterial(
          transaction,
          attempt.organizationId,
          attempt.activityVersionId,
          exposure.stepKey,
          exposure.hintKey
        );
        if (material === null) throw new Error("Persisted hint exposure lost its protected material.");
        revealedHints.push({
          exposureId: exposure.id,
          stepKey: exposure.stepKey,
          hintKey: exposure.hintKey,
          content: material.content,
          revealedAt: exposure.revealedAt
        });
      } else {
        const material = await this.content.findSolutionMaterial(
          transaction,
          attempt.organizationId,
          attempt.activityVersionId,
          exposure.solutionKey
        );
        if (material === null) throw new Error("Persisted solution exposure lost its protected material.");
        professionalSolution = {
          exposureId: exposure.id,
          solutionKey: exposure.solutionKey,
          title: material.title,
          content: material.content,
          revealedAt: exposure.revealedAt
        };
      }
    }

    return { state, revealedHints, professionalSolution };
  }
}
