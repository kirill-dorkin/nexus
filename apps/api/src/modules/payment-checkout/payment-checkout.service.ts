import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  publicPurchaseCheckoutSchema,
  purchaseCheckoutSchema,
  type CreatePurchaseCheckoutRequest,
  type PublicPurchaseCheckout,
  type PurchaseCheckout
} from "@platform/contracts";

import { DatabaseService } from "../../database/database.service";
import { RequestContextService } from "../../request-context/request-context.service";
import { CheckoutCommerceOfferQuery } from "../commerce/application/checkout-commerce-offer.query";
import {
  PurchaseCommand,
  type PurchaseCheckoutSpecification
} from "../commerce/application/purchase.command";
import { PaymentCheckoutGateway } from "../integrations/application/payment-checkout.gateway";
import { CheckoutLearningOfferingQuery } from "../learning-delivery/application/checkout-learning-offering.query";
import { CheckoutOrganizationQuery } from "../organizations/application/checkout-organization.query";

@Injectable()
export class PurchaseCheckoutApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly checkoutOrganizations: CheckoutOrganizationQuery,
    private readonly checkoutOffers: CheckoutCommerceOfferQuery,
    private readonly checkoutOfferings: CheckoutLearningOfferingQuery,
    private readonly purchases: PurchaseCommand,
    private readonly payments: PaymentCheckoutGateway
  ) {}

  async createOrGetCheckout(
    organizationId: string,
    command: CreatePurchaseCheckoutRequest
  ): Promise<PurchaseCheckout> {
    const specification = await this.purchases.openForCheckout(
      organizationId,
      command
    );
    return this.createOrGetProviderCheckout(organizationId, specification);
  }

  async createOrGetPublicCheckout(
    organizationSlug: string,
    productSlug: string,
    command: CreatePurchaseCheckoutRequest
  ): Promise<PublicPurchaseCheckout> {
    const userId = this.requestContext.requirePrincipal().userId;
    const organization = await this.database.userTransaction(
      { userId },
      (transaction) =>
        this.checkoutOrganizations.resolveActiveMemberBySlug(
          transaction,
          organizationSlug
        ),
      { isolationLevel: "repeatable_read", readOnly: true }
    );
    if (organization === null) {
      throw new NotFoundException("Public checkout offer is not available.");
    }

    const specification = await this.database.tenantTransaction(
      { organizationId: organization.id, userId },
      async (transaction) => {
        const activeMembership =
          await this.checkoutOrganizations.lockActiveMembership(
            transaction,
            organization.id,
            userId
          );
        if (!activeMembership) {
          throw new NotFoundException("Public checkout offer is not available.");
        }

        const offer = await this.checkoutOffers.resolveActiveOffer(
          transaction,
          organization.id,
          productSlug,
          command.priceId
        );
        if (offer === null) {
          throw new NotFoundException("Public checkout offer is not available.");
        }

        const sellableOffering =
          await this.checkoutOfferings.lockSellableOffering(
            transaction,
            organization.id,
            offer.offeringId
          );
        if (!sellableOffering) {
          throw new NotFoundException("Public checkout offer is not available.");
        }

        const opened = await this.purchases.openForCheckoutInTransaction(
          transaction,
          organization.id,
          command
        );
        if (
          opened.purchase.productId !== offer.productId ||
          opened.purchase.priceId !== offer.priceId ||
          opened.purchase.offeringId !== offer.offeringId
        ) {
          throw new ConflictException(
            "Purchase idempotency key is already bound to another public offer."
          );
        }

        return opened;
      },
      { isolationLevel: "repeatable_read" }
    );

    return publicPurchaseCheckoutSchema.parse(
      await this.createOrGetProviderCheckout(organization.id, specification)
    );
  }

  private async createOrGetProviderCheckout(
    organizationId: string,
    specification: PurchaseCheckoutSpecification
  ): Promise<PurchaseCheckout> {
    const checkout = await this.payments.createOrGetCheckout({
      organizationId,
      purchaseId: specification.purchase.id,
      productName: specification.productName,
      amountMinor: specification.purchase.amountMinor,
      currency: specification.purchase.currency
    });

    return purchaseCheckoutSchema.parse({
      purchase: specification.purchase,
      checkoutUrl: checkout.checkoutUrl,
      checkoutExpiresAt: checkout.expiresAt
    });
  }
}
