import type { GraderJob, ValidatorBinding } from "@platform/contracts";
import type { GraderJobRequest } from "@platform/contracts/grader";
import type { DatabaseTransaction } from "@platform/database";

export type NewGraderJob = Readonly<{
  jobId: string;
  organizationId: string;
  submissionId: string;
  activityVersionId: string;
  validatorKey: string;
  validatorVersion: number;
  validatorConfig: ValidatorBinding["config"];
  profileKey: string;
  profileVersion: number;
  profileFingerprint: string;
  requestPayload: GraderJobRequest;
  requestedByUserId: string;
}>;

export type PersistedGraderJob = Readonly<{
  job: GraderJob;
  requestPayload: GraderJobRequest;
  validatorConfig: ValidatorBinding["config"];
  requestedByUserId: string | null;
}>;

export type GraderJobCreateResult = Readonly<{
  persisted: PersistedGraderJob;
  created: boolean;
}>;

export abstract class GraderJobRepository {
  abstract createOrFind(
    transaction: DatabaseTransaction,
    input: NewGraderJob
  ): Promise<GraderJobCreateResult>;
}
