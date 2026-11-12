import { Controller, Get, Header, Param } from "@nestjs/common";
import {
  organizationSlugSchema,
  type CatalogAccess
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { SubscriptionApplicationService } from "./application/subscription.service";

/** ADR-0087: the caller's own access to an organization's catalog (subscription or trial). */
@Controller("me/access")
export class OwnCatalogAccessController {
  constructor(private readonly subscriptions: SubscriptionApplicationService) {}

  @Get(":organizationSlug")
  @Header("Cache-Control", "no-store")
  get(
    @Param("organizationSlug") organizationSlug: string
  ): Promise<CatalogAccess> {
    return this.subscriptions.ownAccess(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }
}
