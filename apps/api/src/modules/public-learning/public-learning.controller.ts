import { Controller, Get, Header, Param } from "@nestjs/common";
import {
  organizationSlugSchema,
  resourceSlugSchema
} from "@platform/contracts";
import { parseRequest } from "../../http/validation";
import { PublicLearningService } from "./public-learning.service";
@Controller("public/learning")
export class PublicLearningController {
  constructor(private readonly learning: PublicLearningService) {}
  @Get()
  @Header("Cache-Control", "no-store")
  list() {
    return this.learning.list();
  }
  @Get(":organizationSlug/courses/:courseSlug")
  @Header("Cache-Control", "no-store")
  courseBySlug(
    @Param("organizationSlug") organizationSlug: string,
    @Param("courseSlug") courseSlug: string
  ) {
    return this.learning.courseBySlug(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(resourceSlugSchema, courseSlug)
    );
  }
  @Get(":organizationSlug/courses/:courseSlug/lessons/:lessonSlug")
  @Header("Cache-Control", "no-store")
  lessonBySlug(
    @Param("organizationSlug") organizationSlug: string,
    @Param("courseSlug") courseSlug: string,
    @Param("lessonSlug") lessonSlug: string
  ) {
    return this.learning.lessonBySlug(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(resourceSlugSchema, courseSlug),
      parseRequest(resourceSlugSchema, lessonSlug)
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
  @Get(":organizationSlug/:offeringSlug/lessons/:lessonSlug")
  @Header("Cache-Control", "no-store")
  lesson(
    @Param("organizationSlug") organizationSlug: string,
    @Param("offeringSlug") offeringSlug: string,
    @Param("lessonSlug") lessonSlug: string
  ) {
    return this.learning.lesson(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(resourceSlugSchema, offeringSlug),
      parseRequest(resourceSlugSchema, lessonSlug)
    );
  }
}
