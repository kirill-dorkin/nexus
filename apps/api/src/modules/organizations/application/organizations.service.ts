import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateOrganizationRequest,
  Organization
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { OrganizationsRepository } from "./organizations.repository";

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

    return this.database.tenantTransaction(
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
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "organization.read",
        {
          organizationId,
          type: "organization",
          id: organizationId
        }
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
}
