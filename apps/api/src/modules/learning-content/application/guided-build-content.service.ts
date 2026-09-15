import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CreateGuidedBuildDefinitionRequest,
  GuidedBuildDefinition
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GuidedBuildContentQuery } from "./guided-build-content.query";
import {
  GuidedBuildContentRepository,
  type GuidedBuildHintMaterial,
  type GuidedBuildSolutionMaterial
} from "./guided-build-content.repository";
import { LearningContentRepository } from "./learning-content.repository";
import { LearningGraphRepository } from "./learning-graph.repository";

function courseScope(organizationId: string, courseId: string) {
  return {
    organizationId,
    type: "course" as const,
    id: courseId
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "23505"
  );
}

@Injectable()
export class GuidedBuildContentApplicationService extends GuidedBuildContentQuery {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly content: LearningContentRepository,
    private readonly graph: LearningGraphRepository,
    private readonly guidedBuild: GuidedBuildContentRepository
  ) {
    super();
  }

  async createDefinition(
    organizationId: string,
    courseId: string,
    versionId: string,
    activityVersionId: string,
    command: CreateGuidedBuildDefinitionRequest
  ): Promise<GuidedBuildDefinition> {
    const context = this.requestContext.tenantContext(organizationId);

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "activity.manage",
          courseScope(organizationId, courseId)
        );

        const version = await this.content.findVersion(transaction, organizationId, versionId);
        if (version === null || version.courseId !== courseId) {
          throw new NotFoundException("Course version not found.");
        }
        if (version.status !== "draft") {
          throw new ConflictException("Published Guided Build content is immutable.");
        }

        const activity = await this.graph.findActivityVersionById(
          transaction,
          organizationId,
          activityVersionId
        );
        if (activity === null || activity.courseVersionId !== versionId) {
          throw new NotFoundException("Activity version not found in this course version.");
        }

        if (command.transferActivityVersionId !== null) {
          const transfer = await this.graph.findActivityVersionById(
            transaction,
            organizationId,
            command.transferActivityVersionId
          );
          if (transfer === null || transfer.courseVersionId !== versionId) {
            throw new ConflictException(
              "Guided Build transfer activity must belong to the same course version."
            );
          }
        }

        return this.guidedBuild.createDefinition(transaction, {
          organizationId,
          activityVersionId,
          definition: command
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("This activity version already has a Guided Build definition.");
      }
      throw error;
    }
  }

  findDefinition(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<GuidedBuildDefinition | null> {
    return this.guidedBuild.findDefinition(transaction, organizationId, activityVersionId);
  }

  findHintMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    stepKey: string,
    hintKey: string
  ): Promise<GuidedBuildHintMaterial | null> {
    return this.guidedBuild.findHintMaterial(
      transaction,
      organizationId,
      activityVersionId,
      stepKey,
      hintKey
    );
  }

  findSolutionMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    solutionKey: string
  ): Promise<GuidedBuildSolutionMaterial | null> {
    return this.guidedBuild.findSolutionMaterial(
      transaction,
      organizationId,
      activityVersionId,
      solutionKey
    );
  }
}
