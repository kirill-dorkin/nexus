import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put
} from "@nestjs/common";
import {
  attachSkillToCourseVersionRequestSchema,
  createCourseRequestSchema,
  createCourseVersionActivityRequestSchema,
  createCourseVersionRequestSchema,
  replaceSkillRemediationActivitiesRequestSchema,
  uuidSchema,
  type Course,
  type CourseVersion,
  type CourseVersionActivity,
  type CourseVersionSkill,
  type CourseVersionSkillRemediationSet,
  type CreateCourseResult
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningContentApplicationService } from "./application/learning-content.service";
import { LearningGraphApplicationService } from "./application/learning-graph.service";

@Controller("organizations/:organizationId/courses")
export class LearningContentController {
  constructor(
    private readonly content: LearningContentApplicationService,
    private readonly graph: LearningGraphApplicationService
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

  @Put(":courseId/versions/:versionId/skills/:skillId/remediations")
  @HttpCode(HttpStatus.OK)
  replaceSkillRemediations(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string,
    @Param("versionId") versionId: string,
    @Param("skillId") skillId: string,
    @Body() body: unknown
  ): Promise<CourseVersionSkillRemediationSet> {
    return this.graph.replaceSkillRemediations(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId),
      parseRequest(uuidSchema, versionId),
      parseRequest(uuidSchema, skillId),
      parseRequest(replaceSkillRemediationActivitiesRequestSchema, body)
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
