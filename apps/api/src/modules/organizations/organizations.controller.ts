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
  assignRoleRequestSchema,
  createOrganizationRequestSchema,
  inviteOrganizationMemberRequestSchema,
  uuidSchema,
  type Organization,
  type OrganizationMembership
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

  @Post(":organizationId/memberships")
  @HttpCode(HttpStatus.CREATED)
  inviteMember(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<OrganizationMembership> {
    return this.organizations.inviteMember(
      parseRequest(uuidSchema, organizationId),
      parseRequest(inviteOrganizationMemberRequestSchema, body)
    );
  }

  @Post(":organizationId/memberships/me/accept")
  @HttpCode(HttpStatus.OK)
  acceptMembershipInvitation(
    @Param("organizationId") organizationId: string
  ): Promise<OrganizationMembership> {
    return this.organizations.acceptMembershipInvitation(
      parseRequest(uuidSchema, organizationId)
    );
  }

  @Post(":organizationId/memberships/:memberUserId/suspend")
  @HttpCode(HttpStatus.OK)
  suspendMember(
    @Param("organizationId") organizationId: string,
    @Param("memberUserId") memberUserId: string
  ): Promise<OrganizationMembership> {
    return this.organizations.suspendMember(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, memberUserId)
    );
  }

  @Post(":organizationId/memberships/me/leave")
  @HttpCode(HttpStatus.OK)
  leaveMembership(
    @Param("organizationId") organizationId: string
  ): Promise<OrganizationMembership> {
    return this.organizations.leaveMembership(
      parseRequest(uuidSchema, organizationId)
    );
  }

  @Post(":organizationId/role-assignments")
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRole(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<void> {
    await this.organizations.assignRoleToMember(
      parseRequest(uuidSchema, organizationId),
      parseRequest(assignRoleRequestSchema, body)
    );
  }
}
