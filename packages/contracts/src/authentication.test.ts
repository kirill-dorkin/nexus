import { describe, expect, it } from "vitest";

import {
  loginRequestSchema,
  oauthProvidersResponseSchema,
  registerRequestSchema
} from "./authentication";
import { currentRegistrationConsents } from "./legal";

describe("authentication contracts", () => {
  it("accepts long passphrases without composition rules", () => {
    const parsed = registerRequestSchema.parse({
      email: " learner@example.test ",
      password: "a long passphrase with spaces",
      displayName: " Learner ",
      consents: currentRegistrationConsents()
    });

    expect(parsed).toEqual({
      email: "learner@example.test",
      password: "a long passphrase with spaces",
      displayName: "Learner",
      consents: currentRegistrationConsents()
    });
  });

  it("requires legal consents at registration and rejects unknown documents", () => {
    const base = {
      email: "learner@example.test",
      password: "a long passphrase with spaces"
    };
    expect(registerRequestSchema.safeParse(base).success).toBe(false);
    expect(
      registerRequestSchema.safeParse({ ...base, consents: [] }).success
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...base,
        consents: [{ document: "marketing", version: "v1" }]
      }).success
    ).toBe(false);
  });

  it("rejects passwords shorter than the minimum", () => {
    expect(
      loginRequestSchema.safeParse({
        email: "learner@example.test",
        password: "too-short"
      }).success
    ).toBe(false);
  });

  it("permits passwords up to 128 characters without truncation", () => {
    const password = "x".repeat(128);
    const parsed = loginRequestSchema.parse({
      email: "learner@example.test",
      password
    });

    expect(parsed.password).toHaveLength(128);
    expect(
      loginRequestSchema.safeParse({
        email: "learner@example.test",
        password: `${password}x`
      }).success
    ).toBe(false);
  });

  it("accepts only the supported external login providers", () => {
    expect(
      oauthProvidersResponseSchema.parse({ providers: ["google", "github"] })
    ).toEqual({ providers: ["google", "github"] });
    expect(
      oauthProvidersResponseSchema.safeParse({ providers: ["facebook"] })
        .success
    ).toBe(false);
  });
});
