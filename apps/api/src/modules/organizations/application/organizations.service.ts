import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  AssignRoleRequest,
  CreateOrganizationRequest,
  InviteOrganizationMemberRequest,
  Organization,
  OrganizationMembership
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { OrganizationsRepository } from "./organizations.repository";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function organizationScope(organizationId: string) {
  return {
    organizationId,
    type: "organization" as const,
    id: organizationId
  };
}

@Injectable()
export class OrganizationsApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly organizations: OrganizationsRepository,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly outbox: OutboxRepository
  ) {}

  async createOrganization(
    command: CreateOrganizationRequest
  ): Promise<Organization> {
    const creatorUserId = this.requestContext.requirePrincipal().userId;
    const organizationId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(
        {
          organizationId,
          userId: creatorUserId
        },
        async (transaction) => {
          await this.identity.requireActiveUser(transaction, creatorUserId);

          const organization = await this.organizations.createOrganization(
            transaction,
            {
              id: organizationId,
              slug: command.slug,
              name: command.name,
              createdByUserId: creatorUserId
            }
          );

          await this.organizations.addActiveMembership(
            transaction,
            organizationId,
            creatorUserId
          );
          await this.authorization.bootstrapOrganizationOwner(
            transaction,
            organizationId,
            creatorUserId
          );
          await this.outbox.append(transaction, {
            organizationId,
            eventName: "organization.created",
            eventVersion: 1,
            aggregateType: "organization",
            aggregateId: organizationId,
            actorUserId: creatorUserId,
            payload: {
              organizationId,
              slug: organization.slug,
              name: organization.name,
              createdByUserId: creatorUserId
            }
          });

          return organization;
        }
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("An organization with this slug already exists.");
      }
      throw error;
    }
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "organization.read",
        organizationScope(organizationId)
      );

      const organization = await this.organizations.findById(
        transaction,
        organizationId
      );

      if (organization === null) {
        throw new NotFoundException("Organization not found.");
      }

      return organization;
    });
  }

  async inviteMember(
    organizationId: string,
    command: InviteOrganizationMemberRequest
  ): Promise<OrganizationMembership> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "organization.manage",
        organizationScope(organizationId)
      );
      await this.identity.requireActiveUser(transaction, command.userId);

      const membership = await this.organizations.inviteMembership(
        transaction,
        organizationId,
        command.userId
      );

      if (membership === null) {
        throw new ConflictException(
          "This user already has a membership that cannot be invited."
        );
      }

      return membership;
    });
  }

  async acceptMembershipInvitation(
    organizationId: string
  ): Promise<OrganizationMembership> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

      const membership = await this.organizations.activateInvitedMembership(
        transaction,
        organizationId,
        context.userId
      );

      if (membership === null) {
        throw new ConflictException("An invited membership is required to join.");
      }

      return membership;
    });
  }

  async suspendMember(
    organizationId: string,
    memberUserId: string
  ): Promise<OrganizationMembership> {
    const context = this.requestContext.tenantContext(organizationId);

    if (memberUserId === context.userId) {
      throw new BadRequestException(
        "Use the leave-membership operation instead of suspending yourself."
      );
    }

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "organization.manage",
        organizationScope(organizationId)
      );

      const isOwner = await this.authorization.hasRoleAssignment(
        transaction,
        organizationId,
        memberUserId,
        "organization_owner",
        "organization",
        organizationId
      );
      if (isOwner) {
        throw new ConflictException(
          "Organization owners cannot be suspended before ownership is explicitly changed."
        );
      }

      const membership = await this.organizations.suspendActiveMembership(
        transaction,
        organizationId,
        memberUserId
      );
      if (membership === null) {
        throw new ConflictException("An active membership is required to suspend a member.");
      }

      return membership;
    });
  }

  async leaveMembership(organizationId: string): Promise<OrganizationMembership> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

      const isOwner = await this.authorization.hasRoleAssignment(
        transaction,
        organizationId,
        context.userId,
        "organization_owner",
        "organization",
        organizationId
      );
      if (isOwner) {
        throw new ConflictException(
          "Organization owners cannot leave before ownership is explicitly changed."
        );
      }

      const membership = await this.organizations.leaveMembership(
        transaction,
        organizationId,
        context.userId
      );
      if (membership === null) {
        throw new ConflictException(
          "An invited or active membership is required to leave."
        );
      }

      return membership;
    });
  }

  async assignRoleToMember(
    organizationId: string,
    command: AssignRoleRequest
  ): Promise<void> {
    const context = this.requestContext.tenantContext(organizationId);

    if (
      command.scope.type !== "organization" ||
      command.scope.id !== organizationId
    ) {
      throw new BadRequestException(
        "Only organization-scoped role assignment is available before child resources exist."
      );
    }

    await this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.identity.requireActiveUser(transaction, command.userId);

      const membership = await this.organizations.findMembership(
        transaction,
        organizationId,
        command.userId
      );
      if (membership?.status !== "active") {
        throw new ConflictException(
          "Roles can only be assigned to active organization members."
        );
      }

      await this.authorization.assignRole(
        transaction,
        context.userId,
        organizationId,
        command
      );
    });
  }

  async requireActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership> {
    const membership = await this.organizations.findMembership(
      transaction,
      organizationId,
      userId
    );
    if (membership?.status !== "active") {
      throw new ConflictException(
        "An active organization membership is required for enrollment."
      );
    }
    return membership;
  }
}
