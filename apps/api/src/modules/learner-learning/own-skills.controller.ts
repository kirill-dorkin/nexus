import { Controller, Get, Header, Param } from "@nestjs/common";
import { organizationSlugSchema } from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { OwnSkillsService } from "./own-skills.service";

// A path of its own: under `me/learning/:org/:offering` an Offering slug could collide.
@Controller("me/skills")
export class OwnSkillsController {
  constructor(private readonly skills: OwnSkillsService) {}

  @Get(":organizationSlug")
  @Header("Cache-Control", "no-store")
  list(@Param("organizationSlug") organizationSlug: string) {
    return this.skills.list(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }
}
