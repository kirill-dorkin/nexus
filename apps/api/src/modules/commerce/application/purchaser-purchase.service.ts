import { Injectable, NotFoundException } from "@nestjs/common";
import {
  publicPurchaseSchema,
  type PublicPurchase
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { CommerceRepository } from "./commerce.repository";
import { OwnedPurchaseOrganizationQuery } from "./owned-purchase-organization.query";

@Injectable()
export class PurchaserPurchaseApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly ownedPurchaseOrganizations: OwnedPurchaseOrganizationQuery,
    private readonly commerce: CommerceRepository,
    private readonly identity: IdentityApplicationService
  ) {}

  async getOwnPurchase(purchaseId: string): Promise<PublicPurchase> {
    const principal = this.requestContext.requirePrincipal();
    const organizationId = await this.database.userTransaction(
      { userId: principal.userId },
      (transaction) => this.ownedPurchaseOrganizations.resolve(transaction, purchaseId),
      { readOnly: true }
    );

    if (organizationId === null) {
      throw new NotFoundException("Purchase not found.");
    }

    return this.database.tenantTransaction(
      { organizationId, userId: principal.userId },
      async (transaction) => {
        await this.identity.requireActiveUser(transaction, principal.userId);
        const purchase = await this.commerce.findPurchaseById(
          transaction,
          organizationId,
          purchaseId
        );
        if (purchase === null || purchase.purchaserUserId !== principal.userId) {
          throw new NotFoundException("Purchase not found.");
        }
        return publicPurchaseSchema.parse(purchase);
      },
      { readOnly: true }
    );
  }
}
