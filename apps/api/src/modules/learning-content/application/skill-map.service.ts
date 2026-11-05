import {
  BadRequestException,
  ConflictException,
  Injectable
} from "@nestjs/common";
import {
  publicSkillMapSchema,
  skillMapManifestV2Schema,
  skillMapPrerequisites,
  type ApplySkillMapManifestRequest,
  type PublicSkillMap,
  type SkillMapManifestApplyResult,
  type SkillMapManifestCounts,
  type SkillMapManifestPlan,
  type SkillMapManifestV2
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { SkillMapRepository } from "./skill-map.repository";

/** The one map an organization has today; the schema allows more later. */
export const MAIN_SKILL_MAP = "main";

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

export function skillMapCounts(
  manifest: SkillMapManifestV2
): SkillMapManifestCounts {
  const branches = manifest.characters.flatMap((c) => c.branches);
  return {
    characters: manifest.characters.length,
    branches: branches.length,
    skills: branches.reduce((sum, b) => sum + b.skills.length, 0),
    prerequisites: skillMapPrerequisites(manifest).length
  };
}

/**
 * Imports and publishes `skill-map@2` manifests (ADR-0078). The document's own graph rules are in
 * the contract; this service adds what needs the organization: skills exist, lessons are published.
 * Each apply publishes a new immutable version.
 */
@Injectable()
export class SkillMapApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly maps: SkillMapRepository,
    private readonly outbox: OutboxRepository
  ) {}

  private async plan(
    tx: DatabaseTransaction,
    organizationId: string,
    userId: string,
    manifest: SkillMapManifestV2
  ): Promise<SkillMapManifestPlan> {
    await this.identity.requireActiveUser(tx, userId);
    const scope = {
      organizationId,
      type: "organization" as const,
      id: organizationId
    };
    // Same roles as course manifests: course authors who may manage the organization's Skills.
    await this.authorization.requireCapability(
      tx,
      userId,
      "course.manage",
      scope
    );
    await this.authorization.requireCapability(
      tx,
      userId,
      "skill.manage",
      scope
    );
    const skills = manifest.characters.flatMap((c) =>
      c.branches.flatMap((b) => b.skills)
    );
    const missing = await this.maps.missingSkillKeys(
      tx,
      organizationId,
      skills.map((s) => s.key)
    );
    if (missing.length)
      throw new BadRequestException({
        message:
          "The skill map names skills the organization does not have. Import their courses first.",
        missingSkillKeys: missing
      });
    const links = [
      ...new Map(
        skills
          .flatMap((s) => (s.lesson ? [s.lesson] : []))
          .map((l) => [`${l.course}/${l.slug}`, l] as const)
      ).values()
    ];
    const unpublished = await this.maps.unpublishedLessons(
      tx,
      organizationId,
      links.map((l) => ({ course: l.course, slug: l.slug }))
    );
    if (unpublished.length)
      throw new BadRequestException({
        message:
          "The skill map links lessons that are not in a published course.",
        unpublishedLessons: unpublished
      });
    const state = await this.maps.findState(
      tx,
      organizationId,
      MAIN_SKILL_MAP
    );
    return {
      mode: state ? "create_version" : "create_map",
      skillMapId: state?.skillMapId ?? null,
      expectedLatestVersionNumber: state?.latestVersionNumber ?? null,
      counts: skillMapCounts(manifest)
    };
  }

  async validate(
    organizationId: string,
    manifest: SkillMapManifestV2
  ): Promise<SkillMapManifestPlan> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(
      context,
      (tx) => this.plan(tx, organizationId, context.userId, manifest),
      { readOnly: true, isolationLevel: "repeatable_read" }
    );
  }

  async apply(
    organizationId: string,
    command: ApplySkillMapManifestRequest
  ): Promise<SkillMapManifestApplyResult> {
    const context = this.requestContext.tenantContext(organizationId);
    try {
      return await this.database.tenantTransaction(context, async (tx) => {
        const plan = await this.plan(
          tx,
          organizationId,
          context.userId,
          command.manifest
        );
        if (
          plan.expectedLatestVersionNumber !==
          command.expectedLatestVersionNumber
        )
          throw new ConflictException(
            "The skill map changed after validation. Validate again before applying it."
          );
        const skillMapId =
          plan.skillMapId ??
          (await this.maps.createMap(tx, {
            organizationId,
            slug: MAIN_SKILL_MAP,
            userId: context.userId
          }));
        const versionNumber = (plan.expectedLatestVersionNumber ?? 0) + 1;
        const { versionId } = await this.maps.publishVersion(tx, {
          organizationId,
          skillMapId,
          versionNumber,
          userId: context.userId,
          manifest: command.manifest
        });
        await this.outbox.append(tx, {
          organizationId,
          eventName: "skill_map_version.published",
          eventVersion: 1,
          aggregateType: "skill_map_version",
          aggregateId: versionId,
          actorUserId: context.userId,
          payload: {
            organizationId,
            skillMapId,
            skillMapVersionId: versionId,
            slug: MAIN_SKILL_MAP,
            versionNumber,
            schemaVersion: 2,
            counts: plan.counts
          }
        });
        return { skillMapId, versionId, versionNumber, counts: plan.counts };
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException(
          "The skill map changed after validation. Validate again before applying it."
        );
      throw error;
    }
  }

  /** The published map of an organization, or null before the first publication. */
  async readPublic(organizationSlug: string): Promise<PublicSkillMap> {
    const document = await this.database.transaction(
      (tx) => this.maps.readPublic(tx, organizationSlug, MAIN_SKILL_MAP),
      { readOnly: true, isolationLevel: "repeatable_read" }
    );
    // A stored version was validated on import; a document the current contract no longer reads
    // is served as absent so Web falls back to its bundled map instead of failing.
    const parsed = skillMapManifestV2Schema.safeParse(document);
    return publicSkillMapSchema.parse({
      organizationSlug,
      map: parsed.success ? parsed.data : null
    });
  }
}
