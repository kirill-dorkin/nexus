import { describe, expect, it } from "vitest";

import {
  identifyLearner,
  productAnalytics,
  readConsent,
  setConsent,
  track,
  writeConsent
} from "./product-analytics";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value)
  };
};

describe("analytics consent", () => {
  it("is pending until the visitor chooses, then remembers the choice", () => {
    const storage = memory();
    expect(readConsent(storage)).toBe("pending");
    writeConsent(storage, "granted");
    expect(readConsent(storage)).toBe("granted");
    writeConsent(storage, "denied");
    expect(readConsent(storage)).toBe("denied");
  });

  it("stays pending when storage is missing, broken or holds junk", () => {
    expect(readConsent(null)).toBe("pending");
    expect(
      readConsent({
        getItem: () => {
          throw new Error("blocked");
        }
      })
    ).toBe("pending");
    expect(readConsent({ getItem: () => "yes" })).toBe("pending");
    expect(() =>
      writeConsent(
        {
          setItem: () => {
            throw new Error("quota");
          }
        },
        "granted"
      )
    ).not.toThrow();
  });

  it("stays off without a project key: nothing loads, calls are no-ops", async () => {
    await expect(productAnalytics()).resolves.toBeNull();
    await expect(setConsent("granted")).resolves.toBeUndefined();
    await expect(setConsent("denied")).resolves.toBeUndefined();
    await expect(identifyLearner("user-1")).resolves.toBeUndefined();
    await expect(
      track("quiz_checked", { lesson: "x", outcome: "passed" })
    ).resolves.toBeUndefined();
    await expect(
      track(
        "signup_completed",
        { method: "password" },
        { beforeNavigation: true }
      )
    ).resolves.toBeUndefined();
  });
});
