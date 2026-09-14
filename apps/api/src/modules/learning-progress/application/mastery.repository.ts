import type { MasteryProjection } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type MasteryEvidenceAggregate = Readonly<{
  skillId: string;
  evidenceCount: number;
  scoredEvidenceCount: number;
  scoreTotal: number;
  lastEvidenceAt: string;
}>;

export type MaterializedMasteryProjection = Readonly<{
  organizationId: string;
  userId: string;
  skillId: string;
  algorithmKey: string;
  algorithmVersion: number;
  masteryScore: number | null;
  evidenceCount: number;
  scoredEvidenceCount: number;
  scoreTotal: number;
  lastEvidenceAt: string;
}>;

export abstract class MasteryRepository {
  abstract lockLearner(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<void>;

  abstract aggregateSkillEvidence(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    skillId: string
  ): Promise<MasteryEvidenceAggregate | null>;

  abstract aggregateUserEvidence(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryEvidenceAggregate[]>;

  abstract saveProjection(
    transaction: DatabaseTransaction,
    projection: MaterializedMasteryProjection
  ): Promise<MasteryProjection>;

  abstract deleteSkillProjection(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    skillId: string
  ): Promise<void>;

  abstract deleteUserProjections(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<void>;

  abstract listUserProjections(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryProjection[]>;
}
