import { describe, expect, it } from "vitest";

import { ValidatorRegistry } from "./validator-registry";

describe("ValidatorRegistry", () => {
  const registry = new ValidatorRegistry();

  it("resolves exact authorized-user and system validator versions", () => {
    expect(registry.find("manual-review", 1)).toEqual({
      key: "manual-review",
      version: 1,
      recordingAuthority: "authorized_user",
      evidenceTrust: "trusted"
    });
    expect(registry.find("code-grader", 1)).toEqual({
      key: "code-grader",
      version: 1,
      recordingAuthority: "system",
      evidenceTrust: "trusted",
      grader: {
        protocolVersion: 1,
        sourceEnvelope: "files_v1"
      }
    });
  });

  it("does not silently substitute a different validator version", () => {
    expect(registry.find("manual-review", 2)).toBeNull();
    expect(registry.find("code-grader", 2)).toBeNull();
    expect(registry.find("unknown-validator", 1)).toBeNull();
  });
});
