import { Injectable } from "@nestjs/common";
import type {
  MasteryProjection,
  MasteryRecomputeResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import {
  computeMastery,
  MASTERY_ALGORITHM_KEY,
  MASTERY_ALGORITHM_VERSION
} from "../domain/mastery-algorithm";
import {
  MasteryRepository,
  type MasteryEvidenceAggregate,
  type MaterializedMasteryProjection
} from "./mastery.repository";

function organizationScope(organizationId: string) {
  return {
    organizationId,
    type: "organization" as const,
    id: organizationId
  };
}

@Injectable()
export class MasteryApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly mastery: MasteryRepository,
    private readonly outbox: OutboxRepository
  ) {}

  private materialize(
    organizationId: string,
    userId: string,
    aggregate: MasteryEvidenceAggregate
  ): MaterializedMasteryProjection {
    const computation = computeMastery({
      evidenceCount: aggregate.evidenceCount,
      scoredEvidenceCount: aggregate.scoredEvidenceCount,
      scoreTotal: aggregate.scoreTotal
    });

    return {
      organizationId,
      userId,
      skillId: aggregate.skillId,
      algorithmKey: MASTERY_ALGORITHM_KEY,
      algorithmVersion: MASTERY_ALGORITHM_VERSION,
      masteryScore: computation.masteryScore,
      evidenceCount: aggregate.evidenceCount,
      scoredEvidenceCount: aggregate.scoredEvidenceCount,
      scoreTotal: aggregate.scoreTotal,
      lastEvidenceAt: aggregate.lastEvidenceAt
    };
  }

  async refreshSkillProjection(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    skillId: string
  ): Promise<MasteryProjection | null> {
    await this.mastery.lockLearner(transaction, organizationId, userId);
    const aggregate = await this.mastery.aggregateSkillEvidence(
      transaction,
      organizationId,
      userId,
      skillId
    );

    if (aggregate === null) {
      await this.mastery.deleteSkillProjection(
        transaction,
        organizationId,
        userId,
        skillId
      );
      return null;
    }

    return this.mastery.saveProjection(
      transaction,
      this.materialize(organizationId, userId, aggregate)
    );
  }

  listUserMastery(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryProjection[]> {
    return this.mastery.listUserProjections(
      transaction,
      organizationId,
      userId
    );
  }

  listUsersMastery(
    transaction: DatabaseTransaction,
    organizationId: string,
    userIds: readonly string[],
    skillIds: readonly string[]
  ): Promise<readonly MasteryProjection[]> {
    return this.mastery.listUserProjectionsForUsers(
      transaction,
      organizationId,
      userIds,
      skillIds
    );
  }

  async getUserMastery(
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryProjection[]> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        userId === context.userId ? "mastery.read" : "mastery.read_others",
        organizationScope(organizationId)
      );

      return this.listUserMastery(transaction, organizationId, userId);
    });
  }

  async recomputeUserMastery(
    organizationId: string,
    userId: string
  ): Promise<MasteryRecomputeResult> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "mastery.recompute",
        organizationScope(organizationId)
      );

      await this.mastery.lockLearner(transaction, organizationId, userId);
      const aggregates = await this.mastery.aggregateUserEvidence(
        transaction,
        organizationId,
        userId
      );

      await this.mastery.deleteUserProjections(
        transaction,
        organizationId,
        userId
      );

      const projections: MasteryProjection[] = [];
      for (const aggregate of aggregates) {
        projections.push(
          await this.mastery.saveProjection(
            transaction,
            this.materialize(organizationId, userId, aggregate)
          )
        );
      }

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "mastery.recomputed",
        eventVersion: 1,
        aggregateType: "learner_mastery",
        aggregateId: userId,
        actorUserId: context.userId,
        payload: {
          organizationId,
          userId,
          algorithmKey: MASTERY_ALGORITHM_KEY,
          algorithmVersion: MASTERY_ALGORITHM_VERSION,
          projectionCount: projections.length
        }
      });

      return { userId, projections };
    });
  }
}
