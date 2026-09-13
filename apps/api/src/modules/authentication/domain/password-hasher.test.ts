import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password-hasher";

const VALID_PASSWORD = "correct horse battery staple";

describe("password hashing", () => {
  it("stores a salted scrypt verifier instead of the password", async () => {
    const encoded = await hashPassword(VALID_PASSWORD);

    expect(encoded).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(encoded).not.toContain(VALID_PASSWORD);
    await expect(verifyPassword(VALID_PASSWORD, encoded)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const encoded = await hashPassword(VALID_PASSWORD);

    await expect(
      verifyPassword("a different long passphrase", encoded)
    ).resolves.toBe(false);
  });

  it("performs the dummy verification path for missing credentials", async () => {
    await expect(
      verifyPassword("another sufficiently long password", null)
    ).resolves.toBe(false);
  });
});
