import type { SkillMapManifestV2 } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type SkillMapState = {
  skillMapId: string;
  latestVersionNumber: number | null;
};

export type SkillMapLessonLink = { course: string; slug: string };

/**
 * Storage of the skill map aggregate (ADR-0078, migration 000051). No row locks: the runtime role
 * may not lock skill_maps. Two concurrent applies of the same expected version collide on the
 * unique version number, and the second gets a conflict.
 */
export abstract class SkillMapRepository {
  abstract findState(
    tx: DatabaseTransaction,
    organizationId: string,
    mapSlug: string
  ): Promise<SkillMapState | null>;
  /** Keys of the list that are not Skills of the organization. */
  abstract missingSkillKeys(
    tx: DatabaseTransaction,
    organizationId: string,
    keys: readonly string[]
  ): Promise<string[]>;
  /** Links whose lesson is not in a published version of its course. */
  abstract unpublishedLessons(
    tx: DatabaseTransaction,
    organizationId: string,
    links: readonly SkillMapLessonLink[]
  ): Promise<SkillMapLessonLink[]>;
  abstract createMap(
    tx: DatabaseTransaction,
    input: { organizationId: string; slug: string; userId: string }
  ): Promise<string>;
  /** Writes the next version with its prerequisites as a draft, then publishes it. */
  abstract publishVersion(
    tx: DatabaseTransaction,
    input: {
      organizationId: string;
      skillMapId: string;
      versionNumber: number;
      userId: string;
      manifest: SkillMapManifestV2;
    }
  ): Promise<{ versionId: string; prerequisites: number }>;
  /** The latest published document of an active organization's map, or null. Public, no tenant. */
  abstract readPublic(
    tx: DatabaseTransaction,
    organizationSlug: string,
    mapSlug: string
  ): Promise<unknown>;
}
