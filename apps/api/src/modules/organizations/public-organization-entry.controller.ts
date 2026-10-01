import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  organizationSlugSchema,
  type OrganizationMembership
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { OrganizationsApplicationService } from "./application/organizations.service";

@Controller("public/organizations")
export class PublicOrganizationEntryController {
  constructor(private readonly organizations: OrganizationsApplicationService) {}

  @Post(":organizationSlug/memberships/me")
  @HttpCode(HttpStatus.OK)
  joinOpenCustomerOrganization(
    @Param("organizationSlug") organizationSlug: string
  ): Promise<OrganizationMembership> {
    return this.organizations.joinOpenCustomerOrganization(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }
}
