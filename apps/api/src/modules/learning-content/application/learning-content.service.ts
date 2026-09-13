import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  Course,
  CourseVersion,
  CreateCourseRequest,
  CreateCourseResult,
  CreateCourseVersionRequest
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentRepository } from "./learning-content.repository";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function organizationScope(organizationId: string) {
  return {
    organizationId,
    type: "organization" as const,
    id: organizationId
  };
}

function courseScope(organizationId: string, courseId: string) {
  return {
    organizationId,
    type: "course" as const,
    id: courseId
  };
}

@Injectable()
export class LearningContentApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly content: LearningContentRepository,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly outbox: OutboxRepository
  ) {}

  async createCourse(
    organizationId: string,
    command: CreateCourseRequest
  ): Promise<CreateCourseResult> {
    const context = this.requestContext.tenantContext(organizationId);
    const courseId = await this.database.nextUuid();
    const versionId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "course.manage",
          organizationScope(organizationId)
        );

        const result = await this.content.createCourseWithInitialDraft(
          transaction,
          {
            id: courseId,
            organizationId,
            slug: command.slug,
            createdByUserId: context.userId
          },
          {
            id: versionId,
            organizationId,
            courseId,
            title: command.title,
            description: command.description ?? null,
            createdByUserId: context.userId
          }
        );

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "course.created",
          eventVersion: 1,
          aggregateType: "course",
          aggregateId: courseId,
          actorUserId: context.userId,
          payload: {
            organizationId,
            courseId,
            slug: result.course.slug,
            initialVersionId: versionId
          }
        });
        await this.outbox.append(transaction, {
          organizationId,
          eventName: "course_version.created",
          eventVersion: 1,
          aggregateType: "course_version",
          aggregateId: versionId,
          actorUserId: context.userId,
          payload: {
            organizationId,
            courseId,
            versionId,
            versionNumber: 1
          }
        });

        return result;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("A course with this slug already exists.");
      }
      throw error;
    }
  }

  async getCourse(organizationId: string, courseId: string): Promise<Course> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "course.read",
        courseScope(organizationId, courseId)
      );

      const course = await this.content.findCourse(
        transaction,
        organizationId,
        courseId
      );
      if (course === null) {
        throw new NotFoundException("Course not found.");
      }
      return course;
    });
  }

  async createCourseVersion(
    organizationId: string,
    courseId: string,
    command: CreateCourseVersionRequest
  ): Promise<CourseVersion> {
    const context = this.requestContext.tenantContext(organizationId);
    const versionId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "course.manage",
          courseScope(organizationId, courseId)
        );

        const version = await this.content.createNextDraftVersion(transaction, {
          id: versionId,
          organizationId,
          courseId,
          title: command.title,
          description: command.description ?? null,
          createdByUserId: context.userId
        });
        if (version === null) {
          throw new NotFoundException("Course not found.");
        }

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "course_version.created",
          eventVersion: 1,
          aggregateType: "course_version",
          aggregateId: version.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            courseId,
            versionId: version.id,
            versionNumber: version.versionNumber
          }
        });

        return version;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "Publish the existing draft before creating another course version."
        );
      }
      throw error;
    }
  }

  async publishCourseVersion(
    organizationId: string,
    courseId: string,
    versionId: string
  ): Promise<CourseVersion> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "course.publish",
        courseScope(organizationId, courseId)
      );

      const existing = await this.content.findVersion(
        transaction,
        organizationId,
        versionId
      );
      if (existing === null || existing.courseId !== courseId) {
        throw new NotFoundException("Course version not found.");
      }
      if (existing.status !== "draft") {
        throw new ConflictException("Only a draft course version can be published.");
      }

      const published = await this.content.publishDraftVersion(
        transaction,
        organizationId,
        courseId,
        versionId,
        context.userId
      );
      if (published === null) {
        throw new ConflictException("The course version is no longer publishable.");
      }

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "course_version.published",
        eventVersion: 1,
        aggregateType: "course_version",
        aggregateId: versionId,
        actorUserId: context.userId,
        payload: {
          organizationId,
          courseId,
          versionId,
          versionNumber: published.versionNumber,
          publishedAt: published.publishedAt
        }
      });

      return published;
    });
  }

  async requirePublishedVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    versionId: string
  ): Promise<CourseVersion> {
    const version = await this.content.findVersion(
      transaction,
      organizationId,
      versionId
    );
    if (version === null) {
      throw new NotFoundException("Course version not found.");
    }
    if (version.status !== "published") {
      throw new ConflictException(
        "Learning offerings can only use published course versions."
      );
    }
    return version;
  }
}
