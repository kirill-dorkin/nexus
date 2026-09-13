import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { attachPlatformPrincipal } from "./platform-principal";
import { RequestContextService } from "./request-context.service";

describe("RequestContextService", () => {
  it("refuses to invent an authenticated principal", () => {
    const service = new RequestContextService({});

    expect(() => service.requirePrincipal()).toThrow(UnauthorizedException);
  });

  it("derives tenant transaction context from the authenticated principal", () => {
    const request = {};
    attachPlatformPrincipal(request, { userId: "user-1" });
    const service = new RequestContextService(request);

    expect(service.tenantContext("organization-1")).toEqual({
      organizationId: "organization-1",
      userId: "user-1"
    });
  });
});
