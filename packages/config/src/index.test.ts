import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./index";

const validEnv = {
  DATABASE_URL: "postgresql://platform:platform@localhost:5432/platform",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "x".repeat(32)
};

describe("server environment schema", () => {
  it("applies the development default and accepts a valid local environment", () => {
    const parsed = parseServerEnv(validEnv);

    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(parsed.REDIS_URL).toBe(validEnv.REDIS_URL);
  });

  it("rejects session secrets shorter than the security minimum", () => {
    expect(() =>
      parseServerEnv({
        ...validEnv,
        SESSION_SECRET: "x".repeat(31)
      })
    ).toThrow();
  });
});
