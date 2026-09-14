import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  uuidSchema,
  type MasteryProjection,
  type MasteryRecomputeResult
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { MasteryApplicationService } from "./application/mastery.service";

@Controller("organizations/:organizationId/users/:userId/mastery")
export class MasteryController {
  constructor(private readonly mastery: MasteryApplicationService) {}

  @Get()
  getUserMastery(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string
  ): Promise<readonly MasteryProjection[]> {
    return this.mastery.getUserMastery(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, userId)
    );
  }

  @Post("recompute")
  @HttpCode(HttpStatus.OK)
  recomputeUserMastery(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string
  ): Promise<MasteryRecomputeResult> {
    return this.mastery.recomputeUserMastery(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, userId)
    );
  }
}
