import { NotFoundException } from "@nestjs/common";
import type { Purchase } from "@platform/contracts";
import { describe, expect, it, vi } from "vitest";

import type { DatabaseService } from "../../../database/database.service";
import type { RequestContextService } from "../../../request-context/request-context.service";
import type { IdentityApplicationService } from "../../identity/application/identity.service";
import type { CommerceRepository } from "./commerce.repository";
import type { OwnedPurchaseOrganizationQuery } from "./owned-purchase-organization.query";
import { PurchaserPurchaseApplicationService } from "./purchaser-purchase.service";

const userId = "018f47f1-16ce-7d1f-8f65-c61d8be24a31";
const organizationId = "018f47f1-16ce-7d1f-8f65-c61d8be24a32";
const purchaseId = "018f47f1-16ce-7d1f-8f65-c61d8be24a33";

function purchase(): Purchase {
  return {
    id: purchaseId,
    organizationId,
    productId: "018f47f1-16ce-7d1f-8f65-c61d8be24a34",
    priceId: "018f47f1-16ce-7d1f-8f65-c61d8be24a35",
    offeringId: "018f47f1-16ce-7d1f-8f65-c61d8be24a36",
    purchaserUserId: userId,
    status: "pending",
    amountMinor: 12900,
    currency: "USD",
    billingType: "one_time",
    idempotencyKey: "018f47f1-16ce-7d1f-8f65-c61d8be24a37",
    createdAt: "2026-10-03T08:00:00.000Z",
    paidAt: null
  };
}

function createSubject(
  resolvedOrganizationId: string | null,
  stored = purchase()
) {
  const transaction = {};
  const database = {
    userTransaction: vi.fn(async (_context, operation) =>
      operation(transaction)
    ),
    tenantTransaction: vi.fn(async (_context, operation) =>
      operation(transaction)
    )
  } as unknown as DatabaseService;
  const requestContext = {
    requirePrincipal: vi.fn(() => ({ userId }))
  } as unknown as RequestContextService;
  const ownedPurchaseOrganizations = {
    resolve: vi.fn(async () => resolvedOrganizationId)
  } as unknown as OwnedPurchaseOrganizationQuery;
  const commerce = {
    findPurchaseById: vi.fn(async () => stored)
  } as unknown as CommerceRepository;
  const identity = {
    requireActiveUser: vi.fn(async () => undefined)
  } as unknown as IdentityApplicationService;

  return new PurchaserPurchaseApplicationService(
    database,
    requestContext,
    ownedPurchaseOrganizations,
    commerce,
    identity
  );
}

describe("PurchaserPurchaseApplicationService", () => {
  it("returns only the public projection for the canonical purchaser", async () => {
    const result =
      await createSubject(organizationId).getOwnPurchase(purchaseId);

    expect(result).toMatchObject({
      id: purchaseId,
      status: "pending",
      amountMinor: 12900,
      currency: "USD"
    });
    expect(result).not.toHaveProperty("organizationId");
    expect(result).not.toHaveProperty("productId");
    expect(result).not.toHaveProperty("offeringId");
    expect(result).not.toHaveProperty("purchaserUserId");
  });

  it("fails closed when purchaser-owned tenant resolution returns nothing", async () => {
    await expect(
      createSubject(null).getOwnPurchase(purchaseId)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rechecks purchaser ownership after entering tenant context", async () => {
    const foreign = {
      ...purchase(),
      purchaserUserId: "018f47f1-16ce-7d1f-8f65-c61d8be24a99"
    };
    await expect(
      createSubject(organizationId, foreign).getOwnPurchase(purchaseId)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
