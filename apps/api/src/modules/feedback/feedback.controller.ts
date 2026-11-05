import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import {
  createFeedbackReportRequestSchema,
  feedbackReportListQuerySchema,
  updateFeedbackReportRequestSchema,
  uuidSchema
} from "@platform/contracts";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { ExactWebOriginGuard } from "../../http/exact-web-origin.guard";
import { RateLimit, RateLimitGuard } from "../../http/rate-limit";
import { parseRequest } from "../../http/validation";
import type { PlatformPrincipalCarrier } from "../../request-context/platform-principal";
import { FeedbackApplicationService } from "./application/feedback.service";

/** `POST /v1/feedback`: a report from any learner page, session optional (ADR-0083). */
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedback: FeedbackApplicationService) {}

  @Post()
  @UseGuards(ExactWebOriginGuard, RateLimitGuard)
  @RateLimit("feedback.report")
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  submit(@Req() request: PlatformPrincipalCarrier, @Body() body: unknown) {
    return this.feedback.submit(
      parseRequest(createFeedbackReportRequestSchema, body),
      request.platformPrincipal?.userId ?? null
    );
  }
}

/** Studio «Отзывы»: owners and admins of the Organization. */
@Controller("organizations/:organizationId/feedback")
export class StudioFeedbackController {
  constructor(private readonly feedback: FeedbackApplicationService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list(@Param("organizationId") org: string, @Query() query: unknown) {
    return this.feedback.list(
      parseRequest(uuidSchema, org),
      parseRequest(feedbackReportListQuerySchema, query)
    );
  }

  @Patch(":reportId")
  @UseGuards(BrowserWriteOriginGuard)
  @Header("Cache-Control", "no-store")
  update(
    @Param("organizationId") org: string,
    @Param("reportId") report: string,
    @Body() body: unknown
  ) {
    return this.feedback.update(
      parseRequest(uuidSchema, org),
      parseRequest(uuidSchema, report),
      parseRequest(updateFeedbackReportRequestSchema, body)
    );
  }
}
