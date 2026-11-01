import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import { PublicFreeLearningOfferingQuery } from "../application/public-free-learning-offering.query";
@Injectable()
export class PostgresPublicFreeLearningOfferingQuery extends PublicFreeLearningOfferingQuery {
  async listAddresses(tx: DatabaseTransaction) {
    const result = await tx.client.query<{
      organization_slug: string;
      offering_slug: string;
      offering_name: string;
    }>(
      "SELECT organization_slug,offering_slug,offering_name FROM learning_delivery.list_public_learning_addresses()"
    );
    return result.rows.map((r) => ({
      organizationSlug: r.organization_slug,
      offeringSlug: r.offering_slug,
      offeringName: r.offering_name
    }));
  }
  async findOffering(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string
  ) {
    const result = await tx.client.query<{ slug: string; name: string }>(
      "SELECT slug,name FROM learning_delivery.find_public_learning_offering($1,$2)",
      [organizationSlug, offeringSlug]
    );
    return result.rows[0] ?? null;
  }
  async resolveCourseOffering(
    tx: DatabaseTransaction,
    organizationSlug: string,
    courseSlug: string
  ) {
    const result = await tx.client.query<{ slug: string | null }>(
      "SELECT learning_delivery.resolve_public_course_offering($1,$2) AS slug",
      [organizationSlug, courseSlug]
    );
    return result.rows[0]?.slug ?? null;
  }
}
