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
  createEnrollmentRequestSchema,
  createLearningOfferingRequestSchema,
  uuidSchema,
  type Enrollment,
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
}
