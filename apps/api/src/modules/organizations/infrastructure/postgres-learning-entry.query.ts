import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import {
  LearningEntryQuery,
  type LearningEntryContext
} from "../application/learning-entry.query";
@Injectable()
export class PostgresLearningEntryQuery extends LearningEntryQuery {
  async read(
    tx: DatabaseTransaction,
    organizationId: string,
    userId: string,
    lock = false
  ): Promise<LearningEntryContext | null> {
    const organization = (
      await tx.client.query<{
        slug: string;
        name: string;
        customer_entry_policy: "open" | "closed";
      }>(
        `SELECT slug,name,customer_entry_policy FROM organizations.organizations WHERE id=$1 AND status='active' ${lock ? "FOR SHARE" : ""}`,
        [organizationId]
      )
    ).rows[0];
    if (!organization) return null;
    const membership = (
      await tx.client.query<{
        status: Exclude<LearningEntryContext["membershipStatus"], "none">;
      }>(
        `SELECT status FROM organizations.memberships WHERE organization_id=$1 AND user_id=$2 ${lock ? "FOR SHARE" : ""}`,
        [organizationId, userId]
      )
    ).rows[0];
    return {
      slug: organization.slug,
      name: organization.name,
      customerEntryPolicy: organization.customer_entry_policy,
      membershipStatus: membership?.status ?? "none"
    };
  }
}
