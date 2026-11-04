import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  correctAttendanceRequestSchema,
  createCourseRunRequestSchema,
  createDeliveryGroupRequestSchema,
  createEnrollmentRequestSchema,
  createGroupMembershipRequestSchema,
  createGroupSetRequestSchema,
  createLearningOfferingRequestSchema,
  listLearningOfferingsQuerySchema,
  createSessionRequestSchema,
  recordAttendanceRequestSchema,
  uuidSchema,
  updateLearningOfferingVisibilityRequestSchema,
  type Attendance,
  type CourseRun,
  type DeliveryGroup,
  type Enrollment,
  type GroupMembership,
  type GroupSet,
  type LearningOffering,
  type LearningOfferingList,
  type Session,
  retargetLearningOfferingRequestSchema
} from "@platform/contracts";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { LearningDeliveryApplicationService } from "./application/learning-delivery.service";

@Controller("organizations/:organizationId/offerings")
export class LearningDeliveryController {
  constructor(private readonly delivery: LearningDeliveryApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOffering(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<LearningOffering> {
    return this.delivery.createOffering(
      parseRequest(uuidSchema, organizationId),
      parseRequest(createLearningOfferingRequestSchema, body)
    );
  }

  @Get()
  @Header("Cache-Control", "no-store")
  listOfferings(
    @Param("organizationId") organizationId: string,
    @Query() query: unknown
  ): Promise<LearningOfferingList> {
    const parsed = parseRequest(listLearningOfferingsQuerySchema, query);
    return this.delivery.listOfferings(
      parseRequest(uuidSchema, organizationId),
      parsed.courseVersionId,
      parsed.after ?? null,
      parsed.scope ?? "version"
    );
  }

  @Get(":offeringId")
  getOffering(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string
  ): Promise<LearningOffering> {
    return this.delivery.getOffering(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId)
    );
  }

  @Patch(":offeringId/course-version")
  @UseGuards(BrowserWriteOriginGuard)
  retarget(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Body() body: unknown
  ): Promise<LearningOffering> {
    return this.delivery.retargetOffering(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(retargetLearningOfferingRequestSchema, body).courseVersionId
    );
  }

  @Patch(":offeringId/visibility")
  @UseGuards(BrowserWriteOriginGuard)
  setVisibility(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Body() body: unknown
  ): Promise<LearningOffering> {
    return this.delivery.setOfferingVisibility(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(updateLearningOfferingVisibilityRequestSchema, body)
        .visibility
    );
  }

  @Post(":offeringId/enrollments")
  @HttpCode(HttpStatus.CREATED)
  createEnrollment(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Body() body: unknown
  ): Promise<Enrollment> {
    return this.delivery.createEnrollment(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(createEnrollmentRequestSchema, body)
    );
  }

  @Post(":offeringId/runs")
  @HttpCode(HttpStatus.CREATED)
  createCourseRun(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Body() body: unknown
  ): Promise<CourseRun> {
    return this.delivery.createCourseRun(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(createCourseRunRequestSchema, body)
    );
  }

  @Get(":offeringId/runs/:courseRunId")
  getCourseRun(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string
  ): Promise<CourseRun> {
    return this.delivery.getCourseRun(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId)
    );
  }

  @Post(":offeringId/runs/:courseRunId/group-sets")
  @HttpCode(HttpStatus.CREATED)
  createGroupSet(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string,
    @Body() body: unknown
  ): Promise<GroupSet> {
    return this.delivery.createGroupSet(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId),
      parseRequest(createGroupSetRequestSchema, body)
    );
  }

  @Post(":offeringId/runs/:courseRunId/group-sets/:groupSetId/groups")
  @HttpCode(HttpStatus.CREATED)
  createGroup(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string,
    @Param("groupSetId") groupSetId: string,
    @Body() body: unknown
  ): Promise<DeliveryGroup> {
    return this.delivery.createGroup(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId),
      parseRequest(uuidSchema, groupSetId),
      parseRequest(createDeliveryGroupRequestSchema, body)
    );
  }

  @Post(
    ":offeringId/runs/:courseRunId/group-sets/:groupSetId/groups/:groupId/memberships"
  )
  @HttpCode(HttpStatus.CREATED)
  createGroupMembership(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string,
    @Param("groupSetId") groupSetId: string,
    @Param("groupId") groupId: string,
    @Body() body: unknown
  ): Promise<GroupMembership> {
    return this.delivery.createGroupMembership(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId),
      parseRequest(uuidSchema, groupSetId),
      parseRequest(uuidSchema, groupId),
      parseRequest(createGroupMembershipRequestSchema, body)
    );
  }

  @Post(":offeringId/runs/:courseRunId/sessions")
  @HttpCode(HttpStatus.CREATED)
  createSession(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string,
    @Body() body: unknown
  ): Promise<Session> {
    return this.delivery.createSession(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId),
      parseRequest(createSessionRequestSchema, body)
    );
  }

  @Get(":offeringId/runs/:courseRunId/sessions/:sessionId")
  getSession(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string,
    @Param("sessionId") sessionId: string
  ): Promise<Session> {
    return this.delivery.getSession(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId),
      parseRequest(uuidSchema, sessionId)
    );
  }

  @Post(":offeringId/runs/:courseRunId/sessions/:sessionId/attendances")
  @HttpCode(HttpStatus.CREATED)
  recordAttendance(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string,
    @Param("sessionId") sessionId: string,
    @Body() body: unknown
  ): Promise<Attendance> {
    return this.delivery.recordAttendance(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId),
      parseRequest(uuidSchema, sessionId),
      parseRequest(recordAttendanceRequestSchema, body)
    );
  }

  @Patch(
    ":offeringId/runs/:courseRunId/sessions/:sessionId/attendances/:attendanceId"
  )
  correctAttendance(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("courseRunId") courseRunId: string,
    @Param("sessionId") sessionId: string,
    @Param("attendanceId") attendanceId: string,
    @Body() body: unknown
  ): Promise<Attendance> {
    return this.delivery.correctAttendance(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, courseRunId),
      parseRequest(uuidSchema, sessionId),
      parseRequest(uuidSchema, attendanceId),
      parseRequest(correctAttendanceRequestSchema, body)
    );
  }
}
