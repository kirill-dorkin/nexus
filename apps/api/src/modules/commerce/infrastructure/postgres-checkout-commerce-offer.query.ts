import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  CheckoutCommerceOfferQuery,
  type CheckoutCommerceOffer
} from "../application/checkout-commerce-offer.query";

type CheckoutCommerceOfferRow = {
  product_id: string;
  price_id: string;
  offering_id: string;
};

@Injectable()
export class PostgresCheckoutCommerceOfferQuery extends CheckoutCommerceOfferQuery {
  async resolveActiveOffer(
    transaction: DatabaseTransaction,
    organizationId: string,
    productSlug: string,
    priceId: string
  ): Promise<CheckoutCommerceOffer | null> {
    const result = await transaction.client.query<CheckoutCommerceOfferRow>(
      `SELECT
         product.id::text AS product_id,
         price.id::text AS price_id,
         product.offering_id::text AS offering_id
       FROM commerce.products AS product
       JOIN commerce.prices AS price
         ON price.organization_id = product.organization_id
        AND price.product_id = product.id
       WHERE product.organization_id = $1
         AND product.slug = $2
         AND product.status = 'active'
         AND price.id = $3
         AND price.status = 'active'
       FOR SHARE OF product, price`,
      [organizationId, productSlug, priceId]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          productId: row.product_id,
          priceId: row.price_id,
          offeringId: row.offering_id
        };
  }
}
