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
  studioEmptyRequestSchema,
  studioListQuerySchema,
  studioPublishRequestSchema,
  uuidSchema
} from "@platform/contracts";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { LearningContentApplicationService } from "./application/learning-content.service";
import { StudioApplicationService } from "./application/studio.service";
@Controller("organizations/:organizationId/studio/courses")
export class StudioController {
  constructor(
    private readonly studio: StudioApplicationService,
    private readonly content: LearningContentApplicationService
  ) {}
  @Get()
  @Header("Cache-Control", "no-store")
  list(@Param("organizationId") org: string, @Query() query: unknown) {
    return this.studio.list(
      parseRequest(uuidSchema, org),
      parseRequest(studioListQuerySchema, query).after ?? null
    );
  }
  @Get(":courseId")
  @Header("Cache-Control", "no-store")
  draft(
    @Param("organizationId") org: string,
    @Param("courseId") course: string
  ) {
    return this.studio.draft(
      parseRequest(uuidSchema, org),
      parseRequest(uuidSchema, course)
    );
  }
  @Post(":courseId/draft")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  createDraft(
    @Param("organizationId") org: string,
    @Param("courseId") course: string,
    @Body() body: unknown
  ) {
    parseRequest(studioEmptyRequestSchema, body);
    return this.studio.createDraft(
      parseRequest(uuidSchema, org),
      parseRequest(uuidSchema, course)
    );
  }
  @Post(":courseId/publish")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  publish(
    @Param("organizationId") org: string,
    @Param("courseId") course: string,
    @Body() body: unknown
  ) {
    const command = parseRequest(studioPublishRequestSchema, body);
    return this.content.publishCourseVersion(
      parseRequest(uuidSchema, org),
      parseRequest(uuidSchema, course),
      command.draftVersionId,
      command.expectedRevision
    );
  }
}
