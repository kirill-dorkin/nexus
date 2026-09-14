import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  Entitlement,
  GrantOfferingEntitlementRequest
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { OrganizationsApplicationService } from "../../organizations/application/organizations.service";
import { CommerceRepository } from "./commerce.repository";

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23503"
  );
}

@Injectable()
export class CommerceApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly commerce: CommerceRepository,
    private readonly identity: IdentityApplicationService,
    private readonly organizations: OrganizationsApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly outbox: OutboxRepository
  ) {}

  async grantOfferingEntitlement(
    organizationId: string,
    offeringId: string,
    command: GrantOfferingEntitlementRequest
  ): Promise<Entitlement> {
    const context = this.requestContext.tenantContext(organizationId);
    const entitlementId = await this.database.nextUuid();

    if (
      command.expiresAt !== undefined &&
      new Date(command.expiresAt).getTime() <= Date.now()
    ) {
      throw new BadRequestException("expiresAt must be in the future.");
    }

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.identity.requireActiveUser(transaction, command.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "entitlement.manage",
          offeringScope(organizationId, offeringId)
        );
        await this.organizations.requireActiveMembership(
          transaction,
          organizationId,
          command.userId
        );

        const entitlement = await this.commerce.grantOfferingEntitlement(
          transaction,
          {
            id: entitlementId,
            organizationId,
            offeringId,
            userId: command.userId,
            expiresAt: command.expiresAt ?? null,
            grantedByUserId: context.userId
          }
        );

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "entitlement.granted",
          eventVersion: 1,
          aggregateType: "entitlement",
          aggregateId: entitlement.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            entitlementId: entitlement.id,
            offeringId,
            userId: command.userId,
            expiresAt: entitlement.expiresAt
          }
        });

        return entitlement;
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException("Learning offering not found.");
      }
      throw error;
    }
  }

  async revokeOfferingEntitlement(
    organizationId: string,
    offeringId: string,
    entitlementId: string
  ): Promise<Entitlement> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);

      const entitlement = await this.commerce.findEntitlementById(
        transaction,
        organizationId,
        entitlementId
      );
      if (entitlement === null || entitlement.offeringId !== offeringId) {
        throw new NotFoundException("Entitlement not found.");
      }

      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "entitlement.manage",
        offeringScope(organizationId, offeringId)
      );

      if (entitlement.status === "revoked") {
        return entitlement;
      }

      const revoked = await this.commerce.revokeEntitlement(
        transaction,
        organizationId,
        entitlementId,
        context.userId
      );
      if (revoked === null) {
        throw new ConflictException("Entitlement could not be revoked.");
      }

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "entitlement.revoked",
        eventVersion: 1,
        aggregateType: "entitlement",
        aggregateId: revoked.id,
        actorUserId: context.userId,
        payload: {
          organizationId,
          entitlementId: revoked.id,
          offeringId: revoked.offeringId,
          userId: revoked.userId
        }
      });

      return revoked;
    });
  }

  async requireEffectiveOfferingEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    offeringId: string
  ): Promise<Entitlement> {
    const entitlement = await this.commerce.findEffectiveOfferingEntitlement(
      transaction,
      organizationId,
      userId,
      offeringId
    );
    if (entitlement === null) {
      throw new ConflictException(
        "An active entitlement is required for this learning offering."
      );
    }
    return entitlement;
  }
}
