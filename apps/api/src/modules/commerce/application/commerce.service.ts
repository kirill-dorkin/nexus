import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  CommercePrice,
  CommerceProduct,
  CreateCommercePriceRequest,
  CreateCommerceProductRequest,
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

function organizationScope(organizationId: string) {
  return {
    organizationId,
    type: "organization" as const,
    id: organizationId
  };
}

function offeringScope(organizationId: string, offeringId: string) {
  return {
    organizationId,
    type: "offering" as const,
    id: offeringId
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
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

  async createProduct(
    organizationId: string,
    command: CreateCommerceProductRequest
  ): Promise<CommerceProduct> {
    const context = this.requestContext.tenantContext(organizationId);
    const productId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "commerce.manage",
          organizationScope(organizationId)
        );

        const product = await this.commerce.createProduct(transaction, {
          id: productId,
          organizationId,
          offeringId: command.offeringId,
          slug: command.slug,
          name: command.name,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "commerce.product.created",
          eventVersion: 1,
          aggregateType: "commerce_product",
          aggregateId: product.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            productId: product.id,
            offeringId: product.offeringId,
            slug: product.slug
          }
        });

        return product;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "A Commerce Product with this slug already exists."
        );
      }
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException("Learning offering not found.");
      }
      throw error;
    }
  }

  async archiveProduct(
    organizationId: string,
    productId: string
  ): Promise<CommerceProduct> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "commerce.manage",
        organizationScope(organizationId)
      );

      const product = await this.commerce.findProductById(
        transaction,
        organizationId,
        productId
      );
      if (product === null) {
        throw new NotFoundException("Commerce Product not found.");
      }
      if (product.status === "archived") {
        return product;
      }
      if (
        await this.commerce.hasActivePrices(
          transaction,
          organizationId,
          productId
        )
      ) {
        throw new ConflictException(
          "Archive all active Commerce Prices before archiving the Product."
        );
      }

      const archived = await this.commerce.archiveProduct(
        transaction,
        organizationId,
        productId,
        context.userId
      );
      if (archived === null) {
        throw new ConflictException("Commerce Product could not be archived.");
      }

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "commerce.product.archived",
        eventVersion: 1,
        aggregateType: "commerce_product",
        aggregateId: archived.id,
        actorUserId: context.userId,
        payload: {
          organizationId,
          productId: archived.id,
          offeringId: archived.offeringId
        }
      });

      return archived;
    });
  }

  async createPrice(
    organizationId: string,
    productId: string,
    command: CreateCommercePriceRequest
  ): Promise<CommercePrice> {
    const context = this.requestContext.tenantContext(organizationId);
    const priceId = await this.database.nextUuid();

    try {
      return await this.database.tenantTransaction(context, async (transaction) => {
        await this.identity.requireActiveUser(transaction, context.userId);
        await this.authorization.requireCapability(
          transaction,
          context.userId,
          "commerce.manage",
          organizationScope(organizationId)
        );

        const product = await this.commerce.findProductById(
          transaction,
          organizationId,
          productId
        );
        if (product === null) {
          throw new NotFoundException("Commerce Product not found.");
        }
        if (product.status !== "active") {
          throw new ConflictException(
            "Commerce Prices can only be created for an active Product."
          );
        }

        const price = await this.commerce.createPrice(transaction, {
          id: priceId,
          organizationId,
          productId,
          amountMinor: command.amountMinor,
          currency: command.currency,
          billingType: command.billingType,
          createdByUserId: context.userId
        });

        await this.outbox.append(transaction, {
          organizationId,
          eventName: "commerce.price.created",
          eventVersion: 1,
          aggregateType: "commerce_price",
          aggregateId: price.id,
          actorUserId: context.userId,
          payload: {
            organizationId,
            priceId: price.id,
            productId: price.productId,
            amountMinor: price.amountMinor,
            currency: price.currency,
            billingType: price.billingType
          }
        });

        return price;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "An active Commerce Price already exists for this product, currency, and billing type."
        );
      }
      throw error;
    }
  }

  async archivePrice(
    organizationId: string,
    productId: string,
    priceId: string
  ): Promise<CommercePrice> {
    const context = this.requestContext.tenantContext(organizationId);

    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "commerce.manage",
        organizationScope(organizationId)
      );

      const price = await this.commerce.findPriceById(
        transaction,
        organizationId,
        priceId
      );
      if (price === null || price.productId !== productId) {
        throw new NotFoundException("Commerce Price not found.");
      }
      if (price.status === "archived") {
        return price;
      }

      const archived = await this.commerce.archivePrice(
        transaction,
        organizationId,
        priceId,
        context.userId
      );
      if (archived === null) {
        throw new ConflictException("Commerce Price could not be archived.");
      }

      await this.outbox.append(transaction, {
        organizationId,
        eventName: "commerce.price.archived",
        eventVersion: 1,
        aggregateType: "commerce_price",
        aggregateId: archived.id,
        actorUserId: context.userId,
        payload: {
          organizationId,
          priceId: archived.id,
          productId: archived.productId
        }
      });

      return archived;
    });
  }

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
