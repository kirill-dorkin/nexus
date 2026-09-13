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
  createOrganizationRequestSchema,
  uuidSchema,
  type Organization
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { OrganizationsApplicationService } from "./application/organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrganization(@Body() body: unknown): Promise<Organization> {
    return this.organizations.createOrganization(
      parseRequest(createOrganizationRequestSchema, body)
    );
  }

  @Get(":organizationId")
  getOrganization(
    @Param("organizationId") organizationId: string
  ): Promise<Organization> {
    return this.organizations.getOrganization(
      parseRequest(uuidSchema, organizationId)
    );
  }
}
