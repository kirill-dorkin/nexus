import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { studioCourseListSchema, studioDraftSchema } from "@platform/contracts";
import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { CourseManifestRepository } from "./course-manifest.repository";
import { CourseManifestApplicationService } from "./course-manifest.service";
import { StudioRepository } from "./studio.repository";
@Injectable()
export class StudioApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly context: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly studio: StudioRepository,
    private readonly manifests: CourseManifestRepository,
    private readonly importer: CourseManifestApplicationService
  ) {}
  async list(org: string, after: string | null) {
    const context = this.context.tenantContext(org);
    return this.database.tenantTransaction(
      context,
      async (tx) => {
        await this.identity.requireActiveUser(tx, context.userId);
        const scopes = await this.authorization.authoringScopes(
          tx,
          org,
          context.userId
        );
        if (!scopes.allCourses && scopes.courseIds.length === 0)
          throw new ForbiddenException("Authoring capability is required.");
        const rows = await this.studio.list(
          tx,
          org,
          scopes.allCourses,
          scopes.courseIds,
          after
        );
        return studioCourseListSchema.parse({
          courses: rows.slice(0, 100),
          nextCursor: rows.length > 100 ? rows[99]!.courseId : null,
          canCreate: scopes.allCourses && scopes.canApply
        });
      },
      { readOnly: true, isolationLevel: "repeatable_read" }
    );
  }
  async draft(org: string, course: string) {
    const context = this.context.tenantContext(org);
    return this.database.tenantTransaction(
      context,
      async (tx) => {
        await this.identity.requireActiveUser(tx, context.userId);
        const scope = {
          organizationId: org,
          type: "course" as const,
          id: course
        };
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
        const row = await this.studio.latest(tx, org, course);
        if (!row) throw new NotFoundException("Course not found.");
        const scopes = await this.authorization.authoringScopes(
          tx,
          org,
          context.userId
        );
        return studioDraftSchema.parse({
          ...row,
          manifest: await this.manifests.exportVersion(
            tx,
            org,
            course,
            row.versionId
          ),
          canApply: scopes.canApply,
          canPublish: scopes.canPublish(course)
        });
      },
      { readOnly: true, isolationLevel: "repeatable_read" }
    );
  }
  async createDraft(org: string, course: string) {
    const latest = await this.draft(org, course);
    if (latest.status !== "published")
      throw new ConflictException("A draft already exists.");
    if (!latest.canApply)
      throw new ForbiddenException(
        "Organization skill management is required."
      );
    return this.importer.apply(org, {
      manifest: latest.manifest,
      expectedDraftVersionId: null,
      expectedRevision: latest.versionNumber
    });
  }
}
