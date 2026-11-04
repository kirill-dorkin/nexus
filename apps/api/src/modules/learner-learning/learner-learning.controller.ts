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
  checkQuizRequestSchema,
  submitAssignmentRequestSchema,
  ownLearningListQuerySchema,
  organizationSlugSchema,
  resourceSlugSchema
} from "@platform/contracts";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { RateLimit, RateLimitGuard } from "../../http/rate-limit";
import { parseRequest } from "../../http/validation";
import { LearnerAssignmentService } from "./learner-assignment.service";
import { LearnerLearningService } from "./learner-learning.service";
@Controller("me/learning")
export class LearnerLearningController {
  constructor(
    private readonly learning: LearnerLearningService,
    private readonly assignments: LearnerAssignmentService
  ) {}
  /** ADR-0073: the files of one try at a file assignment; answers with what to fix. */
  @Post(":organizationSlug/:offeringSlug/assignments/:activitySlug/submissions")
  @UseGuards(BrowserWriteOriginGuard, RateLimitGuard)
  @RateLimit("learning.assignment_submit")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  submitAssignment(
    @Param("organizationSlug") organizationSlug: string,
    @Param("offeringSlug") offeringSlug: string,
    @Param("activitySlug") activitySlug: string,
    @Body() body: unknown
  ) {
    return this.assignments.submit(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(resourceSlugSchema, offeringSlug),
      parseRequest(resourceSlugSchema, activitySlug),
      parseRequest(submitAssignmentRequestSchema, body)
    );
  }
  @Post(":organizationSlug/:offeringSlug/quiz/:activitySlug/check")
  @UseGuards(BrowserWriteOriginGuard, RateLimitGuard)
  @RateLimit("learning.quiz_check")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  checkQuiz(
    @Param("organizationSlug") organizationSlug: string,
    @Param("offeringSlug") offeringSlug: string,
    @Param("activitySlug") activitySlug: string,
    @Body() body: unknown
  ) {
    return this.learning.checkQuiz(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(resourceSlugSchema, offeringSlug),
      parseRequest(resourceSlugSchema, activitySlug),
      parseRequest(checkQuizRequestSchema, body)
    );
  }
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
  @Get(":organizationSlug/:offeringSlug/skills")
  @Header("Cache-Control", "no-store")
  skills(
    @Param("organizationSlug") organizationSlug: string,
    @Param("offeringSlug") offeringSlug: string
  ) {
    return this.learning.skills(
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
