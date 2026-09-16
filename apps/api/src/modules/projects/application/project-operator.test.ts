import { ForbiddenException } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import { describe, expect, it, vi } from "vitest";

import type { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { ProjectOperator } from "./project-operator";

describe("ProjectOperator", () => {
  it("requires the active-assignment capability gate before direct role checks", async () => {
    const authorization = {
      requireCapability: vi.fn().mockRejectedValue(
        new ForbiddenException("inactive membership")
      ),
      hasRoleAssignment: vi.fn()
    } as unknown as AuthorizationApplicationService;
    const operator = new ProjectOperator(authorization);
    const transaction = {} as DatabaseTransaction;

    await expect(operator.require(
      transaction,
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "project",
      "00000000-0000-4000-8000-000000000003"
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(authorization.requireCapability).toHaveBeenCalledOnce();
    expect(authorization.hasRoleAssignment).not.toHaveBeenCalled();
  });
});
