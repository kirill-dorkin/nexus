import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  AttachSkillToCourseVersionRequest,
  CourseVersionActivity,
  CourseVersionSkill,
  CourseVersionSkillRemediationSet,
  CreateCourseVersionActivityRequest,
  CreateSkillRequest,
  ReplaceSkillRemediationActivitiesRequest,
  GuidedBuildProtectedDefinition,
  Skill
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GuidedBuildContentQuery } from "./guided-build-content.query";
import type { PublishedLearningGraph } from "./learning-content.query";
import { LearningContentRepository } from "./learning-content.repository";
import { LearningGraphRepository } from "./learning-graph.repository";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
function organizationScope(organizationId: string) {
  return { organizationId, type: "organization" as const, id: organizationId };
}
function courseScope(organizationId: string, courseId: string) {
  return { organizationId, type: "course" as const, id: courseId };
}

@Injectable()
export class LearningGraphApplicationService extends GuidedBuildContentQuery {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly content: LearningContentRepository,
    private readonly graph: LearningGraphRepository,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly outbox: OutboxRepository
  ) { super(); }

  async createSkill(organizationId: string, command: CreateSkillRequest): Promise<Skill> {
    const context = this.requestContext.tenantContext(organizationId);
    const skillId = await this.database.nextUuid();
    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(transaction, context.userId, "skill.manage", organizationScope(organizationId));
        const skill = await this.graph.createSkill(transaction, {
          id: skillId, organizationId, key: command.key, title: command.title,
          description: command.description ?? null, createdByUserId: context.userId
        });
        await this.outbox.append(transaction, {
          organizationId, eventName: "skill.created", eventVersion: 1,
          aggregateType: "skill", aggregateId: skill.id, actorUserId: context.userId,
          payload: { organizationId, skillId: skill.id, key: skill.key }
        });
        return skill;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("A skill with this key already exists.");
      throw error;
    }
  }

  async attachSkill(organizationId: string, courseId: string, versionId: string, command: AttachSkillToCourseVersionRequest): Promise<CourseVersionSkill> {
    const context = this.requestContext.tenantContext(organizationId);
    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(transaction, context.userId, "skill.manage", courseScope(organizationId, courseId));
        await this.requireDraftVersion(transaction, organizationId, courseId, versionId);
        const attached = await this.graph.attachSkill(transaction, organizationId, versionId, command.skillId, command.position ?? 0);
        if (attached === null) throw new NotFoundException("Active skill not found.");
        await this.outbox.append(transaction, {
          organizationId, eventName: "course_version.skill_attached", eventVersion: 1,
          aggregateType: "course_version", aggregateId: versionId, actorUserId: context.userId,
          payload: { organizationId, courseId, courseVersionId: versionId, skillId: command.skillId }
        });
        return attached;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("This skill is already attached to the course version.");
      throw error;
    }
  }

  async replaceSkillRemediations(
    organizationId: string,
    courseId: string,
    versionId: string,
    skillId: string,
    command: ReplaceSkillRemediationActivitiesRequest
  ): Promise<CourseVersionSkillRemediationSet> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "activity.manage",
        courseScope(organizationId, courseId)
      );
      await this.requireDraftVersion(
        transaction,
        organizationId,
        courseId,
        versionId
      );

      const attachedSkill = await this.graph.findAttachedSkill(
        transaction,
        organizationId,
        versionId,
        skillId
      );
      if (attachedSkill === null) {
        throw new NotFoundException("Skill is not attached to this course version.");
      }

      for (const activityId of command.activityIds) {
        const activity = await this.graph.findActivityVersion(
          transaction,
          organizationId,
          versionId,
          activityId
        );
        if (activity === null || !activity.skillIds.includes(skillId)) {
          throw new BadRequestException(
            "Every remediation activity must belong to the same course version and assess the target skill."
          );
        }
      }

      const current = (
        await this.graph.listCourseVersionSkillRemediations(
          transaction,
          organizationId,
          versionId
        )
      )
        .filter((remediation) => remediation.skillId === skillId)
        .sort(
          (left, right) =>
            left.position - right.position ||
            left.activityId.localeCompare(right.activityId)
        );
      const currentActivityIds = current.map(
        (remediation) => remediation.activityId
      );

      if (
        currentActivityIds.length === command.activityIds.length &&
        currentActivityIds.every(
          (activityId, index) => activityId === command.activityIds[index]
        )
      ) {
        return {
          organizationId,
          courseVersionId: versionId,
          skillId,
          activityIds: currentActivityIds
        };
      }

      const replaced = await this.graph.replaceCourseVersionSkillRemediations(
        transaction,
        organizationId,
        versionId,
        skillId,
        command.activityIds
      );

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "course_version.skill_remediations_replaced",
        eventVersion: 1,
        aggregateType: "course_version",
        aggregateId: versionId,
        actorUserId: context.userId,
        payload: {
          organizationId,
          courseId,
          courseVersionId: versionId,
          skillId,
          activityIds: [...command.activityIds]
        }
      });

      return {
        organizationId,
        courseVersionId: versionId,
        skillId,
        activityIds: replaced.map((remediation) => remediation.activityId)
      };
    });
  }

  async createActivity(organizationId: string, courseId: string, versionId: string, command: CreateCourseVersionActivityRequest): Promise<CourseVersionActivity> {
    const context = this.requestContext.tenantContext(organizationId);
    const activityId = await this.database.nextUuid();
    const activityVersionId = await this.database.nextUuid();
    const uniqueSkillIds = [...new Set(command.skillIds)];
    if (uniqueSkillIds.length !== command.skillIds.length) throw new BadRequestException("Activity skillIds must be unique.");

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(transaction, context.userId, "activity.manage", courseScope(organizationId, courseId));
        await this.requireDraftVersion(transaction, organizationId, courseId, versionId);
        for (const skillId of uniqueSkillIds) {
          const attached = await this.graph.findAttachedSkill(transaction, organizationId, versionId, skillId);
          if (attached === null) throw new BadRequestException("Every activity skill must be attached to the same course version.");
        }

        const transferId = command.guidedBuild?.transferActivityVersionId ?? null;
        if (transferId !== null) {
          const transfer = await this.graph.findActivityVersionById(transaction, organizationId, transferId);
          if (transfer === null || transfer.courseVersionId !== versionId) {
            throw new BadRequestException("Guided Build transfer must reference a different ActivityVersion in the same course version.");
          }
        }

        const activity = await this.graph.createActivity(transaction, {
          id: activityVersionId, activityId, organizationId, courseId, courseVersionId: versionId,
          slug: command.slug, activityType: command.activityType, title: command.title,
          instructions: command.instructions ?? null, config: command.config ?? {},
          position: command.position ?? 0, skillIds: uniqueSkillIds, createdByUserId: context.userId
        });
        if (command.guidedBuild !== undefined) {
          await this.graph.createGuidedBuildDefinition(transaction, organizationId, activityVersionId, command.guidedBuild);
        }
        await this.outbox.append(transaction, {
          organizationId, eventName: "activity.created", eventVersion: 1,
          aggregateType: "activity", aggregateId: activityId, actorUserId: context.userId,
          payload: { organizationId, courseId, courseVersionId: versionId, activityId, activityVersionId, activityType: activity.activityType, skillIds: activity.skillIds }
        });
        return activity;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("An activity with this identity or slug already exists in the course version.");
      throw error;
    }
  }

  async requireGuidedBuildDefinition(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string): Promise<GuidedBuildProtectedDefinition> {
    const definition = await this.graph.findGuidedBuildDefinition(transaction, organizationId, activityVersionId);
    if (definition === null) throw new NotFoundException("Guided Build definition not found for this ActivityVersion.");
    return definition;
  }

  async requireActivityVersion(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, activityId: string): Promise<CourseVersionActivity> {
    const activity = await this.graph.findActivityVersion(transaction, organizationId, courseVersionId, activityId);
    if (activity === null) throw new NotFoundException("Activity not found in this course version.");
    return activity;
  }
  async requireActivityVersionById(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string): Promise<CourseVersionActivity> {
    const activity = await this.graph.findActivityVersionById(transaction, organizationId, activityVersionId);
    if (activity === null) throw new NotFoundException("Activity version not found.");
    return activity;
  }
  async activityAssessesSkill(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string, skillId: string): Promise<boolean> {
    return this.graph.activityAssessesSkill(transaction, organizationId, activityVersionId, skillId);
  }
  async requirePublishedLearningGraph(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string): Promise<PublishedLearningGraph> {
    const version = await this.content.findVersion(transaction, organizationId, courseVersionId);
    if (version === null) throw new NotFoundException("Course version not found.");
    if (version.status !== "published") throw new ConflictException("Adaptive sequencing requires a published course version.");
    const skills = await this.graph.listCourseVersionSkills(transaction, organizationId, courseVersionId);
    const activities = await this.graph.listCourseVersionActivities(transaction, organizationId, courseVersionId);
    const remediations = await this.graph.listCourseVersionSkillRemediations(
      transaction,
      organizationId,
      courseVersionId
    );
    return {
      skills,
      activities,
      remediations: remediations.map((remediation) => ({
        skillId: remediation.skillId,
        activityId: remediation.activityId,
        position: remediation.position
      }))
    };
  }
  private async requireDraftVersion(transaction: DatabaseTransaction, organizationId: string, courseId: string, versionId: string): Promise<void> {
    const version = await this.content.findVersion(transaction, organizationId, versionId);
    if (version === null || version.courseId !== courseId) throw new NotFoundException("Course version not found.");
    if (version.status !== "draft") throw new ConflictException("Published course version learning graphs are immutable.");
  }
}
