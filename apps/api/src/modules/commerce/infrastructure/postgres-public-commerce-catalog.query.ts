import { Injectable } from "@nestjs/common";
import type { CommercePrice } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  PublicCommerceCatalogQuery,
  type PublicCommercePrice,
  type PublicCommerceProductCandidate
} from "../application/public-commerce-catalog.query";

type PublicCommerceOfferRow = {
  product_id: string;
  offering_id: string;
  product_slug: string;
  product_name: string;
  price_id: string;
  amount_minor: number;
  currency: string;
  billing_type: CommercePrice["billingType"];
};

type MutableProduct = {
  id: string;
  offeringId: string;
  slug: string;
  name: string;
  prices: PublicCommercePrice[];
};

@Injectable()
export class PostgresPublicCommerceCatalogQuery extends PublicCommerceCatalogQuery {
  async listActiveProductCandidates(
    transaction: DatabaseTransaction,
    organizationId: string,
    productSlug?: string
  ): Promise<readonly PublicCommerceProductCandidate[]> {
    const result = await transaction.client.query<PublicCommerceOfferRow>(
      `SELECT product_id::text,
              offering_id::text,
              product_slug,
              product_name,
              price_id::text,
              amount_minor,
              currency,
              billing_type
         FROM commerce.list_public_catalog_offer_rows($1, $2)`,
      [organizationId, productSlug ?? null]
    );

    const products = new Map<string, MutableProduct>();

    for (const row of result.rows) {
      let product = products.get(row.product_id);
      if (product === undefined) {
        product = {
          id: row.product_id,
          offeringId: row.offering_id,
          slug: row.product_slug,
          name: row.product_name,
          prices: []
        };
        products.set(row.product_id, product);
      }

      product.prices.push({
        id: row.price_id,
        amountMinor: row.amount_minor,
        currency: row.currency,
        billingType: row.billing_type
      });
    }

    return [...products.values()];
  }
}
