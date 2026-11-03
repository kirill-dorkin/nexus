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
  revealGuidedBuildHintRequestSchema,
  revealGuidedBuildSolutionRequestSchema,
  uuidSchema,
  type GuidedBuildCompareView,
  type GuidedBuildLearnerView,
  type GuidedBuildTransferHandoff
} from "@platform/contracts";
import { parseRequest } from "../../http/validation";
import { LearningGuidanceApplicationService } from "./application/learning-guidance.service";

@Controller("organizations/:organizationId/attempts/:attemptId/guided-build")
export class LearningGuidanceController {
  constructor(private readonly guidance: LearningGuidanceApplicationService) {}
  @Get()
  getView(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string
  ): Promise<GuidedBuildLearnerView> {
    return this.guidance.getLearnerView(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId)
    );
  }
  @Get("compare")
  getCompare(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string
  ): Promise<GuidedBuildCompareView> {
    return this.guidance.getCompare(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId)
    );
  }
  @Get("transfer")
  getTransferHandoff(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string
  ): Promise<GuidedBuildTransferHandoff> {
    return this.guidance.getTransferHandoff(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId)
    );
  }
  @Post("hints")
  @HttpCode(HttpStatus.OK)
  revealHint(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown
  ): Promise<GuidedBuildLearnerView> {
    return this.guidance.revealHint(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId),
      parseRequest(revealGuidedBuildHintRequestSchema, body)
    );
  }
  @Post("solution")
  @HttpCode(HttpStatus.OK)
  revealSolution(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown
  ): Promise<GuidedBuildLearnerView> {
    return this.guidance.revealSolution(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId),
      parseRequest(revealGuidedBuildSolutionRequestSchema, body)
    );
  }
}
