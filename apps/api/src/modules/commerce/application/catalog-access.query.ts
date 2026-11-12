import type { CatalogAccess } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

/**
 * Public Commerce interface (ADR-0087 §4): may this learner record progress beyond the free
 * part of the organization's catalog? Runs inside the caller's tenant transaction.
 */
export abstract class CatalogAccessQuery {
  abstract catalogAccess(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<CatalogAccess>;
}
