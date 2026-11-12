import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  catalogAccessSchema,
  type CatalogAccess,
  type OwnSubscription,
  type SubscriptionOffer,
  type CreateSubscriptionPlanPriceRequest,
  type CreateSubscriptionPlanRequest,
  type SubscriptionPlan,
  type SubscriptionPlanPrice
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { CheckoutOrganizationQuery } from "../../organizations/application/checkout-organization.query";
import { PublicOrganizationQuery } from "../../organizations/application/public-organization.query";
import { resolveCatalogAccess } from "./catalog-access";
import { CatalogAccessQuery } from "./catalog-access.query";
import {
  SubscriptionCheckoutCommand,
  type PendingSubscription
} from "./subscription-checkout.command";
import {
  PlanNotActiveError,
  SubscriptionRepository
} from "./subscription.repository";

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

const snapshot = { readOnly: true, isolationLevel: "repeatable_read" as const };

/** ADR-0087: subscription plans (operator) and the caller's catalog access (learner). */
@Injectable()
export class SubscriptionApplicationService
  implements CatalogAccessQuery, SubscriptionCheckoutCommand
{
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly subscriptions: SubscriptionRepository,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly organizations: PublicOrganizationQuery,
    private readonly memberships: CheckoutOrganizationQuery,
    private readonly outbox: OutboxRepository
  ) {}

  async catalogAccess(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<CatalogAccess> {
    const createdAt = await this.identity.accountCreatedAt(transaction, userId);
    if (createdAt === null) throw new NotFoundException("User not found.");
    const now = new Date();
    const entitlement =
      await this.subscriptions.findEffectiveCatalogEntitlement(
        transaction,
        organizationId,
        userId,
        now
      );
    return resolveCatalogAccess(entitlement, createdAt, now);
  }

  publicOffers(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<SubscriptionOffer[]> {
    return this.subscriptions.publicOffers(transaction, organizationSlug);
  }

  activeOffers(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<SubscriptionOffer[]> {
    return this.subscriptions.activeOffers(transaction, organizationId);
  }

  async openPending(
    transaction: DatabaseTransaction,
    input: Parameters<SubscriptionCheckoutCommand["openPending"]>[1]
  ): Promise<PendingSubscription> {
    const pending = await this.subscriptions.openPending(transaction, input);
    if (pending === null)
      throw new NotFoundException("Active subscription price not found.");
    if (
      pending.status === "pending" &&
      (await this.subscriptions.hasChargingSubscription(
        transaction,
        input.organizationId,
        input.userId
      ))
    )
      throw new ConflictException("You already have an active subscription.");
    if (pending.status !== "pending")
      throw new ConflictException("This checkout is already completed.");
    return pending;
  }

  ownSubscription(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OwnSubscription["subscription"]> {
    return this.subscriptions.ownSubscription(
      transaction,
      organizationId,
      userId
    );
  }

  recordCancellation(
    transaction: DatabaseTransaction,
    organizationId: string,
    subscriptionId: string
  ): Promise<void> {
    return this.subscriptions.applyCancellation(
      transaction,
      organizationId,
      subscriptionId
    );
  }

  sellsCatalogSubscription(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<boolean> {
    return this.subscriptions.hasActiveOffer(transaction, organizationId);
  }

  /** `GET /v1/me/access/{organizationSlug}`: what the paywall and «Моя подписка» show. */
  async ownAccess(organizationSlug: string): Promise<CatalogAccess> {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      async (transaction) => {
        await this.identity.requireActiveUser(transaction, userId);
        if (
          !(await this.organizations.findActiveBySlug(
            transaction,
            organizationSlug
          ))
        )
          throw new NotFoundException("Organization not found.");
        const organization = await this.memberships.resolveActiveMemberBySlug(
          transaction,
          organizationSlug
        );
        if (!organization) {
          // Not a member yet: no Entitlement can exist, the trial still counts.
          const createdAt = await this.identity.accountCreatedAt(
            transaction,
            userId
          );
          if (createdAt === null)
            throw new NotFoundException("User not found.");
          return catalogAccessSchema.parse(
            resolveCatalogAccess(null, createdAt, new Date())
          );
        }
        await transaction.client.query(
          "SELECT set_config('app.organization_id',$1,true)",
          [organization.id]
        );
        return catalogAccessSchema.parse(
          await this.catalogAccess(transaction, organization.id, userId)
        );
      },
      snapshot
    );
  }

  createPlan(
    organizationId: string,
    command: CreateSubscriptionPlanRequest
  ): Promise<SubscriptionPlan> {
    return this.manage(organizationId, async (transaction, userId) => {
      try {
        const plan = await this.subscriptions.createPlan(transaction, {
          organizationId,
          slug: command.slug,
          name: command.name,
          createdByUserId: userId
        });
        await this.event(transaction, organizationId, userId, {
          eventName: "subscription_plan.created",
          aggregateType: "subscription_plan",
          aggregateId: plan.id,
          payload: { organizationId, planId: plan.id, slug: plan.slug }
        });
        return plan;
      } catch (error) {
        if (isUniqueViolation(error))
          throw new ConflictException(
            "A subscription plan with this slug already exists."
          );
        throw error;
      }
    });
  }

  archivePlan(organizationId: string, planId: string) {
    return this.manage(organizationId, async (transaction, userId) => {
      const plan = await this.subscriptions.archivePlan(
        transaction,
        organizationId,
        planId
      );
      if (plan === null)
        throw new NotFoundException("Active subscription plan not found.");
      await this.event(transaction, organizationId, userId, {
        eventName: "subscription_plan.archived",
        aggregateType: "subscription_plan",
        aggregateId: plan.id,
        payload: { organizationId, planId: plan.id }
      });
      return plan;
    });
  }

  createPlanPrice(
    organizationId: string,
    planId: string,
    command: CreateSubscriptionPlanPriceRequest
  ): Promise<SubscriptionPlanPrice> {
    return this.manage(organizationId, async (transaction, userId) => {
      try {
        const price = await this.subscriptions.createPlanPrice(transaction, {
          organizationId,
          planId,
          amountMinor: command.amountMinor,
          currency: command.currency,
          billingPeriod: command.billingPeriod,
          createdByUserId: userId
        });
        await this.event(transaction, organizationId, userId, {
          eventName: "subscription_plan_price.created",
          aggregateType: "subscription_plan_price",
          aggregateId: price.id,
          payload: {
            organizationId,
            planId,
            priceId: price.id,
            amountMinor: price.amountMinor,
            currency: price.currency,
            billingPeriod: price.billingPeriod
          }
        });
        return price;
      } catch (error) {
        if (error instanceof PlanNotActiveError)
          throw new NotFoundException("Active subscription plan not found.");
        if (isUniqueViolation(error))
          throw new ConflictException(
            "Archive the active price for this currency and period first."
          );
        throw error;
      }
    });
  }

  archivePlanPrice(organizationId: string, priceId: string) {
    return this.manage(organizationId, async (transaction, userId) => {
      const price = await this.subscriptions.archivePlanPrice(
        transaction,
        organizationId,
        priceId
      );
      if (price === null)
        throw new NotFoundException("Active subscription price not found.");
      await this.event(transaction, organizationId, userId, {
        eventName: "subscription_plan_price.archived",
        aggregateType: "subscription_plan_price",
        aggregateId: price.id,
        payload: { organizationId, priceId: price.id }
      });
      return price;
    });
  }

  private manage<T>(
    organizationId: string,
    operation: (transaction: DatabaseTransaction, userId: string) => Promise<T>
  ): Promise<T> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "commerce.manage",
        { organizationId, type: "organization", id: organizationId }
      );
      return operation(transaction, context.userId);
    });
  }

  private event(
    transaction: DatabaseTransaction,
    organizationId: string,
    actorUserId: string,
    event: {
      eventName: string;
      aggregateType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    }
  ) {
    return this.outbox.append(transaction, {
      organizationId,
      eventVersion: 1,
      actorUserId,
      ...event
    });
  }
}
