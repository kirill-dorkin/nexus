import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DatabaseService } from "../database/database.service";
import {
  clientAddress,
  RATE_LIMIT_RULES,
  rateLimitKey,
  RateLimitService
} from "./rate-limit";

function fakeDatabase(hits: (call: number) => number | Error) {
  let calls = 0;
  const query = vi.fn(() => {
    const next = hits(++calls);
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve({ rows: [{ hits: next }] });
  });
  const database = {
    transaction: (
      operation: (tx: { client: { query: typeof query } }) => unknown
    ) => operation({ client: { query } })
  } as unknown as DatabaseService;
  return { database, query };
}

const request = (ip: string, body?: unknown) => ({
  ip,
  body,
  headers: { "x-vercel-forwarded-for": "203.0.113.9" }
});

describe("client address", () => {
  it("trusts the Vercel edge headers only on Vercel", () => {
    expect(clientAddress(request("10.0.0.1"), { VERCEL: "1" })).toBe(
      "203.0.113.9"
    );
    expect(clientAddress(request("10.0.0.1"), {})).toBe("10.0.0.1");
  });

  it("takes the first forwarded address", () => {
    expect(
      clientAddress(
        { headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.2" } },
        { VERCEL: "1" }
      )
    ).toBe("198.51.100.7");
  });
});

describe("rate limit key", () => {
  it("is a 32-byte digest that depends on rule, scope and value", () => {
    const key = rateLimitKey("secret", "auth.login", "ip", "203.0.113.9");
    expect(key).toHaveLength(32);
    expect(key.toString("hex")).not.toContain("203");
    expect(
      key.equals(rateLimitKey("secret", "auth.login", "email", "203.0.113.9"))
    ).toBe(false);
    expect(
      key.equals(rateLimitKey("other", "auth.login", "ip", "203.0.113.9"))
    ).toBe(false);
  });
});

describe("RateLimitService", () => {
  const previous = process.env.RATE_LIMIT_KEY;
  beforeEach(() => {
    process.env.RATE_LIMIT_KEY = "test-secret";
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.RATE_LIMIT_KEY;
    else process.env.RATE_LIMIT_KEY = previous;
  });

  it("is off without a key", async () => {
    delete process.env.RATE_LIMIT_KEY;
    const { database, query } = fakeDatabase(() => 1000);
    await expect(
      new RateLimitService(database).consume(
        "auth.register",
        request("10.0.0.1")
      )
    ).resolves.toEqual({ allowed: true });
    expect(query).not.toHaveBeenCalled();
  });

  it("allows up to the limit and refuses above it until the window ends", async () => {
    const limit = RATE_LIMIT_RULES["auth.register"][0].limit;
    const { database } = fakeDatabase(() => limit + 1);
    const service = new RateLimitService(database);
    const now = 3600_000 * 10 + 600_000; // ten minutes into an hour window
    await expect(
      service.consume("auth.register", request("10.0.0.1"), now)
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 3000 });

    const under = new RateLimitService(fakeDatabase(() => limit).database);
    await expect(
      under.consume("auth.register", request("10.0.0.1"), now)
    ).resolves.toEqual({ allowed: true });
  });

  it("counts login by address and by normalized email", async () => {
    const { database, query } = fakeDatabase(() => 1);
    await new RateLimitService(database).consume(
      "auth.login",
      request("10.0.0.1", { email: "  Learner@Example.TEST " })
    );
    expect(query).toHaveBeenCalledTimes(2);
    const keys = query.mock.calls.map((call) => (call as unknown[][])[1]?.[0]);
    expect(keys[1]).toEqual(
      rateLimitKey("test-secret", "auth.login", "email", "learner@example.test")
    );
  });

  it("fails open when the counter is unavailable", async () => {
    const { database } = fakeDatabase(
      () => new Error("relation does not exist")
    );
    await expect(
      new RateLimitService(database).consume("auth.login", request("10.0.0.1"))
    ).resolves.toEqual({ allowed: true });
  });
});
