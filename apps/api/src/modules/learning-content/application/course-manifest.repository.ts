import type { CourseManifestV1 } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type ManifestCourseState = {
  courseId: string;
  status: string;
  draftVersionId: string | null;
  revision: number;
};

export abstract class CourseManifestRepository {
  abstract findState(transaction: DatabaseTransaction, organizationId: string, slug: string, lock: boolean): Promise<ManifestCourseState | null>;
  abstract requireCompatibleDraft(transaction: DatabaseTransaction, organizationId: string, versionId: string): Promise<void>;
  abstract requireCompatibleSkills(transaction: DatabaseTransaction, organizationId: string, manifest: CourseManifestV1): Promise<void>;
  abstract requireCompatibleActivityIdentities(transaction: DatabaseTransaction, organizationId: string, courseId: string, manifest: CourseManifestV1): Promise<void>;
  abstract replaceDraft(transaction: DatabaseTransaction, organizationId: string, courseId: string, versionId: string, userId: string, manifest: CourseManifestV1): Promise<{ revision: number; createdSkills: { id: string; key: string }[] }>;
  abstract exportVersion(transaction: DatabaseTransaction, organizationId: string, courseId: string, versionId: string): Promise<CourseManifestV1>;
  abstract isManifestVersion(transaction: DatabaseTransaction, organizationId: string, versionId: string): Promise<boolean>;
  abstract revision(transaction: DatabaseTransaction, organizationId: string, versionId: string): Promise<number | null>;
  abstract lockVersion(transaction: DatabaseTransaction, organizationId: string, versionId: string): Promise<void>;
  abstract cloneLatestPublished(transaction: DatabaseTransaction, organizationId: string, courseId: string, versionId: string): Promise<void>;
}
