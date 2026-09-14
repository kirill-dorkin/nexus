import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  Attendance,
  CorrectAttendanceRequest,
  CourseRun,
  CreateCourseRunRequest,
  CreateDeliveryGroupRequest,
  CreateEnrollmentRequest,
  CreateGroupMembershipRequest,
  CreateGroupSetRequest,
  CreateLearningOfferingRequest,
  CreateSessionRequest,
  DeliveryGroup,
  Enrollment,
  GroupMembership,
  GroupSet,
  LearningOffering,
  RecordAttendanceRequest,
  Session
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { EntitlementQuery } from "../../commerce/application/entitlement.query";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { LearningContentApplicationService } from "../../learning-content/application/learning-content.service";
import { OrganizationsApplicationService } from "../../organizations/application/organizations.service";
import { LearningDeliveryRepository } from "./learning-delivery.repository";

export type ActiveEnrollmentContext = Readonly<{
  enrollment: Enrollment;
  offering: LearningOffering;
}>;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function courseScope(organizationId: string, courseId: string) {
  return {
    organizationId,
    type: "course" as const,
    id: courseId
  };
}

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

@Injectable()
export class LearningDeliveryApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly delivery: LearningDeliveryRepository,
    private readonly content: LearningContentApplicationService,
    private readonly organizations: OrganizationsApplicationService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly entitlements: EntitlementQuery,
    private readonly outbox: OutboxRepository
  ) {}

  async createOffering(
    organizationId: string,
    command: CreateLearningOfferingRequest
  ): Promise<LearningOffering> {
    const context = this.requestContext.tenantContext(organizationId);
    const offeringId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        const version = await this.content.requirePublishedVersion(
          transaction,
          organizationId,
          command.courseVersionId
        );
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          courseScope(organizationId, version.courseId)
        );

        const offering = await this.delivery.createOffering(transaction, {
          id: offeringId,
          organizationId,
          courseVersionId: command.courseVersionId,
          slug: command.slug,
          name: command.name,
          deliveryMode: command.deliveryMode,
          accessMode: command.accessMode,
          startsAt: command.startsAt ?? null,
          endsAt: command.endsAt ?? null,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "learning_offering.created",
          eventVersion: 1,
          aggregateType: "learning_offering",
          aggregateId: offering.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId: offering.id,
            courseId: version.courseId,
            courseVersionId: version.id,
            deliveryMode: offering.deliveryMode,
            accessMode: offering.accessMode
          }
        });

        return offering;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "A learning offering with this slug already exists."
        );
      }
      throw error;
    }
  }

  async getOffering(
    organizationId: string,
    offeringId: string
  ): Promise<LearningOffering> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "offering.read",
        offeringScope(organizationId, offeringId)
      );

      const offering = await this.delivery.findOffering(
        transaction,
        organizationId,
        offeringId
      );
      if (offering === null) {
        throw new NotFoundException("Learning offering not found.");
      }
      return offering;
    });
  }

  async createEnrollment(
    organizationId: string,
    offeringId: string,
    command: CreateEnrollmentRequest
  ): Promise<Enrollment> {
    const context = this.requestContext.tenantContext(organizationId);
    const enrollmentId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.identity.requireActiveUser(transaction, command.userId);

        const offering = await this.delivery.findOffering(
          transaction,
          organizationId,
          offeringId
        );
        if (offering === null) {
          throw new NotFoundException("Learning offering not found.");
        }
        if (offering.status !== "open") {
          throw new ConflictException("Only an open learning offering accepts enrollments.");
        }

        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "enrollment.manage",
          offeringScope(organizationId, offeringId)
        );
        await this.organizations.requireActiveMembership(
          transaction,
          organizationId,
          command.userId
        );

        if (offering.accessMode === "entitlement_required") {
          await this.entitlements.requireEffectiveOfferingEntitlement(
            transaction,
            organizationId,
            command.userId,
            offeringId
          );
        }

        const enrollment = await this.delivery.createEnrollment(transaction, {
          id: enrollmentId,
          organizationId,
          offeringId,
          userId: command.userId,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "enrollment.created",
          eventVersion: 1,
          aggregateType: "enrollment",
          aggregateId: enrollment.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            enrollmentId: enrollment.id,
            offeringId,
            userId: command.userId
          }
        });

        return enrollment;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "This identity is already enrolled in the learning offering."
        );
      }
      throw error;
    }
  }

  async createCourseRun(
    organizationId: string,
    offeringId: string,
    command: CreateCourseRunRequest
  ): Promise<CourseRun> {
    const context = this.requestContext.tenantContext(organizationId);
    const courseRunId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        const offering = await this.delivery.findOffering(
          transaction,
          organizationId,
          offeringId
        );
        if (offering === null) {
          throw new NotFoundException("Learning offering not found.");
        }

        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          offeringScope(organizationId, offeringId)
        );

        if (offering.status !== "open") {
          throw new ConflictException("Course runs require an open learning offering.");
        }
        if (offering.deliveryMode !== "cohort") {
          throw new ConflictException("Course runs require a cohort learning offering.");
        }
        if (
          offering.startsAt !== null &&
          new Date(command.startsAt).getTime() < new Date(offering.startsAt).getTime()
        ) {
          throw new ConflictException("Course run cannot start before its offering window.");
        }
        if (
          offering.endsAt !== null &&
          new Date(command.endsAt).getTime() > new Date(offering.endsAt).getTime()
        ) {
          throw new ConflictException("Course run cannot end after its offering window.");
        }

        const courseRun = await this.delivery.createCourseRun(transaction, {
          id: courseRunId,
          organizationId,
          offeringId,
          slug: command.slug,
          name: command.name,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "course_run.created",
          eventVersion: 1,
          aggregateType: "course_run",
          aggregateId: courseRun.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId,
            courseRunId: courseRun.id,
            startsAt: courseRun.startsAt,
            endsAt: courseRun.endsAt
          }
        });

        return courseRun;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "A course run with this slug already exists in the learning offering."
        );
      }
      throw error;
    }
  }

  async getCourseRun(
    organizationId: string,
    offeringId: string,
    courseRunId: string
  ): Promise<CourseRun> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "offering.read",
        offeringScope(organizationId, offeringId)
      );

      const courseRun = await this.delivery.findCourseRun(
        transaction,
        organizationId,
        courseRunId
      );
      if (courseRun === null || courseRun.offeringId !== offeringId) {
        throw new NotFoundException("Course run not found.");
      }
      return courseRun;
    });
  }

  async createGroupSet(
    organizationId: string,
    offeringId: string,
    courseRunId: string,
    command: CreateGroupSetRequest
  ): Promise<GroupSet> {
    const context = this.requestContext.tenantContext(organizationId);
    const groupSetId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          offeringScope(organizationId, offeringId)
        );

        const courseRun = await this.delivery.findCourseRun(
          transaction,
          organizationId,
          courseRunId
        );
        if (courseRun === null || courseRun.offeringId !== offeringId) {
          throw new NotFoundException("Course run not found.");
        }

        const groupSet = await this.delivery.createGroupSet(transaction, {
          id: groupSetId,
          organizationId,
          courseRunId,
          slug: command.slug,
          name: command.name,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "group_set.created",
          eventVersion: 1,
          aggregateType: "group_set",
          aggregateId: groupSet.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId,
            courseRunId,
            groupSetId: groupSet.id
          }
        });

        return groupSet;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "A group set with this slug already exists in the course run."
        );
      }
      throw error;
    }
  }

  async createGroup(
    organizationId: string,
    offeringId: string,
    courseRunId: string,
    groupSetId: string,
    command: CreateDeliveryGroupRequest
  ): Promise<DeliveryGroup> {
    const context = this.requestContext.tenantContext(organizationId);
    const groupId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          offeringScope(organizationId, offeringId)
        );

        const courseRun = await this.delivery.findCourseRun(
          transaction,
          organizationId,
          courseRunId
        );
        if (courseRun === null || courseRun.offeringId !== offeringId) {
          throw new NotFoundException("Course run not found.");
        }
        const groupSet = await this.delivery.findGroupSet(
          transaction,
          organizationId,
          groupSetId
        );
        if (groupSet === null || groupSet.courseRunId !== courseRunId) {
          throw new NotFoundException("Group set not found.");
        }

        const group = await this.delivery.createGroup(transaction, {
          id: groupId,
          organizationId,
          groupSetId,
          slug: command.slug,
          name: command.name,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "group.created",
          eventVersion: 1,
          aggregateType: "group",
          aggregateId: group.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId,
            courseRunId,
            groupSetId,
            groupId: group.id
          }
        });

        return group;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "A group with this slug already exists in the group set."
        );
      }
      throw error;
    }
  }

  async createGroupMembership(
    organizationId: string,
    offeringId: string,
    courseRunId: string,
    groupSetId: string,
    groupId: string,
    command: CreateGroupMembershipRequest
  ): Promise<GroupMembership> {
    const context = this.requestContext.tenantContext(organizationId);
    const membershipId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          offeringScope(organizationId, offeringId)
        );

        const courseRun = await this.delivery.findCourseRun(
          transaction,
          organizationId,
          courseRunId
        );
        if (courseRun === null || courseRun.offeringId !== offeringId) {
          throw new NotFoundException("Course run not found.");
        }
        const groupSet = await this.delivery.findGroupSet(
          transaction,
          organizationId,
          groupSetId
        );
        if (groupSet === null || groupSet.courseRunId !== courseRunId) {
          throw new NotFoundException("Group set not found.");
        }
        const group = await this.delivery.findGroup(
          transaction,
          organizationId,
          groupId
        );
        if (group === null || group.groupSetId !== groupSetId) {
          throw new NotFoundException("Group not found.");
        }
        const enrollment = await this.delivery.findEnrollment(
          transaction,
          organizationId,
          command.enrollmentId
        );
        if (enrollment === null) {
          throw new NotFoundException("Enrollment not found.");
        }
        if (enrollment.status !== "active") {
          throw new ConflictException("Only an active enrollment can join a group.");
        }
        if (enrollment.offeringId !== offeringId) {
          throw new ConflictException(
            "Group membership requires an enrollment from the same learning offering."
          );
        }

        const membership = await this.delivery.createGroupMembership(transaction, {
          id: membershipId,
          organizationId,
          groupSetId,
          groupId,
          enrollmentId: command.enrollmentId,
          assignedByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "group_membership.assigned",
          eventVersion: 1,
          aggregateType: "group_membership",
          aggregateId: membership.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId,
            courseRunId,
            groupSetId,
            groupId,
            enrollmentId: command.enrollmentId,
            groupMembershipId: membership.id
          }
        });

        return membership;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "This enrollment already has an active group in the group set."
        );
      }
      throw error;
    }
  }

  async createSession(
    organizationId: string,
    offeringId: string,
    courseRunId: string,
    command: CreateSessionRequest
  ): Promise<Session> {
    const context = this.requestContext.tenantContext(organizationId);
    const sessionId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          offeringScope(organizationId, offeringId)
        );

        const courseRun = await this.delivery.findCourseRun(
          transaction,
          organizationId,
          courseRunId
        );
        if (courseRun === null || courseRun.offeringId !== offeringId) {
          throw new NotFoundException("Course run not found.");
        }

        if (
          new Date(command.startsAt).getTime() < new Date(courseRun.startsAt).getTime()
        ) {
          throw new ConflictException("Session cannot start before its course run.");
        }
        if (
          new Date(command.endsAt).getTime() > new Date(courseRun.endsAt).getTime()
        ) {
          throw new ConflictException("Session cannot end after its course run.");
        }

        if (command.groupId !== null) {
          const group = await this.delivery.findGroup(
            transaction,
            organizationId,
            command.groupId
          );
          if (group === null) {
            throw new NotFoundException("Group not found.");
          }
          const groupSet = await this.delivery.findGroupSet(
            transaction,
            organizationId,
            group.groupSetId
          );
          if (groupSet === null || groupSet.courseRunId !== courseRunId) {
            throw new NotFoundException("Group not found.");
          }
        }

        const session = await this.delivery.createSession(transaction, {
          id: sessionId,
          organizationId,
          courseRunId,
          groupId: command.groupId,
          slug: command.slug,
          name: command.name,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "session.created",
          eventVersion: 1,
          aggregateType: "session",
          aggregateId: session.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId,
            courseRunId,
            sessionId: session.id,
            groupId: session.groupId,
            startsAt: session.startsAt,
            endsAt: session.endsAt
          }
        });

        return session;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "A session with this slug already exists in the course run."
        );
      }
      throw error;
    }
  }

  async getSession(
    organizationId: string,
    offeringId: string,
    courseRunId: string,
    sessionId: string
  ): Promise<Session> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "offering.read",
        offeringScope(organizationId, offeringId)
      );

      const courseRun = await this.delivery.findCourseRun(
        transaction,
        organizationId,
        courseRunId
      );
      if (courseRun === null || courseRun.offeringId !== offeringId) {
        throw new NotFoundException("Course run not found.");
      }

      const session = await this.delivery.findSession(
        transaction,
        organizationId,
        sessionId
      );
      if (session === null || session.courseRunId !== courseRunId) {
        throw new NotFoundException("Session not found.");
      }
      return session;
    });
  }

  async recordAttendance(
    organizationId: string,
    offeringId: string,
    courseRunId: string,
    sessionId: string,
    command: RecordAttendanceRequest
  ): Promise<Attendance> {
    const context = this.requestContext.tenantContext(organizationId);
    const attendanceId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "offering.manage",
          offeringScope(organizationId, offeringId)
        );

        const courseRun = await this.delivery.findCourseRun(
          transaction,
          organizationId,
          courseRunId
        );
        if (courseRun === null || courseRun.offeringId !== offeringId) {
          throw new NotFoundException("Course run not found.");
        }

        const session = await this.delivery.findSession(
          transaction,
          organizationId,
          sessionId
        );
        if (session === null || session.courseRunId !== courseRunId) {
          throw new NotFoundException("Session not found.");
        }

        const enrollment = await this.delivery.findEnrollment(
          transaction,
          organizationId,
          command.enrollmentId
        );
        if (enrollment === null) {
          throw new NotFoundException("Enrollment not found.");
        }
        if (enrollment.offeringId !== offeringId) {
          throw new ConflictException(
            "Attendance requires an enrollment from the session course run offering."
          );
        }
        if (
          new Date(enrollment.enrolledAt).getTime() >
          new Date(session.startsAt).getTime()
        ) {
          throw new ConflictException(
            "Attendance requires enrollment by the session start."
          );
        }

        if (session.groupId !== null) {
          const isGroupMember = await this.delivery.hasGroupMembershipAt(
            transaction,
            organizationId,
            session.groupId,
            enrollment.id,
            session.startsAt
          );
          if (!isGroupMember) {
            throw new ConflictException(
              "Group-scoped attendance requires group membership at session start."
            );
          }
        }

        const attendance = await this.delivery.createAttendance(transaction, {
          id: attendanceId,
          organizationId,
          sessionId,
          enrollmentId: enrollment.id,
          status: command.status,
          recordedByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "attendance.recorded",
          eventVersion: 1,
          aggregateType: "attendance",
          aggregateId: attendance.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            offeringId,
            courseRunId,
            sessionId,
            attendanceId: attendance.id,
            enrollmentId: attendance.enrollmentId,
            status: attendance.status
          }
        });

        return attendance;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "Attendance is already recorded for this enrollment and session."
        );
      }
      throw error;
    }
  }

  async correctAttendance(
    organizationId: string,
    offeringId: string,
    courseRunId: string,
    sessionId: string,
    attendanceId: string,
    command: CorrectAttendanceRequest
  ): Promise<Attendance> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "offering.manage",
        offeringScope(organizationId, offeringId)
      );

      const courseRun = await this.delivery.findCourseRun(
        transaction,
        organizationId,
        courseRunId
      );
      if (courseRun === null || courseRun.offeringId !== offeringId) {
        throw new NotFoundException("Course run not found.");
      }

      const session = await this.delivery.findSession(
        transaction,
        organizationId,
        sessionId
      );
      if (session === null || session.courseRunId !== courseRunId) {
        throw new NotFoundException("Session not found.");
      }

      const attendance = await this.delivery.findAttendance(
        transaction,
        organizationId,
        attendanceId
      );
      if (attendance === null || attendance.sessionId !== sessionId) {
        throw new NotFoundException("Attendance not found.");
      }

      if (attendance.status === command.status) {
        return attendance;
      }

      const corrected = await this.delivery.updateAttendanceStatus(
        transaction,
        organizationId,
        attendanceId,
        command.status,
        context.userId
      );

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "attendance.corrected",
        eventVersion: 1,
        aggregateType: "attendance",
        aggregateId: corrected.id,
        actorUserId: context.userId,
        payload: {
          organizationId,
          offeringId,
          courseRunId,
          sessionId,
          attendanceId: corrected.id,
          enrollmentId: corrected.enrollmentId,
          previousStatus: attendance.status,
          status: corrected.status
        }
      });

      return corrected;
    });
  }

  async requireActiveEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<ActiveEnrollmentContext> {
    const enrollment = await this.delivery.findEnrollment(
      transaction,
      organizationId,
      enrollmentId
    );
    if (enrollment === null) {
      throw new NotFoundException("Enrollment not found.");
    }
    if (enrollment.status !== "active") {
      throw new ConflictException("Only an active enrollment can create attempts.");
    }

    const offering = await this.delivery.findOffering(
      transaction,
      organizationId,
      enrollment.offeringId
    );
    if (offering === null) {
      throw new NotFoundException("Learning offering not found.");
    }

    return { enrollment, offering };
  }
}
