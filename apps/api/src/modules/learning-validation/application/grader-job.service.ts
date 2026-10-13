import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import {
  activityValidationConfigSchema,
  type GraderJob
} from "@platform/contracts";
import {
  GraderJobResourcePolicyError,
  GraderProtocolError,
  buildGraderJobId,
  enforceJobResourcePolicy,
  extractGraderSourceEnvelope,
  graderProfileReferenceSchema,
  validateGraderJobRequest,
  type GraderJobRequest,
  type GraderJobSpec
} from "@platform/contracts/grader";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { LearningProgressQuery } from "../../learning-progress/application/learning-progress.query";
import { GraderProfileCatalog } from "../domain/grader-profile.catalog";
import { ValidatorRegistry } from "../domain/validator-registry";
import {
  GraderJobRepository,
  type NewGraderJob,
  type PersistedGraderJob
} from "./grader-job.repository";

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
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function materiallyMatches(
  existing: PersistedGraderJob,
  requested: NewGraderJob
): boolean {
  return (
    existing.job.jobId === requested.jobId &&
    existing.job.organizationId === requested.organizationId &&
    existing.job.submissionId === requested.submissionId &&
    existing.job.activityVersionId === requested.activityVersionId &&
    existing.job.validatorKey === requested.validatorKey &&
    existing.job.validatorVersion === requested.validatorVersion &&
    existing.job.profile.key === requested.profileKey &&
    existing.job.profile.version === requested.profileVersion &&
    existing.job.profile.fingerprint === requested.profileFingerprint &&
    canonicalJson(existing.validatorConfig) === canonicalJson(requested.validatorConfig) &&
    existing.evidenceTrust === requested.evidenceTrust &&
    canonicalJson(existing.requestPayload) === canonicalJson(requested.requestPayload) &&
    existing.requestedByUserId === requested.requestedByUserId
  );
}

@Injectable()
export class GraderJobApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly progress: LearningProgressQuery,
    private readonly content: LearningContentQuery,
    private readonly validators: ValidatorRegistry,
    private readonly profiles: GraderProfileCatalog,
    private readonly jobs: GraderJobRepository
  ) {}

  async schedule(
    organizationId: string,
    submissionId: string
  ): Promise<GraderJob> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

      const submissionContext = await this.progress.requireSubmissionForValidation(
        transaction,
        organizationId,
        submissionId
      );
      if (submissionContext.learnerUserId !== context.userId) {
        throw new ForbiddenException(
          "Grader jobs can only be scheduled by the learner who owns the submission."
        );
      }

      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "attempt.submit",
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
      const definition = this.validators.find(binding.validatorKey, binding.validatorVersion);
      if (definition === null) {
        throw new ConflictException("Configured validator version is not registered.");
      }
      if (definition.recordingAuthority !== "system" || definition.grader === undefined) {
        throw new ConflictException("Configured validator is not executable by the grader.");
      }

      const profileReference = graderProfileReferenceSchema.safeParse(binding.config.profile);
      if (!profileReference.success) {
        throw new ConflictException(
          "Configured system validator has no valid grader execution profile binding."
        );
      }
      const resolvedProfile = this.profiles.find(profileReference.data);
      if (resolvedProfile === null) {
        throw new ConflictException("Configured grader execution profile is not available.");
      }

      let source: GraderJobSpec["source"];
      try {
        source = extractGraderSourceEnvelope(submissionContext.submission.payload);
      } catch (error) {
        if (error instanceof GraderProtocolError) {
          throw new BadRequestException("Submission has no valid executable source envelope.");
        }
        throw error;
      }

      const spec: GraderJobSpec = {
        protocolVersion: definition.grader.protocolVersion,
        profile: profileReference.data,
        submissionId: submissionContext.submission.id,
        activityVersionId: activity.id,
        source
      };
      const request: GraderJobRequest = {
        ...spec,
        jobId: buildGraderJobId(spec)
      };

      try {
        validateGraderJobRequest(request);
        enforceJobResourcePolicy(request, resolvedProfile.profile);
      } catch (error) {
        if (error instanceof GraderProtocolError || error instanceof GraderJobResourcePolicyError) {
          throw new BadRequestException("Submission exceeds the configured grader execution policy.");
        }
        throw error;
      }

      const requested: NewGraderJob = {
        jobId: request.jobId,
        organizationId,
        submissionId: submissionContext.submission.id,
        activityVersionId: activity.id,
        validatorKey: definition.key,
        validatorVersion: definition.version,
        validatorConfig: binding.config,
        evidenceTrust: definition.evidenceTrust,
        profileKey: resolvedProfile.profile.key,
        profileVersion: resolvedProfile.profile.version,
        profileFingerprint: resolvedProfile.fingerprint,
        requestPayload: request,
        requestedByUserId: context.userId
      };

      const persisted = await this.jobs.createOrFind(transaction, requested);
      if (!persisted.created && !materiallyMatches(persisted.persisted, requested)) {
        throw new ConflictException(
          "Existing grader job does not match the current immutable grader configuration."
        );
      }

      return persisted.persisted.job;
    });
  }
}
