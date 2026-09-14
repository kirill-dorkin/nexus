import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  grantOfferingEntitlementRequestSchema,
  uuidSchema,
  type Entitlement
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { CommerceApplicationService } from "./application/commerce.service";

@Controller("organizations/:organizationId/offerings/:offeringId/entitlements")
export class CommerceController {
  constructor(private readonly commerce: CommerceApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  grantOfferingEntitlement(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Body() body: unknown
  ): Promise<Entitlement> {
    return this.commerce.grantOfferingEntitlement(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(grantOfferingEntitlementRequestSchema, body)
    );
  }

  @Post(":entitlementId/revoke")
  revokeOfferingEntitlement(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string,
    @Param("entitlementId") entitlementId: string
  ): Promise<Entitlement> {
    return this.commerce.revokeOfferingEntitlement(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId),
      parseRequest(uuidSchema, entitlementId)
    );
  }
}
