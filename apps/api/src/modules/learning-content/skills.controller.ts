import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  createSkillRequestSchema,
  uuidSchema,
  type Skill
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningGraphApplicationService } from "./application/learning-graph.service";

@Controller("organizations/:organizationId/skills")
export class SkillsController {
  constructor(private readonly graph: LearningGraphApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createSkill(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<Skill> {
    return this.graph.createSkill(
      parseRequest(uuidSchema, organizationId),
      parseRequest(createSkillRequestSchema, body)
    );
  }
}
