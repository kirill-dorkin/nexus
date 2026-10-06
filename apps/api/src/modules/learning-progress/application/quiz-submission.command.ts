import type { DatabaseTransaction } from "@platform/database";
import type { CourseVersionActivity, Submission } from "@platform/contracts";
export abstract class QuizSubmissionCommand {
  abstract commitOwn(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activity: CourseVersionActivity,
    attemptKey: string,
    payload: Readonly<Record<string, unknown>>
  ): Promise<Submission>;
}
