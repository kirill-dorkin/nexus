import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";

// ADR-0070: login, registration and other unauthenticated writes are counted
// per client address (and login per email) in PostgreSQL; the stored keys are
// digests, never the address or the email.
describe("rate limiting over HTTP", () => {
  const saved = {
    key: process.env.RATE_LIMIT_KEY,
    vercel: process.env.VERCEL
  };
  const migrationUrl = process.env.DATABASE_MIGRATION_URL;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    if (migrationUrl === undefined)
      throw new Error(
        "DATABASE_MIGRATION_URL is required for rate limit integration tests."
      );
    process.env.RATE_LIMIT_KEY = `integration-${randomUUID()}`;
    process.env.VERCEL = "1";
    app = await createApiApplication();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
    for (const [name, value] of [
      ["RATE_LIMIT_KEY", saved.key],
      ["VERCEL", saved.vercel]
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  const login = (address: string, email: string) =>
    app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: {
        "content-type": "application/json",
        "x-vercel-forwarded-for": address
      },
      payload: { email, password: "not-the-password-1" }
    });

  it("refuses the 21st login from one address and keeps others open", async () => {
    const address = `198.51.100.${String(Math.floor(Math.random() * 200) + 1)}`;
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++)
      statuses.push(
        (await login(address, `${randomUUID()}@example.test`)).statusCode
      );
    expect(statuses.slice(0, 20).every((status) => status === 401)).toBe(true);
    expect(statuses[20]).toBe(429);

    const refused = await login(address, `${randomUUID()}@example.test`);
    expect(Number(refused.headers["retry-after"])).toBeGreaterThan(0);

    const other = await login(
      `203.0.113.${String(Math.floor(Math.random() * 200) + 1)}`,
      `${randomUUID()}@example.test`
    );
    expect(other.statusCode).toBe(401);
  });

  it("refuses the 11th login for one email from different addresses", async () => {
    const email = `${randomUUID()}@example.test`;
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++)
      statuses.push(
        (await login(`192.0.2.${String(i + 1)}-${randomUUID()}`, email))
          .statusCode
      );
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("stores only digests", async () => {
    const pool = createDatabasePool(migrationUrl ?? "", {
      applicationName: "rate-limit-integration-test"
    });
    try {
      const rows = await pool.query<{ key: Buffer }>(
        "SELECT key_sha256 AS key FROM platform_internal.rate_limit_buckets"
      );
      expect(rows.rows.length).toBeGreaterThan(0);
      for (const row of rows.rows) {
        expect(row.key).toHaveLength(32);
        expect(row.key.toString("utf8")).not.toMatch(
          /198\.51\.100|@example\.test/
        );
      }
    } finally {
      await pool.end();
    }
  });
});
