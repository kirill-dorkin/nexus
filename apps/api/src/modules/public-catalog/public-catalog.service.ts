import { Injectable, NotFoundException } from "@nestjs/common";
import {
  publicCatalogProductResponseSchema,
  publicCatalogSchema,
  type PublicCatalog,
  type PublicCatalogProduct,
  type PublicCatalogProductResponse
} from "@platform/contracts";

import { DatabaseService } from "../../database/database.service";
import {
  PublicCommerceCatalogQuery,
  type PublicCommerceProductCandidate
} from "../commerce/application/public-commerce-catalog.query";
import {
  PublicLearningOfferingQuery,
  type PublicSellableOffering
} from "../learning-delivery/application/public-learning-offering.query";
import { PublicOrganizationQuery } from "../organizations/application/public-organization.query";

@Injectable()
export class PublicCatalogService {
  constructor(
    private readonly database: DatabaseService,
    private readonly organizations: PublicOrganizationQuery,
    private readonly commerce: PublicCommerceCatalogQuery,
    private readonly delivery: PublicLearningOfferingQuery
  ) {}

  async getCatalog(organizationSlug: string): Promise<PublicCatalog> {
    return this.database.transaction(
      async (transaction) => {
        const organization = await this.organizations.findActiveBySlug(
          transaction,
          organizationSlug
        );
        if (organization === null) {
          throw new NotFoundException("Public catalog not found.");
        }

        const candidates = await this.commerce.listActiveProductCandidates(
          transaction,
          organization.slug
        );
        const offerings = await this.delivery.listSellableByIds(
          transaction,
          organization.slug,
          candidates.map((product) => product.offeringId)
        );

        return publicCatalogSchema.parse({
          organization: {
            slug: organization.slug,
            name: organization.name,
            customerEntryPolicy: organization.customerEntryPolicy
          },
          products: this.composeProducts(candidates, offerings)
        });
      },
      { isolationLevel: "repeatable_read", readOnly: true }
    );
  }

  async getProduct(
    organizationSlug: string,
    productSlug: string
  ): Promise<PublicCatalogProductResponse> {
    return this.database.transaction(
      async (transaction) => {
        const organization = await this.organizations.findActiveBySlug(
          transaction,
          organizationSlug
        );
        if (organization === null) {
          throw new NotFoundException("Public catalog product not found.");
        }

        const candidates = await this.commerce.listActiveProductCandidates(
          transaction,
          organization.slug,
          productSlug
        );
        const offerings = await this.delivery.listSellableByIds(
          transaction,
          organization.slug,
          candidates.map((product) => product.offeringId)
        );
        const product = this.composeProducts(candidates, offerings)[0];
        if (product === undefined) {
          throw new NotFoundException("Public catalog product not found.");
        }

        return publicCatalogProductResponseSchema.parse({
          organization: {
            slug: organization.slug,
            name: organization.name,
            customerEntryPolicy: organization.customerEntryPolicy
          },
          product
        });
      },
      { isolationLevel: "repeatable_read", readOnly: true }
    );
  }

  private composeProducts(
    candidates: readonly PublicCommerceProductCandidate[],
    offerings: readonly PublicSellableOffering[]
  ): PublicCatalogProduct[] {
    const offeringById = new Map(
      offerings.map((offering) => [offering.id, offering] as const)
    );

    return candidates.flatMap((candidate) => {
      const offering = offeringById.get(candidate.offeringId);
      if (offering === undefined) {
        return [];
      }

      return [
        {
          slug: candidate.slug,
          name: candidate.name,
          offering: {
            slug: offering.slug,
            name: offering.name,
            deliveryMode: offering.deliveryMode,
            startsAt: offering.startsAt,
            endsAt: offering.endsAt
          },
          prices: candidate.prices.map((price) => ({
            id: price.id,
            amountMinor: price.amountMinor,
            currency: price.currency,
            billingType: price.billingType
          }))
        }
      ];
    });
  }
}
