import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
  UseGuards
} from "@nestjs/common";
import { learningAnalyticsBatchSchema } from "@platform/contracts";

import {
  optionalConfiguredWebOrigin,
  parseExactHttpOrigin
} from "../../http/web-app-origin";
import { RateLimit, RateLimitGuard } from "../../http/rate-limit";
import { parseRequest } from "../../http/validation";
import { LearningAnalyticsService } from "./learning-analytics.service";

/** Lesson pages report steps and active time here (ADR-0084). Only the site itself may report. */
@Controller("analytics")
export class LearningAnalyticsController {
  constructor(private readonly analytics: LearningAnalyticsService) {}

  @Post("learning")
  @UseGuards(RateLimitGuard)
  @RateLimit("analytics.learning")
  @HttpCode(HttpStatus.NO_CONTENT)
  async receive(
    @Headers("origin") origin: string | undefined,
    @Body() body: unknown
  ): Promise<void> {
    let expected: string | null;
    try {
      expected = optionalConfiguredWebOrigin();
    } catch {
      expected = null;
    }
    if (expected === null)
      throw new ServiceUnavailableException(
        "WEB_APP_ORIGIN is not configured."
      );
    if (origin === undefined || parseExactHttpOrigin(origin) !== expected)
      throw new ForbiddenException("Analytics origin is not allowed.");
    await this.analytics.record(
      parseRequest(learningAnalyticsBatchSchema, body)
    );
  }
}
