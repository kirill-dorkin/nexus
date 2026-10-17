import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put
} from "@nestjs/common";
import {
  assignRoleRequestSchema,
  inviteOrganizationMemberRequestSchema,
  updateCustomerEntryPolicyRequestSchema,
  uuidSchema,
  type Organization,
  type OrganizationCustomerEntryPolicy,
  type OrganizationMembership
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { RequestContextService } from "../../request-context/request-context.service";
import { OrganizationsApplicationService } from "./application/organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsApplicationService,
    private readonly requestContext: RequestContextService
  ) {}

  // Legacy POST remains recognized but never creates tenants from a user session.
  @Post()
  @Header("Cache-Control", "no-store")
  createOrganization(): never {
    this.requestContext.requirePrincipal();
    throw new ForbiddenException(
      "Organization creation is available only through trusted operations."
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

  @Get(":organizationId/customer-entry-policy")
  @Header("Cache-Control", "no-store")
  getCustomerEntryPolicy(
    @Param("organizationId") organizationId: string
  ): Promise<OrganizationCustomerEntryPolicy> {
    return this.organizations.getCustomerEntryPolicy(
      parseRequest(uuidSchema, organizationId)
    );
  }

  @Put(":organizationId/customer-entry-policy")
  @HttpCode(HttpStatus.OK)
  updateCustomerEntryPolicy(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<OrganizationCustomerEntryPolicy> {
    return this.organizations.updateCustomerEntryPolicy(
      parseRequest(uuidSchema, organizationId),
      parseRequest(updateCustomerEntryPolicyRequestSchema, body)
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
