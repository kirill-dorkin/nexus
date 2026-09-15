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
  attachSkillToCourseVersionRequestSchema,
  createCourseRequestSchema,
  createCourseVersionActivityRequestSchema,
  createCourseVersionRequestSchema,
  createGuidedBuildDefinitionRequestSchema,
  uuidSchema,
  type Course,
  type CourseVersion,
  type CourseVersionActivity,
  type CourseVersionSkill,
  type CreateCourseResult,
  type GuidedBuildDefinition
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { GuidedBuildContentApplicationService } from "./application/guided-build-content.service";
import { LearningContentApplicationService } from "./application/learning-content.service";
import { LearningGraphApplicationService } from "./application/learning-graph.service";

@Controller("organizations/:organizationId/courses")
export class LearningContentController {
  constructor(
    private readonly content: LearningContentApplicationService,
    private readonly graph: LearningGraphApplicationService,
    private readonly guidedBuild: GuidedBuildContentApplicationService
  ) {}

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

  @Post(":courseId/versions/:versionId/skills")
  @HttpCode(HttpStatus.CREATED)
  attachSkill(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string,
    @Param("versionId") versionId: string,
    @Body() body: unknown
  ): Promise<CourseVersionSkill> {
    return this.graph.attachSkill(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId),
      parseRequest(uuidSchema, versionId),
      parseRequest(attachSkillToCourseVersionRequestSchema, body)
    );
  }

  @Post(":courseId/versions/:versionId/activities")
  @HttpCode(HttpStatus.CREATED)
  createActivity(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string,
    @Param("versionId") versionId: string,
    @Body() body: unknown
  ): Promise<CourseVersionActivity> {
    return this.graph.createActivity(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId),
      parseRequest(uuidSchema, versionId),
      parseRequest(createCourseVersionActivityRequestSchema, body)
    );
  }

  @Post(":courseId/versions/:versionId/activities/:activityVersionId/guided-build")
  @HttpCode(HttpStatus.CREATED)
  createGuidedBuildDefinition(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string,
    @Param("versionId") versionId: string,
    @Param("activityVersionId") activityVersionId: string,
    @Body() body: unknown
  ): Promise<GuidedBuildDefinition> {
    return this.guidedBuild.createDefinition(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId),
      parseRequest(uuidSchema, versionId),
      parseRequest(uuidSchema, activityVersionId),
      parseRequest(createGuidedBuildDefinitionRequestSchema, body)
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
