import { describe, expect, it } from "vitest";

import { TRIAL_DAYS, resolveCatalogAccess } from "./catalog-access";

const created = "2026-11-01T10:00:00.000Z";
const trialEnd = "2026-11-08T10:00:00.000Z";

describe("catalog access (ADR-0087)", () => {
  it("gives a trial for the first days after registration, then nothing", () => {
    expect(TRIAL_DAYS).toBe(7);
    expect(
      resolveCatalogAccess(null, created, new Date("2026-11-08T09:59:59Z"))
    ).toEqual({ access: "trial", until: trialEnd, trialEndsAt: trialEnd });
    expect(
      resolveCatalogAccess(null, created, new Date("2026-11-08T10:00:00Z"))
    ).toEqual({ access: "none", until: null, trialEndsAt: trialEnd });
  });

  it("prefers a subscription or manual grant, also during the trial", () => {
    expect(
      resolveCatalogAccess(
        { grantSource: "subscription", expiresAt: "2026-12-03T00:00:00.000Z" },
        created,
        new Date("2026-11-02T00:00:00Z")
      )
    ).toEqual({
      access: "subscription",
      until: "2026-12-03T00:00:00.000Z",
      trialEndsAt: trialEnd
    });
    expect(
      resolveCatalogAccess(
        { grantSource: "manual", expiresAt: null },
        created,
        new Date("2027-01-01T00:00:00Z")
      )
    ).toEqual({ access: "manual", until: null, trialEndsAt: trialEnd });
  });
});
