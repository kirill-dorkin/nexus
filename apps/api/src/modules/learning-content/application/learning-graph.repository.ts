import type {
  CourseVersionActivity,
  CourseVersionSkill,
  GuidedBuildAuthoring,
  GuidedBuildProtectedDefinition,
  Skill
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewSkill = Readonly<{
  id: string;
  organizationId: string;
  key: string;
  title: string;
  description: string | null;
  createdByUserId: string;
}>;

export type CourseVersionSkillRemediation = Readonly<{
  organizationId: string;
  courseVersionId: string;
  skillId: string;
  activityId: string;
  position: number;
}>;

export type NewCourseVersionActivity = Readonly<{
  id: string;
  activityId: string;
  organizationId: string;
  courseId: string;
  courseVersionId: string;
  slug: string;
  activityType: string;
  title: string;
  instructions: string | null;
  config: Readonly<Record<string, unknown>>;
  position: number;
  skillIds: readonly string[];
  createdByUserId: string;
}>;

export abstract class LearningGraphRepository {
  abstract createSkill(transaction: DatabaseTransaction, skill: NewSkill): Promise<Skill>;
  abstract attachSkill(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, skillId: string, position: number): Promise<CourseVersionSkill | null>;
  abstract findAttachedSkill(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, skillId: string): Promise<CourseVersionSkill | null>;
  abstract listCourseVersionSkills(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string): Promise<readonly CourseVersionSkill[]>;
  abstract createActivity(transaction: DatabaseTransaction, activity: NewCourseVersionActivity): Promise<CourseVersionActivity>;
  abstract createGuidedBuildDefinition(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string, definition: GuidedBuildAuthoring): Promise<void>;
  abstract findGuidedBuildDefinition(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string): Promise<GuidedBuildProtectedDefinition | null>;
  abstract findActivityVersion(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, activityId: string): Promise<CourseVersionActivity | null>;
  abstract findActivityVersionById(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string): Promise<CourseVersionActivity | null>;
  abstract listCourseVersionActivities(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string): Promise<readonly CourseVersionActivity[]>;
  abstract listCourseVersionSkillRemediations(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string): Promise<readonly CourseVersionSkillRemediation[]>;
  abstract replaceCourseVersionSkillRemediations(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, skillId: string, activityIds: readonly string[]): Promise<readonly CourseVersionSkillRemediation[]>;
  abstract activityAssessesSkill(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string, skillId: string): Promise<boolean>;
  abstract cloneLatestPublishedGraph(transaction: DatabaseTransaction, organizationId: string, courseId: string, targetCourseVersionId: string): Promise<void>;
}
