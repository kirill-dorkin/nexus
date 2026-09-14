import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  createCourseRunRequestSchema,
  createDeliveryGroupRequestSchema,
  createEnrollmentRequestSchema,
  createGroupMembershipRequestSchema,
  createGroupSetRequestSchema,
  createLearningOfferingRequestSchema,
  uuidSchema,
  type CourseRun,
  type DeliveryGroup,
  type Enrollment,
  type GroupMembership,
  type GroupSet,
  type LearningOffering
} from "@platform/contracts";

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
}
