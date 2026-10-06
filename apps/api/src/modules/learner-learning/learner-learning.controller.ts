import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  freeSelfEnrollmentRequestSchema,
  ownLearningListQuerySchema,
  organizationSlugSchema,
  resourceSlugSchema
} from "@platform/contracts";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { LearnerLearningService } from "./learner-learning.service";
@Controller("me/learning")
export class LearnerLearningController {
  constructor(private readonly learning: LearnerLearningService) {}
  @Get()
  @Header("Cache-Control", "no-store")
  list(@Query() query: unknown) {
    return this.learning.list(
      parseRequest(ownLearningListQuerySchema, query).after ?? null
    );
  }
  @Get(":organizationSlug/:offeringSlug")
  @Header("Cache-Control", "no-store")
  course(
    @Param("organizationSlug") organizationSlug: string,
    @Param("offeringSlug") offeringSlug: string
  ) {
    return this.learning.course(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(resourceSlugSchema, offeringSlug)
    );
  }
  @Post(":organizationSlug/:offeringSlug/enrollment")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  enroll(
    @Param("organizationSlug") organizationSlug: string,
    @Param("offeringSlug") offeringSlug: string,
    @Body() body: unknown
  ) {
    parseRequest(freeSelfEnrollmentRequestSchema, body);
    return this.learning.enroll(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(resourceSlugSchema, offeringSlug)
    );
  }
}
