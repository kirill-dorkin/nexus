import { describe, expect, it } from "vitest";

import {
  loginRequestSchema,
  registerRequestSchema
} from "./authentication";

describe("authentication contracts", () => {
  it("accepts long passphrases without composition rules", () => {
    const parsed = registerRequestSchema.parse({
      email: " learner@example.test ",
      password: "a long passphrase with spaces",
      displayName: " Learner "
    });

    expect(parsed).toEqual({
      email: "learner@example.test",
      password: "a long passphrase with spaces",
      displayName: "Learner"
    });
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
});
