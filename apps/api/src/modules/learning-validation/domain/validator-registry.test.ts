import { describe, expect, it } from "vitest";

import { ValidatorRegistry } from "./validator-registry";

describe("ValidatorRegistry", () => {
  const registry = new ValidatorRegistry();

  it("resolves an exact validator key and version", () => {
    expect(registry.find("manual-review", 1)).toEqual({
      key: "manual-review",
      version: 1,
      recordingAuthority: "authorized_user",
      evidenceTrust: "trusted"
    });
  });

  it("does not silently substitute a different validator version", () => {
    expect(registry.find("manual-review", 2)).toBeNull();
    expect(registry.find("unknown-validator", 1)).toBeNull();
  });
});
