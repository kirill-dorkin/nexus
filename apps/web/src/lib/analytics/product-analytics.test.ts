import { describe, expect, it } from "vitest";

import { readConsent, writeConsent } from "./product-analytics";

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
});
