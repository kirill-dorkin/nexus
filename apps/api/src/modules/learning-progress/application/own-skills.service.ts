import { Injectable } from "@nestjs/common";
import type { OwnSkill } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { RequestContextService } from "../../../request-context/request-context.service";
import { SkillKeyQuery } from "../../learning-content/application/skill-key.query";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { MasteryQuery } from "./mastery.query";
import { OwnSkillsQuery } from "./own-skills.query";
import { SkillConfirmationRepository } from "./skill-confirmation.repository";

@Injectable()
export class OwnSkillsApplicationService implements OwnSkillsQuery {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly mastery: MasteryQuery,
    private readonly skillKeys: SkillKeyQuery,
    private readonly delivery: LearningDeliveryQuery,
    private readonly confirmations: SkillConfirmationRepository
  ) {}

  async ownOrganizationSkills(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<readonly OwnSkill[]> {
    const { userId } = this.requestContext.requirePrincipal();
    const projections = (
      await this.mastery.listUserMastery(transaction, organizationId, userId)
    ).filter((projection) => projection.evidenceCount > 0);
    if (projections.length === 0) return [];

    const enrollments = await this.delivery.listEnrollmentsForUsers(
      transaction,
      organizationId,
      [userId]
    );
    // One transaction client: run the reads one after another.
    const keys = await this.skillKeys.skillKeys(
      transaction,
      organizationId,
      projections.map((projection) => projection.skillId)
    );
    const confirmations = await this.confirmations.aggregateConfirmations(
      transaction,
      organizationId,
      enrollments
        .filter((enrollment) => enrollment.userId === userId)
        .map((enrollment) => enrollment.id)
    );
    const confirmationsBySkill = new Map(
      confirmations.map((aggregate) => [aggregate.skillId, aggregate] as const)
    );

    return projections
      .flatMap((projection): OwnSkill[] => {
        const skillKey = keys.get(projection.skillId);
        if (skillKey === undefined) return [];
        const confirmed = confirmationsBySkill.get(projection.skillId);
        return [
          {
            skillKey,
            masteryScore: projection.masteryScore,
            evidenceCount: projection.evidenceCount,
            scoredEvidenceCount: projection.scoredEvidenceCount,
            lastEvidenceAt: projection.lastEvidenceAt,
            confirmations: confirmed?.confirmations ?? 0,
            firstConfirmedAt: confirmed?.firstConfirmedAt ?? null,
            lastConfirmedAt: confirmed?.lastConfirmedAt ?? null,
            confirmedDays: [...(confirmed?.confirmedDays ?? [])]
          }
        ];
      })
      .sort((left, right) => left.skillKey.localeCompare(right.skillKey));
  }
}
