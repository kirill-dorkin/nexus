import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CourseVersionActivity,
  Evidence,
  ValidationResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { normalizeTrustedValidationResult } from "../domain/trusted-validation-evidence-normalizer";
import {
  LearningProgressRepository,
  type NewEvidence
} from "./learning-progress.repository";
import { MasteryApplicationService } from "./mastery.service";
import { TrustedValidationEvidenceSink } from "./trusted-validation-evidence.sink";

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

function materiallyMatches(existing: Evidence, requested: NewEvidence): boolean {
  return (
    existing.organizationId === requested.organizationId &&
    existing.attemptId === requested.attemptId &&
    existing.submissionId === requested.submissionId &&
    existing.skillId === requested.skillId &&
    existing.kind === requested.kind &&
    existing.score === requested.score &&
    canonicalJson(existing.payload) === canonicalJson(requested.payload) &&
    existing.recordedByUserId === requested.recordedByUserId &&
    existing.sourceType === requested.sourceType &&
    existing.sourceValidationResultId === requested.sourceValidationResultId
  );
}

@Injectable()
export class TrustedValidationEvidenceApplicationService extends TrustedValidationEvidenceSink {
  constructor(
    private readonly database: DatabaseService,
    private readonly progress: LearningProgressRepository,
    private readonly mastery: MasteryApplicationService,
    private readonly outbox: OutboxRepository
  ) {
    super();
  }

  async materializeTrustedValidationEvidence(
    transaction: DatabaseTransaction,
    organizationId: string,
    result: ValidationResult,
    activity: CourseVersionActivity
  ): Promise<readonly Evidence[]> {
    if (
      result.organizationId !== organizationId ||
      activity.organizationId !== organizationId
    ) {
      throw new ConflictException("Validation Evidence must remain in one organization.");
    }

    const normalized = normalizeTrustedValidationResult(result, activity);
    if (normalized.length === 0) {
      return [];
    }

    const submissionContext = await this.progress.findSubmissionContext(
      transaction,
      organizationId,
      result.submissionId
    );
    if (submissionContext === null) {
      throw new NotFoundException("ValidationResult Submission not found.");
    }
    if (
      submissionContext.attempt.activityVersionId !== result.activityVersionId ||
      activity.id !== result.activityVersionId
    ) {
      throw new ConflictException(
        "ValidationResult does not match the Submission ActivityVersion."
      );
    }

    const evidence: Evidence[] = [];
    for (const candidate of normalized) {
      const requested: NewEvidence = {
        id: await this.database.nextUuid(),
        organizationId,
        attemptId: submissionContext.attempt.id,
        submissionId: submissionContext.submission.id,
        skillId: candidate.skillId,
        kind: candidate.kind,
        score: candidate.score,
        payload: candidate.payload,
        recordedByUserId: null,
        sourceType: "validation_result",
        sourceValidationResultId: result.id
      };

      const persisted = await this.progress.createOrFindValidationEvidence(
        transaction,
        requested
      );
      if (!materiallyMatches(persisted.evidence, requested)) {
        throw new ConflictException(
          "ValidationResult is already materialized with different Evidence semantics."
        );
      }

      evidence.push(persisted.evidence);
      if (!persisted.created) {
        continue;
      }

      await this.mastery.refreshSkillProjection(
        transaction,
        organizationId,
        submissionContext.learnerUserId,
        persisted.evidence.skillId
      );

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "evidence.recorded",
        eventVersion: 1,
        aggregateType: "evidence",
        aggregateId: persisted.evidence.id,
        actorUserId: null,
        payload: {
          organizationId,
          evidenceId: persisted.evidence.id,
          attemptId: persisted.evidence.attemptId,
          submissionId: persisted.evidence.submissionId,
          skillId: persisted.evidence.skillId,
          kind: persisted.evidence.kind,
          score: persisted.evidence.score,
          sourceType: persisted.evidence.sourceType,
          sourceValidationResultId: persisted.evidence.sourceValidationResultId
        }
      });
    }

    return evidence;
  }
}
