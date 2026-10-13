import {
  Inject,
  Injectable,
  Scope,
  UnauthorizedException
} from "@nestjs/common";
import { REQUEST } from "@nestjs/core";

import type {
  PlatformPrincipal,
  PlatformPrincipalCarrier
} from "./platform-principal";

export type TenantRequestContext = Readonly<{
  organizationId: string;
  userId: string;
}>;

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  constructor(
    @Inject(REQUEST)
    private readonly request: PlatformPrincipalCarrier
  ) {}

  requirePrincipal(): PlatformPrincipal {
    const principal = this.request.platformPrincipal;

    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required.");
    }

    return principal;
  }

  tenantContext(organizationId: string): TenantRequestContext {
    if (organizationId.trim().length === 0) {
      throw new Error("organizationId is required for tenant request context.");
    }

    return {
      organizationId,
      userId: this.requirePrincipal().userId
    };
  }
}
