import { Controller, Get, Header, Param } from "@nestjs/common";
import {
  organizationSlugSchema,
  publicCatalogProductResponseSchema,
  publicCatalogSchema,
  resourceSlugSchema,
  type PublicCatalog,
  type PublicCatalogProductResponse
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { PublicCatalogService } from "./public-catalog.service";

@Controller("public/catalog/:organizationSlug/products")
export class PublicCatalogController {
  constructor(private readonly catalog: PublicCatalogService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async list(
    @Param("organizationSlug") organizationSlug: string
  ): Promise<PublicCatalog> {
    return publicCatalogSchema.parse(
      await this.catalog.getCatalog(
        parseRequest(organizationSlugSchema, organizationSlug)
      )
    );
  }

  @Get(":productSlug")
  @Header("Cache-Control", "no-store")
  async get(
    @Param("organizationSlug") organizationSlug: string,
    @Param("productSlug") productSlug: string
  ): Promise<PublicCatalogProductResponse> {
    return publicCatalogProductResponseSchema.parse(
      await this.catalog.getProduct(
        parseRequest(organizationSlugSchema, organizationSlug),
        parseRequest(resourceSlugSchema, productSlug)
      )
    );
  }
}
