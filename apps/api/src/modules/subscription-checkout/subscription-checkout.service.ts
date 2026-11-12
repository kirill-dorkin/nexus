import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import {
  ownSubscriptionSchema,
  publicSubscriptionOffersSchema,
  subscriptionCheckoutSchema,
  type OwnSubscription,
  type PublicSubscriptionOffers,
  type StartSubscriptionCheckoutRequest,
  type SubscriptionCheckout
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../database/database.service";
import { RequestContextService } from "../../request-context/request-context.service";
import { CatalogAccessQuery } from "../commerce/application/catalog-access.query";
import { SubscriptionCheckoutCommand } from "../commerce/application/subscription-checkout.command";
import { IdentityApplicationService } from "../identity/application/identity.service";
import { LavaSubscriptionPort } from "../integrations/application/lava-subscription.port";
import { CheckoutOrganizationQuery } from "../organizations/application/checkout-organization.query";

const snapshot = { readOnly: true, isolationLevel: "repeatable_read" as const };

function returnUrl(): string {
  const origin = process.env.WEB_APP_ORIGIN?.trim();
  if (!origin)
    throw new ServiceUnavailableException("WEB_APP_ORIGIN is required.");
  return `${new URL(origin).origin}/me/subscription`;
}

/**
 * ADR-0087 §5, §7: subscription checkout and cancellation. Commerce owns the subscription,
 * Integrations owns lava.top; provider calls happen between the two transactions.
 */
@Injectable()
export class SubscriptionCheckoutService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly memberships: CheckoutOrganizationQuery,
    private readonly subscriptions: SubscriptionCheckoutCommand,
    private readonly access: CatalogAccessQuery,
    private readonly lava: LavaSubscriptionPort
  ) {}

  publicOffers(organizationSlug: string): Promise<PublicSubscriptionOffers> {
    return this.database.transaction(
      async (transaction) =>
        publicSubscriptionOffersSchema.parse({
          offers: await this.subscriptions.publicOffers(
            transaction,
            organizationSlug
          )
        }),
      snapshot
    );
  }

  async own(organizationSlug: string): Promise<OwnSubscription> {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      async (transaction) => {
        const organizationId = await this.member(
          transaction,
          userId,
          organizationSlug
        );
        return ownSubscriptionSchema.parse({
          subscription: await this.subscriptions.ownSubscription(
            transaction,
            organizationId,
            userId
          ),
          access: await this.access.catalogAccess(
            transaction,
            organizationId,
            userId
          )
        });
      },
      snapshot
    );
  }

  async checkout(
    organizationSlug: string,
    command: StartSubscriptionCheckoutRequest
  ): Promise<SubscriptionCheckout> {
    const { userId } = this.requestContext.requirePrincipal();
    const opened = await this.database.userTransaction(
      { userId },
      async (transaction) => {
        const user = await this.identity.requireActiveUser(transaction, userId);
        const organizationId = await this.member(
          transaction,
          userId,
          organizationSlug
        );
        const pending = await this.subscriptions.openPending(transaction, {
          organizationId,
          userId,
          priceId: command.priceId,
          idempotencyKey: command.idempotencyKey,
          termsVersion: command.termsVersion
        });
        const existing = await this.lava.firstContract(
          transaction,
          organizationId,
          pending.id
        );
        return { organizationId, email: user.email, pending, existing };
      }
    );
    if (opened.existing)
      return subscriptionCheckoutSchema.parse({
        paymentUrl: opened.existing.paymentUrl
      });

    const invoice = await this.lava.createInvoice({
      priceId: command.priceId,
      email: opened.email,
      currency: opened.pending.currency,
      billingPeriod: opened.pending.billingPeriod,
      returnUrl: returnUrl(),
      ...(command.utm ? { utm: command.utm } : {})
    });

    return this.database.userTransaction({ userId }, async (transaction) => {
      await this.enterTenant(transaction, opened.organizationId);
      const raced = await this.lava.firstContract(
        transaction,
        opened.organizationId,
        opened.pending.id
      );
      if (raced) return subscriptionCheckoutSchema.parse(raced);
      await this.lava.recordFirstContract(transaction, {
        organizationId: opened.organizationId,
        subscriptionId: opened.pending.id,
        contractId: invoice.contractId,
        paymentUrl: invoice.paymentUrl
      });
      return subscriptionCheckoutSchema.parse({
        paymentUrl: invoice.paymentUrl
      });
    });
  }

  async cancel(organizationSlug: string): Promise<OwnSubscription> {
    const { userId } = this.requestContext.requirePrincipal();
    const target = await this.database.userTransaction(
      { userId },
      async (transaction) => {
        const user = await this.identity.requireActiveUser(transaction, userId);
        const organizationId = await this.member(
          transaction,
          userId,
          organizationSlug
        );
        const subscription = await this.subscriptions.ownSubscription(
          transaction,
          organizationId,
          userId
        );
        if (
          subscription === null ||
          (subscription.status !== "active" &&
            subscription.status !== "past_due")
        )
          throw new ConflictException("There is no subscription to cancel.");
        const contract = await this.lava.firstContract(
          transaction,
          organizationId,
          subscription.id
        );
        if (contract === null)
          throw new ConflictException("The subscription has no payment yet.");
        return {
          organizationId,
          email: user.email,
          subscriptionId: subscription.id,
          parentContractId: contract.contractId
        };
      }
    );
    await this.lava.cancel({
      parentContractId: target.parentContractId,
      email: target.email
    });
    await this.database.userTransaction({ userId }, async (transaction) => {
      await this.enterTenant(transaction, target.organizationId);
      await this.subscriptions.recordCancellation(
        transaction,
        target.organizationId,
        target.subscriptionId
      );
    });
    return this.own(organizationSlug);
  }

  private async member(
    transaction: DatabaseTransaction,
    userId: string,
    organizationSlug: string
  ): Promise<string> {
    await this.identity.requireActiveUser(transaction, userId);
    const organization = await this.memberships.resolveActiveMemberBySlug(
      transaction,
      organizationSlug
    );
    if (!organization)
      throw new NotFoundException("Join the organization first.");
    await this.enterTenant(transaction, organization.id);
    return organization.id;
  }

  private enterTenant(
    transaction: DatabaseTransaction,
    organizationId: string
  ) {
    return transaction.client.query(
      "SELECT set_config('app.organization_id',$1,true)",
      [organizationId]
    );
  }
}
