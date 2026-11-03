import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  scheduleGraderJobRequestSchema,
  uuidSchema,
  type GraderJob
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { GraderJobApplicationService } from "./application/grader-job.service";

@Controller(
  "organizations/:organizationId/submissions/:submissionId/grader-jobs"
)
export class GraderJobController {
  constructor(private readonly graderJobs: GraderJobApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  schedule(
    @Param("organizationId") organizationId: string,
    @Param("submissionId") submissionId: string,
    @Body() body: unknown
  ): Promise<GraderJob> {
    parseRequest(scheduleGraderJobRequestSchema, body);
    return this.graderJobs.schedule(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, submissionId)
    );
  }
}
