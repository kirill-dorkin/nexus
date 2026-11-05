import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import { uuidSchema } from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { CourseManifestApplicationService } from "./application/course-manifest.service";
import { applyManifestSchema, manifestSchema } from "./domain/manifest-schema";

@Controller("organizations/:organizationId/courses")
export class CourseManifestController {
  constructor(private readonly manifests: CourseManifestApplicationService) {}

  @Post("manifest/validate")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(HttpStatus.OK)
  validate(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ) {
    return this.manifests.validate(
      parseRequest(uuidSchema, organizationId),
      parseRequest(manifestSchema(), body)
    );
  }

  @Post("manifest/apply")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(HttpStatus.OK)
  apply(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ) {
    return this.manifests.apply(
      parseRequest(uuidSchema, organizationId),
      parseRequest(applyManifestSchema(), body)
    );
  }

  @Get(":courseId/versions/:versionId/manifest")
  @Header("Cache-Control", "no-store")
  exportDraft(
    @Param("organizationId") organizationId: string,
    @Param("courseId") courseId: string,
    @Param("versionId") versionId: string
  ) {
    return this.manifests.exportDraft(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, courseId),
      parseRequest(uuidSchema, versionId)
    );
  }
}
