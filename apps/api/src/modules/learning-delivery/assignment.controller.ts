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
  assignmentSchema,
  createAssignmentRequestSchema,
  uuidSchema,
  type Assignment
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { AssignmentApplicationService } from "./application/assignment.service";

@Controller("organizations/:organizationId/offerings/:offeringId/assignments")
export class AssignmentController {
  constructor(private readonly assignments: AssignmentApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Body() body: unknown
  ): Promise<Assignment> {
    const assignment = await this.assignments.createAssignment(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(createAssignmentRequestSchema, body)
    );
    return assignmentSchema.parse(assignment);
  }

  @Get(":assignmentId")
  async getAssignment(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("assignmentId") assignmentId: string
  ): Promise<Assignment> {
    const assignment = await this.assignments.getAssignment(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, assignmentId)
    );
    return assignmentSchema.parse(assignment);
  }

  @Post(":assignmentId/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelAssignment(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("assignmentId") assignmentId: string
  ): Promise<Assignment> {
    const assignment = await this.assignments.cancelAssignment(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, assignmentId)
    );
    return assignmentSchema.parse(assignment);
  }
}
