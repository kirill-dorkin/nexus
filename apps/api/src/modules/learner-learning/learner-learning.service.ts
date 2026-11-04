import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  learnerCourseSkillsSchema,
  learnerLearningCourseSchema,
  ownLearningListSchema,
  type LearnerLearningCourse,
  type CheckQuizRequest,
  quizCheckResultSchema
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
import { OwnSkillProgressQuery } from "../learning-progress/application/own-skill-progress.query";
import { QuizSubmissionCommand } from "../learning-progress/application/quiz-submission.command";
import { LearningContentQuery } from "../learning-content/application/learning-content.query";
import { QuizValidationApplicationService } from "../learning-validation/application/quiz-validation.service";
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
    private readonly progress: CourseActivityProgressQuery,
    private readonly quizSubmissions: QuizSubmissionCommand,
    private readonly activityContent: LearningContentQuery,
    private readonly quiz: QuizValidationApplicationService,
    private readonly skillProgress: OwnSkillProgressQuery
  ) {}
  async checkQuiz(
    organizationSlug: string,
    offeringSlug: string,
    activitySlug: string,
    command: CheckQuizRequest
  ) {
    const { userId } = this.requestContext.requirePrincipal();
    const answer =
      command.answer.type === "quiz.multiple_choice"
        ? { ...command.answer, optionIds: [...command.answer.optionIds].sort() }
        : command.answer;
    try {
      const submission = await this.database.userTransaction(
        { userId },
        async (tx) => {
          const target = await this.quizTarget(
            tx,
            userId,
            organizationSlug,
            offeringSlug,
            activitySlug
          );
          await this.quiz.validateAnswer(
            tx,
            target.route.organizationId,
            target.activity,
            answer
          );
          return this.quizSubmissions.commitOwn(
            tx,
            target.route.organizationId,
            target.enrollment.id,
            target.activity,
            command.attemptKey,
            answer
          );
        }
      );
      const recorded = await this.database.userTransaction(
        { userId },
        async (tx) => {
          const target = await this.quizTarget(
            tx,
            userId,
            organizationSlug,
            offeringSlug,
            activitySlug
          );
          return this.quiz.recordOwn(
            tx,
            target.route.organizationId,
            target.enrollment.id,
            target.activity.id,
            submission.id
          );
        }
      );
      await this.quiz.normalize(recorded);
      return quizCheckResultSchema.parse({
        attemptNumber: recorded.attemptNumber,
        outcome: recorded.result.outcome,
        score: recorded.result.score,
        feedback:
          recorded.result.outcome === "passed"
            ? "Ответ соответствует условию задания."
            : "Вернитесь к конспекту и внимательно проверьте условие задания."
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        ["23505", "40001", "40P01"].includes(String(error.code))
      )
        throw new ConflictException(
          "Attempt key or learning state changed. Retry the same action."
        );
      throw error;
    }
  }
  private async quizTarget(
    tx: DatabaseTransaction,
    userId: string,
    organizationSlug: string,
    offeringSlug: string,
    activitySlug: string
  ) {
    await this.identity.requireActiveUser(tx, userId, true);
    const route = await this.delivery.resolve(
      tx,
      organizationSlug,
      offeringSlug
    );
    if (!route) throw new NotFoundException("Quiz not found.");
    await tx.client.query("SELECT set_config('app.organization_id',$1,true)", [
      route.organizationId
    ]);
    const org = await this.organizations.read(
      tx,
      route.organizationId,
      userId,
      true
    );
    if (!org) throw new NotFoundException("Quiz not found.");
    if (org.membershipStatus !== "active")
      throw new ConflictException("Active membership is required.");
    if (!(await this.delivery.offering(tx, route, true)))
      throw new NotFoundException("Quiz not found.");
    const lessons = await this.content.lessons(
      tx,
      route.organizationId,
      route.courseVersionId,
      true
    );
    const ref = lessons
      ?.flatMap((l) => l.activities)
      .find((a) => a.slug === activitySlug);
    if (!ref) throw new NotFoundException("Quiz not found.");
    const enrollment = await this.delivery.ownEnrollment(
      tx,
      route,
      userId,
      true
    );
    if (enrollment?.status !== "active")
      throw new ConflictException("Active own enrollment is required.");
    const activity = await this.activityContent.requireActivityVersionById(
      tx,
      route.organizationId,
      ref.activityVersionId
    );
    return { route, enrollment, activity };
  }
  async course(organizationSlug: string, offeringSlug: string) {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      (tx) => this.compose(tx, userId, organizationSlug, offeringSlug, false),
      snapshot
    );
  }
  async skills(organizationSlug: string, offeringSlug: string) {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      async (tx) => {
        await this.identity.requireActiveUser(tx, userId);
        const route = await this.delivery.resolve(
          tx,
          organizationSlug,
          offeringSlug
        );
        if (!route) throw new NotFoundException("Learning course not found.");
        await tx.client.query(
          "SELECT set_config('app.organization_id',$1,true)",
          [route.organizationId]
        );
        const organization = await this.organizations.read(
          tx,
          route.organizationId,
          userId,
          false
        );
        if (
          organization?.membershipStatus !== "active" ||
          !(await this.delivery.offering(tx, route, false))
        )
          throw new NotFoundException("Learning course not found.");
        const enrollment = await this.delivery.ownEnrollment(tx, route, userId);
        if (
          enrollment?.status !== "active" &&
          enrollment?.status !== "completed"
        )
          throw new NotFoundException("Own enrollment not found.");
        return learnerCourseSkillsSchema.parse({
          skills: await this.skillProgress.ownSkills(
            tx,
            route.organizationId,
            enrollment.id
          )
        });
      },
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
            addresses.length > 100
              ? (addresses[99]?.enrollmentId ?? null)
              : null
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
      // Work on any published version of the same Activities counts (ADR-0062).
      const lineage = await this.content.activityLineage(
        tx,
        route.organizationId,
        [
          ...new Set(
            structure.flatMap((l) => l.activities.map((a) => a.activityId))
          )
        ]
      );
      const ids = [
        ...new Set([
          ...structure.flatMap((l) =>
            l.activities.map((a) => a.activityVersionId)
          ),
          ...lineage.keys()
        ])
      ];
      progress = deriveCourseProgress(
        structure,
        await this.progress.observations(
          tx,
          route.organizationId,
          enrollment.id,
          ids
        ),
        lineage
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
