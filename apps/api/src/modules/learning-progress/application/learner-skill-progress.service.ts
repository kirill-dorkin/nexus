import { ForbiddenException, Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import type {
  CourseVersionSkill,
  LearnerSkillProgress,
  LearnerSkillProgressReadModel,
  MasteryProjection
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentQuery } from "../../learning-content/application/learning-content.query";
import { LearningDeliveryQuery } from "../../learning-delivery/application/learning-delivery.query";
import { MasteryQuery } from "./mastery.query";
import { OwnSkillProgressQuery } from "./own-skill-progress.query";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

function mapSkillProgress(
  skill: CourseVersionSkill,
  projection: MasteryProjection | undefined
): LearnerSkillProgress {
  const presentation = {
    skillId: skill.skillId,
    title: skill.title,
    description: skill.description,
    position: skill.position
  };

  if (projection === undefined) {
    return {
      ...presentation,
      state: "unobserved",
      masteryScore: null,
      evidenceCount: 0,
      scoredEvidenceCount: 0,
      lastEvidenceAt: null
    };
  }

  if (projection.evidenceCount <= 0) {
    throw new Error("Mastery projection must be backed by Evidence.");
  }

  if (projection.masteryScore === null) {
    if (projection.scoredEvidenceCount !== 0) {
      throw new Error(
        "Mastery projection with scored Evidence must expose a mastery score."
      );
    }

    return {
      ...presentation,
      state: "observed_unscored",
      masteryScore: null,
      evidenceCount: projection.evidenceCount,
      scoredEvidenceCount: 0,
      lastEvidenceAt: projection.lastEvidenceAt
    };
  }

  if (
    projection.scoredEvidenceCount <= 0 ||
    projection.scoredEvidenceCount > projection.evidenceCount
  ) {
    throw new Error(
      "Assessed Mastery projection has inconsistent Evidence counts."
    );
  }

  return {
    ...presentation,
    state: "assessed",
    masteryScore: projection.masteryScore,
    evidenceCount: projection.evidenceCount,
    scoredEvidenceCount: projection.scoredEvidenceCount,
    lastEvidenceAt: projection.lastEvidenceAt
  };
}

@Injectable()
export class LearnerSkillProgressApplicationService implements OwnSkillProgressQuery {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly delivery: LearningDeliveryQuery,
    private readonly content: LearningContentQuery,
    private readonly mastery: MasteryQuery
  ) {}

  async getEnrollmentSkillProgress(
    organizationId: string,
    enrollmentId: string
  ): Promise<LearnerSkillProgressReadModel> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

      const enrollmentContext = await this.delivery.requireEnrollment(
        transaction,
        organizationId,
        enrollmentId
      );
      if (enrollmentContext.enrollment.userId !== context.userId) {
        throw new ForbiddenException(
          "Skill progress can only be read for your own enrollment."
        );
      }

      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "mastery.read",
        offeringScope(organizationId, enrollmentContext.offering.id)
      );

      const skills = await this.readSkills(
        transaction,
        organizationId,
        enrollmentContext.offering.courseVersionId,
        context.userId
      );

      return {
        organizationId,
        enrollmentId,
        offeringId: enrollmentContext.offering.id,
        courseVersionId: enrollmentContext.offering.courseVersionId,
        skills
      };
    });
  }

  async ownSkills(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<readonly LearnerSkillProgress[]> {
    const { userId } = this.requestContext.requirePrincipal();
    const enrollmentContext = await this.delivery.requireEnrollment(
      transaction,
      organizationId,
      enrollmentId
    );
    if (enrollmentContext.enrollment.userId !== userId) {
      throw new ForbiddenException(
        "Skill progress can only be read for your own enrollment."
      );
    }
    return this.readSkills(
      transaction,
      organizationId,
      enrollmentContext.offering.courseVersionId,
      userId
    );
  }

  private async readSkills(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    userId: string
  ): Promise<LearnerSkillProgress[]> {
    const graph = await this.content.requirePublishedLearningGraph(
      transaction,
      organizationId,
      courseVersionId
    );
    const projections = await this.mastery.listUserMastery(
      transaction,
      organizationId,
      userId
    );
    const masteryBySkillId = new Map(
      projections.map((projection) => [projection.skillId, projection] as const)
    );
    return [...graph.skills]
      .sort(
        (left, right) =>
          left.position - right.position ||
          left.skillId.localeCompare(right.skillId)
      )
      .map((skill) =>
        mapSkillProgress(skill, masteryBySkillId.get(skill.skillId))
      );
  }
}
