import type { Assignment } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewAssignment = Readonly<{
  id: string;
  organizationId: string;
  offeringId: string;
  activityVersionId: string;
  slug: string;
  name: string;
  audienceType: Assignment["audience"]["type"];
  courseRunId: string | null;
  groupId: string | null;
  enrollmentId: string | null;
  availableAt: string | null;
  dueAt: string | null;
  createdByUserId: string;
}>;

export abstract class AssignmentRepository {
  abstract createAssignment(
    transaction: DatabaseTransaction,
    assignment: NewAssignment
  ): Promise<Assignment>;

  abstract findAssignment(
    transaction: DatabaseTransaction,
    organizationId: string,
    assignmentId: string
  ): Promise<Assignment | null>;

  abstract cancelAssignment(
    transaction: DatabaseTransaction,
    organizationId: string,
    assignmentId: string,
    cancelledByUserId: string
  ): Promise<Assignment | null>;
}
