import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  learnerLearningCourseSchema,
  ownLearningListSchema,
  type LearnerLearningCourse
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { DatabaseService } from "../../database/database.service";
import { RequestContextService } from "../../request-context/request-context.service";
import { IdentityApplicationService } from "../identity/application/identity.service";
import { LearningEntryQuery } from "../organizations/application/learning-entry.query";
import { FreeLearningDeliveryPort } from "../learning-delivery/application/free-learning-delivery.port";
import { PublicLearningContentQuery } from "../learning-content/application/public-learning-content.query";
import { LearnerCourseContentQuery } from "../learning-content/application/learner-course-content.query";
import { CourseActivityProgressQuery } from "../learning-progress/application/course-activity-progress.query";
import { deriveCourseProgress } from "./domain/course-progress.policy";
const snapshot = { readOnly: true, isolationLevel: "repeatable_read" as const };
@Injectable()
export class LearnerLearningService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly organizations: LearningEntryQuery,
    private readonly delivery: FreeLearningDeliveryPort,
    private readonly publicContent: PublicLearningContentQuery,
    private readonly content: LearnerCourseContentQuery,
    private readonly progress: CourseActivityProgressQuery
  ) {}
  async course(organizationSlug: string, offeringSlug: string) {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      (tx) => this.compose(tx, userId, organizationSlug, offeringSlug, false),
      snapshot
    );
  }
  async enroll(organizationSlug: string, offeringSlug: string) {
    const { userId } = this.requestContext.requirePrincipal();
    try {
      return await this.database.userTransaction({ userId }, (tx) =>
        this.compose(tx, userId, organizationSlug, offeringSlug, true)
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "40001" || error.code === "40P01")
      )
        throw new ConflictException({
          code: "learner_entry_retry",
          message: "Learning state changed concurrently. Retry the same action."
        });
      throw error;
    }
  }
  async list(after: string | null) {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      async (tx) => {
        await this.identity.requireActiveUser(tx, userId);
        const addresses = await this.delivery.listOwn(tx, after);
        const courses: LearnerLearningCourse[] = [];
        for (const address of addresses.slice(0, 100)) {
          try {
            const course = await this.compose(
              tx,
              userId,
              address.organizationSlug,
              address.offeringSlug,
              false
            );
            if (
              course.progress &&
              (course.entry.enrollmentStatus === "active" ||
                course.entry.enrollmentStatus === "completed")
            )
              courses.push(course);
          } catch (error) {
            if (!(error instanceof NotFoundException)) throw error;
          }
        }
        return ownLearningListSchema.parse({
          courses,
          nextCursor:
            addresses.length > 100 ? addresses[99]!.enrollmentId : null
        });
      },
      snapshot
    );
  }
  private async compose(
    tx: DatabaseTransaction,
    userId: string,
    organizationSlug: string,
    offeringSlug: string,
    enroll: boolean
  ) {
    await this.identity.requireActiveUser(tx, userId, enroll);
    const route = await this.delivery.resolve(
      tx,
      organizationSlug,
      offeringSlug
    );
    if (!route) throw new NotFoundException("Learning course not found.");
    await tx.client.query("SELECT set_config('app.organization_id',$1,true)", [
      route.organizationId
    ]);
    const organization = await this.organizations.read(
      tx,
      route.organizationId,
      userId,
      enroll
    );
    if (!organization)
      throw new NotFoundException("Learning course not found.");
    if (enroll && organization.membershipStatus !== "active")
      throw new ConflictException(
        "An active organization membership is required."
      );
    const offering = await this.delivery.offering(tx, route, enroll);
    if (!offering) throw new NotFoundException("Learning course not found.");
    const structure = await this.content.lessons(
      tx,
      route.organizationId,
      route.courseVersionId,
      enroll
    );
    const course = await this.publicContent.readCourse(
      tx,
      organizationSlug,
      offeringSlug
    );
    if (!structure || !course)
      throw new NotFoundException("Learning course not found.");
    const enrollment =
      organization.membershipStatus === "active"
        ? enroll
          ? await this.delivery.enrollSelf(tx, route, userId)
          : await this.delivery.ownEnrollment(tx, route, userId)
        : null;
    let progress = null;
    if (
      enrollment &&
      (enrollment.status === "active" || enrollment.status === "completed")
    ) {
      const ids = [
        ...new Set(
          structure.flatMap((l) => l.activities.map((a) => a.activityVersionId))
        )
      ];
      progress = deriveCourseProgress(
        structure,
        await this.progress.observations(
          tx,
          route.organizationId,
          enrollment.id,
          ids
        )
      );
    }
    return learnerLearningCourseSchema.parse({
      organization: { slug: organization.slug, name: organization.name },
      offering: { slug: offering.slug, name: offering.name },
      course,
      entry: {
        customerEntryPolicy: organization.customerEntryPolicy,
        membershipStatus: organization.membershipStatus,
        enrollmentStatus: enrollment?.status ?? null
      },
      progress
    });
  }
}
