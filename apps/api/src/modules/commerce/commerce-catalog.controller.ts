import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  commercePriceSchema,
  commerceProductSchema,
  createCommercePriceRequestSchema,
  createCommerceProductRequestSchema,
  uuidSchema,
  type CommercePrice,
  type CommerceProduct
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { CommerceApplicationService } from "./application/commerce.service";

@Controller("organizations/:organizationId/commerce/products")
export class CommerceCatalogController {
  constructor(private readonly commerce: CommerceApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<CommerceProduct> {
    return commerceProductSchema.parse(
      await this.commerce.createProduct(
        parseRequest(uuidSchema, organizationId),
        parseRequest(createCommerceProductRequestSchema, body)
      )
    );
  }

  @Post(":productId/archive")
  @HttpCode(HttpStatus.OK)
  async archiveProduct(
    @Param("organizationId") organizationId: string,
    @Param("productId") productId: string
  ): Promise<CommerceProduct> {
    return commerceProductSchema.parse(
      await this.commerce.archiveProduct(
        parseRequest(uuidSchema, organizationId),
        parseRequest(uuidSchema, productId)
      )
    );
  }

  @Post(":productId/prices")
  @HttpCode(HttpStatus.CREATED)
  async createPrice(
    @Param("organizationId") organizationId: string,
    @Param("productId") productId: string,
    @Body() body: unknown
  ): Promise<CommercePrice> {
    return commercePriceSchema.parse(
      await this.commerce.createPrice(
        parseRequest(uuidSchema, organizationId),
        parseRequest(uuidSchema, productId),
        parseRequest(createCommercePriceRequestSchema, body)
      )
    );
  }

  @Post(":productId/prices/:priceId/archive")
  @HttpCode(HttpStatus.OK)
  async archivePrice(
    @Param("organizationId") organizationId: string,
    @Param("productId") productId: string,
    @Param("priceId") priceId: string
  ): Promise<CommercePrice> {
    return commercePriceSchema.parse(
      await this.commerce.archivePrice(
        parseRequest(uuidSchema, organizationId),
        parseRequest(uuidSchema, productId),
        parseRequest(uuidSchema, priceId)
      )
    );
  }
}
