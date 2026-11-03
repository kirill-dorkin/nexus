import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  recordValidationResultRequestSchema,
  uuidSchema,
  type ValidationResult
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { ValidationApplicationService } from "./application/validation.service";

@Controller(
  "organizations/:organizationId/submissions/:submissionId/validation-results"
)
export class LearningValidationController {
  constructor(private readonly validation: ValidationApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  recordResult(
    @Param("organizationId") organizationId: string,
    @Param("submissionId") submissionId: string,
    @Body() body: unknown
  ): Promise<ValidationResult> {
    return this.validation.recordResult(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, submissionId),
      parseRequest(recordValidationResultRequestSchema, body)
    );
  }
}
