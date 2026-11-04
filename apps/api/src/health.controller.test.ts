import { describe, expect, it } from "vitest";

import { apiRelease, HealthController } from "./health.controller";

describe("health", () => {
  it("names the deployed commit in 12 characters", () => {
    expect(
      apiRelease({
        VERCEL_GIT_COMMIT_SHA: "0123456789abcdef0123456789abcdef01234567"
      })
    ).toBe("0123456789ab");
  });

  it("reports local outside a deployment", () => {
    expect(apiRelease({})).toBe("local");
  });

  it("answers ok with the release", () => {
    expect(new HealthController().health()).toMatchObject({
      status: "ok",
      service: "api",
      release: expect.any(String)
    });
  });
});
