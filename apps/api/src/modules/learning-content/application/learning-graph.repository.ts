import type {
  CourseVersionActivity,
  CourseVersionSkill,
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
  abstract createSkill(
    transaction: DatabaseTransaction,
    skill: NewSkill
  ): Promise<Skill>;

  abstract attachSkill(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    skillId: string,
    position: number
  ): Promise<CourseVersionSkill | null>;

  abstract findAttachedSkill(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    skillId: string
  ): Promise<CourseVersionSkill | null>;

  abstract createActivity(
    transaction: DatabaseTransaction,
    activity: NewCourseVersionActivity
  ): Promise<CourseVersionActivity>;

  abstract findActivityVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    activityId: string
  ): Promise<CourseVersionActivity | null>;

  abstract activityAssessesSkill(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    skillId: string
  ): Promise<boolean>;

  abstract cloneLatestPublishedGraph(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string,
    targetCourseVersionId: string
  ): Promise<void>;
}
