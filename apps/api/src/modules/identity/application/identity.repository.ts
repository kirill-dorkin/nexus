import type { IdentityUser } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class IdentityRepository {
  abstract findById(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<IdentityUser | null>;
}
