import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  ApplyCourseManifestRequest,
  CourseManifestApplyResult,
  CourseManifestPlan,
  CourseManifestV1
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { oneRow } from "../../../database/one-row";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentRepository } from "./learning-content.repository";
import { CourseManifestRepository } from "./course-manifest.repository";

@Injectable()
export class CourseManifestApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly content: LearningContentRepository,
    private readonly manifests: CourseManifestRepository,
    private readonly outbox: OutboxRepository
  ) {}

  private async plan(
    tx: DatabaseTransaction,
    org: string,
    user: string,
    manifest: CourseManifestV1,
    lock: boolean
  ): Promise<CourseManifestPlan> {
    await this.identity.requireActiveUser(tx, user);
    const state = await this.manifests.findState(
      tx,
      org,
      manifest.course.slug,
      lock
    );
    const scope = {
      organizationId: org,
      type: state === null ? ("organization" as const) : ("course" as const),
      id: state?.courseId ?? org
    };
    await this.authorization.requireCapability(
      tx,
      user,
      "course.manage",
      scope
    );
    await this.authorization.requireCapability(
      tx,
      user,
      "activity.manage",
      scope
    );
    // Import may create shared organization Skills, requiring the existing org capability.
    await this.authorization.requireCapability(tx, user, "skill.manage", {
      organizationId: org,
      type: "organization",
      id: org
    });
    if (state?.status === "archived")
      throw new ConflictException(
        "An archived course cannot receive a manifest."
      );
    if (state?.draftVersionId)
      await this.manifests.requireCompatibleDraft(
        tx,
        org,
        state.draftVersionId
      );
    await this.manifests.requireCompatibleSkills(tx, org, manifest);
    if (state)
      await this.manifests.requireCompatibleActivityIdentities(
        tx,
        org,
        state.courseId,
        manifest
      );
    return {
      mode: !state
        ? "create_course"
        : state.draftVersionId
          ? "replace_draft"
          : "create_draft",
      courseId: state?.courseId ?? null,
      expectedDraftVersionId: state?.draftVersionId ?? null,
      expectedRevision: state?.revision ?? 0,
      counts: {
        skills: manifest.skills.length,
        activities: manifest.activities.length,
        lessons: manifest.lessons.length
      }
    };
  }

  async validate(
    organizationId: string,
    manifest: CourseManifestV1
  ): Promise<CourseManifestPlan> {
    const context = this.requestContext.tenantContext(organizationId);
    // Dry-run is a consistent, DB-enforced read-only transaction: no UUID/state/outbox write.
    return this.database.tenantTransaction(
      context,
      (tx) => this.plan(tx, organizationId, context.userId, manifest, false),
      { readOnly: true, isolationLevel: "repeatable_read" }
    );
  }

  async apply(
    organizationId: string,
    command: ApplyCourseManifestRequest
  ): Promise<CourseManifestApplyResult> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (tx) => {
      const plan = await this.plan(
        tx,
        organizationId,
        context.userId,
        command.manifest,
        true
      );
      if (
        plan.expectedDraftVersionId !== command.expectedDraftVersionId ||
        plan.expectedRevision !== command.expectedRevision
      ) {
        throw new ConflictException(
          "The draft changed after validation. Validate again before applying the manifest."
        );
      }
      let courseId = plan.courseId;
      let versionId = plan.expectedDraftVersionId;
      const meta = command.manifest.course;
      if (courseId === null) {
        const newCourseId = await this.uuid(tx);
        const result = await this.content.createCourseWithInitialDraft(
          tx,
          {
            id: newCourseId,
            organizationId,
            slug: meta.slug,
            createdByUserId: context.userId
          },
          {
            id: await this.uuid(tx),
            organizationId,
            courseId: newCourseId,
            title: meta.title,
            description: meta.description,
            createdByUserId: context.userId
          }
        );
        courseId = result.course.id;
        versionId = result.draftVersion.id;
        await this.outbox.append(tx, {
          organizationId,
          eventName: "course.created",
          eventVersion: 1,
          aggregateType: "course",
          aggregateId: courseId,
          actorUserId: context.userId,
          payload: {
            organizationId,
            courseId,
            slug: meta.slug,
            initialVersionId: versionId
          }
        });
        await this.versionCreated(
          tx,
          organizationId,
          courseId,
          versionId,
          1,
          context.userId
        );
      } else if (versionId === null) {
        const version = await this.content.createNextDraftVersion(tx, {
          id: await this.uuid(tx),
          organizationId,
          courseId,
          title: meta.title,
          description: meta.description,
          createdByUserId: context.userId
        });
        if (!version) throw new NotFoundException("Course not found.");
        versionId = version.id;
        await this.versionCreated(
          tx,
          organizationId,
          courseId,
          versionId,
          version.versionNumber,
          context.userId
        );
      }
      if (!versionId)
        throw new Error("Manifest import did not resolve a draft.");
      const result = await this.manifests.replaceDraft(
        tx,
        organizationId,
        courseId,
        versionId,
        context.userId,
        command.manifest
      );
      for (const skill of result.createdSkills) {
        await this.outbox.append(tx, {
          organizationId,
          eventName: "skill.created",
          eventVersion: 1,
          aggregateType: "skill",
          aggregateId: skill.id,
          actorUserId: context.userId,
          payload: { organizationId, skillId: skill.id, key: skill.key }
        });
      }
      await this.outbox.append(tx, {
        organizationId,
        eventName: "course_version.manifest_imported",
        eventVersion: 1,
        aggregateType: "course_version",
        aggregateId: versionId,
        actorUserId: context.userId,
        payload: {
          organizationId,
          courseId,
          courseVersionId: versionId,
          schemaVersion: 1,
          revision: result.revision,
          counts: plan.counts
        }
      });
      return {
        courseId,
        draftVersionId: versionId,
        revision: result.revision,
        counts: plan.counts
      };
    });
  }

  async exportDraft(
    organizationId: string,
    courseId: string,
    versionId: string
  ): Promise<CourseManifestV1> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(
      context,
      async (tx) => {
        await this.identity.requireActiveUser(tx, context.userId);
        const scope = { organizationId, type: "course" as const, id: courseId };
        // course.read includes learners/mentors: NEVER use it to disclose answer keys.
        await this.authorization.requireCapability(
          tx,
          context.userId,
          "course.manage",
          scope
        );
        await this.authorization.requireCapability(
          tx,
          context.userId,
          "activity.manage",
          scope
        );
        const version = await this.content.findVersion(
          tx,
          organizationId,
          versionId
        );
        if (version?.courseId !== courseId)
          throw new NotFoundException("Course version not found.");
        if (version.status !== "draft")
          throw new ConflictException(
            "Only a draft can be exported through authoring."
          );
        return this.manifests.exportVersion(
          tx,
          organizationId,
          courseId,
          versionId
        );
      },
      { readOnly: true, isolationLevel: "repeatable_read" }
    );
  }

  private async uuid(tx: DatabaseTransaction): Promise<string> {
    return oneRow(
      await tx.client.query<{ id: string }>("SELECT uuidv7()::text AS id"),
      "uuidv7()"
    ).id;
  }

  private async versionCreated(
    tx: DatabaseTransaction,
    org: string,
    course: string,
    version: string,
    number: number,
    user: string
  ) {
    await this.outbox.append(tx, {
      organizationId: org,
      eventName: "course_version.created",
      eventVersion: 1,
      aggregateType: "course_version",
      aggregateId: version,
      actorUserId: user,
      payload: {
        organizationId: org,
        courseId: course,
        versionId: version,
        versionNumber: number
      }
    });
  }
}
