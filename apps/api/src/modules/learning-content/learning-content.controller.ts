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
  createCourseRequestSchema,
  createCourseVersionRequestSchema,
  uuidSchema,
  type Course,
  type CourseVersion,
  type CreateCourseResult
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningContentApplicationService } from "./application/learning-content.service";

@Controller("organizations/:organizationId/courses")
export class LearningContentController {
  constructor(private readonly content: LearningContentApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createCourse(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<CreateCourseResult> {
    return this.content.createCourse(
      parseRequest(uuidSchema, organizationId),
      parseRequest(createCourseRequestSchema, body)
    );
  }

  @Get(":courseId")
  getCourse(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string
  ): Promise<Course> {
    return this.content.getCourse(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId)
    );
  }

  @Post(":courseId/versions")
  @HttpCode(HttpStatus.CREATED)
  createCourseVersion(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string,
    @Body() body: unknown
  ): Promise<CourseVersion> {
    return this.content.createCourseVersion(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId),
      parseRequest(createCourseVersionRequestSchema, body)
    );
  }

  @Post(":courseId/versions/:versionId/publish")
  @HttpCode(HttpStatus.OK)
  publishCourseVersion(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string,
    @Param("versionId") versionId: string
  ): Promise<CourseVersion> {
    return this.content.publishCourseVersion(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId),
      parseRequest(uuidSchema, versionId)
    );
  }
}
