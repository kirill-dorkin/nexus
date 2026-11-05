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
import {
  applySkillMapManifestRequestSchema,
  organizationSlugSchema,
  skillMapManifestV2Schema,
  uuidSchema
} from "@platform/contracts";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { SkillMapApplicationService } from "./application/skill-map.service";

/** Authoring of the skill map (ADR-0078): validate, then apply publishes a new version. */
@Controller("organizations/:organizationId/skill-maps")
export class SkillMapManifestController {
  constructor(private readonly maps: SkillMapApplicationService) {}

  @Post("manifest/validate")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(HttpStatus.OK)
  validate(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ) {
    return this.maps.validate(
      parseRequest(uuidSchema, organizationId),
      parseRequest(skillMapManifestV2Schema, body)
    );
  }

  @Post("manifest/apply")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(HttpStatus.OK)
  apply(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ) {
    return this.maps.apply(
      parseRequest(uuidSchema, organizationId),
      parseRequest(applySkillMapManifestRequestSchema, body)
    );
  }
}

/** Public read for Web's character pages; `map` is null until the first publication. */
@Controller("public/skill-map")
export class PublicSkillMapController {
  constructor(private readonly maps: SkillMapApplicationService) {}

  @Get(":organizationSlug")
  @Header("Cache-Control", "no-store")
  read(@Param("organizationSlug") organizationSlug: string) {
    return this.maps.readPublic(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }
}
