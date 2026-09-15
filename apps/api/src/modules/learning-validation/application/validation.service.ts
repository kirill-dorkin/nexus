import { ConflictException, Injectable } from "@nestjs/common";
import {
  activityValidationConfigSchema,
  type CourseVersionActivity,
  type RecordValidationResultRequest,
  type ValidationResult
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { LearningEventSink } from "../../learning-history/application/learning-event.sink";
import { LearningProgressQuery } from "../../learning-progress/application/learning-progress.query";
import { TrustedValidationEvidenceSink } from "../../learning-progress/application/trusted-validation-evidence.sink";
import { ValidatorRegistry } from "../domain/validator-registry";
import {
  ValidationRepository,
  type NewValidationResult
} from "./validation.repository";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function materiallyMatches(
  existing: ValidationResult,
  requested: NewValidationResult
): boolean {
  return (
    existing.organizationId === requested.organizationId &&
    existing.submissionId === requested.submissionId &&
    existing.activityVersionId === requested.activityVersionId &&
    existing.validatorKey === requested.validatorKey &&
    existing.validatorVersion === requested.validatorVersion &&
    canonicalJson(existing.validatorConfig) === canonicalJson(requested.validatorConfig) &&
    existing.idempotencyKey === requested.idempotencyKey &&
    existing.status === requested.status &&
    existing.outcome === requested.outcome &&
    existing.score === requested.score &&
    existing.evidenceTrust === requested.evidenceTrust &&
    canonicalJson(existing.payload) === canonicalJson(requested.payload) &&
    existing.recordedByUserId === requested.recordedByUserId
  );
}

type RecordedValidation = Readonly<{
  result: ValidationResult;
  activity: CourseVersionActivity;
}>;

@Injectable()
export class ValidationApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly progress: LearningProgressQuery,
    private readonly content: LearningContentQuery,
    private readonly registry: ValidatorRegistry,
    private readonly validation: ValidationRepository,
    private readonly evidence: TrustedValidationEvidenceSink,
    private readonly learningEvents: LearningEventSink,
    private readonly outbox: OutboxRepository
  ) {}

  async recordResult(
    organizationId: string,
    submissionId: string,
    command: RecordValidationResultRequest
  ): Promise<ValidationResult> {
    const context = this.requestContext.tenantContext(organizationId);
    const validationResultId = await this.database.nextUuid();

    const recorded = await this.database.tenantTransaction(
      context,
      async (transaction): Promise<RecordedValidation> => {
        await this.identity.requireActiveUser(transaction, context.userId);

        const submissionContext = await this.progress.requireSubmissionForValidation(
          transaction,
          organizationId,
          submissionId
        );

        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "validation.record",
          offeringScope(organizationId, submissionContext.offeringId)
        );

        const activity = await this.content.requireActivityVersionById(
          transaction,
          organizationId,
          submissionContext.attempt.activityVersionId
        );
        const configured = activityValidationConfigSchema.safeParse(activity.config);
        if (!configured.success) {
          throw new ConflictException("Activity has no valid validation binding.");
        }

        const binding = configured.data.validation;
        const definition = this.registry.find(
          binding.validatorKey,
          binding.validatorVersion
        );
        if (definition === null) {
          throw new ConflictException("Configured validator version is not registered.");
        }
        if (definition.recordingAuthority !== "authorized_user") {
          throw new ConflictException(
            "Configured validator does not accept user-recorded results."
          );
        }

        const requested: NewValidationResult = {
          id: validationResultId,
          organizationId,
          submissionId: submissionContext.submission.id,
          activityVersionId: activity.id,
          validatorKey: definition.key,
          validatorVersion: definition.version,
          validatorConfig: binding.config,
          idempotencyKey: command.idempotencyKey,
          status: command.status,
          outcome: command.status === "completed" ? command.outcome : null,
          score: command.status === "completed" ? command.score : null,
          evidenceTrust: definition.evidenceTrust,
          payload: command.payload,
          recordedByUserId: context.userId
        };

        const persisted = await this.validation.createOrFind(transaction, requested);
        if (!persisted.created) {
          if (!materiallyMatches(persisted.result, requested)) {
            throw new ConflictException(
              "Idempotency key is already bound to a different validation result."
            );
          }
          return { result: persisted.result, activity };
        }

        if (persisted.result.status === "completed") {
          await this.learningEvents.appendValidationResultRecorded(
            transaction,
            submissionContext.learnerUserId,
            submissionContext.attempt,
            persisted.result
          );
        }

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "validation.result_recorded",
          eventVersion: 1,
          aggregateType: "validation_result",
          aggregateId: persisted.result.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            validationResultId: persisted.result.id,
            submissionId: persisted.result.submissionId,
            activityVersionId: persisted.result.activityVersionId,
            validatorKey: persisted.result.validatorKey,
            validatorVersion: persisted.result.validatorVersion,
            status: persisted.result.status,
            outcome: persisted.result.outcome,
            score: persisted.result.score,
            evidenceTrust: persisted.result.evidenceTrust
          }
        });

        return { result: persisted.result, activity };
      }
    );

    await this.database.tenantTransaction(context, async (transaction) => {
      await this.evidence.materializeTrustedValidationEvidence(
        transaction,
        organizationId,
        recorded.result,
        recorded.activity
      );
    });

    return recorded.result;
  }
}
