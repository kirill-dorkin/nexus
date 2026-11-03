import { Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { uuidSchema, type Enrollment } from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningProgressionApplicationService } from "./application/learning-progression.service";

@Controller("organizations/:organizationId/enrollments/:enrollmentId")
export class LearningProgressionController {
  constructor(
    private readonly progression: LearningProgressionApplicationService
  ) {}

  @Post("complete")
  @HttpCode(HttpStatus.OK)
  completeEnrollment(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string
  ): Promise<Enrollment> {
    return this.progression.completeEnrollment(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId)
    );
  }
}
