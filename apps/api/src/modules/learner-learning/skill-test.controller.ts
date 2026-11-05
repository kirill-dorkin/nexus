import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  organizationSlugSchema,
  resourceSlugSchema,
  startSkillTestRequestSchema,
  submitSkillTestRequestSchema,
  uuidSchema
} from "@platform/contracts";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { RateLimit, RateLimitGuard } from "../../http/rate-limit";
import { parseRequest } from "../../http/validation";
import { LearnerSkillTestService } from "./learner-skill-test.service";

/** ADR-0075: skill tests and branch tests of the caller's own learning. */
@Controller("me")
export class SkillTestController {
  constructor(private readonly tests: LearnerSkillTestService) {}

  @Get("skills/:organizationSlug/tests")
  @Header("Cache-Control", "no-store")
  listOwn(@Param("organizationSlug") organizationSlug: string) {
    return this.tests.listOwn(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }

  @Post("learning/:organizationSlug/skills/:skillKey/tests")
  @UseGuards(BrowserWriteOriginGuard, RateLimitGuard)
  @RateLimit("learning.skill_test")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  startSkillTest(
    @Param("organizationSlug") organizationSlug: string,
    @Param("skillKey") skillKey: string,
    @Body() body: unknown
  ) {
    return this.tests.start(
      parseRequest(organizationSlugSchema, organizationSlug),
      { type: "skill", skillKey: parseRequest(resourceSlugSchema, skillKey) },
      parseRequest(startSkillTestRequestSchema, body).drawKey
    );
  }

  @Post("learning/:organizationSlug/skills/:skillKey/tests/:drawKey/submission")
  @UseGuards(BrowserWriteOriginGuard, RateLimitGuard)
  @RateLimit("learning.skill_test")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  submitSkillTest(
    @Param("organizationSlug") organizationSlug: string,
    @Param("skillKey") skillKey: string,
    @Param("drawKey") drawKey: string,
    @Body() body: unknown
  ) {
    return this.tests.submit(
      parseRequest(organizationSlugSchema, organizationSlug),
      { type: "skill", skillKey: parseRequest(resourceSlugSchema, skillKey) },
      parseRequest(uuidSchema, drawKey),
      parseRequest(submitSkillTestRequestSchema, body).answers
    );
  }

  @Post("learning/:organizationSlug/branches/:branchId/tests")
  @UseGuards(BrowserWriteOriginGuard, RateLimitGuard)
  @RateLimit("learning.skill_test")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  startBranchTest(
    @Param("organizationSlug") organizationSlug: string,
    @Param("branchId") branchId: string,
    @Body() body: unknown
  ) {
    return this.tests.start(
      parseRequest(organizationSlugSchema, organizationSlug),
      { type: "branch", branchId: parseRequest(resourceSlugSchema, branchId) },
      parseRequest(startSkillTestRequestSchema, body).drawKey
    );
  }

  @Post(
    "learning/:organizationSlug/branches/:branchId/tests/:drawKey/submission"
  )
  @UseGuards(BrowserWriteOriginGuard, RateLimitGuard)
  @RateLimit("learning.skill_test")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  submitBranchTest(
    @Param("organizationSlug") organizationSlug: string,
    @Param("branchId") branchId: string,
    @Param("drawKey") drawKey: string,
    @Body() body: unknown
  ) {
    return this.tests.submit(
      parseRequest(organizationSlugSchema, organizationSlug),
      { type: "branch", branchId: parseRequest(resourceSlugSchema, branchId) },
      parseRequest(uuidSchema, drawKey),
      parseRequest(submitSkillTestRequestSchema, body).answers
    );
  }
}
